<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { buildReport } from '@/lib/adsReport'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import BreakdownDonutChart from '@/components/charts/BreakdownDonutChart.vue'
import ApiFetchOverlay from '@/components/ApiFetchOverlay.vue'

const SOURCES = [
  { key: 'meta', label: 'Meta' },
  { key: 'google', label: 'Google' },
]

const source = ref('meta')
const periods = ref([])            // [{id,label,sources}]
const selectedPeriod = ref('')
const dateFrom = ref('')           // custom range (daily Meta files only)
const dateTo = ref('')
const report = ref(null)
const loading = ref(true)
const fetching = ref(false)   // "connecting to Meta/Google API" animation (mockup)
const error = ref('')
let programmatic = false           // guards the date watcher during resets

// This report supports a custom date range (Meta "Day" breakdown export).
const supportsRange = computed(() => report.value?.daily === true)
const rangeBounds = computed(() => report.value?.date_range || null)

// Periods that have the currently selected source.
const availablePeriods = computed(() => periods.value.filter((p) => p.sources.includes(source.value)))

const fmtRp = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0))
const fmtNum = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0))

// KPI tiles built from the unified totals (source-specific extras appended).
const kpis = computed(() => {
  const t = report.value?.totals
  if (!t) return []
  const out = [
    { label: 'Total Spend', value: fmtRp(t.spend), accent: true },
    { label: 'Impressions', value: fmtNum(t.impressions) },
    { label: 'Clicks', value: fmtNum(t.clicks) },
    { label: 'CTR', value: (t.ctr ?? 0) + '%' },
    { label: 'CPC', value: fmtRp(t.cpc) },
    { label: 'CPM', value: fmtRp(t.cpm) },
  ]
  if (t.views != null) out.push({ label: 'Views', value: fmtNum(t.views) })
  if (t.conversions != null) out.push({ label: 'Conversions', value: fmtNum(t.conversions) })
  if (t.reach != null) out.push({ label: t.reach_approx ? 'Reach ≈' : 'Reach', value: fmtNum(t.reach) })
  return out
})

const showViews = computed(() => report.value?.totals?.views != null)

async function loadPeriods() {
  const res = await fetch(`${import.meta.env.BASE_URL}ads-data/periods.json`)
  const data = await res.json()
  periods.value = data.data || []
}

async function loadReport(animate = false) {
  // Resolve the period first, so we never play the sync animation just to error out.
  if (!availablePeriods.value.some((p) => p.id === selectedPeriod.value)) {
    selectedPeriod.value = availablePeriods.value[0]?.id || ''
  }
  if (!selectedPeriod.value) {
    report.value = null
    error.value = `Belum ada laporan ${source.value === 'meta' ? 'Meta' : 'Google'}. Please connect to API Ads.`
    loading.value = false
    fetching.value = false
    return
  }

  if (animate) fetching.value = true
  loading.value = true
  error.value = ''
  const started = Date.now()
  try {
    const res = await fetch(
      `${import.meta.env.BASE_URL}ads-data/${selectedPeriod.value}__${source.value}.json`,
    )
    if (!res.ok) throw new Error('not found')
    const raw = await res.json()
    report.value = buildReport(raw, dateFrom.value, dateTo.value)
  } catch {
    error.value = 'Laporan tidak ditemukan untuk periode/sumber itu.'
    report.value = null
  } finally {
    // Let the "fetching from Meta/Google API" animation breathe (mockup polish).
    if (animate) {
      const wait = 2600 - (Date.now() - started)
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      fetching.value = false
    }
    loading.value = false
  }
}

// Changing source/period drops any custom range back to the full month.
function resetAndLoad() {
  programmatic = true
  dateFrom.value = ''
  dateTo.value = ''
  programmatic = false
  loadReport(true) // switching source/period → play the API-sync animation
}
function clearRange() {
  programmatic = true
  dateFrom.value = ''
  dateTo.value = ''
  programmatic = false
  loadReport()
}
watch(source, resetAndLoad)
watch(selectedPeriod, (v, old) => { if (v !== old) resetAndLoad() })
watch([dateFrom, dateTo], () => { if (!programmatic) loadReport() }, { flush: 'sync' })

