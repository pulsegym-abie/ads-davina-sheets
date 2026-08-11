<?php

namespace App\Support\Ads;

/**
 * Builds the unified report model both parsers (Meta / Google) return, so the
 * frontend renders one dashboard regardless of source. Rows are per-campaign
 * (or per-ad-set) with: name, group (donut dimension), spend, impressions,
 * clicks, and optionally conversions (Google) / reach (Meta).
 */
class AdsReport
{
    public static function build(string $source, string $title, string $period, string $currency, array $rows, string $dimension): array
    {
        $sum = fn (string $k) => array_sum(array_map(fn ($r) => (float) ($r[$k] ?? 0), $rows));

        $spend = $sum('spend');
        $impr = $sum('impressions');
        $clicks = $sum('clicks');

        $totals = [
            'spend' => $spend,
            'impressions' => $impr,
            'clicks' => $clicks,
            'ctr' => $impr > 0 ? round($clicks / $impr * 100, 2) : 0,   // %
            'cpc' => $clicks > 0 ? round($spend / $clicks) : 0,          // per click
            'cpm' => $impr > 0 ? round($spend / $impr * 1000) : 0,       // per 1000 impr
        ];
        // Source-specific extras, only when the data has them.
        $hasConv = array_key_exists('conversions', $rows[0] ?? []);
        $hasReach = array_key_exists('reach', $rows[0] ?? []);
        $hasViews = array_key_exists('views', $rows[0] ?? []);
        if ($hasConv) {
            $totals['conversions'] = round($sum('conversions'), 1);
        }
        if ($hasReach) {
            $totals['reach'] = $sum('reach');
        }
        if ($hasViews) {
            $totals['views'] = $sum('views');
        }

        // Donut breakdown by the source's primary dimension.
        $groups = [];
        foreach ($rows as $r) {
            $g = $r['group'] ?: 'Other';
            $groups[$g] ??= ['name' => $g, 'spend' => 0, 'impressions' => 0, 'clicks' => 0];
            $groups[$g]['spend'] += (float) $r['spend'];
            $groups[$g]['impressions'] += (float) $r['impressions'];
            $groups[$g]['clicks'] += (float) $r['clicks'];
        }
        $items = array_values($groups);
        usort($items, fn ($a, $b) => $b['spend'] <=> $a['spend']);

        // Campaign/ad-set table: aggregate rows by name (Meta leaves span
        // multiple platforms per ad set), biggest spend first.
        $byName = [];
        foreach ($rows as $r) {
            $n = $r['name'];
            if (! isset($byName[$n])) {
                $byName[$n] = ['name' => $n, 'group' => $r['group'] ?? null, 'spend' => 0, 'impressions' => 0, 'clicks' => 0];
                if ($hasConv) {
                    $byName[$n]['conversions'] = 0;
                }
                if ($hasReach) {
                    $byName[$n]['reach'] = 0;
                }
                if ($hasViews) {
                    $byName[$n]['views'] = 0;
                }
            }
            $byName[$n]['spend'] += (float) $r['spend'];
            $byName[$n]['impressions'] += (float) $r['impressions'];
            $byName[$n]['clicks'] += (float) $r['clicks'];
            if ($hasConv) {
                $byName[$n]['conversions'] += (float) ($r['conversions'] ?? 0);
            }
            if ($hasReach) {
                $byName[$n]['reach'] += (float) ($r['reach'] ?? 0);
            }
            if ($hasViews) {
                $byName[$n]['views'] += (float) ($r['views'] ?? 0);
            }
        }
        $campaigns = array_values($byName);
        usort($campaigns, fn ($a, $b) => (float) $b['spend'] <=> (float) $a['spend']);

        return [
            'source' => $source,
            'title' => $title,
            'period' => $period,
            'currency' => $currency,
            'totals' => $totals,
            'breakdown' => ['dimension' => $dimension, 'items' => $items],
            'campaigns' => array_values($campaigns),
        ];
    }
}
