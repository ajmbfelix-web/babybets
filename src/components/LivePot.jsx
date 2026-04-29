import { useMemo, useState } from 'react'
import { calcPayouts, formatCurrency } from '../lib/finance'
import { InfoButton, TrustModal } from './UI'
import clsx from 'clsx'

export function LivePot({ bets, className = '' }) {
  const [showTrust, setShowTrust] = useState(false)

  const stats = useMemo(() => {
    const gross = bets.reduce((sum, b) => sum + (b.amount_paid || 0), 0)
    if (gross === 0) return null
    return { gross, ...calcPayouts(gross), count: bets.length }
  }, [bets])

  if (!stats) return (
    <div className={clsx('bg-sage-50 rounded-3xl p-5 text-center', className)}>
      <p className="text-sage-400 font-sans text-sm">Be the first to place a bet!</p>
    </div>
  )

  return (
    <>
      <div className={clsx('bg-gradient-to-br from-sage-700 to-sage-900 rounded-3xl p-5 text-white', className)}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sage-300 text-xs font-sans font-medium uppercase tracking-widest">Current Pool</p>
            <p className="font-serif text-4xl font-semibold mt-0.5">{formatCurrency(stats.gross)}</p>
            <p className="text-sage-400 text-xs font-sans mt-1">{stats.count} bet{stats.count !== 1 ? 's' : ''} placed</p>
          </div>
          <div className="text-3xl">🎉</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-sage-300 text-xs font-sans">👶 Baby Fund</p>
            <p className="font-serif text-lg font-semibold text-white mt-0.5">{formatCurrency(stats.parents)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-sage-300 text-xs font-sans">🥇 1st Place Prize</p>
            <p className="font-serif text-lg font-semibold text-gold-300 mt-0.5">{formatCurrency(stats.first)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-sage-300 text-xs font-sans">🥈 2nd Place</p>
            <p className="font-serif text-base font-semibold text-white mt-0.5">{formatCurrency(stats.second)}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-sage-300 text-xs font-sans">🥉 3rd Place</p>
            <p className="font-serif text-base font-semibold text-white mt-0.5">{formatCurrency(stats.third)}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <p className="text-sage-400 text-xs font-sans">10% platform fee applied to net</p>
          <button onClick={() => setShowTrust(true)}
            className="text-sage-300 text-xs font-sans underline underline-offset-2 hover:text-white transition-colors">
            How it works
          </button>
        </div>
      </div>

      {showTrust && <TrustModal onClose={() => setShowTrust(false)} />}
    </>
  )
}
