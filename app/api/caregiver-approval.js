import { createClient } from '@supabase/supabase-js'
import { escapeHtml, getPublicSiteUrl, getResendConfig, getSupabaseConfig, renderBrandedEmail, sendEmail, sendJson, validEmail } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const applicationId = typeof body.applicationId === 'string' ? body.applicationId.trim() : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!applicationId || !fullName || !email || !password) {
    return sendJson(res, 400, { error: 'A valid application, name, email, and password are required.' })
  }

  if (!validEmail(email)) {
    return sendJson(res, 400, { error: 'Enter a valid caregiver email address.' })
  }

  if (password.length < 8) {
    return sendJson(res, 400, { error: 'The caregiver password must be at least 8 characters long.' })
  }

  const { config: supabaseConfig, missing: missingSupabase } = getSupabaseConfig()
  if (missingSupabase.length) {
    console.error('Caregiver approval Supabase configuration is incomplete:', missingSupabase.join(', '))
    return sendJson(res, 503, { error: 'The caregiver approval flow is not available right now.' })
  }

  const serviceSupabase = createClient(supabaseConfig.SUPABASE_URL, supabaseConfig.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const { data: application, error: applicationError } = await serviceSupabase
      .from('caregiver_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle()

    if (applicationError) throw applicationError
    if (!application) return sendJson(res, 404, { error: 'The caregiver application could not be found.' })

    const { data: existingUsers, error: listUsersError } = await serviceSupabase.auth.admin.listUsers()
    if (listUsersError) throw listUsersError

    const userAlreadyExists = existingUsers.users.some((user) => user.email?.toLowerCase() === email.toLowerCase())

    const { data: authUser, error: createUserError } = userAlreadyExists
      ? { data: existingUsers.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()), error: null }
      : await serviceSupabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: application.role || 'Caregiver',
          },
        })

    if (createUserError) {
      if (createUserError.message?.toLowerCase().includes('already registered')) {
        console.warn('Caregiver auth user already exists, continuing with the approved flow:', email)
      } else {
        throw createUserError
      }
    }

    const caregiverId = authUser?.id || null
    const existingProfile = await serviceSupabase
      .from('caregiver_profiles')
      .select('id')
      .eq('application_id', applicationId)
      .maybeSingle()

    if (existingProfile.error) throw existingProfile.error

    if (!existingProfile.data) {
      const { error: profileError } = await serviceSupabase.from('caregiver_profiles').insert({
        application_id: applicationId,
        full_name: application.full_name || fullName,
        email: application.email || email,
        phone: application.phone || '',
        city: application.city || '',
        role: application.role || 'Caregiver',
        status: 'active',
      })
      if (profileError) throw profileError
    }

    const now = new Date().toISOString()
    const { error: updateApplicationError } = await serviceSupabase
      .from('caregiver_applications')
      .update({
        status: 'approved',
        approved_at: now,
        password: null,
      })
      .eq('id', applicationId)

    if (updateApplicationError) throw updateApplicationError

    const { config: resend, missing: missingResend } = getResendConfig()
    if (!missingResend.length) {
      const emailHtml = renderBrandedEmail({
        preheader: `Your caregiver application has been approved – your dashboard login is ready`,
        title: 'Caregiver application approved',
        intro: `Hi ${escapeHtml(fullName)}, your Cedar caregiver application has been approved.`,
        content: `<p style="margin:0 0 14px;color:#405548;font-size:15px;line-height:1.7">Your dashboard access is now active. Please sign in with the email below and the password you selected during your application.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:9px 0;color:#6b7b70;font-size:13px;font-weight:bold">Email</td><td style="padding:9px 0;color:#203529;font-size:13px">${escapeHtml(email)}</td></tr><tr><td style="padding:9px 0;color:#6b7b70;font-size:13px;font-weight:bold">Password</td><td style="padding:9px 0;color:#203529;font-size:13px">${escapeHtml(password)}</td></tr></table><p style="margin:18px 0 0;color:#405548;font-size:15px;line-height:1.7">Once you sign in, you will be able to review your dashboard and your assigned care details.</p>`,
        button: { url: `${getPublicSiteUrl()}/admin`, label: 'Open dashboard' },
      })
      await sendEmail(resend, {
        to: email,
        subject: 'Your Cedar caregiver account is ready',
        html: emailHtml,
      })
    }

    return sendJson(res, 200, {
      ok: true,
      userId: caregiverId,
      message: 'Caregiver application approved. Their dashboard access has been created and the confirmation email was triggered.',
    })
  } catch (error) {
    console.error('Caregiver approval failed:', error)
    return sendJson(res, 500, {
      error: error.message || 'We could not complete the caregiver approval flow right now.',
    })
  }
}
