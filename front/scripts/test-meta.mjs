import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const file = path.resolve('../back/storage/app/ads/2026-10/meta-okt-Format.xlsx');

const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').replace(/[,%"\s]/g, '')
  return s !== '' && !Number.isNaN(Number(s)) ? Number(s) : 0
}

const toDate = (v) => {
  if (v == null || v === '') return null
  if (v instanceof Date) return dayjs(v).isValid() ? dayjs(v).format('YYYY-MM-DD') : null
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return dayjs(d).isValid() ? dayjs(d).format('YYYY-MM-DD') : null
  }
  const d = dayjs(String(v))
  return d.isValid() ? d.format('YYYY-MM-DD') : null
}

const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellDates: true })
const ws = wb.Sheets['Raw Data Report'] || wb.Sheets[wb.SheetNames[0]]
const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true })

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

console.log('headerIdx:', headerIdx);
console.log('col:', col);
if ('Ad set name' in col) labelCol = 'Ad set name'
else if ('Campaign name' in col) labelCol = 'Campaign name'
console.log('labelCol:', labelCol);

const isDaily = 'Day' in col
console.log('isDaily:', isDaily);
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

console.log('Parsed rows count:', rows.length);
console.log('Total spend in rows:', rows.reduce((s, r) => s + r.spend, 0));
console.log('Sample rows:', rows.slice(0, 5));
console.log('grandReach:', grandReach, 'monthStart:', monthStart, 'monthEnd:', monthEnd, 'minDay:', minDay, 'maxDay:', maxDay);

// Compare with front/public/ads-data/2026-10__meta.json
const currentJson = JSON.parse(fs.readFileSync('public/ads-data/2026-10__meta.json', 'utf8'));
console.log('Current JSON rows count:', currentJson.rows.length);
console.log('Current JSON total spend:', currentJson.rows.reduce((s, r) => s + r.spend, 0));
console.log('Are row counts equal?', rows.length === currentJson.rows.length);
console.log('Difference in JSON content?', JSON.stringify({ rows, grand_reach: grandReach }) === JSON.stringify({ rows: currentJson.rows, grand_reach: currentJson.grand_reach }));
