// ─── Constants ───────────────────────────────────────────────────
export const PLATFORM_FEE_RATE = 0.10      // 10% gross fee
export const STRIPE_RATE       = 0.029     // 2.9%
export const STRIPE_FIXED      = 0.30      // 30¢
export const MIN_BET_PRICE     = 2.00      // $2 floor

// Payout split (of NET pool after platform fee)
export const SPLIT = {
  parents: 0.50,
  first:   0.25,
  second:  0.1666,
  third:   0.0834,   // adjusted so total = 100%
}

// ─── Bet Pricing ─────────────────────────────────────────────────

/**
 * Calculate cost for a given date relative to due date.
 * Decay: -10% of maxPrice per day away, floor at $2.
 */
export function calcDatePrice(selectedDate, dueDate, maxPrice) {
  const sel = new Date(selectedDate)
  const due = new Date(dueDate)
  sel.setHours(12, 0, 0, 0)
  due.setHours(12, 0, 0, 0)
  const daysAway = Math.round(Math.abs((sel - due) / 86400000))
  const decayPerDay = maxPrice * 0.10
  return Math.max(MIN_BET_PRICE, parseFloat((maxPrice - daysAway * decayPerDay).toFixed(2)))
}

/**
 * Compute total bet amount including add-ons.
 */
export function calcBetTotal(datePriceBase, addOns) {
  const addOnTotal = addOns.reduce((sum, a) => sum + (a.enabled ? a.price : 0), 0)
  return parseFloat((datePriceBase + addOnTotal).toFixed(2))
}

/**
 * Gross up so guest pays Stripe fee.
 * guest_pays = (subtotal + 0.30) / (1 - 0.029)
 */
export function grossUpForStripe(subtotal) {
  return parseFloat(((subtotal + STRIPE_FIXED) / (1 - STRIPE_RATE)).toFixed(2))
}

/**
 * Platform fee on total collected (10%).
 */
export function platformFee(grossTotal) {
  return parseFloat((grossTotal * PLATFORM_FEE_RATE).toFixed(2))
}

/**
 * Full payout breakdown from gross total.
 */
export function calcPayouts(grossTotal) {
  const fee  = platformFee(grossTotal)
  const net  = parseFloat((grossTotal - fee).toFixed(2))
  const raw  = {
    parents: parseFloat((net * SPLIT.parents).toFixed(2)),
    first:   parseFloat((net * SPLIT.first).toFixed(2)),
    second:  parseFloat((net * SPLIT.second).toFixed(2)),
    third:   parseFloat((net * SPLIT.third).toFixed(2)),
  }
  // Rounding correction — add leftover cents to first
  const distributed = raw.parents + raw.first + raw.second + raw.third
  const leftover = parseFloat((net - distributed).toFixed(2))
  raw.first = parseFloat((raw.first + leftover).toFixed(2))
  return { grossTotal, fee, net, ...raw }
}

// ─── Winner Scoring ───────────────────────────────────────────────

/**
 * Score a single bet against actual birth stats.
 * Lower is better.
 * Primary: absolute day difference
 * Secondary: absolute hour difference (0-23)
 * Tiebreaker: absolute minute difference
 * Add-on bonuses: correct sex = -0.0001, correct weight = -0.0001
 */
export function scoreBet(bet, actual) {
  const betDate    = new Date(bet.guessed_date)
  const actualDate = new Date(actual.actual_date)
  betDate.setHours(12, 0, 0, 0)
  actualDate.setHours(12, 0, 0, 0)
  const dayDiff  = Math.abs((betDate - actualDate) / 86400000)

  const betHour24    = to24h(parseInt(bet.guessed_hour), bet.guessed_ampm)
  const actualHour24 = to24h(parseInt(actual.actual_hour), actual.actual_ampm)
  const hourDiff = Math.abs(betHour24 - actualHour24)

  const minDiff  = Math.abs(parseInt(bet.guessed_minute) - parseInt(actual.actual_minute))

  let addOnBonus = 0
  if (actual.actual_sex && bet.guessed_sex && bet.guessed_sex === actual.actual_sex) addOnBonus -= 0.00001
  if (actual.actual_weight_oz && bet.guessed_weight_oz) {
    const wDiff = Math.abs(parseInt(bet.guessed_weight_oz) - parseInt(actual.actual_weight_oz))
    if (wDiff === 0) addOnBonus -= 0.00001
  }

  return dayDiff * 10000 + hourDiff * 100 + minDiff + addOnBonus
}

export function to24h(hour, ampm) {
  if (!ampm) return hour
  if (ampm === 'AM') return hour === 12 ? 0 : hour
  return hour === 12 ? 12 : hour + 12
}

/**
 * Rank bets and return top 3 + their prizes.
 */
export function rankBets(bets, actual, grossTotal) {
  const payouts = calcPayouts(grossTotal)
  const scored  = bets
    .map(b => ({ ...b, score: scoreBet(b, actual) }))
    .sort((a, b) => a.score - b.score)

  const result = scored.map((b, i) => ({
    ...b,
    rank:  i + 1,
    prize: i === 0 ? payouts.first : i === 1 ? payouts.second : i === 2 ? payouts.third : 0,
  }))

  return { ranked: result, payouts }
}

// ─── Formatting helpers ───────────────────────────────────────────
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatTime(hour, ampm) {
  if (!hour || !ampm) return ''
  return `${hour}:00 ${ampm}`
}

export function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30) + '-' + Math.random().toString(36).slice(2, 7)
}

export function ozToDisplay(oz) {
  if (!oz) return ''
  const lbs = Math.floor(oz / 16)
  const rem = oz % 16
  return `${lbs} lbs ${rem} oz`
}

export function lbsOzToOz(lbs, oz) {
  return parseInt(lbs || 0) * 16 + parseInt(oz || 0)
}
