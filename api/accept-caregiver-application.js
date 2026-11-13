import { escapeHtml, getPublicSiteUrl, getResendConfig, getSupabaseConfig, isCaregiverReference, renderBrandedEmail, sendEmail, sendJson } from './_shared.js'

const cedarAdminUserId = 'bb9a9a8e-83b6-4c7a-b101-dcfdfe9fd20c'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const { config: supabase, missing } = getSupabaseConfig()
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  if (missing.length || !publishableKey) {
    return sendJson(res, 503, { error: 'Caregiver status updates are not configured.' })
  }

  const token = typeof req.headers.authorization === 'string'
    ? req.headers.authorization.replace(/^Bearer\s+/i, '')
    : ''
  if (!token) return sendJson(res, 401, { error: 'Sign in to continue.' })

  try {
    const authResponse = await fetch(`${supabase.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!authResponse.ok) return sendJson(res, 401, { error: 'Your admin session has expired. Sign in again.' })
    const user = await authResponse.json()
    if (user.id !== cedarAdminUserId) return sendJson(res, 403, { error: 'Admin access is required.' })

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const referenceCode = typeof body.referenceCode === 'string' ? body.referenceCode.trim().toUpperCase() : ''
    if (!isCaregiverReference(referenceCode)) return sendJson(res, 400, { error: 'A valid application reference is required.' })

    const applicationUrl = new URL(`${supabase.SUPABASE_URL}/rest/v1/caregiver_applications`)
    applicationUrl.searchParams.set('select', 'id,full_name,email,gender,role')
    applicationUrl.searchParams.set('reference_code', `eq.${referenceCode}`)
    applicationUrl.searchParams.set('limit', '1')
    const applicationResponse = await fetch(applicationUrl, {
      headers: {
        apikey: supabase.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${supabase.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })
    if (!applicationResponse.ok) {
      console.error('Unable to load caregiver application for acceptance:', applicationResponse.status, await applicationResponse.text())
      return sendJson(res, 502, { error: 'The application could not be loaded. Please try again.' })
    }
    const [application] = await applicationResponse.json()
    if (!application) return sendJson(res, 404, { error: 'Caregiver application not found.' })

    const updateUrl = new URL(`${supabase.SUPABASE_URL}/rest/v1/caregiver_applications`)
    updateUrl.searchParams.set('reference_code', `eq.${referenceCode}`)
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        apikey: supabase.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${supabase.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ status: 'accepted' }),
    })
    if (!updateResponse.ok) {
      console.error('Unable to mark caregiver application as accepted:', updateResponse.status, await updateResponse.text())
      return sendJson(res, 502, { error: 'The application could not be marked as accepted. Please try again.' })
    }

    const { config: resend, missing: missingResend } = getResendConfig()
    if (missingResend.length) {
      console.error('Caregiver acceptance email configuration is incomplete:', missingResend.join(', '))
      return sendJson(res, 200, { ok: true, emailSent: false })
    }

    const verifyUrl = `${getPublicSiteUrl()}/verify?reference=${encodeURIComponent(referenceCode)}`
    const applicationPronouns = application.gender === 'Male'
      ? 'He/him'
      : application.gender === 'Female'
        ? 'She/her'
        : 'Not specified'
    const emailSent = await sendEmail(resend, {
      to: application.email,
      subject: 'Your Cedar caregiver application was accepted',
      html: renderBrandedEmail({
        preheader: 'There is an update to your Cedar caregiver application.',
        title: 'Your application was accepted',
        intro: `Hello ${application.full_name}, we are pleased to let you know that your application to join Cedar Healthcare was accepted.`,
        content: `<p style="margin:0;color:#405548;font-size:14px;line-height:1.75">Care service: <strong>${escapeHtml(application.role)}</strong></p><p style="margin:12px 0 0;color:#405548;font-size:14px;line-height:1.75">Gender: <strong>${escapeHtml(application.gender || 'Not specified')}</strong> · Pronouns: <strong>${applicationPronouns}</strong></p><p style="margin:14px 0 0;color:#405548;font-size:14px;line-height:1.75">You can use your reference number on the status page to review this update.</p><p style="margin:12px 0 0;color:#405548;font-size:13px;line-height:1.75">Reference: <strong>${escapeHtml(referenceCode)}</strong></p>`,
        button: { url: verifyUrl, label: 'Check application status' },
      }),
    })

    return sendJson(res, 200, { ok: true, emailSent })
  } catch (error) {
    console.error('Unable to accept caregiver application:', error)
    return sendJson(res, 502, { error: 'The application status could not be updated. Please try again.' })
  }
}