onMounted(async () => {
  try {
    await loadPeriods()
    await loadReport(true)
  } catch {
    error.value = 'Gagal memuat daftar periode.'
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header + controls -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Ads Performance</h1>
        <p class="text-sm text-muted-foreground">
          {{ report?.title || 'Laporan iklan' }}<span v-if="report?.period"> · {{ report.period }}</span>
        </p>
      </div>
      <div class="flex items-end gap-3">
        <!-- Source toggle -->
        <div class="inline-flex rounded-lg border p-0.5">
          <button
            v-for="s in SOURCES" :key="s.key" type="button"
            class="px-4 py-1.5 text-sm font-medium rounded-md transition-colors"
            :class="source === s.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="source = s.key"
          >{{ s.label }}</button>
        </div>
        <!-- Period select -->
        <select
          v-model="selectedPeriod"
          class="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option v-if="!availablePeriods.length" value="">— tidak ada —</option>
          <option v-for="p in availablePeriods" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </div>
    </div>

    <!-- Custom date range (only for daily "Day" breakdown files) -->
    <div v-if="supportsRange && !fetching" class="flex flex-wrap items-center gap-2 text-sm">
      <span class="text-muted-foreground">Rentang tanggal:</span>
      <input
        v-model="dateFrom" type="date" :min="rangeBounds?.min" :max="rangeBounds?.max"
        class="h-9 rounded-md border border-input bg-background px-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
      <span class="text-muted-foreground">s/d</span>
      <input
        v-model="dateTo" type="date" :min="rangeBounds?.min" :max="rangeBounds?.max"
        class="h-9 rounded-md border border-input bg-background px-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
      <button
        v-if="dateFrom || dateTo" type="button" @click="clearRange"
        class="h-9 rounded-md border px-3 text-muted-foreground hover:text-foreground"
      >Sebulan penuh</button>
      <span v-if="report?.totals?.reach_approx" class="text-xs text-amber-600">
        Reach untuk rentang custom = perkiraan (audiens antar-hari bisa overlap)
      </span>
    </div>

    <!-- API fetch animation (client mockup) -->
    <ApiFetchOverlay v-if="fetching" :platform="source" />

    <!-- Loading (quick refresh, e.g. date-range tweak) -->
    <div v-else-if="loading" class="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Skeleton v-for="i in 6" :key="i" class="h-20" />
    </div>

    <!-- Error / empty -->
    <Card v-else-if="error">
      <CardContent class="py-10 text-center text-sm text-muted-foreground">{{ error }}</CardContent>
    </Card>

    <template v-else-if="report">
      <!-- KPI tiles -->
      <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card v-for="k in kpis" :key="k.label" :class="k.accent ? 'border-primary/30 bg-primary/5' : ''">
          <CardHeader class="p-3 pb-1">
            <CardTitle class="text-xs font-medium text-muted-foreground">{{ k.label }}</CardTitle>
          </CardHeader>
          <CardContent class="p-3 pt-0">
            <p class="text-lg font-bold tracking-tight whitespace-nowrap" :class="k.accent ? 'text-primary' : ''">{{ k.value }}</p>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-4 lg:grid-cols-5">
        <!-- Donut -->
        <Card class="lg:col-span-2">
          <CardHeader><CardTitle class="text-base">Spend by {{ report.breakdown.dimension }}</CardTitle></CardHeader>
          <CardContent>
            <BreakdownDonutChart :data="report.breakdown.items" label-key="name" value-key="spend" />
          </CardContent>
        </Card>

        <!-- Campaign table -->
        <Card class="lg:col-span-3">
          <CardHeader><CardTitle class="text-base">Per {{ source === 'meta' ? 'Ad set' : 'Campaign' }}</CardTitle></CardHeader>
          <CardContent class="p-0">
            <div class="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead class="text-right">Spend</TableHead>
                    <TableHead class="text-right">Impr.</TableHead>
                    <TableHead class="text-right">Clicks</TableHead>
                    <TableHead v-if="showViews" class="text-right">Views</TableHead>
                    <TableHead class="text-right">{{ source === 'google' ? 'Conv.' : 'Reach' }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="c in report.campaigns" :key="c.name">
                    <TableCell class="font-medium max-w-[240px] truncate" :title="c.name">{{ c.name }}</TableCell>
                    <TableCell class="text-right">{{ fmtRp(c.spend) }}</TableCell>
                    <TableCell class="text-right">{{ fmtNum(c.impressions) }}</TableCell>
                    <TableCell class="text-right">{{ fmtNum(c.clicks) }}</TableCell>
                    <TableCell v-if="showViews" class="text-right">{{ fmtNum(c.views) }}</TableCell>
                    <TableCell class="text-right">{{ fmtNum(source === 'google' ? c.conversions : c.reach) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
