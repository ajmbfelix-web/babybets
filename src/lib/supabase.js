import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Pool helpers ────────────────────────────────────────────────
export async function createPool(data) {
  const { data: pool, error } = await supabase
    .from('pools')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return pool
}

export async function getPool(slug) {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getPoolById(id) {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function updatePool(id, updates) {
  const { data, error } = await supabase
    .from('pools')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Bet helpers ─────────────────────────────────────────────────
export async function createBet(data) {
  const { data: bet, error } = await supabase
    .from('bets')
    .insert([data])
    .select()
    .single()
  if (error) throw error
  return bet
}

export async function getBetsForPool(poolId, includePrivate = false) {
  let query = supabase
    .from('bets')
    .select(includePrivate
      ? '*'
      : 'id, pool_id, guessed_date, guessed_hour, guessed_ampm, guessed_minute, guessed_sex, guessed_weight_oz, amount_paid, payment_status, created_at'
    )
    .eq('pool_id', poolId)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateBet(id, updates) {
  const { data, error } = await supabase
    .from('bets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Results helpers ──────────────────────────────────────────────
export async function submitBirthStats(poolId, stats) {
  const { data, error } = await supabase
    .from('pools')
    .update({
      actual_date: stats.date,
      actual_hour: stats.hour,
      actual_ampm: stats.ampm,
      actual_minute: stats.minute,
      actual_sex: stats.sex,
      actual_weight_oz: stats.weightOz,
      status: 'review',
      results_submitted_at: new Date().toISOString(),
    })
    .eq('id', poolId)
    .select()
    .single()
  if (error) throw error
  return data
}
