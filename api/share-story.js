import { escapeHtml, getCareRequestRecipients, getPublicSiteUrl, getResendConfig, getSupabaseConfig, insertRow, isHoneypotFilled, renderBrandedEmail, sendEmail, sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (isHoneypotFilled(body)) return sendJson(res, 200, { ok: true, notificationSent: true })
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const relationship = typeof body.relationship === 'string' ? body.relationship.trim() : ''
  const story = typeof body.story === 'string' ? body.story.trim() : ''
  const rating = body.rating === undefined ? 5 : Number(body.rating)
  const location = typeof body.location === 'string' ? body.location.trim() : ''
  if (
    !name || name.length > 120
    || !relationship || relationship.length > 120
    || !story || story.length > 2000
    || !Number.isInteger(rating) || rating < 1 || rating > 5
    || location.length > 100
  ) {
    return sendJson(res, 400, { error: 'Please complete each field before sending your story.' })
  }

  const { config: supabase, missing: missingSupabase } = getSupabaseConfig()
  if (missingSupabase.length) {
    console.error('Story submission Supabase configuration is incomplete:', missingSupabase.join(', '))
    return sendJson(res, 503, { error: 'Story submissions are not available right now. Please call Cedar Healthcare.' })
  }

  try {
    await insertRow(supabase, 'testimonial_submissions', {
      name,
      relationship,
      story,
      rating,
      location: location || null,
    })
  } catch (error) {
    console.error('Unable to save story submission:', error)
    return sendJson(res, 502, { error: 'We could not save your story. Please try again later.' })
  }

  const { config: resend, missing: missingResend } = getResendConfig({ recipient: true })
  if (missingResend.length) {
    console.error('Story submission email configuration is incomplete:', missingResend.join(', '))
    return sendJson(res, 200, { ok: true, notificationSent: false })
  }
  let notificationRecipients
  try {
    notificationRecipients = getCareRequestRecipients(resend)
  } catch (error) {
    console.error('Story submission email recipients are invalid:', error)
    return sendJson(res, 200, { ok: true, notificationSent: false })
  }
  
  const emailHtml = renderBrandedEmail({
    preheader: `A new testimonial from ${name} is waiting for review.`,
    title: 'A story is ready for review',
    intro: 'A Cedar family has shared their experience. This story is not published until an admin approves it.',
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:8px 0;color:#6b7b70;font-size:13px;font-weight:bold">Name</td><td style="padding:8px 0;color:#203529;font-size:13px">${escapeHtml(name)}</td></tr><tr><td style="padding:8px 0;color:#6b7b70;font-size:13px;font-weight:bold">Relationship</td><td style="padding:8px 0;color:#203529;font-size:13px">${escapeHtml(relationship)}</td></tr><tr><td style="padding:8px 0;color:#6b7b70;font-size:13px;font-weight:bold">Rating</td><td style="padding:8px 0;color:#b48626;font-size:13px">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</td></tr>${location ? `<tr><td style="padding:8px 0;color:#6b7b70;font-size:13px;font-weight:bold">Location</td><td style="padding:8px 0;color:#203529;font-size:13px">${escapeHtml(location)}</td></tr>` : ''}</table><h2 style="margin:20px 0 8px;color:#294836;font-size:16px">Story</h2><p style="margin:0;color:#405548;font-size:14px;line-height:1.75;white-space:pre-wrap">${escapeHtml(story)}</p>`,
    button: { url: `${getPublicSiteUrl()}/admin`, label: 'Review testimonial' },
  })
  const notificationSent = await sendEmail(resend, {
    to: notificationRecipients,
    subject: `A Cedar family story from ${name}`,
    html: emailHtml,
  })
  return sendJson(res, 200, { ok: true, notificationSent })
}
