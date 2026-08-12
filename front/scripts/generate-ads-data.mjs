/**
 * Build-time generator: parses the Meta (.xlsx) + Google (.csv) ad exports into
 * static JSON that the SPA fetches directly — no backend at runtime.
 *
 * Source files live in `back/storage/app/ads/<YYYY-MM>/` (kept in the repo).
 * Output goes to `front/public/ads-data/`:
 *   - periods.json                  → [{ id, label, sources }]
 *   - <period>__<source>.json       → { source, title, currency, dimension,
 *                                        daily, period, date_range?, grand_reach?, rows }
 * The frontend aggregates totals/breakdown and filters the date range client-side
 * (see src/lib/adsReport.js), mirroring the old Laravel parsers exactly.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = process.env.ADS_SOURCE_DIR
  || path.resolve(__dirname, '../../back/storage/app/ads')
const OUT = path.resolve(__dirname, '../public/ads-data')

// ---------- helpers ----------
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').replace(/[,%"\s]/g, '')
  return s !== '' && !Number.isNaN(Number(s)) ? Number(s) : 0
}

const toDate = (v) => {
  if (v == null || v === '') return null
  if (v instanceof Date) return dayjs(v).isValid() ? dayjs(v).format('YYYY-MM-DD') : null
  if (typeof v === 'number') {
    // Excel serial → date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return dayjs(d).isValid() ? dayjs(d).format('YYYY-MM-DD') : null
  }
  const d = dayjs(String(v))
  return d.isValid() ? d.format('YYYY-MM-DD') : null
}

const monthLabel = (id) => {
  const m = /^(\d{4})-(\d{2})$/.exec(id)
  if (m) {
    const d = dayjs(`${id}-01`)
    if (d.isValid()) return d.format('MMMM YYYY')
  }
  return id
}

// ---------- Meta (.xlsx) ----------
function parseMeta(file, periodId) {
  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellDates: true })
  const ws = wb.Sheets['Raw Data Report'] || wb.Sheets[wb.SheetNames[0]]
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true })

  // Header = first row that carries the spend column.
  let col = {}
  let labelCol = null
  let headerIdx = -1
  for (let i = 0; i < grid.length; i++) {
    const names = grid[i].map((c) => String(c ?? '').trim())
    if (names.includes('Amount spent (IDR)')) {
      names.forEach((n, j) => {
        if (n !== '') {
          if (!(n in col)) col[n] = j
          if (labelCol === null) labelCol = n
        }
      })
      headerIdx = i
      break
    }
  }

  // Prefer Ad set (then Campaign) as the breakdown dimension when present,
  // regardless of column order in the export.
  if ('Ad set name' in col) labelCol = 'Ad set name'
  else if ('Campaign name' in col) labelCol = 'Campaign name'

  const dimension = labelCol ? labelCol.replace(/\s*name$/i, '').trim() || 'Ad set' : 'Ad set'
  const base = {
    source: 'meta', title: 'Meta Ads', currency: 'IDR', dimension,
    daily: false, period: monthLabel(periodId), rows: [],
  }
  if (headerIdx === -1) return base

  const isDaily = 'Day' in col
  const val = (r, name) => (name in col ? r[col[name]] : null)

  let grandReach = null
  let monthStart = null
  let monthEnd = null
  let minDay = null
  let maxDay = null
  const rows = []

  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i]
    const label = String(val(r, labelCol) ?? '').trim()

    // Grand-total row: blank dimension but real numbers.
    if (label === '' || label.toLowerCase() === 'all') {
      if (grandReach === null && num(val(r, 'Impressions')) > 0) {
        grandReach = num(val(r, 'Reach'))
        monthStart = toDate(val(r, 'Reporting starts'))
        monthEnd = toDate(val(r, 'Reporting ends'))
      }
      continue
    }

    const date = toDate(isDaily ? val(r, 'Day') : val(r, 'Reporting starts'))
    if (date) {
      if (!minDay || date < minDay) minDay = date
      if (!maxDay || date > maxDay) maxDay = date
    }

    rows.push({
      name: label,
      group: label,
      spend: num(val(r, 'Amount spent (IDR)')),
      impressions: num(val(r, 'Impressions')),
      clicks: num(val(r, 'Clicks (all)')),
      views: num(val(r, 'Views')),
      link_clicks: num(val(r, 'Link clicks')),
      reach: num(val(r, 'Reach')),
      date,
    })
  }

  const period = (monthStart && monthEnd)
    ? `${fmt(monthStart)} - ${fmt(monthEnd)}`
    : monthLabel(periodId)

  return {
    ...base,
    daily: isDaily,
    period,
    grand_reach: grandReach,
    date_range: isDaily && minDay && maxDay ? { min: minDay, max: maxDay } : null,
    rows,
  }
}

// ---------- Google (.csv) ----------
function parseGoogle(file, periodId) {
  const buf = fs.readFileSync(file)
  let raw
  if (buf[0] === 0xff && buf[1] === 0xfe) raw = buf.slice(2).toString('utf16le')
  else raw = buf.toString('utf8')
  const lines = raw.split(/\r\n|\r|\n/)

  const title = (lines[0] ?? 'Google Ads').trim()
  const preamble = (lines[1] ?? '').replace(/^[\s"]+|[\s"]+$/g, '')

  let headerIdx = -1
  let col = {}
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('\t')) continue
    const cells = lines[i].split('\t').map((c) => c.trim())
    if (cells.includes('Campaign') && cells.includes('Cost')) {
      cells.forEach((c, j) => { if (!(c in col)) col[c] = j })
      headerIdx = i
      break
    }
  }

  const base = {
    source: 'google', title, currency: 'IDR', dimension: 'Campaign type',
    daily: false, period: preamble || monthLabel(periodId), rows: [],
  }
  if (headerIdx === -1) return base

  const dayKey = 'Day' in col ? 'Day' : ('Date' in col ? 'Date' : null)
  const isDaily = dayKey !== null
  const get = (r, name) => (name in col ? r[col[name]] : null)

  let minDay = null
  let maxDay = null
  const rows = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    const r = lines[i].split('\t')
    const name = String(get(r, 'Campaign') ?? '').trim()
    if (name === '') continue

    const date = isDaily ? toDate(get(r, dayKey)) : null
    if (date) {
      if (!minDay || date < minDay) minDay = date
      if (!maxDay || date > maxDay) maxDay = date
    }

    rows.push({
      name,
      group: String(get(r, 'Campaign type') ?? '').trim() || 'Other',
      spend: num(get(r, 'Cost')),
      impressions: num(get(r, 'Impr.')),
      clicks: num(get(r, 'Clicks')),
      conversions: num(get(r, 'Conversions')),
      date,
    })
  }

  return {
    ...base,
    daily: isDaily,
    period: preamble || monthLabel(periodId),
    date_range: isDaily && minDay && maxDay ? { min: minDay, max: maxDay } : null,
    rows,
  }
}

const fmt = (isoOrLabel) => {
  const d = dayjs(isoOrLabel)
  return d.isValid() ? d.format('MMM D, YYYY') : String(isoOrLabel)
}

const findFile = (dir, exts) => {
  const files = fs.readdirSync(dir)
  for (const ext of exts) {
    const hit = files.find((f) => f.toLowerCase().endsWith('.' + ext))
    if (hit) return path.join(dir, hit)
  }
  return null
}

// ---------- run ----------
function main() {
  if (!fs.existsSync(SRC)) {
    // Not fatal: the committed public/ads-data/*.json is used as-is (e.g. if the
    // build host doesn't include the sibling back/ folder). Add data locally,
    // regenerate, and commit the JSON.
    console.warn(`[ads-data] source dir not found (${SRC}); using committed JSON.`)
    process.exit(0)
  }
  fs.mkdirSync(OUT, { recursive: true })

  const periods = []
  const dirs = fs.readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => (a < b ? 1 : -1)) // newest first

  for (const id of dirs) {
    const dir = path.join(SRC, id)
    const sources = []

    const metaFile = findFile(dir, ['xlsx', 'xls'])
    if (metaFile) {
      const report = parseMeta(metaFile, id)
      fs.writeFileSync(path.join(OUT, `${id}__meta.json`), JSON.stringify(report))
      sources.push('meta')
    }

    const googleFile = findFile(dir, ['csv'])
    if (googleFile) {
      const report = parseGoogle(googleFile, id)
      fs.writeFileSync(path.join(OUT, `${id}__google.json`), JSON.stringify(report))
      sources.push('google')
    }

    if (sources.length) periods.push({ id, label: monthLabel(id), sources })
  }

  fs.writeFileSync(path.join(OUT, 'periods.json'), JSON.stringify({ data: periods }))
  console.log(`[ads-data] wrote ${periods.length} periods → ${path.relative(process.cwd(), OUT)}`)
}

main()
