import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { record } = await req.json()

    // record is the new row from your 'pools' table
    const poolId = record.id
    const slug = record.slug
    const hostEmail = record.parent_email
    const babyName = record.baby_last_name

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'Baby Bets <onboarding@resend.dev>',
        to: [hostEmail],
        subject: `Your Baby Bets Pool is Live! 👶`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2>Congrats! The Baby ${babyName} pool is ready.</h2>
            <p>Your friends and family can now place their bets at the link below:</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <a href="https://babybets.app/pool/${slug}">babybets.app/pool/${slug}</a>
            </div>
            <hr />
            <p><strong>IMPORTANT: Host Controls</strong></p>
            <p>When the baby arrives, use this private link to enter the birth stats and pick the winner:</p>
            <div style="background: #fffbeb; border: 1px dashed #f59e0b; padding: 15px; border-radius: 10px;">
              <a href="https://babybets.app/pool/${slug}?key=${poolId}">Manage & Resolve Pool</a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              Powered by Baby Bets & Flourish Financial
            </p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})