<?php

namespace App\Support\Ads;

use Carbon\Carbon;

/**
 * Parses a Google Ads "Campaign performance" export.
 * Format: UTF-16 (with BOM), TAB-separated, 2 preamble rows (title + date range),
 * then a header row, then data rows.
 *
 * Two shapes are supported:
 *   Monthly : one row per campaign (default export).
 *   Daily   : segmented by "Day" — one row per campaign PER DAY, which enables the
 *             custom date-range filter (same behaviour as the Meta "Day" export).
 *
 * @param  string       $path
 * @param  string|null  $from  inclusive Y-m-d, daily files only
 * @param  string|null  $to    inclusive Y-m-d, daily files only
 */
class GoogleReportParser
{
    public function parse(string $path, ?string $from = null, ?string $to = null): array
    {
        $raw = file_get_contents($path);
        // Google exports as UTF-16; normalise to UTF-8.
        if (str_starts_with($raw, "\xFF\xFE") || str_starts_with($raw, "\xFE\xFF")) {
            $raw = mb_convert_encoding($raw, 'UTF-8', 'UTF-16');
        }
        $lines = preg_split('/\r\n|\r|\n/', $raw);

        $title = trim($lines[0] ?? 'Google Ads');
        $preamblePeriod = trim($lines[1] ?? '', " \t\"");

        // Header = the first TAB-separated row carrying both "Campaign" and "Cost".
        // (Robust to column order, e.g. when a "Day" segment is the first column.)
        $headerIdx = null;
        $col = [];
        foreach ($lines as $i => $l) {
            if (strpos($l, "\t") === false) {
                continue;
            }
            $cells = array_map(fn ($c) => trim($c), explode("\t", $l));
            if (in_array('Campaign', $cells, true) && in_array('Cost', $cells, true)) {
                $col = array_flip($cells);
                $headerIdx = $i;
                break;
            }
        }

        if ($headerIdx === null) {
            $rep = AdsReport::build('google', $title, $preamblePeriod, 'IDR', [], 'Campaign type');
            $rep['daily'] = false;

            return $rep;
        }

        $get = function (array $r, string $name) use ($col) {
            $i = $col[$name] ?? null;

            return $i !== null && isset($r[$i]) ? $r[$i] : null;
        };

        // A "Day" (or "Date") segment column makes this a daily file.
        $dayKey = isset($col['Day']) ? 'Day' : (isset($col['Date']) ? 'Date' : null);
        $isDaily = $dayKey !== null;

        $fromD = $from ? Carbon::parse($from)->startOfDay() : null;
        $toD = $to ? Carbon::parse($to)->endOfDay() : null;
        $filtered = $isDaily && ($fromD || $toD);

        $minDay = null;
        $maxDay = null;
        $rows = [];
        foreach (array_slice($lines, $headerIdx + 1) as $line) {
            if (trim($line) === '') {
                continue;
            }
            $r = explode("\t", $line);
            $name = trim((string) $get($r, 'Campaign'));
            if ($name === '') {
                continue; // skip blank / total rows
            }

            // Row date (daily files only), for range filtering + bounds.
            $date = $isDaily ? $this->toDate($get($r, $dayKey)) : null;
            if ($date) {
                $minDay = ($minDay === null || $date->lt($minDay)) ? $date->copy() : $minDay;
                $maxDay = ($maxDay === null || $date->gt($maxDay)) ? $date->copy() : $maxDay;
            }
            if ($filtered && $date) {
                if ($fromD && $date->lt($fromD)) {
                    continue;
                }
                if ($toD && $date->gt($toD)) {
                    continue;
                }
            }

            $rows[] = [
                'name' => $name,
                'group' => trim((string) $get($r, 'Campaign type')) ?: 'Other', // Search / Performance Max
                'state' => trim((string) $get($r, 'Campaign state')),
                'spend' => self::num($get($r, 'Cost')),
                'impressions' => self::num($get($r, 'Impr.')),
                'clicks' => self::num($get($r, 'Clicks')),
                'conversions' => self::num($get($r, 'Conversions')),
            ];
        }

        // Period label reflects the actual window shown.
        if ($filtered) {
            $period = $this->fmt($fromD ?? $minDay) . ' - ' . $this->fmt($toD ?? $maxDay);
        } else {
            $period = $preamblePeriod ?: $this->folderPeriod($path);
        }

        $report = AdsReport::build('google', $title, $period, 'IDR', $rows, 'Campaign type');
        $report['daily'] = $isDaily;
        if ($isDaily && $minDay && $maxDay) {
            $report['date_range'] = ['min' => $minDay->toDateString(), 'max' => $maxDay->toDateString()];
        }

        return $report;
    }

    /** ISO / string / Excel-ish date → Carbon (or null). */
    private function toDate($v): ?Carbon
    {
        if ($v === null || trim((string) $v) === '') {
            return null;
        }
        try {
            return Carbon::parse(trim((string) $v));
        } catch (\Throwable) {
            return null;
        }
    }

    private function fmt(?Carbon $d): string
    {
        return $d ? $d->format('M j, Y') : '';
    }

    /** "…/2026-06/file.csv" → "June 2026". */
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

    private static function num(mixed $v): float
    {
        $s = str_replace([',', '%', '"', ' '], '', (string) $v);

        return is_numeric($s) ? (float) $s : 0.0;
    }
}
