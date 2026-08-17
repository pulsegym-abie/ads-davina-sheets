import { supabase } from '@/lib/supabase'

const TABLE = 'saldo_ads_transactions'

export async function fetchTransactions({ from, to } = {}) {
  let query = supabase.from(TABLE).select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function addTransaction({ date, platform, type, amount, note }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ date, platform, type, amount, note: note || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
