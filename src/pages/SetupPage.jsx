import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen, StepHeader, Card, Input, Select, Toggle, Button, Logo } from '../components/UI'
import { createPool } from '../lib/supabase'
import { generateSlug, MIN_BET_PRICE, calcDatePrice, formatCurrency } from '../lib/finance'
import { AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const STEPS = 4

export default function SetupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Step 1 — About
  const [parentName, setParentName] = useState('')
  const [babyLastName, setBabyLastName] = useState('')
  const [email, setEmail] = useState('')

  // Step 2 — Due date + pricing
  const [dueDate, setDueDate] = useState('')
  const [maxPrice, setMaxPrice] = useState(20)

  // Step 3 — Add-ons
  const [addOns, setAddOns] = useState({
    sex:    { enabled: false, price: 5  },
    weight: { enabled: false, price: 5  },
  })

  // Step 4 — Stripe setup note
  const [stripeConnected] = useState(false)

  // ── Validation ──────────────────────────────────────────────────
  function validate() {
    const e = {}
    if (step === 1) {
      if (!parentName.trim()) e.parentName = 'Required'
      if (!babyLastName.trim()) e.babyLastName = 'Required'
      if (!email.trim() || !email.includes('@')) e.email = 'Valid email required'
    }
    if (step === 2) {
      if (!dueDate) e.dueDate = 'Required'
      if (maxPrice < 2) e.maxPrice = 'Minimum is $2.00'
      if (maxPrice > 500) e.maxPrice = 'Maximum is $500.00'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validate()) return
    if (step < STEPS) setStep(s => s + 1)
    else handleSubmit()
  }

  function back() {
    if (step > 1) setStep(s => s - 1)
  }

  // ── Preview pricing ──────────────────────────────────────────────
  function pricePreview(daysAway) {
    return calcDatePrice(
      new Date(Date.now() + daysAway * 86400000).toISOString().slice(0, 10),
      dueDate,
      maxPrice
    )
  }

  // ── Submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    setLoading(true)
    try {
      const slug = generateSlug(babyLastName)
      const pool = await createPool({
        slug,
        parent_name:    parentName,
        baby_last_name: babyLastName,
        parent_email:   email,
        due_date:       dueDate,
        max_price:      parseFloat(maxPrice),
        addon_sex:      addOns.sex.enabled,
        addon_sex_price: addOns.sex.price,
        addon_weight:   addOns.weight.enabled,
        addon_weight_price: addOns.weight.price,
        status:         'open',
        created_at:     new Date().toISOString(),
      })
      navigate(`/pool/${slug}/host?id=${pool.id}`)
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <div className="pt-6 pb-3 flex items-center justify-between">
        <Logo size="sm" />
        {step > 1 && (
          <button onClick={back} className="text-sage-400 font-sans text-sm hover:text-sage-600 transition-colors">
            ← Back
          </button>
        )}
      </div>

      <StepHeader
        step={step} total={STEPS}
        title={[
          "Create your pool",
          "Set the stakes",
          "Add-on questions",
          "Connect payments",
        ][step - 1]}
        subtitle={[
          "Tell us about the little one on the way.",
          "Set your due date and bet pricing.",
          "Optional extra questions add excitement.",
          "Connect Stripe to receive payouts.",
        ][step - 1]}
      />

      {/* ── Step 1 ──────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-up">
          <Card>
            <div className="space-y-4">
              <Input label="Your name" placeholder="e.g. Sarah & Mike Johnson"
                value={parentName} onChange={e => setParentName(e.target.value)}
                error={errors.parentName} />
              <Input label="Baby's last name" placeholder="e.g. Johnson"
                value={babyLastName} onChange={e => setBabyLastName(e.target.value)}
                error={errors.babyLastName}
                hint="Used to generate your pool link." />
              <Input label="Your email" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                error={errors.email}
                hint="For pool management and winner notifications." />
            </div>
          </Card>
        </div>
      )}

      {/* ── Step 2 ──────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-up">
          <Card>
            <div className="space-y-4">
              <Input label="Due date" type="date" value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                error={errors.dueDate} />
              <div>
                <label className="label-text">Max price (for the due date)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-400 font-sans">$</span>
                  <input type="number" min="2" max="500" step="1"
                    value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}
                    className={clsx('input-field pl-8', errors.maxPrice && 'border-blush-400')} />
                </div>
                {errors.maxPrice && <p className="text-xs text-blush-500 mt-1">{errors.maxPrice}</p>}
              </div>
            </div>
          </Card>

          {dueDate && maxPrice >= 2 && (
            <Card variant="cream">
              <p className="text-xs font-sans font-semibold text-sage-500 uppercase tracking-widest mb-3">Pricing Preview</p>
              <div className="space-y-2">
                {[0, 1, 2, 5, 10].map(d => (
                  <div key={d} className="flex items-center justify-between text-sm font-sans">
                    <span className="text-sage-600">{d === 0 ? 'Due date (exact)' : `${d} day${d > 1 ? 's' : ''} away`}</span>
                    <span className="font-medium text-sage-800">{formatCurrency(pricePreview(d))}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-sans border-t border-cream-300 pt-2 mt-2">
                  <span className="text-sage-400">Minimum (any date)</span>
                  <span className="font-medium text-sage-500">{formatCurrency(MIN_BET_PRICE)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Step 3 ──────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-up">
          <Card>
            <div className="space-y-5">
              {/* Sex add-on */}
              <div className="space-y-3">
                <Toggle checked={addOns.sex.enabled}
                  onChange={v => setAddOns(a => ({ ...a, sex: { ...a.sex, enabled: v } }))}
                  label="Boy or Girl? 🩷💙"
                  description="Guests guess the baby's sex as part of their bet slip." />
                {addOns.sex.enabled && (
                  <div className="ml-14 animate-fade-up">
                    <label className="label-text">Price for this question</label>
                    <div className="flex gap-2">
                      {[2, 5, 10].map(p => (
                        <button key={p} onClick={() => setAddOns(a => ({ ...a, sex: { ...a.sex, price: p } }))}
                          className={clsx(
                            'flex-1 py-2 rounded-xl text-sm font-sans font-medium transition-colors',
                            addOns.sex.price === p
                              ? 'bg-sage-600 text-white'
                              : 'bg-cream-200 text-sage-700 hover:bg-cream-300'
                          )}>
                          ${p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-cream-200" />

              {/* Weight add-on */}
              <div className="space-y-3">
                <Toggle checked={addOns.weight.enabled}
                  onChange={v => setAddOns(a => ({ ...a, weight: { ...a.weight, enabled: v } }))}
                  label="Birth weight ⚖️"
                  description="Guests guess the birth weight in lbs + oz." />
                {addOns.weight.enabled && (
                  <div className="ml-14 animate-fade-up">
                    <label className="label-text">Price for this question</label>
                    <div className="flex gap-2">
                      {[2, 5, 10].map(p => (
                        <button key={p} onClick={() => setAddOns(a => ({ ...a, weight: { ...a.weight, price: p } }))}
                          className={clsx(
                            'flex-1 py-2 rounded-xl text-sm font-sans font-medium transition-colors',
                            addOns.weight.price === p
                              ? 'bg-sage-600 text-white'
                              : 'bg-cream-200 text-sage-700 hover:bg-cream-300'
                          )}>
                          ${p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card variant="cream">
            <p className="text-xs font-sans text-sage-500 leading-relaxed">
              <strong className="text-sage-700">Tie-breaker:</strong> Every bet slip automatically includes a "Birth Minute" field (0–59). This is used as the final tie-breaker when multiple guests guess the same date and hour. Closest minute wins.
            </p>
          </Card>
        </div>
      )}

      {/* ── Step 4 ──────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-up">
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blush-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">💳</span>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-sage-800 text-sm">Stripe Connect Required</h3>
                <p className="text-xs font-sans text-sage-400 mt-1 leading-relaxed">
                  To receive automatic payouts, you need to connect a Stripe account. Guests pay at checkout and funds are held in escrow until you confirm the birth.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-sans text-sage-600">
                <span className="w-1.5 h-1.5 bg-sage-400 rounded-full" />
                Instant setup — no banking forms required
              </div>
              <div className="flex items-center gap-2 text-xs font-sans text-sage-600">
                <span className="w-1.5 h-1.5 bg-sage-400 rounded-full" />
                Automatic payouts after 24-hr review
              </div>
              <div className="flex items-center gap-2 text-xs font-sans text-sage-600">
                <span className="w-1.5 h-1.5 bg-sage-400 rounded-full" />
                Processing fee passed to guests
              </div>
            </div>
          </Card>

          <Card variant="sage">
            <div className="flex gap-3">
              <AlertCircle className="w-4 h-4 text-sage-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-sans text-sage-600 leading-relaxed">
                After creating your pool, you'll be redirected to your host dashboard where you can complete Stripe Connect setup. You can still share your pool link immediately.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ── Error ── */}
      {errors.submit && (
        <div className="mt-4 bg-blush-100 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-4 h-4 text-blush-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-sans text-blush-500">{errors.submit}</p>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="mt-6 space-y-3">
        <Button onClick={next} loading={loading}>
          {step === STEPS ? 'Create My Pool →' : 'Continue →'}
        </Button>
        {step === 3 && (
          <Button variant="secondary" onClick={next}>
            Skip add-ons for now
          </Button>
        )}
      </div>
    </Screen>
  )
}
