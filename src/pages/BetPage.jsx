import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import Calendar from 'react-calendar'
import { ChevronRight, ChevronLeft, Minus, Plus, Info } from 'lucide-react'
import {
  Screen, Logo, Card, Input, Select, Button, Spinner,
  EmptyState, TrustModal, InfoButton
} from '../components/UI'
import { LivePot } from '../components/LivePot'
import { getPool, getBetsForPool, createBet } from '../lib/supabase'
import {
  calcDatePrice, calcBetTotal, grossUpForStripe,
  formatCurrency, formatDate, formatTime, lbsOzToOz, MIN_BET_PRICE
} from '../lib/finance'
import { loadStripe } from '@stripe/stripe-js'
import clsx from 'clsx'

const STEPS = ['date', 'time', 'addons', 'info', 'checkout']

export default function BetPage() {
  const { slug } = useParams()
  const [pool, setPool]           = useState(null)
  const [bets, setBets]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [step, setStep]           = useState(0)
  const [showTrust, setShowTrust] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(false)

  // Bet state
  const [selectedDate, setSelectedDate] = useState(null)
  const [hour, setHour]     = useState('12')
  const [ampm, setAmpm]     = useState('AM')
  const [minute, setMinute] = useState('30')
  const [sex, setSex]       = useState('')
  const [weightLbs, setWeightLbs] = useState('7')
  const [weightOz, setWeightOz]   = useState('8')
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [phone, setPhone]   = useState('')
  const [errors, setErrors] = useState({})

useEffect(() => {
    async function load() {
      try {
        const p = await getPool(slug)
        
        // --- 3-WEEK LOCKOUT LOGIC ---
        const dueDate = new Date(p.due_date);
        const today = new Date();
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 21) {
          // Send them back to the leaderboard with a flag in the URL
          window.location.href = `/pool/${slug}?locked=true`;
          return;
        }

        setPool(p)
        const b = await getBetsForPool(p.id)
        setBets(b)
      } catch (e) {
        setError('Pool not found')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const datePrice = useMemo(() => {
    if (!selectedDate || !pool) return null
    const iso = selectedDate.toISOString().slice(0, 10)
    return calcDatePrice(iso, pool.due_date, pool.max_price)
  }, [selectedDate, pool])

  const subtotal = useMemo(() => {
    if (!datePrice) return 0
    return calcBetTotal(datePrice, [
      { enabled: pool?.addon_sex && !!sex, price: pool?.addon_sex_price || 0 },
      { enabled: pool?.addon_weight && (!!weightLbs || !!weightOz), price: pool?.addon_weight_price || 0 },
    ])
  }, [datePrice, pool, sex, weightLbs, weightOz])

  const totalWithFee = useMemo(() => grossUpForStripe(subtotal), [subtotal])
  const stripeFee    = useMemo(() => parseFloat((totalWithFee - subtotal).toFixed(2)), [totalWithFee, subtotal])

  const tileDisabled = useCallback(({ date, view }) => {
    if (view !== 'month') return false
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return date < today
  }, [])

  const tileContent = useCallback(({ date, view }) => {
    if (view !== 'month' || !pool) return null
    const iso = date.toISOString().slice(0, 10)
    const p = calcDatePrice(iso, pool.due_date, pool.max_price)
    return (
      <p className="text-[9px] leading-none mt-0.5 text-sage-400 font-sans">
        {formatCurrency(p)}
      </p>
    )
  }, [pool])

  function validate() {
    const e = {}
    if (step === 1) {
      if (!hour) e.hour = 'Required'
      if (!ampm) e.ampm = 'Required'
      if (minute === '' || minute === null) e.minute = 'Required'
    }
    if (step === 3) {
      if (!name.trim()) e.name = 'Required'
      if (!email.trim() || !email.includes('@')) e.email = 'Valid email required'
      if (!phone.trim()) e.phone = 'Required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function nextStep() {
    if (!validate()) return
    setStep(s => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo(0, 0)
  }

  function prevStep() {
    setStep(s => Math.max(s - 1, 0))
    window.scrollTo(0, 0)
  }

  // --- UPDATED CHECKOUT LOGIC ---
  async function handleCheckout() {
    setSubmitting(true)
    setError(null)
    try {
      const iso = selectedDate.toISOString().slice(0, 10)
      
      // 1. Save the bet to Supabase first as "pending"
      const bet = await createBet({
        pool_id:           pool.id,
        bettor_name:       name,
        bettor_email:      email,
        bettor_phone:      phone,
        guessed_date:      iso,
        guessed_hour:      parseInt(hour),
        guessed_ampm:      ampm,
        guessed_minute:    parseInt(minute),
        guessed_sex:       pool.addon_sex && sex ? sex : null,
        guessed_weight_oz: pool.addon_weight && (weightLbs || weightOz)
                           ? lbsOzToOz(weightLbs, weightOz) : null,
        amount_paid:       subtotal,
        total_charged:     totalWithFee,
        payment_status:    'pending',
      })

      // 2. Call your Supabase Edge Function
      const apiUrl = import.meta.env.VITE_API_URL
      const res = await fetch(`${apiUrl}/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          betId: bet.id, 
          poolSlug: slug, 
          successUrl: `${window.location.origin}/success`, 
          cancelUrl: window.location.href 
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create checkout session')
      }


      /// 3. Save the bet ID for the "Handshake" and Redirect to Stripe
      const { url } = await res.json()
      
      // We store this so the Leaderboard knows to show it immediately on return
      localStorage.setItem('pendingBetId', bet.id)

      window.location.href = url

    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Screen><div className="pt-20"><Spinner /></div></Screen>
  if (error && !pool) return <Screen><EmptyState icon="🔍" title="Pool not found" description={error} /></Screen>

  const progressPct = ((step) / (STEPS.length - 1)) * 100

  return (
    <Screen>
      <div className="pt-6 pb-3 flex items-center justify-between">
        <Logo size="sm" />
        <InfoButton onClick={() => setShowTrust(true)} />
      </div>

      <div className="pt-2 pb-5 animate-fade-up">
        <h1 className="font-serif text-2xl text-sage-900">
          Baby {pool.baby_last_name} Pool
        </h1>
        <p className="text-sage-400 font-sans text-sm mt-0.5">
          Due {formatDate(pool.due_date)}
        </p>
      </div>

      <LivePot bets={bets} className="mb-5" />

      <div className="mb-5">
        <div className="flex justify-between mb-1.5">
          {['Date', 'Time', 'Add-ons', 'You', 'Pay'].map((label, i) => (
            <span key={i} className={clsx(
              'text-xs font-sans',
              i <= step ? 'text-sage-600 font-medium' : 'text-sage-300'
            )}>{label}</span>
          ))}
        </div>
        <div className="h-1.5 bg-cream-300 rounded-full overflow-hidden">
          <div className="h-full bg-sage-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {step === 0 && (
        <div className="animate-fade-up">
          <h2 className="section-title mb-1">Pick a date</h2>
          <Card className="mb-4">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileDisabled={tileDisabled}
              tileContent={tileContent}
              minDetail="month"
            />
          </Card>
          <Button onClick={nextStep} disabled={!selectedDate}>Continue → Time</Button>
        </div>
      )}

      {step === 1 && (
        <div className="animate-fade-up">
          <h2 className="section-title mb-1">Pick a time</h2>
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label-text">Hour</label>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => setHour(h => String(Math.max(1, parseInt(h) - 1)))} className="w-9 h-9 rounded-xl bg-cream-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                  <span className="flex-1 text-center font-serif text-2xl">{hour}</span>
                  <button onClick={() => setHour(h => String(Math.min(12, parseInt(h) + 1)))} className="w-9 h-9 rounded-xl bg-cream-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <label className="label-text">AM / PM</label>
                <div className="flex gap-2 mt-1">
                  {['AM', 'PM'].map(v => (
                    <button key={v} onClick={() => setAmpm(v)} className={clsx('flex-1 py-2 rounded-xl', ampm === v ? 'bg-sage-600 text-white' : 'bg-cream-200 text-sage-700')}>{v}</button>
                  ))}
                </div>
              </div>
            </div>
            <label className="label-text">Minute</label>
            <input type="range" min="0" max="59" value={minute} onChange={e => setMinute(e.target.value)} className="w-full accent-sage-600" />
          </Card>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={prevStep}>← Back</Button>
            <Button onClick={nextStep}>Continue →</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-up">
          <h2 className="section-title mb-1">Add-ons</h2>
          {pool.addon_sex && (
            <Card className="mb-3">
              <p className="font-sans font-medium mb-3">Boy or Girl? 🩷💙</p>
              <div className="flex gap-3">
                {[{v:'', l:'Skip'}, {v:'M', l:'Boy'}, {v:'F', l:'Girl'}].map(o => (
                  <button key={o.v} onClick={() => setSex(o.v)} className={clsx('flex-1 py-2 rounded-xl', sex === o.v ? 'bg-sage-600 text-white' : 'bg-cream-100')}>{o.l}</button>
                ))}
              </div>
            </Card>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={prevStep}>← Back</Button>
            <Button onClick={nextStep}>Continue →</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-up">
          <h2 className="section-title mb-1">Your details</h2>
          <Card className="mb-4 space-y-4">
            <Input label="Full name" value={name} onChange={e => setName(e.target.value)} error={errors.name} />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />
            <Input label="Phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} />
          </Card>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={prevStep}>← Back</Button>
            <Button onClick={nextStep}>Review Bet →</Button>
          </div>
        </div>
      )}

{step === 4 && (
  <div className="animate-fade-up">
    <h2 className="section-title mb-1">Review your bet</h2>
    <Card variant="cream" className="mb-4">
      <div className="space-y-3 font-sans">
        {/* Line Items */}
        <div className="flex justify-between text-sm text-sage-600">
          <span>Date & Time Guess ({formatDate(selectedDate)})</span>
          <span>{formatCurrency(datePrice)}</span>
        </div>

        {pool.addon_sex && sex && (
          <div className="flex justify-between text-sm text-sage-600">
            <span>Add-on: Boy/Girl Guess</span>
            <span>{formatCurrency(pool.addon_sex_price)}</span>
          </div>
        )}

        {pool.addon_weight && (weightLbs || weightOz) && (
          <div className="flex justify-between text-sm text-sage-600">
            <span>Add-on: Weight Guess</span>
            <span>{formatCurrency(pool.addon_weight_price)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm text-sage-400 border-t pt-2">
          <span>Processing Fee</span>
          <span>{formatCurrency(stripeFee)}</span>
        </div>

        {/* Final Total */}
        <div className="flex justify-between font-bold text-xl text-sage-900 pt-1">
          <span>Total Amount</span>
          <span>{formatCurrency(totalWithFee)}</span>
        </div>
      </div>
    </Card>

    {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
    
    <div className="flex gap-3">
      <Button variant="secondary" onClick={prevStep}>← Back</Button>
      <Button loading={submitting} onClick={handleCheckout}>Confirm & Pay →</Button>
    </div>
  </div>
)}
      {showTrust && <TrustModal onClose={() => setShowTrust(false)} />}
    </Screen>
  )
}