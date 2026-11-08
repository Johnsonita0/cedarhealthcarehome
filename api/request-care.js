import { escapeHtml, getResendConfig, getSupabaseConfig, insertRow, isHoneypotFilled, sendEmail, sendJson, validEmail } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (isHoneypotFilled(body)) return sendJson(res, 200, { ok: true, notificationSent: true })

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const contact = typeof body.contact === 'string' ? body.contact.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!name || name.length > 120 || !contact || contact.length > 160 || !message || message.length > 2000) {
    return sendJson(res, 400, { error: 'Please check your name, contact details, and message, then try again.' })
  }

  const { config: supabase, missing: missingSupabase } = getSupabaseConfig()
  if (missingSupabase.length) {
    console.error('Care request Supabase configuration is incomplete:', missingSupabase.join(', '))
    return sendJson(res, 503, { error: 'Our request form is not available right now. Please call Cedar Healthcare.' })
  }

  try {
    await insertRow(supabase, 'care_requests', { full_name: name, contact, message })
  } catch (error) {
    console.error('Unable to save care request:', error)
    return sendJson(res, 502, { error: 'We could not save your request. Please call Cedar Healthcare instead.' })
  }

  const { config: resend, missing: missingResend } = getResendConfig({ recipient: true })
  if (missingResend.length) {
    console.error('Care request email configuration is incomplete:', missingResend.join(', '))
    return sendJson(res, 200, { ok: true, notificationSent: false })
  }

  const emailHtml = `<h2>New care request</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Phone or email:</strong> ${escapeHtml(contact)}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
  const notificationSent = await sendEmail(resend, {
    to: resend.CARE_REQUEST_RECIPIENT,
    subject: `New care request from ${name}`,
    html: emailHtml,
    replyTo: validEmail(contact) ? contact : undefined,
  })

  return sendJson(res, 200, { ok: true, notificationSent })
}
