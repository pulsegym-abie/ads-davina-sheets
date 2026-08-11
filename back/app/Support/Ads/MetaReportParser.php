<?php

namespace App\Support\Ads;

use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/**
 * Parses a Meta (Facebook/Instagram) Ads monthly export (.xlsx), the
 * "Raw Data Report" sheet. Two shapes are supported:
 *
 *   Monthly : Ad set name | Reach | Impressions | Clicks (all) | … | Amount spent (IDR) | …
 *             one row per ad set (+ a blank-name grand-total row on top).
 *   Daily   : Ad set name | Day | Reach | … | Amount spent (IDR) | …
 *             one row per ad set PER DAY, enabling custom date-range filtering.
 *
 * Spend/impressions/clicks/views are summed from the rows (exact). Reach is NOT
 * additive (audiences overlap): for a full month it comes from the grand-total
 * row; for a custom range it can only be approximated by summing (flagged).
 *
 * @param  string       $path
 * @param  string|null  $from  inclusive Y-m-d, daily files only
 * @param  string|null  $to    inclusive Y-m-d, daily files only
 */
class MetaReportParser
{
    public function parse(string $path, ?string $from = null, ?string $to = null): array
    {
        $book = IOFactory::load($path);
        $sheet = $book->getSheetByName('Raw Data Report') ?? $book->getActiveSheet();
        $grid = $sheet->toArray(null, true, false, false);

        // Header = first row that carries the spend column.
        $col = [];
        $labelCol = null;
        $headerIdx = null;
        foreach ($grid as $i => $r) {
            $names = array_map(fn ($c) => trim((string) $c), $r);
            if (in_array('Amount spent (IDR)', $names, true)) {
                foreach ($names as $j => $n) {
                    if ($n !== '') {
                        $col[$n] = $j;
                        $labelCol ??= $n; // first column = the dimension (e.g. "Ad set name")
                    }
                }
                $headerIdx = $i;
                break;
            }
        }

        $dimension = $labelCol ? trim(preg_replace('/\bname$/i', '', $labelCol)) : 'Ad set';
        $isDaily = isset($col['Day']);

        if ($headerIdx === null) {
            $rep = AdsReport::build('meta', 'Meta Ads', $this->folderPeriod($path), 'IDR', [], $dimension ?: 'Ad set');
            $rep['daily'] = false;

            return $rep;
        }

        $val = fn (array $r, string $name) => isset($col[$name], $r[$col[$name]]) ? $r[$col[$name]] : null;
        $num = fn ($v) => is_numeric($v) ? (float) $v : 0.0;

        $fromD = $from ? Carbon::parse($from)->startOfDay() : null;
        $toD = $to ? Carbon::parse($to)->endOfDay() : null;
        $filtered = $isDaily && ($fromD || $toD);

        $grandReach = null;
        $monthStart = null;
        $monthEnd = null;
        $minDay = null;
        $maxDay = null;
        $rows = [];
        foreach (array_slice($grid, $headerIdx + 1) as $r) {
            $label = trim((string) $val($r, $labelCol));

            // Grand-total row: blank dimension but real numbers.
            if ($label === '' || strcasecmp($label, 'All') === 0) {
                if ($grandReach === null && $num($val($r, 'Impressions')) > 0) {
                    $grandReach = $num($val($r, 'Reach'));
                    $monthStart = $this->toDate($val($r, 'Reporting starts'));
                    $monthEnd = $this->toDate($val($r, 'Reporting ends'));
                }

                continue;
            }

            // Row date: the "Day" column (daily) or the reporting window start.
            $date = $this->toDate($isDaily ? $val($r, 'Day') : $val($r, 'Reporting starts'));
            if ($date) {
                $minDay = ($minDay === null || $date->lt($minDay)) ? $date->copy() : $minDay;
                $maxDay = ($maxDay === null || $date->gt($maxDay)) ? $date->copy() : $maxDay;
            }

            // Apply the date range (daily files only).
            if ($filtered && $date) {
                if ($fromD && $date->lt($fromD)) {
                    continue;
                }
                if ($toD && $date->gt($toD)) {
                    continue;
                }
            }

            $rows[] = [
                'name' => $label,
                'group' => $label,          // one donut slice per ad set (no Platform column)
                'spend' => $num($val($r, 'Amount spent (IDR)')),
                'impressions' => $num($val($r, 'Impressions')),
                'clicks' => $num($val($r, 'Clicks (all)')),
                'views' => $num($val($r, 'Views')),
                'link_clicks' => $num($val($r, 'Link clicks')),
                'reach' => $num($val($r, 'Reach')),
            ];
        }

        // Period label reflects the actual window shown.
        if ($filtered) {
            $period = $this->fmt($fromD ?? $minDay) . ' - ' . $this->fmt($toD ?? $maxDay);
        } elseif ($monthStart && $monthEnd) {
            $period = $this->fmt($monthStart) . ' - ' . $this->fmt($monthEnd);
        } else {
            $period = $this->folderPeriod($path);
        }

        $report = AdsReport::build('meta', 'Meta Ads', $period, 'IDR', $rows, $dimension ?: 'Ad set');

        // Full month → exact (de-duplicated) reach from the total row.
        // Custom range → summed reach is only an estimate.
        if (! $filtered && $grandReach !== null) {
            $report['totals']['reach'] = $grandReach;
        } elseif ($filtered) {
            $report['totals']['reach_approx'] = true;
        }

        $report['daily'] = $isDaily;
        if ($isDaily && $minDay && $maxDay) {
            $report['date_range'] = ['min' => $minDay->toDateString(), 'max' => $maxDay->toDateString()];
        }

        return $report;
    }

    /** Excel serial or string date → Carbon (or null). */
    private function toDate($v): ?Carbon
    {
        if ($v === null || $v === '') {
            return null;
        }
        try {
            if (is_numeric($v)) {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $v));
            }

            return Carbon::parse((string) $v);
        } catch (\Throwable) {
            return null;
        }
    }

    private function fmt(?Carbon $d): string
    {
        return $d ? $d->format('M j, Y') : '';
    }

    /** "…/2026-06/file.xlsx" → "June 2026". */
    private function folderPeriod(string $path): string
    {
        $id = basename(dirname($path));
        if (preg_match('/^\d{4}-\d{2}$/', $id)) {
            try {
                return Carbon::createFromFormat('Y-m', $id)->translatedFormat('F Y');
            } catch (\Throwable) {
                // fall through
            }
        }

        return $id;
    }
}
