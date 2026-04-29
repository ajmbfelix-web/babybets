import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')! // Note: using the renamed key we set earlier
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

try {
    const { betId, poolSlug } = await req.json()

    // 1. Fetch the bet and the associated pool
    const { data: bet, error: betErr } = await supabase
      .from('bets')
      .select('*, pools(*)')
      .eq('id', betId)
      .single()

    if (betErr || !bet) throw new Error('Bet not found')

    const pool = bet.pools

    // 2. The Rake Logic (Subtracting 10% from the total)
    const totalUserPays = bet.total_charged; // e.g., $25.00
    const platformFee = totalUserPays * 0.10; // e.g., $2.50
    const netToPot = totalUserPays - platformFee; // e.g., $22.50
    
    const amountCents = Math.round(totalUserPays * 100);

// Use the origin header or fallback to localhost during development
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // 3. Create the Stripe Session with Dynamic Redirects
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Baby ${pool.baby_last_name} Pool Entry`,
            description: `Bet for ${bet.guessed_date}. ($${netToPot.toFixed(2)} added to the jackpot after service fee)`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      // We use pool.slug here because that's what your frontend routing expects
      success_url: `${origin}/pool/${pool.slug}?success=true`,
      cancel_url: `${origin}/pool/${pool.slug}`,
      metadata: {
        bet_id: betId,
        pool_id: pool.id,
        rake_amount: platformFee.toFixed(2),
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})