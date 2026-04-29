import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen, Logo, Card, TrustModal, InfoButton } from '../components/UI'
import { formatCurrency, calcPayouts } from '../lib/finance'
import { ArrowRight, Baby, Shield, Trophy, Zap } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()
  const [showTrust, setShowTrust] = useState(false)
  const demo = calcPayouts(420)

  return (
    <Screen>
      {/* Nav */}
      <div className="pt-6 pb-2 flex items-center justify-between">
        <Logo />
        <InfoButton onClick={() => setShowTrust(true)} />
      </div>

      {/* Hero */}
      <div className="pt-8 pb-6 animate-fade-up">
        <div className="inline-block bg-sage-100 text-sage-600 text-xs font-sans font-medium px-3 py-1.5 rounded-full mb-4 uppercase tracking-widest">
          🍼 A New Way to Celebrate
        </div>
        <h1 className="font-serif text-4xl text-sage-900 leading-tight mb-3">
          The friendliest<br/>
          <em className="italic text-sage-600">baby pool</em> app.
        </h1>
        <p className="text-sage-500 font-sans text-base leading-relaxed mb-6">
          Guess the birthday, time, sex, and weight. Compete with friends and family — with real prizes for the winners and a bonus for the new baby.
        </p>
        <button onClick={() => navigate('/setup')}
          className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4">
          Create a Pool
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Live demo pot */}
      <Card className="mb-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <p className="text-xs font-sans font-semibold text-sage-400 uppercase tracking-widest mb-3">Example: $420 pool</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '👶 Baby Fund', value: demo.parents, highlight: false },
            { label: '🥇 1st Place', value: demo.first, highlight: true },
            { label: '🥈 2nd Place', value: demo.second, highlight: false },
            { label: '🥉 3rd Place', value: demo.third, highlight: false },
          ].map(item => (
            <div key={item.label} className={`rounded-2xl p-3 text-center ${item.highlight ? 'bg-gold-100' : 'bg-cream-100'}`}>
              <p className="text-xs font-sans text-sage-500 mb-0.5">{item.label}</p>
              <p className={`font-serif text-xl font-semibold ${item.highlight ? 'text-gold-500' : 'text-sage-700'}`}>
                {formatCurrency(item.value)}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs font-sans text-sage-300 text-center mt-3">10% platform fee · Remaining goes to baby + prizes</p>
      </Card>

      {/* Features */}
      <div className="space-y-3 mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
        {[
          {
            icon: <Trophy className="w-5 h-5 text-gold-500" />,
            title: 'Real prizes, auto-paid',
            desc: 'Winners are calculated instantly and paid out via Stripe after a 24-hour review period.',
          },
          {
            icon: <Baby className="w-5 h-5 text-sage-500" />,
            title: '50% goes to baby',
            desc: 'Half the net pool is a gift to the new parents — every bet helps the little one.',
          },
          {
            icon: <Shield className="w-5 h-5 text-sage-500" />,
            title: 'Transparent & trusted',
            desc: 'Funds held in Stripe escrow. Clear fee disclosures. No surprises.',
          },
          {
            icon: <Zap className="w-5 h-5 text-blush-400" />,
            title: 'Setup in 2 minutes',
            desc: 'Create your pool, share the link, and start collecting bets immediately.',
          },
        ].map(f => (
          <Card key={f.title} className="flex items-start gap-4 py-4">
            <div className="w-10 h-10 bg-cream-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              {f.icon}
            </div>
            <div>
              <p className="font-sans font-medium text-sage-800 text-sm">{f.title}</p>
              <p className="text-xs font-sans text-sage-400 mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      <button onClick={() => navigate('/setup')}
        className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
        Get Started Free
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-center text-xs font-sans text-sage-300 pb-4">
        <InfoButton onClick={() => setShowTrust(true)} />
      </p>

      {showTrust && <TrustModal onClose={() => setShowTrust(false)} />}
    </Screen>
  )
}
