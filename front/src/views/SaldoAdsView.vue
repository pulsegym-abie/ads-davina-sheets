<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import { fetchTransactions, addTransaction, deleteTransaction } from '@/lib/saldoAds'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, Trash2 } from 'lucide-vue-next'

const PLATFORMS = [
  { key: 'meta', label: 'Meta' },
  { key: 'google', label: 'Google' },
]

const today = dayjs().format('YYYY-MM-DD')
const dateFrom = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const dateTo = ref(today)

const transactions = ref([])
const loading = ref(true)
const saving = ref(false)
const deletingId = ref('')

const form = ref({
  date: today,
  platform: 'meta',
  type: 'in',
  amount: '',
  note: '',
})

const fmtRp = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0))
const fmtDate = (d) => dayjs(d).format('D MMM YYYY')
const platformLabel = (key) => PLATFORMS.find((p) => p.key === key)?.label || key

async function load() {
  loading.value = true
  try {
    transactions.value = await fetchTransactions({ from: dateFrom.value, to: dateTo.value })
  } catch (err) {
    toast.error('Gagal memuat data', { description: err.message })
  } finally {
    loading.value = false
  }
}

function setPreset(preset) {
  const end = dayjs()
  if (preset === 'month') dateFrom.value = end.startOf('month').format('YYYY-MM-DD')
  else if (preset === '7d') dateFrom.value = end.subtract(6, 'day').format('YYYY-MM-DD')
  else if (preset === '30d') dateFrom.value = end.subtract(29, 'day').format('YYYY-MM-DD')
  dateTo.value = end.format('YYYY-MM-DD')
}

watch([dateFrom, dateTo], load)

