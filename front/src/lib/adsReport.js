// Client-side aggregation + date-range filtering for the static ad-report JSON.
// Mirrors the old Laravel AdsReport::build + parser date logic exactly, so the
// dashboard renders identically without a backend.
import dayjs from 'dayjs'

const fmt = (iso) => {
  const d = dayjs(iso)
  return d.isValid() ? d.format('MMM D, YYYY') : String(iso ?? '')
}

const round = (n, dp = 0) => {
  const f = 10 ** dp
  return Math.round((Number(n) || 0) * f) / f
}

/**
 * @param {object} raw  loaded <period>__<source>.json
 * @param {string} [from] inclusive YYYY-MM-DD (daily reports only)
 * @param {string} [to]   inclusive YYYY-MM-DD (daily reports only)
 */
export function buildReport(raw, from = '', to = '') {
  const source = raw.source
  const filtered = raw.daily && (from || to)

  const rows = filtered
    ? raw.rows.filter((r) => !r.date || ((!from || r.date >= from) && (!to || r.date <= to)))
    : raw.rows

  const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)
  const spend = sum('spend')
  const impressions = sum('impressions')
  const clicks = sum('clicks')

  const totals = {
    spend,
    impressions,
    clicks,
    ctr: impressions > 0 ? round((clicks / impressions) * 100, 2) : 0,
    cpc: clicks > 0 ? round(spend / clicks) : 0,
    cpm: impressions > 0 ? round((spend / impressions) * 1000) : 0,
  }

  const hasConv = source === 'google'
  const hasReach = source === 'meta'
  const hasViews = source === 'meta'

  if (hasConv) totals.conversions = round(sum('conversions'), 1)
  if (hasViews) totals.views = sum('views')
  if (hasReach) {
    // Full period → exact (de-duplicated) reach from the grand-total row.
    // Custom range → summed reach is only an estimate (audiences overlap).
    if (!filtered && raw.grand_reach != null) {
      totals.reach = raw.grand_reach
    } else if (filtered) {
      totals.reach = sum('reach')
      totals.reach_approx = true
    } else {
      totals.reach = sum('reach')
    }
  }

  // Donut breakdown by the source's primary dimension.
  const groups = {}
  for (const r of rows) {
    const g = r.group || 'Other'
    groups[g] ??= { name: g, spend: 0, impressions: 0, clicks: 0 }
    groups[g].spend += Number(r.spend) || 0
    groups[g].impressions += Number(r.impressions) || 0
    groups[g].clicks += Number(r.clicks) || 0
  }
  const items = Object.values(groups).sort((a, b) => b.spend - a.spend)

  // Campaign/ad-set table: aggregate rows by name.
  const byName = {}
  for (const r of rows) {
    const n = r.name
    if (!byName[n]) {
      byName[n] = { name: n, group: r.group ?? null, spend: 0, impressions: 0, clicks: 0 }
      if (hasConv) byName[n].conversions = 0
      if (hasReach) byName[n].reach = 0
      if (hasViews) byName[n].views = 0
    }
    byName[n].spend += Number(r.spend) || 0
    byName[n].impressions += Number(r.impressions) || 0
    byName[n].clicks += Number(r.clicks) || 0
    if (hasConv) byName[n].conversions += Number(r.conversions) || 0
    if (hasReach) byName[n].reach += Number(r.reach) || 0
    if (hasViews) byName[n].views += Number(r.views) || 0
  }
  const campaigns = Object.values(byName).sort((a, b) => b.spend - a.spend)

  const period = filtered
    ? `${fmt(from || raw.date_range?.min)} - ${fmt(to || raw.date_range?.max)}`
    : raw.period

  return {
    source,
    title: raw.title,
    period,
    currency: raw.currency,
    totals,
    breakdown: { dimension: raw.dimension, items },
    campaigns,
    daily: !!raw.daily,
    date_range: raw.date_range || null,
  }
}
