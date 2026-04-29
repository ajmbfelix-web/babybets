import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')! // Updated to match your previous secret name
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

  try {
    // 1. Verify the event actually came from Stripe
    const event = stripe.webhooks.constructEvent(body, signature!, endpointSecret)

    // 2. Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const betId = session.metadata?.bet_id

      if (betId) {
        const { error } = await supabase
          .from('bets')
          .update({ 
            payment_status: 'paid',
            stripe_session_id: session.id 
          })
          .eq('id', betId)

        if (error) throw error
        console.log(`✅ Bet ${betId} successfully marked as PAID`)
      }
    }

    // 3. Handle failed payment
    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      const betId = pi.metadata?.bet_id
      
      if (betId) {
        await supabase.from('bets').update({ payment_status: 'failed' }).eq('id', betId)
        console.log(`❌ Bet ${betId} marked as FAILED`)
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' } 
    })

  } catch (err) {
    console.error(`Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})