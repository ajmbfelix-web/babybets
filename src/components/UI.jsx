import { useState } from 'react'
import { ChevronDown, Info, X } from 'lucide-react'
import { formatCurrency } from '../lib/finance'
import clsx from 'clsx'

// ─── Logo ─────────────────────────────────────────────────────────
export function Logo({ size = 'md' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }
  return (
    <div className={clsx('font-serif font-semibold text-sage-700 flex items-center gap-2', sizes[size])}>
      <span className="text-2xl">🍼</span>
      <span>Baby <em className="font-normal italic text-sage-500">Bets</em></span>
    </div>
  )
}

// ─── Screen wrapper ───────────────────────────────────────────────
export function Screen({ children, className = '' }) {
  return (
    <div className={clsx('min-h-screen bg-cream-100 grain', className)}>
      <div className="max-w-md mx-auto px-4 pb-16">
        {children}
      </div>
    </div>
  )
}

// ─── Step header ─────────────────────────────────────────────────
export function StepHeader({ step, total, title, subtitle }) {
  return (
    <div className="pt-8 pb-6 animate-fade-up">
      {step && total && (
        <div className="flex gap-1 mb-4">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={clsx('h-1 flex-1 rounded-full transition-colors duration-300',
              i < step ? 'bg-sage-500' : 'bg-cream-300')} />
          ))}
        </div>
      )}
      <p className="text-xs font-sans font-medium text-sage-400 uppercase tracking-widest mb-1">
        {step && total ? `Step ${step} of ${total}` : ''}
      </p>
      <h1 className="section-title">{title}</h1>
      {subtitle && <p className="text-sage-500 font-sans text-sm mt-1">{subtitle}</p>}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────
