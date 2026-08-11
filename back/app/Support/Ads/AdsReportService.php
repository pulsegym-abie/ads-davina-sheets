<?php

namespace App\Support\Ads;

use Carbon\Carbon;

/**
 * Lists available report periods (one folder per month under storage/app/ads)
 * and dispatches to the right parser by source. .xlsx → Meta, .csv → Google.
 */
class AdsReportService
{
    private string $base;

    public function __construct()
    {
        $this->base = storage_path('app/ads');
    }

    /** Available periods with the sources present in each. Newest first. */
    public function periods(): array
    {
        $out = [];
        foreach (glob($this->base . '/*', GLOB_ONLYDIR) as $dir) {
            $id = basename($dir);
            $sources = [];
            if ($this->findFile($dir, ['xlsx', 'xls'])) {
                $sources[] = 'meta';
            }
            if ($this->findFile($dir, ['csv'])) {
                $sources[] = 'google';
            }
            if ($sources) {
                $out[] = ['id' => $id, 'label' => $this->label($id), 'sources' => $sources];
            }
        }
        usort($out, fn ($a, $b) => strcmp($b['id'], $a['id']));

        return $out;
    }

    /** Parse a specific period + source into the unified model, or null. */
    public function report(string $period, string $source, ?string $from = null, ?string $to = null): ?array
    {
        $dir = $this->base . '/' . basename($period); // basename = path traversal guard
        if (! is_dir($dir)) {
            return null;
        }

        if ($source === 'meta') {
            $f = $this->findFile($dir, ['xlsx', 'xls']);

            return $f ? (new MetaReportParser)->parse($f, $from, $to) : null;
        }
        if ($source === 'google') {
            $f = $this->findFile($dir, ['csv']);

            return $f ? (new GoogleReportParser)->parse($f, $from, $to) : null;
        }

        return null;
    }

    private function findFile(string $dir, array $exts): ?string
    {
        foreach ($exts as $e) {
            foreach ([$e, strtoupper($e)] as $ext) {
                $g = glob($dir . '/*.' . $ext);
                if ($g) {
                    return $g[0];
                }
            }
        }

        return null;
    }

    /** "2026-05" → "May 2026"; otherwise the raw id. */
    private function label(string $id): string
    {
        if (preg_match('/^(\d{4})-(\d{2})$/', $id)) {
            try {
                return Carbon::createFromFormat('Y-m', $id)->translatedFormat('F Y');
            } catch (\Throwable) {
                // fall through
            }
        }

        return $id;
    }
}
