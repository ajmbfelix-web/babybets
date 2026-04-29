import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Leaderboard = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState(null);
  const [bets, setBets] = useState([]);

  const isSuccess = searchParams.get('success') === 'true';
const isLocked = (() => {
    if (!pool) return false;
    const dueDate = new Date(pool.due_date);
    const today = new Date();
    
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 21; 
  })();
  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        // 1. Fetch Pool and Bets
        const { data, error } = await supabase
          .from('pools')
          .select(`
            *,
            bets (*)
          `)
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setPool(data);

        // 2. THE HANDSHAKE: Get the ID saved in LocalStorage from BetPage
        const pendingBetId = localStorage.getItem('pendingBetId');
        
        // 3. Filter bets: Show officially 'paid' OR the one the user just finished
        const displayedBets = data.bets
          .filter(bet => {
            if (bet.payment_status === 'paid') return true;
            
            // If we just got back from Stripe and IDs match, show it optimistically
            if (isSuccess && String(bet.id) === String(pendingBetId)) return true;
            
            return false;
          })
          .sort((a, b) => new Date(a.guessed_date) - new Date(b.guessed_date));
        
        setBets(displayedBets);

      } catch (err) {
        console.error("Error loading leaderboard:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPoolData();
  }, [slug, isSuccess]);

  if (loading) return <div className="p-10 text-center font-sans text-sage-500">Loading Leaderboard...</div>;
  if (!pool) return <div className="p-10 text-center font-sans">Pool not found.</div>;

  // 4. Rake Math: Calculate the Jackpot (Total Volume - 10%)
  const totalVolume = bets.reduce((sum, bet) => sum + (bet.total_charged || 0), 0);
  const jackpot = totalVolume * 0.90; 

  return (
    <div className="min-h-screen bg-[#FDFCF9] p-4 md:p-8 font-sans text-sage-900">
      <div className="max-w-3xl mx-auto">
        
        {isSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-2xl mb-8 text-center animate-fade-in">
            <span className="text-xl mr-2">🎉</span> 
            <span className="font-medium">Your bet is locked in! Good luck!</span>
          </div>
        )}

        <header className="text-center mb-10">
          <h1 className="text-4xl font-serif text-sage-800 mb-2">
            Baby {pool.baby_last_name}'s Leaderboard
          </h1>
          <p className="text-sage-500 uppercase tracking-widest text-xs font-semibold">
            Due {new Date(pool.due_date).toLocaleDateString()}
          </p>
        </header>

        {/* Jackpot Card */}
        <div className="bg-white border-2 border-sage-100 rounded-3xl p-8 shadow-sm mb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-sage-200" />
          <p className="text-xs uppercase tracking-tighter text-sage-400 mb-2 font-bold">Estimated Jackpot</p>
          <h2 className="text-6xl font-serif text-sage-800">${jackpot.toFixed(2)}</h2>
          <p className="text-[10px] text-sage-300 mt-4 italic">
            *Includes a 10% platform service fee on all entries
          </p>
        </div>
{/* The Big Reveal Banner - Shows only when results are in */}
{pool.status === 'review' && (
  <Card variant="cream" className="mb-8 border-2 border-sage-500 animate-fade-up">
    <div className="text-center py-4">
      <p className="text-xs uppercase tracking-[0.2em] font-bold text-sage-400 mb-2">The Results are In</p>
      <h2 className="font-serif text-3xl text-sage-900 mb-4">
        Welcome to the world, Baby {pool.baby_last_name}!
      </h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6 border-y border-sage-100 py-4">
        <div>
          <p className="text-[10px] uppercase text-sage-400 font-bold">Born On</p>
          <p className="text-sage-800 font-medium">{new Date(pool.actual_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-sage-400 font-bold">At</p>
          <p className="text-sage-800 font-medium">{pool.actual_hour}:{String(pool.actual_minute).padStart(2, '0')} {pool.actual_ampm}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-sage-400 font-bold">Weight</p>
          <p className="text-sage-800 font-medium">
            {Math.floor(pool.actual_weight_oz / 16)}lb {pool.actual_weight_oz % 16}oz
          </p>
        </div>
      </div>

      {bets.find(b => b.rank === 1) && (
        <div className="bg-sage-800 text-white p-4 rounded-xl inline-block">
          <p className="text-xs uppercase opacity-70">The Winner</p>
          <p className="text-xl font-serif">{bets.find(b => b.rank === 1).bettor_name}</p>
        </div>
      )}
    </div>
  </Card>
)}
  {/* The Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-sage-100 overflow-hidden mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sage-50/50">
                <th className="px-6 py-4 text-xs font-bold uppercase text-sage-500 tracking-wider">Player</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-sage-500 tracking-wider text-right">Guess</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {bets.length > 0 ? (
                bets.sort((a, b) => (a.rank === 1 ? -1 : 1)).map((bet) => (
                  <tr key={bet.id} className={`${bet.rank === 1 ? 'bg-sage-50/80' : 'hover:bg-sage-50/30'} transition-colors`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-serif text-lg text-sage-800">{bet.bettor_name}</p>
                        {bet.rank === 1 && (
                          <span className="bg-sage-800 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Winner</span>
                        )}
                      </div>
                      <span className="text-[10px] text-sage-400 uppercase tracking-tighter">Verified Entry</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="text-sage-700 font-medium">
                        {new Date(bet.guessed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-sage-400">
                        {bet.guessed_hour}:{String(bet.guessed_minute).padStart(2, '0')} {bet.guessed_ampm}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="px-6 py-16 text-center text-sage-300 italic font-serif">
                    The pot is empty... for now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Host Controls: Only visible if the URL key matches the Pool ID */}
        {searchParams.get('key') === pool.id && pool.status !== 'review' && (
          <div className="mt-8 mb-8 p-8 border-2 border-dashed border-sage-200 rounded-3xl text-center bg-white/50">
            <p className="text-xs uppercase tracking-widest font-bold text-sage-400 mb-2">Host Controls Unlocked</p>
            <h3 className="font-serif text-xl text-sage-800 mb-4">The baby is here! Ready to pick the winner?</h3>
            <button 
              onClick={() => navigate(`/admin/resolve/${slug}?key=${pool.id}`)}
              className="bg-white border-2 border-sage-800 text-sage-800 px-8 py-3 rounded-xl font-bold hover:bg-sage-800 hover:text-white transition-all shadow-md"
            >
              Enter Birth Results →
            </button>
          </div>
        )}
        
        {/* Place a Bet Section with 3-Week Lockout */}
        <div className="mt-10 text-center">
          {isLocked ? (
            <div className="inline-block bg-sage-50 border border-sage-100 px-8 py-4 rounded-2xl">
              <p className="text-sage-500 font-medium italic">
                🔒 Betting is now closed for this pool (3-week lockout).
              </p>
            </div>
          ) : (
            <button 
              onClick={() => window.location.href = `/bet/${slug}`}
              className="bg-sage-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-sage-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              Place a Bet
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Leaderboard;