export function Card({ children, className = '', variant = 'white' }) {
  const variants = {
    white: 'bg-white shadow-card',
    cream: 'bg-cream-100',
    sage:  'bg-sage-50',
  }
  return (
    <div className={clsx('rounded-3xl p-5', variants[variant], className)}>
      {children}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────
export function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && <label className="label-text">{label}</label>}
      <input {...props} className={clsx(
        'input-field',
        error ? 'border-blush-400 focus:ring-blush-300' : ''
      )} />
      {error && <p className="text-xs text-blush-500 font-sans">{error}</p>}
      {hint && !error && <p className="text-xs text-sage-400 font-sans">{hint}</p>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────
export function Select({ label, error, options, className = '', ...props }) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && <label className="label-text">{label}</label>}
      <div className="relative">
        <select {...props} className={clsx(
          'input-field appearance-none pr-10 cursor-pointer',
          error ? 'border-blush-400' : ''
        )}>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-blush-500 font-sans">{error}</p>}
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={clsx('flex items-start gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          disabled={disabled} className="sr-only" />
        <div className={clsx(
          'w-11 h-6 rounded-full transition-colors duration-200',
          checked ? 'bg-sage-500' : 'bg-cream-300'
        )}>
          <div className={clsx(
            'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200',
            checked ? 'left-6' : 'left-1'
          )} />
        </div>
      </div>
      <div>
        <p className="font-sans font-medium text-sage-800 text-sm">{label}</p>
        {description && <p className="font-sans text-xs text-sage-400 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

// ─── Button ───────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', loading, className = '', ...props }) {
  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    danger:    'bg-blush-100 text-blush-500 font-sans font-medium px-6 py-3 rounded-2xl hover:bg-blush-200 transition-colors active:scale-95',
  }
  return (
    <button {...props} className={clsx(variants[variant], 'w-full flex items-center justify-center gap-2', className)}>
      {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

// ─── Prize Display ────────────────────────────────────────────────
export function PrizeBar({ payouts }) {
  if (!payouts) return null
  const items = [
    { label: '👶 Baby Fund', amount: payouts.parents, color: 'bg-sage-100 text-sage-700' },
    { label: '🥇 1st Place', amount: payouts.first,   color: 'bg-gold-100 text-gold-500' },
    { label: '🥈 2nd Place', amount: payouts.second,  color: 'bg-cream-200 text-sage-600' },
    { label: '🥉 3rd Place', amount: payouts.third,   color: 'bg-cream-100 text-sage-500' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(item => (
        <div key={item.label} className={clsx('rounded-2xl p-3 text-center', item.color)}>
          <p className="text-xs font-sans font-medium">{item.label}</p>
          <p className="text-lg font-serif font-semibold mt-0.5">{formatCurrency(item.amount)}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Trust Block Modal ────────────────────────────────────────────
export function TrustModal({ onClose }) {
  const splitData = [
    { label: 'Platform Fee (10%)', color: '#a8c2a8', pct: 10 },
    { label: 'Baby Fund (50%)', color: '#5a835a', pct: 50 },
    { label: '1st Place (25%)', color: '#f0a500', pct: 25 },
    { label: '2nd Place (16.66%)', color: '#d4b494', pct: 16.66 },
    { label: '3rd Place (8.33%)', color: '#ecdfc9', pct: 8.33 },
  ]
  return (
    <div className="fixed inset-0 bg-sage-900/60 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl text-sage-900">How Payouts Work</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center hover:bg-cream-300 transition-colors">
            <X className="w-4 h-4 text-sage-600" />
          </button>
        </div>

        <section className="mb-5">
          <h3 className="font-sans font-semibold text-sage-700 text-sm mb-2">💰 The Split</h3>
          <div className="space-y-2">
            {/* Visual bar */}
            <div className="flex h-8 rounded-xl overflow-hidden w-full">
              {splitData.map(s => (
                <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                  className="transition-all" title={s.label} />
              ))}
            </div>
            <div className="space-y-1">
              {splitData.map(s => (
                <div key={s.label} className="flex items-center gap-2 text-xs font-sans text-sage-600">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-5 space-y-3">
          <div className="bg-cream-100 rounded-2xl p-4">
            <h3 className="font-sans font-semibold text-sage-700 text-sm mb-1">🔒 Platform Fee</h3>
            <p className="text-xs font-sans text-sage-500 leading-relaxed">
              A 10% fee is deducted from the gross pool to support hosting, automated payout technology, and platform maintenance. This fee is deducted before any prize calculations.
            </p>
          </div>
          <div className="bg-cream-100 rounded-2xl p-4">
            <h3 className="font-sans font-semibold text-sage-700 text-sm mb-1">🏦 Escrow & Security</h3>
            <p className="text-xs font-sans text-sage-500 leading-relaxed">
              All funds are held securely via Stripe's escrow system until the parent confirms the actual birth details. Payouts are processed automatically after the 24-hour review period.
            </p>
          </div>
          <div className="bg-cream-100 rounded-2xl p-4">
            <h3 className="font-sans font-semibold text-sage-700 text-sm mb-1">💳 Payment Processing</h3>
            <p className="text-xs font-sans text-sage-500 leading-relaxed">
              A credit card processing fee (~2.9% + 30¢) is added to your bet total at checkout. This ensures the full bet amount enters the prize pool.
            </p>
          </div>
        </section>

        <section className="bg-sage-50 rounded-2xl p-4 border border-sage-100">
          <h3 className="font-sans font-semibold text-sage-700 text-sm mb-1">⚖️ Social Gaming Disclosure</h3>
          <p className="text-xs font-sans text-sage-500 leading-relaxed">
            Baby Bets is a social gaming platform designed for friendly, celebratory competition among friends and family. The platform is a neutral third party and does not make judgments on outcomes. Participation should be in the spirit of fun and celebration. Please play responsibly.
          </p>
        </section>

        <button onClick={onClose} className="btn-primary w-full mt-5 text-sm">Got it</button>
      </div>
    </div>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────
export function InfoButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-sage-400 hover:text-sage-600 transition-colors font-sans underline underline-offset-2">
      <Info className="w-3 h-3" />
      How payouts work
    </button>
  )
}

// ─── Loading spinner ──────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex items-center justify-center p-8">
      <div className={clsx(sizes[size], 'border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin')} />
    </div>
  )
}

// ─── Empty / error states ─────────────────────────────────────────
export function EmptyState({ icon, title, description }) {
  return (
    <div className="text-center py-12 animate-fade-in">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-serif text-lg text-sage-700 mb-1">{title}</h3>
      <p className="text-sm font-sans text-sage-400">{description}</p>
    </div>
  )
}
