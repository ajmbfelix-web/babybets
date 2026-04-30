import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Share2, Copy, Check, ExternalLink, Trophy, Baby, Clock } from 'lucide-react'
import { Screen, Logo, Card, Button, Spinner, EmptyState, TrustModal } from '../components/UI'
import { LivePot } from '../components/LivePot'
import { getBetsForPool, getPoolById, submitBirthStats, updatePool } from '../lib/supabase'
import { rankBets, calcPayouts, formatCurrency, formatDate, formatTime, ozToDisplay } from '../lib/finance'
import clsx from 'clsx'

export default function HostPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const poolId = searchParams.get('id')

  const [pool, setPool]         = useState(null)
  const [bets, setBets]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)
  const [showTrust, setShowTrust] = useState(false)
  const [tab, setTab]           = useState('overview') // overview | bets | results

  // Birth stats entry
  const [showBirthForm, setShowBirthForm] = useState(false)
  const [birth, setBirth] = useState({ date: '', hour: '12', ampm: 'AM', minute: '0', sex: '', lbs: '', oz: '' })
  const [submitting, setSubmitting] = useState(false)

useEffect(() => {
    async function load() {
      try {
        // 1. You MUST fetch the pool first so the UI knows the baby's name/details
        const p = await getPoolById(poolId);
        setPool(p);

        // 2. Then fetch the bets
        const { data: b, error: betError } = await supabase
          .from('bets')
          .select('*')
          .eq('pool_id', poolId);

        if (betError) console.error("Bet fetch error:", betError);
        setBets(b || []);
        
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    if (poolId) load();
  }, [poolId]);

  const shareUrl = `${window.location.origin}/pool/${slug}`
  const guestUrl = `${window.location.origin}/bet/${slug}`

  const grossTotal = useMemo(() => bets.reduce((s, b) => s + (b.amount_paid || 0), 0), [bets])
  const payouts    = useMemo(() => grossTotal > 0 ? calcPayouts(grossTotal) : null, [grossTotal])
  const leaderboard = useMemo(() => {
    if (!pool?.actual_date || bets.length === 0) return null
    return rankBets(bets, pool, grossTotal)
  }, [pool, bets, grossTotal])

  async function copyLink() {
    await navigator.clipboard.writeText(guestUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleBirthSubmit() {
    setSubmitting(true)
    try {
      const updated = await submitBirthStats(poolId, {
        date:      birth.date,
        hour:      birth.hour,
        ampm:      birth.ampm,
        minute:    birth.minute,
        sex:       birth.sex,
        weightOz:  birth.lbs || birth.oz ? (parseInt(birth.lbs || 0) * 16 + parseInt(birth.oz || 0)) : null,
      })
      setPool(updated)
      setShowBirthForm(false)
      setTab('results')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmPayouts() {
    await updatePool(poolId, { status: 'paid', paid_at: new Date().toISOString() })
    const p = await getPoolById(poolId)
    setPool(p)
  }

  if (loading) return <Screen><div className="pt-20"><Spinner /></div></Screen>
  if (!pool) return <Screen><EmptyState icon="🔍" title="Pool not found" description="Check your link." /></Screen>

  const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))
  const MIN_OPTIONS  = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, '0') }))

  return (
    <Screen>
      <div className="pt-6 pb-3 flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <span className={clsx(
            'text-xs font-sans font-medium px-3 py-1 rounded-full',
            pool.status === 'open'   ? 'bg-sage-100 text-sage-600' :
            pool.status === 'review' ? 'bg-gold-100 text-gold-500' :
            'bg-cream-200 text-sage-500'
          )}>
            {pool.status === 'open' ? '🟢 Open' : pool.status === 'review' ? '⏳ In Review' : '✅ Settled'}
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="pt-4 pb-6 animate-fade-up">
        <p className="text-xs font-sans text-sage-400 uppercase tracking-widest mb-1">Host Dashboard</p>
        <h1 className="font-serif text-3xl text-sage-900">
          Baby {pool.baby_last_name}
        </h1>
        <p className="text-sage-500 font-sans text-sm mt-1">
          Due {formatDate(pool.due_date)} · Max bet {formatCurrency(pool.max_price)}
        </p>
      </div>

      {/* Share bar */}
      <Card className="mb-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <p className="text-xs font-sans font-medium text-sage-500 mb-2">Share with guests</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-cream-100 rounded-xl px-3 py-2 text-xs font-sans text-sage-600 truncate">
            {guestUrl}
          </div>
          <button onClick={copyLink}
            className={clsx(
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-sans font-medium transition-all',
              copied ? 'bg-sage-100 text-sage-600' : 'bg-sage-600 text-white hover:bg-sage-700'
            )}>
            {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream-200 rounded-2xl p-1 mb-4">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'bets',     label: `Bets (${bets.length})` },
          { id: 'results',  label: 'Results' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              'flex-1 py-2 rounded-xl text-sm font-sans font-medium transition-all',
              tab === t.id ? 'bg-white text-sage-800 shadow-soft' : 'text-sage-500 hover:text-sage-700'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          <LivePot bets={bets} />

          {payouts && (
            <Card variant="cream">
              <p className="text-xs font-sans font-semibold text-sage-500 uppercase tracking-widest mb-3">Payout Breakdown</p>
              <div className="space-y-2">
                {[
                  { label: 'Gross collected', value: formatCurrency(payouts.grossTotal), bold: false },
                  { label: '− Platform fee (10%)', value: `−${formatCurrency(payouts.fee)}`, bold: false, muted: true },
                  { label: 'Net pool', value: formatCurrency(payouts.net), bold: true },
                  { label: '👶 Baby Fund (50%)', value: formatCurrency(payouts.parents), bold: false },
                  { label: '🥇 1st Place (25%)', value: formatCurrency(payouts.first), bold: false },
                  { label: '🥈 2nd Place (16.66%)', value: formatCurrency(payouts.second), bold: false },
                  { label: '🥉 3rd Place (8.33%)', value: formatCurrency(payouts.third), bold: false },
                ].map(row => (
                  <div key={row.label} className={clsx('flex justify-between text-sm font-sans',
                    row.bold ? 'font-semibold text-sage-800 border-t border-cream-300 pt-2 mt-1' : '',
                    row.muted ? 'text-sage-400' : 'text-sage-600'
                  )}>
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {pool.status === 'open' && (
            <Button onClick={() => setShowBirthForm(true)}>
              🎉 Enter Birth Stats
            </Button>
          )}

          {pool.status === 'review' && (
            <Card className="border-2 border-gold-300">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-sans font-semibold text-sage-800 text-sm">24-Hour Review Period</h3>
                  <p className="text-xs font-sans text-sage-500 mt-1 leading-relaxed">
                    Birth stats submitted. Winners have been calculated. Review the leaderboard, then confirm payouts after 24 hours.
                  </p>
                  <Button className="mt-3" onClick={confirmPayouts}>
                    Confirm Payouts →
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Bets Tab ─────────────────────────────────────────────── */}
      {tab === 'bets' && (
        <div className="space-y-3 animate-fade-in">
          {bets.length === 0
            ? <EmptyState icon="🎲" title="No bets yet" description="Share your pool link to start collecting bets." />
            : bets.map((bet, i) => (
              <Card key={bet.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans font-medium text-sage-800 text-sm">{bet.bettor_name}</p>
                    <p className="text-xs font-sans text-sage-400 mt-0.5">
                      {formatDate(bet.guessed_date)} · {bet.guessed_hour} {bet.guessed_ampm} · :{String(bet.guessed_minute).padStart(2, '0')}
                    </p>
                    {bet.guessed_sex && <p className="text-xs font-sans text-sage-400">{bet.guessed_sex === 'M' ? '💙 Boy' : '🩷 Girl'}</p>}
                    {bet.guessed_weight_oz && <p className="text-xs font-sans text-sage-400">⚖️ {ozToDisplay(bet.guessed_weight_oz)}</p>}
                  </div>
                  <span className="font-serif font-semibold text-sage-700 text-sm">{formatCurrency(bet.amount_paid)}</span>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* ── Results Tab ──────────────────────────────────────────── */}
      {tab === 'results' && (
        <div className="space-y-4 animate-fade-in">
          {!pool.actual_date
            ? (
              <EmptyState icon="👶"
                title="Birth not yet recorded"
                description="Submit birth stats from the Overview tab once baby arrives!" />
            )
            : (
              <>
                <Card variant="sage">
                  <p className="text-xs font-sans font-semibold text-sage-500 uppercase tracking-widest mb-3">Actual Birth</p>
                  <div className="grid grid-cols-2 gap-2 text-sm font-sans">
                    <div><span className="text-sage-400">Date</span><p className="font-medium text-sage-800">{formatDate(pool.actual_date)}</p></div>
                    <div><span className="text-sage-400">Time</span><p className="font-medium text-sage-800">{pool.actual_hour}:{String(pool.actual_minute).padStart(2,'0')} {pool.actual_ampm}</p></div>
                    {pool.actual_sex && <div><span className="text-sage-400">Sex</span><p className="font-medium text-sage-800">{pool.actual_sex === 'M' ? '💙 Boy' : '🩷 Girl'}</p></div>}
                    {pool.actual_weight_oz && <div><span className="text-sage-400">Weight</span><p className="font-medium text-sage-800">{ozToDisplay(pool.actual_weight_oz)}</p></div>}
                  </div>
                </Card>

                {leaderboard && (
                  <>
                    <p className="text-xs font-sans font-semibold text-sage-500 uppercase tracking-widest">🏆 Leaderboard</p>
                    {leaderboard.ranked.slice(0, 10).map((bet, i) => (
                      <Card key={bet.id} className={clsx(i === 0 ? 'border-2 border-gold-300' : '')}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                            <div>
                              <p className="font-sans font-medium text-sage-800 text-sm">{bet.bettor_name}</p>
                              <p className="text-xs font-sans text-sage-400 mt-0.5">
                                {formatDate(bet.guessed_date)} · {bet.guessed_hour} {bet.guessed_ampm} · :{String(bet.guessed_minute).padStart(2, '0')}
                              </p>
                            </div>
                          </div>
                          {bet.prize > 0 && (
                            <div className="text-right">
                              <p className="font-serif font-semibold text-sage-700">{formatCurrency(bet.prize)}</p>
                              <p className="text-xs text-sage-400 font-sans">Prize</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </>
            )
          }
        </div>
      )}

      {/* ── Birth Stats Modal ─────────────────────────────────────── */}
      {showBirthForm && (
        <div className="fixed inset-0 bg-sage-900/60 z-50 flex items-end justify-center animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-fade-up space-y-4">
            <h2 className="font-serif text-xl text-sage-900">🎉 Enter Birth Stats</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label-text">Birth date</label>
                <input type="date" value={birth.date}
                  onChange={e => setBirth(b => ({ ...b, date: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="label-text">Hour</label>
                <select value={birth.hour} onChange={e => setBirth(b => ({ ...b, hour: e.target.value }))}
                  className="input-field">
                  {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">AM/PM</label>
                <select value={birth.ampm} onChange={e => setBirth(b => ({ ...b, ampm: e.target.value }))} className="input-field">
                  <option>AM</option><option>PM</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label-text">Minute (0–59)</label>
                <select value={birth.minute} onChange={e => setBirth(b => ({ ...b, minute: e.target.value }))} className="input-field">
                  {MIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {pool.addon_sex && (
                <div className="col-span-2">
                  <label className="label-text">Sex</label>
                  <select value={birth.sex} onChange={e => setBirth(b => ({ ...b, sex: e.target.value }))} className="input-field">
                    <option value="">Select</option>
                    <option value="M">Boy 💙</option>
                    <option value="F">Girl 🩷</option>
                  </select>
                </div>
              )}
              {pool.addon_weight && (
                <>
                  <div>
                    <label className="label-text">Weight (lbs)</label>
                    <input type="number" min="0" max="15" value={birth.lbs}
                      onChange={e => setBirth(b => ({ ...b, lbs: e.target.value }))} className="input-field" />
                  </div>
                  <div>
                    <label className="label-text">Weight (oz)</label>
                    <input type="number" min="0" max="15" value={birth.oz}
                      onChange={e => setBirth(b => ({ ...b, oz: e.target.value }))} className="input-field" />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowBirthForm(false)}>Cancel</Button>
              <Button loading={submitting} onClick={handleBirthSubmit}>Submit →</Button>
            </div>
          </div>
        </div>
      )}

      {showTrust && <TrustModal onClose={() => setShowTrust(false)} />}
    </Screen>
  )
}