async function handleSubmit() {
  if (!form.value.date || !form.value.amount || Number(form.value.amount) <= 0) {
    toast.error('Lengkapi tanggal & jumlah (harus lebih dari 0)')
    return
  }
  saving.value = true
  try {
    await addTransaction({ ...form.value, amount: Number(form.value.amount) })
    toast.success('Transaksi disimpan')
    form.value.amount = ''
    form.value.note = ''
    await load()
  } catch (err) {
    toast.error('Gagal menyimpan', { description: err.message })
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  deletingId.value = id
  try {
    await deleteTransaction(id)
    transactions.value = transactions.value.filter((t) => t.id !== id)
    toast.success('Transaksi dihapus')
  } catch (err) {
    toast.error('Gagal menghapus', { description: err.message })
  } finally {
    deletingId.value = ''
  }
}

function summaryFor(platform) {
  const rows = platform ? transactions.value.filter((t) => t.platform === platform) : transactions.value
  const masuk = rows.filter((t) => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0)
  const keluar = rows.filter((t) => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0)
  return { masuk, keluar, saldo: masuk - keluar }
}

const overall = computed(() => summaryFor())
const metaSummary = computed(() => summaryFor('meta'))
const googleSummary = computed(() => summaryFor('google'))

const historyTabs = computed(() => [
  { key: 'all', label: 'Semua', rows: transactions.value, showPlatform: true },
  { key: 'meta', label: 'Meta', rows: transactions.value.filter((t) => t.platform === 'meta'), showPlatform: false },
  { key: 'google', label: 'Google', rows: transactions.value.filter((t) => t.platform === 'google'), showPlatform: false },
])

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Header + date range -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Saldo Ads</h1>
        <p class="text-sm text-muted-foreground">Pemasukan &amp; pengeluaran saldo iklan Meta dan Google</p>
      </div>

      <Popover>
        <PopoverTrigger as-child>
          <Button variant="outline" class="gap-2 font-normal">
            <CalendarDays class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm">{{ fmtDate(dateFrom) }} &mdash; {{ fmtDate(dateTo) }}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-4" align="end">
          <div class="space-y-4">
            <div class="flex gap-2">
              <Button variant="outline" size="sm" @click="setPreset('7d')">7 hari</Button>
              <Button variant="outline" size="sm" @click="setPreset('30d')">30 hari</Button>
              <Button variant="outline" size="sm" @click="setPreset('month')">Bulan ini</Button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label class="text-xs">Dari</Label>
                <Input v-model="dateFrom" type="date" :max="dateTo" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">Sampai</Label>
                <Input v-model="dateTo" type="date" :min="dateFrom" />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>

    <!-- Summary -->
    <div v-if="loading" class="grid gap-3 sm:grid-cols-3">
      <Skeleton v-for="i in 3" :key="i" class="h-20" />
    </div>
    <template v-else>
      <div class="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader class="p-3 pb-1"><CardTitle class="text-xs font-medium text-muted-foreground">Total Pemasukan</CardTitle></CardHeader>
          <CardContent class="p-3 pt-0"><p class="text-lg font-bold tracking-tight text-emerald-600">{{ fmtRp(overall.masuk) }}</p></CardContent>
        </Card>
        <Card>
          <CardHeader class="p-3 pb-1"><CardTitle class="text-xs font-medium text-muted-foreground">Total Pengeluaran</CardTitle></CardHeader>
          <CardContent class="p-3 pt-0"><p class="text-lg font-bold tracking-tight text-red-600">{{ fmtRp(overall.keluar) }}</p></CardContent>
        </Card>
        <Card class="border-primary/30 bg-primary/5">
          <CardHeader class="p-3 pb-1"><CardTitle class="text-xs font-medium text-muted-foreground">Saldo (Masuk - Keluar)</CardTitle></CardHeader>
          <CardContent class="p-3 pt-0"><p class="text-lg font-bold tracking-tight text-primary">{{ fmtRp(overall.saldo) }}</p></CardContent>
        </Card>
      </div>

      <!-- Per-platform breakdown -->
      <div class="grid gap-4 sm:grid-cols-2">
        <Card v-for="p in [{ key: 'meta', label: 'Meta', summary: metaSummary }, { key: 'google', label: 'Google', summary: googleSummary }]" :key="p.key">
          <CardHeader><CardTitle class="text-base">{{ p.label }}</CardTitle></CardHeader>
          <CardContent class="grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-xs text-muted-foreground">Masuk</p>
              <p class="text-sm font-semibold text-emerald-600">{{ fmtRp(p.summary.masuk) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Keluar</p>
              <p class="text-sm font-semibold text-red-600">{{ fmtRp(p.summary.keluar) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Saldo</p>
              <p class="text-sm font-semibold">{{ fmtRp(p.summary.saldo) }}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- Add transaction form -->
    <Card>
      <CardHeader><CardTitle class="text-base">Tambah Transaksi</CardTitle></CardHeader>
      <CardContent>
        <form class="grid gap-3 sm:grid-cols-5 sm:items-end" @submit.prevent="handleSubmit">
          <div class="space-y-1.5">
            <Label class="text-xs">Tanggal</Label>
            <Input v-model="form.date" type="date" :max="today" required />
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">Platform</Label>
            <Select v-model="form.platform">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meta">Meta</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">Jenis</Label>
            <Select v-model="form.type">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Pemasukan</SelectItem>
                <SelectItem value="out">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">Jumlah (Rp)</Label>
            <Input v-model="form.amount" type="number" min="1" step="1" placeholder="0" required />
          </div>
          <div class="space-y-1.5 sm:col-span-1">
            <Label class="text-xs">Catatan (opsional)</Label>
            <Input v-model="form.note" type="text" placeholder="mis. top up saldo" />
          </div>
          <Button type="submit" class="sm:col-span-5 sm:w-auto sm:justify-self-start" :disabled="saving">
            {{ saving ? 'Menyimpan…' : 'Simpan' }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <!-- History -->
    <Card>
      <CardHeader><CardTitle class="text-base">Riwayat Transaksi</CardTitle></CardHeader>
      <CardContent class="p-0">
        <Tabs default-value="all">
          <TabsList class="mx-4 mb-2">
            <TabsTrigger v-for="tab in historyTabs" :key="tab.key" :value="tab.key">{{ tab.label }}</TabsTrigger>
          </TabsList>

          <TabsContent v-for="tab in historyTabs" :key="tab.key" :value="tab.key" class="mt-0">
            <div class="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead v-if="tab.showPlatform">Platform</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead class="text-right">Jumlah</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead class="w-9" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableEmpty v-if="!loading && !tab.rows.length" :colspan="tab.showPlatform ? 6 : 5">
                    Belum ada transaksi {{ tab.key === 'all' ? '' : tab.label }} di rentang tanggal ini.
                  </TableEmpty>
                  <TableRow v-for="t in tab.rows" :key="t.id">
                    <TableCell class="whitespace-nowrap">{{ fmtDate(t.date) }}</TableCell>
                    <TableCell v-if="tab.showPlatform"><Badge variant="outline">{{ platformLabel(t.platform) }}</Badge></TableCell>
                    <TableCell>
                      <Badge :class="t.type === 'in' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'">
                        {{ t.type === 'in' ? 'Masuk' : 'Keluar' }}
                      </Badge>
                    </TableCell>
                    <TableCell class="text-right font-medium" :class="t.type === 'in' ? 'text-emerald-600' : 'text-red-600'">
                      {{ t.type === 'in' ? '+' : '-' }}{{ fmtRp(t.amount) }}
                    </TableCell>
                    <TableCell class="max-w-[200px] truncate text-muted-foreground" :title="t.note">{{ t.note || '—' }}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        class="text-muted-foreground hover:text-red-600 disabled:opacity-50"
                        :disabled="deletingId === t.id"
                        @click="handleDelete(t.id)"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
</template>
