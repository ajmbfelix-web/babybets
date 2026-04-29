import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, Screen, Button, Input } from '../components/UI';

export default function AdminResolve() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [pool, setPool] = useState(null);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  // Form State (Aligned with your SQL: actual_date, actual_hour, actual_ampm, actual_minute)
  const [actualDate, setActualDate] = useState('');
  const [actualHour, setActualHour] = useState('12');
  const [actualAmpm, setActualAmpm] = useState('AM');
  const [actualMinute, setActualMinute] = useState('0');
  const [actualSex, setActualSex] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [weightOz, setWeightOz] = useState('');

  useEffect(() => {
    async function loadData() {
      const { data: p, error } = await supabase.from('pools').select('*, bets(*)').eq('slug', slug).single();
      if (p) {
        setPool(p);
        setBets(p.bets.filter(b => b.payment_status === 'paid'));
      }
      setLoading(false);
    }
    loadData();
  }, [slug]);

  const handleResolve = async () => {
    setResolving(true);
    const totalWeightOz = (parseInt(weightLbs || 0) * 16) + parseInt(weightOz || 0);
    
    // 1. Convert "Actual" input to a Date object for comparison
    const actualTimeStr = `${actualHour}:${actualMinute} ${actualAmpm}`;
    const actualDateTime = new Date(`${actualDate} ${actualTimeStr}`);
    
    // 2. The Math: Map through paid bets and find the distance
    const scoredBets = bets.map(bet => {
      const guessString = `${bet.guessed_date} ${bet.guessed_hour}:${bet.guessed_minute} ${bet.guessed_ampm}`;
      const guessedDateTime = new Date(guessString);
      
      const minuteDiff = Math.abs(actualDateTime - guessedDateTime) / (1000 * 60);
      const weightDiff = Math.abs((bet.guessed_weight_oz || 0) - totalWeightOz);
      const sexCorrect = bet.guessed_sex === actualSex;

      return { ...bet, minuteDiff, weightDiff, sexCorrect };
    });

    // Sort by: 1. Minutes (closest) 2. Sex Tie-breaker 3. Weight Tie-breaker
    const sorted = scoredBets.sort((a, b) => {
      if (a.minuteDiff !== b.minuteDiff) return a.minuteDiff - b.minuteDiff;
      if (a.sexCorrect !== b.sexCorrect) return b.sexCorrect - a.sexCorrect;
      return a.weightDiff - b.weightDiff;
    });

    const winner = sorted[0];

    try {
      // 3. Update the Pool table using your EXACT SQL columns
      const { error } = await supabase
        .from('pools')
        .update({
          actual_date: actualDate,
          actual_hour: parseInt(actualHour),
          actual_ampm: actualAmpm,
          actual_minute: parseInt(actualMinute),
          actual_sex: actualSex,
          actual_weight_oz: totalWeightOz,
          status: 'review', // Moving to 'review' status as per your CHECK constraint
          results_submitted_at: new Date().toISOString()
        })
        .eq('id', pool.id);

      if (error) throw error;
      
      // 4. Update the Winning Bet with its Rank and Prize
      // (Pot calculation: Total Volume * 0.90 rake)
      const totalVolume = bets.reduce((sum, b) => sum + (b.total_charged || 0), 0);
      const prize = totalVolume * 0.90;

      await supabase
        .from('bets')
        .update({ rank: 1, prize_amount: prize })
        .eq('id', winner.id);

      alert(`Winner identified: ${winner.bettor_name}! Pot: $${prize.toFixed(2)}`);
      navigate(`/pool/${slug}`); 
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setResolving(false);
    }
  };

  if (loading) return <Screen><div className="pt-20 text-center font-serif">Loading Pool Data...</div></Screen>;

  return (
    <Screen>
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-serif mb-6 text-sage-900 text-center">Resolve Pool</h1>
        
        <Card className="space-y-6">
          <Input label="Birth Date" type="date" value={actualDate} onChange={e => setActualDate(e.target.value)} />
          
          <div className="grid grid-cols-3 gap-2">
             <Input label="Hour" type="number" min="1" max="12" value={actualHour} onChange={e => setActualHour(e.target.value)} />
             <Input label="Min" type="number" min="0" max="59" value={actualMinute} onChange={e => setActualMinute(e.target.value)} />
             <div>
                <label className="text-xs font-bold text-sage-400 uppercase">AM/PM</label>
                <select value={actualAmpm} onChange={e => setActualAmpm(e.target.value)} className="w-full mt-1 p-3 bg-cream-50 border border-cream-200 rounded-xl">
                  <option>AM</option>
                  <option>PM</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-sage-400">Sex</label>
              <select value={actualSex} onChange={e => setActualSex(e.target.value)} className="w-full mt-1 p-3 bg-cream-50 border border-cream-200 rounded-xl">
                <option value="">Select...</option>
                <option value="M">Boy</option>
                <option value="F">Girl</option>
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <Input label="Lbs" type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} />
              <Input label="Oz" type="number" value={weightOz} onChange={e => setWeightOz(e.target.value)} />
            </div>
          </div>

          <Button loading={resolving} onClick={handleResolve} className="w-full py-4 text-lg bg-sage-800">
            Finalize Winner →
          </Button>
        </Card>
      </div>
    </Screen>
  );
}