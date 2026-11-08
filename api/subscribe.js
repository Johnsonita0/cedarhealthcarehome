import { getResendConfig, getSupabaseConfig, insertRow, isHoneypotFilled, renderBrandedEmail, sendEmail, sendJson, validEmail } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (isHoneypotFilled(body)) return sendJson(res, 200, { ok: true, emailSent: true })
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!validEmail(email)) return sendJson(res, 400, { error: 'Please enter a valid email address.' })

  const { config: supabase, missing: missingSupabase } = getSupabaseConfig()
  if (missingSupabase.length) {
    console.error('Newsletter Supabase configuration is incomplete:', missingSupabase.join(', '))
    return sendJson(res, 503, { error: 'Subscriptions are not available right now. Please try again later.' })
  }

  try {
    await insertRow(supabase, 'newsletter_subscribers', { email }, {
      query: '?on_conflict=email',
      prefer: 'resolution=ignore-duplicates,return=minimal',
    })
  } catch (error) {
    console.error('Unable to save newsletter subscription:', error)
    return sendJson(res, 502, { error: 'We could not save your subscription. Please try again later.' })
  }

  const { config: resend, missing: missingResend } = getResendConfig()
  if (missingResend.length) {
    console.error('Newsletter email configuration is incomplete:', missingResend.join(', '))
    return sendJson(res, 200, { ok: true, emailSent: false })
  }

  const emailSent = await sendEmail(resend, {
    to: email,
    subject: 'Welcome to Cedar Healthcare',
    html: renderBrandedEmail({
      preheader: 'Thoughtful care tips and occasional updates from Cedar.',
      title: 'Welcome to Cedar Healthcare',
      intro: 'Thanks for joining our community.',
      content: '<p style="margin:0;color:#405548;font-size:15px;line-height:1.75">We’ll share occasional care tips and thoughtful updates. You can unsubscribe at any time by replying to this email.</p>',
      button: { url: 'https://cedarhealthcarehome.vercel.app/#services', label: 'Explore our services' },
    }),
  })
  return sendJson(res, 200, { ok: true, emailSent })
}
