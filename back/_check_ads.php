<?php
$svc = new App\Support\Ads\AdsReportService();
$show = function ($label, $r) {
    if (!$r) { echo "  $label: NULL\n"; return; }
    $t = $r['totals'];
    echo "  $label:\n    period='{$r['period']}' campaigns=".count($r['campaigns'])
        ." breakdown=".count($r['breakdown']['items'])." daily=".($r['daily']?'yes':'no')
        ." range=".json_encode($r['date_range'] ?? null)."\n";
    echo "    totals: spend=".round($t['spend'])." impr=".$t['impressions']." clicks=".$t['clicks']
        ." ctr={$t['ctr']}% cpc={$t['cpc']} cpm={$t['cpm']}"
        ." reach=".($t['reach'] ?? '-').(($t['reach_approx']??false)?' (approx)':'')."\n";
    $top = $r['campaigns'][0] ?? null;
    if ($top) echo "    top: '{$top['name']}' spend=".round($top['spend'])."\n";
};
$show('2026-07 meta monthly', $svc->report('2026-07','meta'));
$show('2026-06 meta daily(full)', $svc->report('2026-06','meta'));
$show('2026-06 meta range 21-25', $svc->report('2026-06','meta','2026-06-21','2026-06-25'));
$show('2026-07 google', $svc->report('2026-07','google'));
