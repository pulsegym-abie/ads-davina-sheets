<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Ads\AdsReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Serves the uploaded Meta/Google ad reports (from storage/app/ads) as a
 * unified model for the read-only dashboard. No database involved.
 */
class AdsReportController extends Controller
{
    public function periods(AdsReportService $svc): JsonResponse
    {
        return response()->json(['data' => $svc->periods()]);
    }

    public function data(Request $request, AdsReportService $svc): JsonResponse
    {
        $source = $request->query('source') === 'google' ? 'google' : 'meta';
        $period = (string) $request->query('period', '');

        // Default to the newest period that has the requested source.
        if ($period === '') {
            foreach ($svc->periods() as $p) {
                if (in_array($source, $p['sources'], true)) {
                    $period = $p['id'];
                    break;
                }
            }
        }

        // Optional custom date range (Meta daily files only). Validate Y-m-d.
        $date = fn (string $k) => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query($k, ''))
            ? (string) $request->query($k)
            : null;
        $from = $date('from');
        $to = $date('to');

        $report = $period !== '' ? $svc->report($period, $source, $from, $to) : null;

        return $report
            ? response()->json(['data' => $report])
            : response()->json(['message' => 'Laporan tidak ditemukan untuk periode/sumber itu.'], 404);
    }
}
