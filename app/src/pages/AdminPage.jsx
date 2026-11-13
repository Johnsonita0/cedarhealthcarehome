import { useEffect, useRef, useState } from 'react'
import { Icon, SearchableSelect, SiteSplash } from '../components/UI.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { defaultSiteContent } from '../data/adminDefaults.js'
import cedarLogo from '../images/logo/logo.jpeg'
import { isCedarAdminUser, isSupabaseConfigured, supabase } from '../supabaseClient.js'
import '../styles/admin.css'

const publicSiteUrl = 'https://www.cedarhealthcarehome.com'
const publicSiteShareUrl = encodeURIComponent(publicSiteUrl)
const publicSiteShareMessage = encodeURIComponent(`Learn more about Cedar Healthcare: ${publicSiteUrl}`)

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'content', label: 'Page content', icon: 'leaf' },
  { id: 'enquiries', label: 'Enquiries', icon: 'mail' },
  { id: 'caregivers', label: 'Caregivers', icon: 'people' },
  { id: 'testimonials', label: 'Testimonials', icon: 'quote' },
  { id: 'newsletter', label: 'Newsletter', icon: 'health' },
]

const editableSections = [
  { key: 'hero', label: 'Hero', editor: 'hero' },
  { key: 'faqs', label: 'FAQs', editor: 'faqs' },
  { key: 'privacyPolicy', label: 'Privacy policy', editor: 'policies' },
  { key: 'termsOfUse', label: 'Terms of use', editor: 'policies' },
]

const emptyData = {
  requests: [],
  submissions: [],
  testimonials: [],
  subscribers: [],
  campaigns: [],
  caregiverApplications: [],
  caregiverProfiles: [],
  caregiverAssignments: [],
  siteContent: null,
}
const readNotificationStorageKey = 'cedar-admin-read-notifications'

function loadReadNotificationIds() {
  try {
    const storedIds = JSON.parse(window.localStorage.getItem(readNotificationStorageKey) || '[]')
    return new Set(Array.isArray(storedIds) ? storedIds : [])
  } catch {
    return new Set()
  }
}

function displayDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return 'Not yet published'
  return new Intl.DateTimeFormat('en-US', options).format(new Date(value))
}

function mergeContent(value) {
  return {
    ...defaultSiteContent,
    ...value,
    hero: { ...defaultSiteContent.hero, ...value?.hero },
    faqs: value?.faqs ?? defaultSiteContent.faqs,
    privacyPolicy: value?.privacyPolicy ?? defaultSiteContent.privacyPolicy,
    termsOfUse: value?.termsOfUse ?? defaultSiteContent.termsOfUse,
  }
}

function mergeEditorContent(record) {
  const published = record?.published || {}
  const draft = record?.draft || {}
  return mergeContent({
    ...published,
    ...draft,
    hero: { ...published.hero, ...draft.hero },
    faqs: draft.faqs ?? published.faqs,
    privacyPolicy: draft.privacyPolicy ?? published.privacyPolicy,
    termsOfUse: draft.termsOfUse ?? published.termsOfUse,
  })
}

function AdminPage() {
  const { showToast } = useToast()
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activeView, setActiveView] = useState('dashboard')
  const [data, setData] = useState(emptyData)
  const [content, setContent] = useState(defaultSiteContent)
  const [dataLoading, setDataLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const confirmationResolver = useRef(null)
  const [requestFilter, setRequestFilter] = useState('new')
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [readNotificationIds, setReadNotificationIds] = useState(loadReadNotificationIds)
  const [reviewFilter, setReviewFilter] = useState('pending')
  const [editingReview, setEditingReview] = useState(null)
  const [contentSection, setContentSection] = useState('hero')
  const [policyKey, setPolicyKey] = useState('privacyPolicy')
  const [newsletter, setNewsletter] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('cedar-admin-newsletter-draft')) || { subject: '', body: '', imageUrl: '', imageAlt: '' }
    } catch {
      return { subject: '', body: '', imageUrl: '', imageAlt: '' }
    }
  })
  function notify(message, type = 'success') {
    setNotice(message)
    showToast(message, type)
  }

  function confirmAction(options) {
    return new Promise((resolve) => {
      confirmationResolver.current = resolve
      setConfirmation(options)
    })
  }

  function finishConfirmation(accepted) {
    const resolve = confirmationResolver.current
    confirmationResolver.current = null
    setConfirmation(null)
    resolve?.(accepted)
  }

  useEffect(() => {
    if (!confirmation) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') finishConfirmation(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmation])

  function saveReadNotificationIds(nextIds) {
    setReadNotificationIds(nextIds)
    try {
      window.localStorage.setItem(readNotificationStorageKey, JSON.stringify([...nextIds]))
    } catch {
      return
    }
  }

  function markNotificationRead(notificationId) {
    if (readNotificationIds.has(notificationId)) return
    const nextIds = new Set(readNotificationIds)
    nextIds.add(notificationId)
    saveReadNotificationIds(nextIds)
  }

  function markAllNotificationsRead(notificationIds) {
    saveReadNotificationIds(new Set([...readNotificationIds, ...notificationIds]))
  }

  function openNotification(notification) {
    markNotificationRead(notification.id)
    if (notification.destination === 'enquiries') {
      setRequestFilter('all')
      setSelectedRequestId(notification.targetId)
    }
    if (notification.destination === 'testimonials') setReviewFilter('pending')
    setActiveView(notification.destination)
  }

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return undefined
    }

    let active = true
    const acceptSession = (currentSession) => {
      if (!active) return
      if (isCedarAdminUser(currentSession?.user)) {
        setSession(currentSession)
        setAuthError('')
      } else {
        setSession(null)
        if (currentSession) {
          setAuthError('This signed-in account is not on the Cedar admin allowlist. Check that its Supabase Auth user ID matches the configured admin ID.')
          supabase.auth.signOut()
        }
      }
      setAuthLoading(false)
    }

    supabase.auth.getSession().then(({ data: result, error }) => {
      if (error) setAuthError(error.message)
      acceptSession(result?.session)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      acceptSession(currentSession)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function loadData() {
    if (!supabase) return
    setDataLoading(true)
    const [requests, submissions, testimonials, subscribers, campaigns, caregiverApplications, caregiverProfiles, caregiverAssignments, siteContent] = await Promise.all([
      supabase.from('care_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('testimonial_submissions').select('*').order('created_at', { ascending: false }),
      supabase.from('testimonials').select('*').order('created_at', { ascending: false }),
      supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }),
      supabase.from('newsletter_campaigns').select('*').order('sent_at', { ascending: false }).limit(10),
      supabase.from('caregiver_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('caregiver_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('caregiver_client_assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('site_content').select('draft,published,updated_at,published_at').eq('id', 1).maybeSingle(),
    ])
    const queryError = [requests, submissions, testimonials, subscribers, campaigns, caregiverApplications, caregiverProfiles, caregiverAssignments, siteContent]
      .find((result) => result.error)?.error

    if (queryError) {
      notify(queryError.message, 'error')
    } else {
      const nextData = {
        requests: requests.data || [],
        submissions: submissions.data || [],
        testimonials: testimonials.data || [],
        subscribers: subscribers.data || [],
        campaigns: campaigns.data || [],
        caregiverApplications: caregiverApplications.data || [],
        caregiverProfiles: caregiverProfiles.data || [],
        caregiverAssignments: caregiverAssignments.data || [],
        siteContent: siteContent.data,
      }
      setData(nextData)
      setContent(mergeEditorContent(nextData.siteContent))
      setSelectedRequestId((current) => current && nextData.requests.some((item) => item.id === current)
        ? current
        : nextData.requests.find((item) => item.status !== 'replied')?.id || nextData.requests[0]?.id || null)
      setNotice('')
    }
    setDataLoading(false)
  }

  useEffect(() => {
    if (session) loadData()
  }, [session])

  async function signIn(event) {
    event.preventDefault()
    setBusy(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setPassword('')
    if (error) setAuthError(error.message)
    setBusy(false)
  }

  async function signOut() {
    setProfileModalOpen(false)
    await supabase?.auth.signOut()
    setSession(null)
    setData(emptyData)
  }

  function updateContent(key, value) {
    setContent((current) => ({ ...current, [key]: value }))
  }

  function updateHero(key, value) {
    setContent((current) => ({ ...current, hero: { ...current.hero, [key]: value } }))
  }

  async function uploadHeroImage(file) {
    const allowedTypes = new Map([
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
    ])
    const extension = allowedTypes.get(file?.type)
    if (!extension) {
      notify('Choose a JPG, PNG, or WebP image.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('Choose an image smaller than 5 MB.', 'error')
      return
    }

    setBusy(true)
    const path = `hero/${window.crypto.randomUUID()}.${extension}`
    const { data: uploaded, error } = await supabase.storage
      .from('site-content')
      .upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false })
    if (error) {
      notify(error.message || 'The image could not be uploaded.', 'error')
    } else {
      const { data: publicImage } = supabase.storage.from('site-content').getPublicUrl(uploaded.path)
      updateHero('image', publicImage.publicUrl)
      notify('Image uploaded. Save or publish to use it on the public page.')
    }
    setBusy(false)
  }

  async function uploadNewsletterImage(file) {
    const allowedTypes = new Map([
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
    ])
    const extension = allowedTypes.get(file?.type)
    if (!extension) return notify('Choose a JPG, PNG, or WebP image.', 'error')
    if (file.size > 5 * 1024 * 1024) return notify('Choose an image smaller than 5 MB.', 'error')

    setBusy(true)
    const path = `newsletter/${window.crypto.randomUUID()}.${extension}`
    const { data: uploaded, error } = await supabase.storage
      .from('site-content')
      .upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false })
    if (error) notify(error.message || 'The image could not be uploaded.', 'error')
    else {
      const { data: publicImage } = supabase.storage.from('site-content').getPublicUrl(uploaded.path)
      updateNewsletter('imageUrl', publicImage.publicUrl)
      notify('Newsletter image uploaded.')
    }
    setBusy(false)
  }

  function updatePolicy(key, patch) {
    setContent((current) => ({
      ...current,
      [policyKey]: { ...current[policyKey], ...patch },
    }))
  }

  async function saveContent(publish = false) {
    setBusy(true)
    const now = new Date().toISOString()
    const payload = {
      id: 1,
      draft: publish ? {} : content,
      updated_at: now,
      ...(publish ? { published: content, published_at: now } : {}),
    }
    const { error } = await supabase.from('site_content').upsert(payload, { onConflict: 'id' })
    if (error) notify(error.message, 'error')
    else {
      notify(publish ? 'Your page changes are published.' : 'Draft saved.')
      await loadData()
    }
    setBusy(false)
  }

  function editContentSection(key) {
    const section = editableSections.find((item) => item.key === key)
    if (!section) return
    const value = data.siteContent?.draft?.[key]
      ?? data.siteContent?.published?.[key]
      ?? content[key]
    setContent((current) => mergeContent({ ...current, [key]: value }))
    setContentSection(section.editor)
    if (key === 'privacyPolicy' || key === 'termsOfUse') setPolicyKey(key)
    notify(`${section.label} loaded in the editor.`)
  }

  async function updateContentSectionStatus(key, action) {
    const row = data.siteContent
    const section = editableSections.find((item) => item.key === key)
    if (!row || !section) return

    const draft = { ...(row.draft || {}) }
    const published = { ...(row.published || {}) }
    const hasDraft = Object.prototype.hasOwnProperty.call(draft, key)
    const hasPublished = Object.prototype.hasOwnProperty.call(published, key)

    if (action === 'publish') {
      if (!hasDraft) return notify(`Save a ${section.label.toLowerCase()} draft before publishing.`, 'warning')
      published[key] = draft[key]
      delete draft[key]
    } else if (action === 'unpublish') {
      if (!hasPublished) return
      if (!await confirmAction({
        title: `Unpublish ${section.label.toLowerCase()}?`,
        message: 'Its draft will be kept.',
        confirmLabel: 'Unpublish',
      })) return
      delete published[key]
    } else if (action === 'delete') {
      if (!hasDraft && !hasPublished) return
      if (!await confirmAction({
        title: `Delete the saved ${section.label.toLowerCase()}?`,
        message: 'This will remove it from drafts and the public site.',
        confirmLabel: 'Delete',
      })) return
      delete draft[key]
      delete published[key]
    }

    setBusy(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('site_content').update({
      draft,
      published,
      updated_at: now,
      published_at: now,
    }).eq('id', 1)
    if (error) notify(error.message, 'error')
    else {
      const message = action === 'publish'
        ? `${section.label} published.`
        : action === 'unpublish'
          ? `${section.label} unpublished. Its draft was kept.`
          : `${section.label} deleted.`
      notify(message)
      await loadData()
    }
    setBusy(false)
  }

  async function updateRequestStatus(request, status) {
    const { error } = await supabase.from('care_requests').update({ status }).eq('id', request.id)
    if (error) notify(error.message, 'error')
    else {
      notify(status === 'replied' ? 'Enquiry marked as replied.' : 'Enquiry reopened.')
      await loadData()
    }
  }

  async function deleteRequest(request) {
    if (!await confirmAction({
      title: 'Delete this enquiry?',
      message: `The enquiry from ${request.full_name} will be permanently deleted.`,
      confirmLabel: 'Delete enquiry',
    })) return
    const { error } = await supabase.from('care_requests').delete().eq('id', request.id)
    if (error) notify(error.message, 'error')
    else {
      notify('Enquiry deleted.')
      await loadData()
    }
  }

  async function publishSubmission(submission) {
    setBusy(true)
    const { error: insertError } = await supabase.from('testimonials').insert({
      name: submission.name,
      relationship: submission.relationship,
      story: submission.story,
      rating: submission.rating || 5,
      location: submission.location,
      is_published: true,
    })
    if (insertError) {
      notify(insertError.message, 'error')
    } else {
      const { error: deleteError } = await supabase.from('testimonial_submissions').delete().eq('id', submission.id)
      notify(deleteError ? `Published, but the pending copy could not be removed: ${deleteError.message}` : 'Testimonial published.', deleteError ? 'warning' : 'success')
      await loadData()
    }
    setBusy(false)
  }

  async function updateTestimonial(item, isPublished) {
    const { error } = await supabase.from('testimonials').update({ is_published: isPublished }).eq('id', item.id)
    if (error) notify(error.message, 'error')
    else {
      notify(isPublished ? 'Testimonial published.' : 'Testimonial hidden from the public site.')
      await loadData()
    }
  }

  async function updateCaregiverStatus(application, status) {
    const { error } = await supabase.from('caregiver_applications').update({ status }).eq('id', application.id)
    if (error) notify(error.message, 'error')
    else {
      notify(`Caregiver application marked as ${status}.`)
      await loadData()
    }
  }

  async function approveCaregiverApplication(application) {
    const password = typeof application.password === 'string' ? application.password.trim() : ''
    if (!password) {
      notify('This caregiver application does not have a dashboard password yet. Ask them to submit one before approving.', 'warning')
      return
    }

    try {
      const response = await fetch('/api/caregiver-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          fullName: application.full_name,
          email: application.email,
          password,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'The caregiver approval request could not be completed.')
      notify(result?.message || 'Caregiver application approved and their dashboard access has been created.')
      await loadData()
    } catch (error) {
      notify(error.message || 'We could not approve the caregiver application.', 'error')
    }
  }

  async function assignClientToCaregiver(event, assignment) {
    event.preventDefault()
    if (!assignment.caregiverId || !assignment.clientName.trim() || !assignment.careType.trim()) {
      notify('Choose a caregiver and provide the client name and care type.', 'warning')
      return
    }

    const { error } = await supabase.from('caregiver_client_assignments').insert({
      caregiver_id: assignment.caregiverId,
      client_name: assignment.clientName.trim(),
      client_phone: assignment.clientPhone.trim() || null,
      care_type: assignment.careType.trim(),
      notes: assignment.notes.trim() || null,
      status: 'assigned',
    })
    if (error) notify(error.message, 'error')
    else {
      notify('Client assignment saved.')
      await loadData()
      event.currentTarget.reset()
    }
  }

  async function saveReview(event) {
    event.preventDefault()
    const table = editingReview.source === 'pending' ? 'testimonial_submissions' : 'testimonials'
    const updates = {
      name: editingReview.name.trim(),
      relationship: editingReview.relationship.trim(),
      story: editingReview.story.trim(),
      rating: Number(editingReview.rating),
      location: editingReview.location?.trim() || null,
    }
    const { error } = await supabase.from(table).update(updates).eq('id', editingReview.id)
    if (error) notify(error.message, 'error')
    else {
      setEditingReview(null)
      notify('Testimonial updated.')
      await loadData()
    }
  }

  async function deleteReview(item, source) {
    if (!await confirmAction({
      title: 'Delete this testimonial?',
      message: `The testimonial from ${item.name} will be permanently deleted.`,
      confirmLabel: 'Delete testimonial',
    })) return
    const table = source === 'pending' ? 'testimonial_submissions' : 'testimonials'
    const { error } = await supabase.from(table).delete().eq('id', item.id)
    if (error) notify(error.message, 'error')
    else {
      notify('Testimonial deleted.')
      await loadData()
    }
  }

  function updateNewsletter(key, value) {
    const next = { ...newsletter, [key]: value }
    setNewsletter(next)
    window.localStorage.setItem('cedar-admin-newsletter-draft', JSON.stringify(next))
  }

  function insertNewsletterImage() {
    const imageUrl = newsletter.imageUrl.trim()
    let parsedUrl
    try {
      parsedUrl = new URL(imageUrl)
    } catch {
      notify('Enter a valid HTTPS image URL or upload an image first.', 'warning')
      return
    }
    if (parsedUrl.protocol !== 'https:') {
      notify('Newsletter images must use HTTPS.', 'warning')
      return
    }

    const alt = (newsletter.imageAlt.trim() || 'Cedar Healthcare update').replace(/[\]\\\r\n]/g, ' ')
    const imageBlock = `![${alt}](${parsedUrl.toString()})`
    updateNewsletter('body', `${newsletter.body.trimEnd()}${newsletter.body.trim() ? '\n\n' : ''}${imageBlock}\n`)
    notify('Image block added to the newsletter draft.')
  }

  async function sendNewsletter(action) {
    if (!newsletter.subject.trim() || !newsletter.body.trim()) {
      notify('Add a subject and message first.', 'warning')
      return
    }
    if (action === 'send' && !await confirmAction({
      title: 'Send this newsletter?',
      message: `This will send the newsletter to ${data.subscribers.length} subscribers.`,
      confirmLabel: 'Send newsletter',
      dangerous: false,
    })) return

    setBusy(true)
    setNotice('')
    const { data: sessionData } = await supabase.auth.getSession()
    const response = await fetch('/api/admin-newsletter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ action, subject: newsletter.subject, body: newsletter.body }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) notify(result.error || 'The newsletter could not be sent.', 'error')
    else {
      notify(action === 'test' ? `Test sent to ${session.user.email}.` : `Newsletter sent to ${result.sent} subscribers.`, result.historySaved === false ? 'warning' : 'success')
      if (action === 'send') {
        const cleared = { subject: '', body: '', imageUrl: '', imageAlt: '' }
        setNewsletter(cleared)
        window.localStorage.removeItem('cedar-admin-newsletter-draft')
      }
      await loadData()
    }
    setBusy(false)
  }

  if (authLoading) return <SiteSplash />
  if (!session) {
    return (
      <main className="admin-login-shell">
        <form className="admin-login" onSubmit={signIn}>
          <a className="admin-login__brand" href="/" aria-label="Cedar Healthcare home">
            <img src={cedarLogo} alt="Cedar Healthcare" />
          </a>
          <p className="admin-kicker">Private staff area</p>
          <h1>Welcome back.</h1>
          <p className="admin-login__intro">Sign in with your Cedar staff account.</p>
          {!isSupabaseConfigured && <p className="admin-alert">Add the Supabase URL and publishable key to the app environment to enable sign-in.</p>}
          <label htmlFor="admin-email">Email address</label>
          <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {authError && <p className="admin-alert" role="alert">{authError}</p>}
          <button className="admin-primary-button" type="submit" disabled={!isSupabaseConfigured || busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <a className="admin-login__public-link" href="/">Back to Cedar Healthcare</a>
        </form>
      </main>
    )
  }

  const currentRequest = data.requests.find((request) => request.id === selectedRequestId)
  const pendingCount = data.submissions.length
  const publishedCount = data.testimonials.filter((item) => item.is_published).length
  const hiddenCount = data.testimonials.length - publishedCount
  const newRequestsCount = data.requests.filter((item) => item.status !== 'replied').length
  const notificationItems = [
    ...data.requests.map((request) => ({
      id: `request:${request.id}`,
      category: 'Care request',
      title: `Care request from ${request.full_name || 'a visitor'}`,
      detail: request.message || 'A new care request was submitted.',
      createdAt: request.created_at,
      destination: 'enquiries',
      destinationLabel: 'Open',
      targetId: request.id,
    })),
    ...data.submissions.map((submission) => ({
      id: `testimonial:${submission.id}`,
      category: 'Testimonial',
      title: `Testimonial from ${submission.name || 'a visitor'}`,
      detail: submission.story || 'A new testimonial is ready for review.',
      createdAt: submission.created_at,
      destination: 'testimonials',
      destinationLabel: 'Open',
    })),
    ...data.subscribers.map((subscriber) => ({
      id: `subscriber:${subscriber.id}`,
      category: 'Newsletter',
      title: 'New newsletter subscriber',
      detail: subscriber.email,
      createdAt: subscriber.created_at,
      destination: 'newsletter',
      destinationLabel: 'Open',
    })),
  ].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
    .map((notification) => ({ ...notification, read: readNotificationIds.has(notification.id) }))
  const unreadNotificationCount = notificationItems.filter((notification) => !notification.read).length
  const viewLabel = navigation.find((item) => item.id === activeView)?.label || (activeView === 'notifications' ? 'Notifications' : 'Dashboard')

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="Cedar Healthcare public website">
          <img src={cedarLogo} alt="Cedar Healthcare" />
          <span>Admin</span>
        </a>
        <nav className="admin-sidebar__nav" aria-label="Admin navigation">
          {navigation.map((item) => (
            <button type="button" className={activeView === item.id ? 'is-active' : ''} key={item.id} onClick={() => setActiveView(item.id)}>
              <Icon name={item.icon} size={18} /><span>{item.label}</span>
              {item.id === 'enquiries' && newRequestsCount > 0 && <span className="admin-nav-count">{newRequestsCount}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar__bottom">
          <a href="/" target="_blank" rel="noreferrer"><Icon name="arrow" size={17} /> View public site</a>
          <button type="button" onClick={signOut}><Icon name="close" size={17} /> Sign out</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><p className="admin-kicker">Cedar Healthcare</p><h1>{activeView === 'dashboard' ? 'Dashboard' : viewLabel}</h1></div>
          <div className="admin-topbar__user">
            <button className="admin-notification-button" type="button" aria-label={unreadNotificationCount ? `Notifications, ${unreadNotificationCount} unread` : 'Notifications'} aria-pressed={activeView === 'notifications'} title="Notifications" onClick={() => setActiveView((current) => current === 'notifications' ? 'dashboard' : 'notifications')}>
              <Icon name="bell" size={19} />
              {unreadNotificationCount > 0 && <span className="admin-notification-count">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}
            </button>
            <button className="admin-profile-trigger" type="button" aria-label="Open CedarAdmin account menu" aria-haspopup="dialog" onClick={() => setProfileModalOpen(true)}><Icon name="user" size={18} /></button>
            <div><strong>CedarAdmin</strong><small>{session.user.email}</small></div>
          </div>
        </header>

        {notice && <div className="admin-notice" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><Icon name="close" size={15} /></button></div>}
        {dataLoading && <div className="admin-inline-loading">Refreshing records…</div>}

        {activeView === 'dashboard' && (
          <DashboardView
            data={data}
            newRequests={newRequestsCount}
            pendingCount={pendingCount}
            publishedCount={publishedCount}
            onNavigate={setActiveView}
          />
        )}
        {activeView === 'notifications' && (
          <NotificationsView
            notifications={notificationItems}
            unreadCount={unreadNotificationCount}
            loading={dataLoading}
            onMarkRead={markNotificationRead}
            onMarkAllRead={() => markAllNotificationsRead(notificationItems.map((item) => item.id))}
            onOpen={openNotification}
          />
        )}
        {activeView === 'content' && (
          <ContentEditor
            content={content}
            publishedContent={data.siteContent?.published}
            draftContent={data.siteContent?.draft}
            busy={busy}
            updatedAt={data.siteContent?.published_at}
            section={contentSection}
            policyKey={policyKey}
            onSectionChange={setContentSection}
            onPolicyChange={setPolicyKey}
            onUpdate={updateContent}
            onHeroUpdate={updateHero}
            onUploadImage={uploadHeroImage}
            onNotify={notify}
            onEditSection={editContentSection}
            onSectionAction={updateContentSectionStatus}
            onPolicyUpdate={updatePolicy}
            onSave={() => saveContent(false)}
            onPublish={() => saveContent(true)}
          />
        )}
        {activeView === 'enquiries' && (
          <InboxView
            requests={data.requests}
            filter={requestFilter}
            selected={currentRequest}
            onFilterChange={setRequestFilter}
            onSelect={(request) => setSelectedRequestId(request.id)}
            onStatus={updateRequestStatus}
            onDelete={deleteRequest}
          />
        )}
        {activeView === 'caregivers' && (
          <CaregiverManagementView
            applicants={data.caregiverApplications}
            caregivers={data.caregiverProfiles}
            assignments={data.caregiverAssignments}
            onStatus={updateCaregiverStatus}
            onApprove={approveCaregiverApplication}
            onAssign={assignClientToCaregiver}
          />
        )}
        {activeView === 'testimonials' && (
          <ReviewsView
            filter={reviewFilter}
            pending={data.submissions}
            testimonials={data.testimonials}
            onFilterChange={setReviewFilter}
            onPublish={publishSubmission}
            onToggle={updateTestimonial}
            onEdit={setEditingReview}
            onDelete={deleteReview}
          />
        )}
        {activeView === 'newsletter' && (
          <>
            <NewsletterImagePanel
              draft={newsletter}
              busy={busy}
              onUpdate={updateNewsletter}
              onUpload={uploadNewsletterImage}
              onInsert={insertNewsletterImage}
            />
            <NewsletterView
              draft={newsletter}
              subscribers={data.subscribers}
              campaigns={data.campaigns}
              busy={busy}
              onUpdate={updateNewsletter}
              onSend={sendNewsletter}
            />
            <NewsletterTemplatePreview draft={newsletter} />
          </>
        )}
      </main>

      <nav className="admin-mobile-nav" aria-label="Mobile admin navigation">
        {[
          ['dashboard', 'Home', 'home'],
          ['content', 'Content', 'leaf'],
          ['enquiries', 'Inbox', 'mail'],
          ['caregivers', 'Caregivers', 'people'],
          ['testimonials', 'Reviews', 'quote'],
          ['newsletter', 'Mail', 'health'],
        ].map(([id, label, icon]) => (
          <button type="button" className={activeView === id ? 'is-active' : ''} key={id} onClick={() => setActiveView(id)}>
            <Icon name={icon} size={19} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {profileModalOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileModalOpen(false) }}>
          <section className="admin-modal admin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="admin-profile-title">
            <div className="admin-modal__heading"><div><p className="admin-kicker">Account</p><h2 id="admin-profile-title">Profile</h2></div><button type="button" aria-label="Close account menu" onClick={() => setProfileModalOpen(false)}><Icon name="close" size={20} /></button></div>
            <div className="admin-profile-details"><span><Icon name="user" size={20} /></span><div><strong>CedarAdmin</strong><small>{session.user.email}</small></div></div>
            <div className="admin-modal__actions"><button className="admin-secondary-button" type="button" onClick={() => setProfileModalOpen(false)}>Close</button><button className="admin-danger-button" type="button" onClick={signOut}><Icon name="close" size={15} /> Sign out</button></div>
          </section>
        </div>
      )}

      {editingReview && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingReview(null) }}>
          <form className="admin-modal" onSubmit={saveReview}>
            <div className="admin-modal__heading"><div><p className="admin-kicker">Testimonial</p><h2>Edit review</h2></div><button type="button" aria-label="Close edit form" onClick={() => setEditingReview(null)}><Icon name="close" size={20} /></button></div>
            <label>Name<input value={editingReview.name} onChange={(event) => setEditingReview({ ...editingReview, name: event.target.value })} maxLength="120" required /></label>
            <label>Relationship<input value={editingReview.relationship} onChange={(event) => setEditingReview({ ...editingReview, relationship: event.target.value })} maxLength="120" required /></label>
            <label>Location<input value={editingReview.location || ''} onChange={(event) => setEditingReview({ ...editingReview, location: event.target.value })} maxLength="100" placeholder="Optional, for example Chicago, IL" /></label>
            <label>Rating<SearchableSelect value={editingReview.rating || 5} options={[5, 4, 3, 2, 1].map((rating) => ({ value: rating, label: `${rating} stars` }))} onChange={(rating) => setEditingReview({ ...editingReview, rating })} /></label>
            <label>Testimonial<textarea value={editingReview.story} onChange={(event) => setEditingReview({ ...editingReview, story: event.target.value })} rows="5" maxLength="2000" required /></label>
            <div className="admin-modal__actions"><button className="admin-secondary-button" type="button" onClick={() => setEditingReview(null)}>Cancel</button><button className="admin-primary-button" type="submit">Save review</button></div>
          </form>
        </div>
      )}

      {confirmation && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) finishConfirmation(false) }}>
          <section className="admin-modal admin-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="admin-confirmation-title" aria-describedby="admin-confirmation-message">
            <div className="admin-modal__heading">
              <div><p className="admin-kicker">Please confirm</p><h2 id="admin-confirmation-title">{confirmation.title}</h2></div>
            </div>
            <p id="admin-confirmation-message">{confirmation.message}</p>
            <div className="admin-modal__actions">
              <button className="admin-secondary-button" type="button" onClick={() => finishConfirmation(false)} autoFocus>Cancel</button>
              <button className={confirmation.dangerous === false ? 'admin-primary-button' : 'admin-danger-button'} type="button" onClick={() => finishConfirmation(true)}>{confirmation.confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function NotificationsView({ notifications, unreadCount, loading, onMarkRead, onMarkAllRead, onOpen }) {
  const [filter, setFilter] = useState('all')
  const visibleNotifications = filter === 'unread'
    ? notifications.filter((notification) => !notification.read)
    : notifications

  return (
    <section className="admin-workspace">
      <div className="admin-page-heading">
        <div><p className="admin-kicker">Admin activity</p><h2>Notifications</h2><p>Care requests, testimonials, and newsletter signups in one place.</p></div>
        {unreadCount > 0 && <button className="admin-secondary-button" type="button" onClick={onMarkAllRead}>Mark all as read</button>}
      </div>
      <div className="admin-notification-toolbar">
        <span>{notifications.length} total · {unreadCount} unread</span>
        <div className="admin-segmented" aria-label="Notification filter">
          <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button>
          <button type="button" className={filter === 'unread' ? 'is-active' : ''} onClick={() => setFilter('unread')}>Unread</button>
        </div>
      </div>
      {visibleNotifications.length ? (
        <div className="admin-notification-list">
          {visibleNotifications.map((notification) => (
            <article className={`admin-notification-row${notification.read ? '' : ' is-unread'}`} key={notification.id}>
              <div className="admin-notification-row__content">
                <div className="admin-notification-row__meta"><span>{notification.category}</span><time dateTime={notification.createdAt}>{displayDate(notification.createdAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>{!notification.read && <span className="admin-notification-unread">Unread</span>}</div>
                <h3>{notification.title}</h3>
                <p>{notification.detail}</p>
              </div>
              <div className="admin-notification-row__actions">
                {!notification.read && <button className="admin-secondary-button" type="button" onClick={() => onMarkRead(notification.id)}>Mark read</button>}
                <button className="admin-primary-button" type="button" onClick={() => onOpen(notification)}>{notification.destinationLabel}</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <Icon name="bell" size={27} />
          <h3>{loading ? 'Loading notifications' : filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'}</h3>
          <p>{loading ? 'New activity will appear here.' : filter === 'unread' ? 'There are no unread updates.' : 'New care requests and signups will appear here.'}</p>
        </div>
      )}
    </section>
  )
}

function CaregiverManagementView({ applicants, caregivers, assignments, onStatus, onApprove, onAssign }) {
  const [assignmentForm, setAssignmentForm] = useState({
    caregiverId: '',
    clientName: '',
    clientPhone: '',
    careType: 'Personal care',
    notes: '',
  })

  return (
    <section className="admin-workspace">
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Team operations</p>
          <h2>Caregiver pipeline</h2>
          <p>Review applicants, approve caregivers, and assign clients to the right team member.</p>
        </div>
      </div>

      <div className="admin-caregiver-grid">
        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <p className="admin-kicker">Applications</p>
              <h2>Open applicants</h2>
            </div>
            <span>{applicants.length}</span>
          </div>

          {applicants.length === 0 ? (
            <div className="admin-empty-state"><h3>No applications yet</h3><p>Caregiver applications will appear here.</p></div>
          ) : (
            applicants.map((application) => (
              <article className="admin-caregiver-card" key={application.id}>
                <div className="admin-caregiver-card__top">
                  <div>
                    <strong>{application.full_name}</strong>
                    <small>{application.city || 'Chicago'} • {application.role || 'Caregiver'}</small>
                  </div>
                  <SearchableSelect
                    className="admin-caregiver-card__status"
                    aria-label={`Status for ${application.full_name}`}
                    value={application.status || 'new'}
                    options={[
                      { value: 'new', label: 'New' },
                      { value: 'reviewing', label: 'Reviewing' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                    ]}
                    onChange={(status) => onStatus(application, status)}
                  />
                </div>
                <p>{application.email} • {application.phone}</p>
                <p><strong>Experience:</strong> {application.experience}</p>
                <p><strong>Availability:</strong> {application.availability}</p>
                {application.message && <p><strong>Note:</strong> {application.message}</p>}
                <div className="admin-caregiver-card__actions">
                  <button type="button" className="admin-primary-button" onClick={() => onApprove(application)} disabled={application.status === 'approved'}>
                    {application.status === 'approved' ? 'Approved' : 'Approve caregiver'}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <p className="admin-kicker">Team</p>
              <h2>Active caregivers</h2>
            </div>
            <span>{caregivers.length}</span>
          </div>

          {caregivers.length === 0 ? (
            <div className="admin-empty-state"><h3>No active caregivers</h3><p>Approved applicants will appear here once they are added.</p></div>
          ) : (
            caregivers.map((caregiver) => {
              const assignedClients = assignments.filter((item) => item.caregiver_id === caregiver.id)
              return (
                <article className="admin-caregiver-card" key={caregiver.id}>
                  <div className="admin-caregiver-card__top">
                    <div>
                      <strong>{caregiver.full_name}</strong>
                      <small>{caregiver.role || 'Caregiver'} • {caregiver.city || 'Chicago'}</small>
                    </div>
                    <span className={`admin-status-pill admin-status-pill--${caregiver.status || 'active'}`}>{caregiver.status || 'active'}</span>
                  </div>
                  <p>{caregiver.email} • {caregiver.phone}</p>
                  <div className="admin-caregiver-card__list">
                    <strong>Assigned clients:</strong>
                    {assignedClients.length ? (
                      <ul>
                        {assignedClients.map((assignment) => (
                          <li key={assignment.id}>{assignment.client_name} <em>({assignment.care_type})</em></li>
                        ))}
                      </ul>
                    ) : <span>None yet</span>}
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>

      <section className="admin-panel admin-caregiver-assignments">
        <div className="admin-panel__heading">
          <div>
            <p className="admin-kicker">Client placement</p>
            <h2>Assign a client to a caregiver</h2>
          </div>
        </div>
        <form className="admin-assignment-form" onSubmit={(event) => onAssign(event, assignmentForm)}>
          <label>
            Caregiver
            <SearchableSelect
              value={assignmentForm.caregiverId}
              options={[
                { value: '', label: 'Select a caregiver' },
                ...caregivers.map((caregiver) => ({ value: caregiver.id, label: caregiver.full_name })),
              ]}
              onChange={(caregiverId) => setAssignmentForm((current) => ({ ...current, caregiverId }))}
            />
          </label>
          <label>
            Client name
            <input value={assignmentForm.clientName} onChange={(event) => setAssignmentForm((current) => ({ ...current, clientName: event.target.value }))} placeholder="Jane Doe" required />
          </label>
          <label>
            Client phone
            <input value={assignmentForm.clientPhone} onChange={(event) => setAssignmentForm((current) => ({ ...current, clientPhone: event.target.value }))} placeholder="(555) 555-1234" />
          </label>
          <label>
            Care type
            <input value={assignmentForm.careType} onChange={(event) => setAssignmentForm((current) => ({ ...current, careType: event.target.value }))} placeholder="Personal care" required />
          </label>
          <label>
            Notes
            <textarea value={assignmentForm.notes} onChange={(event) => setAssignmentForm((current) => ({ ...current, notes: event.target.value }))} rows="3" placeholder="Pickup instructions, care preferences, and any schedule notes." />
          </label>
          <button className="admin-primary-button" type="submit">Save assignment</button>
        </form>
      </section>
    </section>
  )
}

function DashboardView({ data, newRequests, pendingCount, publishedCount, onNavigate }) {
  const attentionItems = [
    { title: 'New care enquiries', detail: newRequests ? `${newRequests} waiting for a response` : 'Your inbox is up to date', action: 'Open inbox', view: 'enquiries', count: newRequests },
    { title: 'Testimonials waiting', detail: pendingCount ? `${pendingCount} ready for review` : 'Nothing waiting for review', action: 'Review stories', view: 'testimonials', count: pendingCount },
    { title: 'Newsletter draft', detail: 'Continue writing your next update', action: 'Continue draft', view: 'newsletter', count: null },
  ]

  return (
    <section className="admin-dashboard">
      <div className="admin-welcome"><div><p className="admin-kicker">{displayDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</p><h2>Good care starts with good follow-through.</h2><p>Here’s what needs your attention today.</p></div><span className="admin-welcome__leaf"><Icon name="leaf" size={50} /></span></div>
      <div className="admin-stat-grid">
        <StatCard label="New enquiries" value={newRequests} detail="Care requests" icon="mail" />
        <StatCard label="To review" value={pendingCount} detail="New testimonials" icon="quote" />
        <StatCard label="Subscribers" value={data.subscribers.length} detail="Newsletter audience" icon="health" />
        <StatCard label="Last page update" value={displayDate(data.siteContent?.published_at, { month: 'short', day: 'numeric' })} detail="Published content" icon="leaf" />
      </div>
      <div className="admin-dashboard__columns">
        <section className="admin-panel admin-attention"><div className="admin-panel__heading"><div><p className="admin-kicker">Daily overview</p><h2>Needs your attention</h2></div><span>{newRequests + pendingCount}</span></div>
          {attentionItems.map((item) => <div className="admin-attention__row" key={item.view}><span className={`admin-attention__dot${item.count ? ' is-on' : ''}`} /><div><strong>{item.title}</strong><small>{item.detail}</small></div><button type="button" onClick={() => onNavigate(item.view)}>{item.action}<Icon name="arrow" size={15} /></button></div>)}
        </section>
        <section className="admin-panel admin-quick"><p className="admin-kicker">Quick actions</p><h2>Make a quick update</h2>
          <button type="button" onClick={() => onNavigate('content')}><span><Icon name="leaf" size={18} /></span><strong>Update page content</strong><Icon name="arrow" size={16} /></button>
          <button type="button" onClick={() => onNavigate('testimonials')}><span><Icon name="quote" size={18} /></span><strong>Review testimonials</strong><Icon name="arrow" size={16} /></button>
          <button type="button" onClick={() => onNavigate('newsletter')}><span><Icon name="health" size={18} /></span><strong>Write a newsletter</strong><Icon name="arrow" size={16} /></button>
          <small>{publishedCount} testimonials currently visible on the public site</small>
        </section>
      </div>
    </section>
  )
}

function StatCard({ label, value, detail, icon }) {
  return <article className="admin-stat"><span className="admin-stat__icon"><Icon name={icon} size={19} /></span><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>
}

function ContentEditor({ content, publishedContent, draftContent, busy, updatedAt, section, policyKey, onSectionChange, onPolicyChange, onUpdate, onHeroUpdate, onUploadImage, onNotify, onEditSection, onSectionAction, onPolicyUpdate, onSave, onPublish }) {
  const document = content[policyKey]
  const safeUrl = (value) => {
    const trimmed = value.trim()
    if (!trimmed || trimmed.startsWith('#') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) return true
    try {
      return ['https:', 'http:', 'mailto:', 'tel:'].includes(new URL(trimmed).protocol)
    } catch {
      return false
    }
  }
  const saveHero = (publish) => {
    if (!safeUrl(content.hero.primaryUrl || '') || !safeUrl(content.hero.secondaryUrl || '')) {
      onNotify('Enter a valid website URL, page path, email link, or phone link for each button.', 'error')
      return
    }
    if (publish) onPublish()
    else onSave()
  }
  const uploadFiles = (files) => {
    const [file] = files || []
    if (file) onUploadImage(file)
  }
  const dropImage = (event) => {
    event.preventDefault()
    uploadFiles(event.dataTransfer.files)
  }
  return (
    <section className="admin-workspace">
      <div className="admin-page-heading"><div><p className="admin-kicker">Website settings</p><h2>Page content</h2><p>Edit copy, save a draft, and publish when it’s ready.</p></div><div className="admin-page-heading__actions"><span>Last published {displayDate(updatedAt)}</span>{section !== 'published' && <><button className="admin-secondary-button" type="button" onClick={() => saveHero(false)} disabled={busy}>Save draft</button><button className="admin-primary-button" type="button" onClick={() => saveHero(true)} disabled={busy}>Publish changes</button></>}</div></div>
      <div className="admin-editor-tabs" role="tablist" aria-label="Content section">
        {[
          ['hero', 'Hero'], ['faqs', 'FAQs'], ['policies', 'Policies'], ['published', 'Published'],
        ].map(([id, label]) => <button type="button" role="tab" aria-selected={section === id} className={section === id ? 'is-active' : ''} key={id} onClick={() => onSectionChange(id)}>{label}</button>)}
      </div>
      {section === 'published' && <PublishedContentManager publishedContent={publishedContent || {}} draftContent={draftContent || {}} busy={busy} onEdit={onEditSection} onAction={onSectionAction} />}
      {section === 'hero' && (
        <div className="admin-content-grid">
          <div className="admin-panel admin-editor-form">
            <h3>Hero</h3>
            <label>Current hero image URL<input value={content.hero.image} onChange={(event) => onHeroUpdate('image', event.target.value)} /></label>
            <label className="admin-upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={dropImage}>
              <input className="admin-upload-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { uploadFiles(event.target.files); event.target.value = '' }} />
              <span className="admin-upload-dropzone__icon"><Icon name="image" size={22} /></span>
              <span className="admin-upload-dropzone__copy"><strong>Drop an image here or browse files</strong><small>JPG, PNG, or WebP. Maximum 5 MB.</small></span>
            </label>
            <label>Tagline<input value={content.hero.eyebrow} onChange={(event) => onHeroUpdate('eyebrow', event.target.value)} maxLength="120" /></label>
            <label>Headline<textarea value={content.hero.headline} onChange={(event) => onHeroUpdate('headline', event.target.value)} rows="2" maxLength="180" /></label>
            <label>Introduction<textarea value={content.hero.introduction} onChange={(event) => onHeroUpdate('introduction', event.target.value)} rows="3" maxLength="500" /></label>
            <label>Main button label<input value={content.hero.primaryLabel} onChange={(event) => onHeroUpdate('primaryLabel', event.target.value)} maxLength="60" /></label>
            <label>Main button URL<input value={content.hero.primaryUrl || ''} onChange={(event) => onHeroUpdate('primaryUrl', event.target.value)} placeholder="#contact or https://example.com" /></label>
            <label>Client app button label<input value={content.hero.secondaryLabel} onChange={(event) => onHeroUpdate('secondaryLabel', event.target.value)} maxLength="60" /></label>
            <label>Client app button URL<input value={content.hero.secondaryUrl || ''} onChange={(event) => onHeroUpdate('secondaryUrl', event.target.value)} placeholder="https://your-client-app.com" /></label>
          </div>
          <div className="admin-panel admin-preview">
            <p className="admin-kicker">Live preview</p>
            <img className="admin-preview__thumbnail" src={content.hero.image} alt="Current hero image preview" />
            <div className="admin-preview__image" style={{ backgroundImage: `linear-gradient(90deg,rgba(2,53,12,.78),rgba(2,53,12,.18)),url("${content.hero.image}")` }}>
              <small>{content.hero.eyebrow}</small><strong>{content.hero.headline}</strong><p>{content.hero.introduction}</p>
              <span>{content.hero.primaryLabel}</span><span className="admin-preview__secondary">{content.hero.secondaryLabel}</span>
            </div>
          </div>
        </div>
      )}
      {section === 'faqs' && <div className="admin-panel admin-faq-editor"><div className="admin-panel__heading"><div><p className="admin-kicker">Questions and answers</p><h3>FAQs</h3></div><button className="admin-secondary-button" type="button" onClick={() => onUpdate('faqs', [...content.faqs, { question: '', answer: '' }])}>Add a question</button></div>{content.faqs.map((faq, index) => <div className="admin-faq-row" key={`faq-${index}`}><label>Question<input value={faq.question} onChange={(event) => onUpdate('faqs', content.faqs.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item))} maxLength="200" /></label><label>Answer<textarea value={faq.answer} onChange={(event) => onUpdate('faqs', content.faqs.map((item, itemIndex) => itemIndex === index ? { ...item, answer: event.target.value } : item))} rows="2" maxLength="1000" /></label><button className="admin-icon-button" type="button" aria-label="Remove question" onClick={() => onUpdate('faqs', content.faqs.filter((_, itemIndex) => itemIndex !== index))}><Icon name="close" size={17} /></button></div>)}</div>}
      {section === 'policies' && <div className="admin-panel admin-policy-editor"><div className="admin-panel__heading"><div><p className="admin-kicker">Legal content</p><h3>Policies & usage</h3></div><div className="admin-segmented"><button type="button" className={policyKey === 'privacyPolicy' ? 'is-active' : ''} onClick={() => onPolicyChange('privacyPolicy')}>Privacy</button><button type="button" className={policyKey === 'termsOfUse' ? 'is-active' : ''} onClick={() => onPolicyChange('termsOfUse')}>Terms</button></div></div><label>Document title<input value={document.title} onChange={(event) => onPolicyUpdate(policyKey, { title: event.target.value })} /></label><label>Updated date<input value={document.updated} onChange={(event) => onPolicyUpdate(policyKey, { updated: event.target.value })} /></label><label>Introduction<textarea value={document.introduction} onChange={(event) => onPolicyUpdate(policyKey, { introduction: event.target.value })} rows="3" /></label>{document.sections.map((item, index) => <div className="admin-policy-section" key={`${policyKey}-${index}`}><label>Section title<input value={item.title} onChange={(event) => onPolicyUpdate(policyKey, { sections: document.sections.map((part, partIndex) => partIndex === index ? { ...part, title: event.target.value } : part) })} /></label><label>Section text<textarea value={item.paragraphs.join('\n\n')} onChange={(event) => onPolicyUpdate(policyKey, { sections: document.sections.map((part, partIndex) => partIndex === index ? { ...part, paragraphs: event.target.value.split(/\n\s*\n/).filter(Boolean) } : part) })} rows="4" /></label></div>)}</div>}
    </section>
  )
}

function PublishedContentManager({ publishedContent, draftContent, busy, onEdit, onAction }) {
  function getSummary(key, value) {
    if (!value) return 'No saved content yet.'
    if (key === 'hero') return value.headline || 'Hero content saved.'
    if (key === 'faqs') return `${value.length} question${value.length === 1 ? '' : 's'} saved.`
    return value.title || 'Policy content saved.'
  }

  return (
    <section className="admin-published-manager">
      <div className="admin-published-manager__intro"><p className="admin-kicker">Live and draft versions</p><h3>Website sections</h3><p>Manage each section independently. Unpublishing keeps its draft; deleting removes both versions.</p></div>
      <div className="admin-published-manager__list">
        {editableSections.map((section) => {
          const isPublished = Object.prototype.hasOwnProperty.call(publishedContent, section.key)
          const hasDraft = Object.prototype.hasOwnProperty.call(draftContent, section.key)
          const savedValue = draftContent[section.key] ?? publishedContent[section.key]
          const status = isPublished ? (hasDraft ? 'Live · draft changes' : 'Published') : (hasDraft ? 'Draft only' : 'Not configured')

          return (
            <article className="admin-published-item" key={section.key}>
              {section.key === 'hero' && publishedContent.hero?.image
                ? <img className="admin-published-item__image" src={publishedContent.hero.image} alt="Published hero" />
                : <span className="admin-published-item__icon"><Icon name={section.key === 'faqs' ? 'spark' : section.key === 'hero' ? 'image' : 'leaf'} size={19} /></span>}
              <div className="admin-published-item__copy"><div><h4>{section.label}</h4><span className={`admin-status-pill${isPublished ? ' is-replied' : ''}`}>{status}</span></div><p>{getSummary(section.key, savedValue)}</p></div>
              <div className="admin-published-item__actions">
                <button className="admin-secondary-button" type="button" onClick={() => onEdit(section.key)}>{isPublished ? 'Edit live' : hasDraft ? 'Edit draft' : 'Add content'}</button>
                {hasDraft && <button className="admin-primary-button" type="button" disabled={busy} onClick={() => onAction(section.key, 'publish')}>{isPublished ? 'Publish draft' : 'Publish'}</button>}
                {isPublished && <button className="admin-secondary-button" type="button" disabled={busy} onClick={() => onAction(section.key, 'unpublish')}>Unpublish</button>}
                {(hasDraft || isPublished) && <button className="admin-danger-button" type="button" disabled={busy} onClick={() => onAction(section.key, 'delete')}>Delete</button>}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function InboxView({ requests, filter, selected, onFilterChange, onSelect, onStatus, onDelete }) {
  const visibleRequests = requests.filter((request) => filter === 'all' || (filter === 'new' ? request.status !== 'replied' : request.status === 'replied'))
  const isEmail = selected?.contact?.includes('@')
  const replyHref = isEmail ? `mailto:${selected.contact}?subject=${encodeURIComponent('Re: your Cedar Healthcare care request')}` : `tel:${(selected?.contact || '').replace(/[^+\d]/g, '')}`
  const whatsappHref = selected?.whatsapp_number
    ? `https://wa.me/${selected.whatsapp_number}?text=${encodeURIComponent(`Hello ${selected.full_name}, this is Cedar Healthcare following up on your care request.`)}`
    : ''
  return (
    <section className="admin-workspace"><div className="admin-page-heading"><div><p className="admin-kicker">Contact form</p><h2>Enquiries</h2><p>Respond to families and keep request status current.</p></div><div className="admin-segmented"><button type="button" className={filter === 'new' ? 'is-active' : ''} onClick={() => onFilterChange('new')}>New</button><button type="button" className={filter === 'replied' ? 'is-active' : ''} onClick={() => onFilterChange('replied')}>Replied</button><button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => onFilterChange('all')}>All</button></div></div>
      <div className="admin-inbox"><div className="admin-inbox__list">{visibleRequests.length ? visibleRequests.map((request) => <button type="button" className={`admin-request-row${selected?.id === request.id ? ' is-selected' : ''}`} key={request.id} onClick={() => onSelect(request)}><span className={`admin-status-dot${request.status === 'replied' ? ' is-replied' : ''}`} /><span><strong>{request.full_name}</strong><small>{request.contact} · {displayDate(request.created_at)}</small><span>{request.message}</span></span><em>{request.status === 'replied' ? 'Replied' : 'New'}</em></button>) : <div className="admin-empty-state"><Icon name="mail" size={26} /><h3>Your inbox is clear</h3><p>New website enquiries will appear here.</p></div>}</div>
        <div className="admin-inbox__detail">{selected ? <><div className="admin-inbox__detail-head"><div><p className="admin-kicker">Received {displayDate(selected.created_at, { dateStyle: 'full', timeStyle: 'short' })}</p><h3>{selected.full_name}</h3><a href={replyHref}>{selected.contact}</a>{selected.whatsapp_number && <p><Icon name="whatsapp" size={15} /> +{selected.whatsapp_number}</p>}</div><span className={`admin-status-pill${selected.status === 'replied' ? ' is-replied' : ''}`}>{selected.status === 'replied' ? 'Replied' : 'New'}</span></div><p className="admin-message">{selected.message}</p><div className="admin-inbox__actions"><a className="admin-primary-button" href={replyHref}><Icon name={isEmail ? 'mail' : 'phone'} size={16} /> Reply {isEmail ? 'by email' : 'by phone'}</a>{whatsappHref && <a className="admin-secondary-button" href={whatsappHref} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} /> WhatsApp</a>}<button className="admin-secondary-button" type="button" onClick={() => onStatus(selected, selected.status === 'replied' ? 'new' : 'replied')}>{selected.status === 'replied' ? 'Mark as new' : 'Mark as replied'}</button><button className="admin-danger-button" type="button" onClick={() => onDelete(selected)}>Delete</button></div></> : <div className="admin-empty-state"><h3>Select an enquiry</h3><p>Choose a message to see its contact details.</p></div>}</div></div>
    </section>
  )
}

function ReviewsView({ filter, pending, testimonials, onFilterChange, onPublish, onToggle, onEdit, onDelete }) {
  const filteredTestimonials = testimonials.filter((item) => filter === 'published' ? item.is_published : !item.is_published)
  const items = filter === 'pending' ? pending : filteredTestimonials
  return (
    <section className="admin-workspace"><div className="admin-page-heading"><div><p className="admin-kicker">Stories from Cedar families</p><h2>Testimonials</h2><p>Review every story before it appears on the public site.</p></div></div><div className="admin-review-tabs"><button type="button" className={filter === 'pending' ? 'is-active' : ''} onClick={() => onFilterChange('pending')}>Pending <span>{pending.length}</span></button><button type="button" className={filter === 'published' ? 'is-active' : ''} onClick={() => onFilterChange('published')}>Published</button><button type="button" className={filter === 'hidden' ? 'is-active' : ''} onClick={() => onFilterChange('hidden')}>Unpublished</button></div>
      {items.length ? <div className="admin-review-grid">{items.map((item) => { const isPending = filter === 'pending'; const isPublished = item.is_published; return <article className="admin-review-card" key={`${isPending ? 'pending' : 'saved'}-${item.id}`}><div className="admin-review-card__top"><div className="admin-review-avatar">{(item.name || 'C').slice(0, 1).toUpperCase()}</div><div><strong>{item.name}</strong><small>{item.relationship}{item.location ? ` · ${item.location}` : ''}</small></div><span className={`admin-status-pill${isPublished ? ' is-replied' : ''}`}>{isPending ? 'Pending' : isPublished ? 'Published' : 'Unpublished'}</span></div><div className="admin-stars" aria-label={`${item.rating || 5} out of 5 stars`}>{'★'.repeat(item.rating || 5)}<span>{'★'.repeat(5 - (item.rating || 5))}</span></div><p>{item.story}</p><small className="admin-review-card__date">{displayDate(item.created_at)}</small><div className="admin-review-card__actions">{isPending ? <button className="admin-primary-button" type="button" onClick={() => onPublish(item)}>Publish</button> : <button className="admin-secondary-button" type="button" onClick={() => onToggle(item, !isPublished)}>{isPublished ? 'Unpublish' : 'Publish'}</button>}<button className="admin-secondary-button" type="button" onClick={() => onEdit({ ...item, source: isPending ? 'pending' : 'saved' })}>Edit</button><button className="admin-danger-button" type="button" onClick={() => onDelete(item, isPending ? 'pending' : 'saved')}>Delete</button></div></article>})}</div> : <div className="admin-empty-state"><Icon name="quote" size={27} /><h3>No testimonials here</h3><p>Submissions and published stories will appear in their respective lists.</p></div>}
    </section>
  )
}

function NewsletterImagePanel({ draft, busy, onUpdate, onUpload, onInsert }) {
  return (
    <section className="admin-panel admin-newsletter-image-panel">
      <div className="admin-newsletter-image-panel__heading"><div><p className="admin-kicker">Newsletter content</p><h3>Add an image</h3></div><small>Images load from their public HTTPS URL in email apps.</small></div>
      <div className="admin-newsletter-image-panel__controls">
        <label>Image URL<input type="url" value={draft.imageUrl || ''} onChange={(event) => onUpdate('imageUrl', event.target.value)} placeholder="https://example.com/image.jpg" /></label>
        <label>Image description<input value={draft.imageAlt || ''} onChange={(event) => onUpdate('imageAlt', event.target.value)} maxLength="160" placeholder="Describe the image" /></label>
        <label className="admin-upload-dropzone admin-newsletter-image-upload">
          <input className="admin-upload-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const [file] = event.target.files || []; if (file) onUpload(file); event.target.value = '' }} />
          <span className="admin-upload-dropzone__icon"><Icon name="image" size={20} /></span>
          <span className="admin-upload-dropzone__copy"><strong>Upload image</strong><small>JPG, PNG, or WebP · Max 5 MB</small></span>
        </label>
        <button className="admin-secondary-button" type="button" disabled={busy || !draft.imageUrl} onClick={onInsert}>Insert image into message</button>
      </div>
      {draft.imageUrl && <img className="admin-newsletter-image-preview" src={draft.imageUrl} alt={draft.imageAlt || 'Newsletter image preview'} />}
    </section>
  )
}

function NewsletterTemplatePreview({ draft }) {
  const lines = (draft.body || '').split(/\r?\n/)
  const renderLine = (line, index) => {
    const image = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/.exec(line.trim())
    if (image) {
      try {
        if (new URL(image[2]).protocol === 'https:') {
          return <img className="admin-email-preview__image" src={image[2]} alt={image[1]} key={`image-${index}`} />
        }
      } catch {
        return <p className="admin-email-preview__text" key={`text-${index}`}>{line}</p>
      }
    }
    if (!line.trim()) return <div className="admin-email-preview__space" key={`space-${index}`} />

    const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g)
    return <p className="admin-email-preview__text" key={`line-${index}`}>{tokens.map((token, tokenIndex) => {
      if (token.startsWith('**') && token.endsWith('**')) return <strong key={tokenIndex}>{token.slice(2, -2)}</strong>
      if (token.startsWith('*') && token.endsWith('*')) return <em key={tokenIndex}>{token.slice(1, -1)}</em>
      const link = /^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/.exec(token)
      if (link) return <a href={link[2]} key={tokenIndex}>{link[1]}</a>
      return token
    })}</p>
  }

  return (
    <section className="admin-newsletter-preview-wrap">
      <div className="admin-published-manager__intro"><p className="admin-kicker">Live draft preview</p><h3>Email template</h3><p>This is how the newsletter will appear with Cedar branding.</p></div>
      <article className="admin-email-preview">
        <header><img src={cedarLogo} alt="Cedar Healthcare, LLC" /></header>
        <div className="admin-email-preview__body">
          <h2>{draft.subject || 'Your newsletter subject'}</h2>
          <p className="admin-email-preview__intro">A thoughtful update from Cedar Healthcare.</p>
          {draft.body.trim() ? lines.map(renderLine) : <p className="admin-email-preview__placeholder">Your newsletter message and images will appear here.</p>}
          <a className="admin-email-preview__cta" href={publicSiteUrl}>Visit Cedar Healthcare</a>
        </div>
        <footer>
          <nav aria-label="Email footer links"><a href={publicSiteUrl}>Visit Cedar</a><a href={`${publicSiteUrl}/#services`}>Our services</a><a href={`${publicSiteUrl}/#stories`}>Stories</a><a href={`${publicSiteUrl}/#contact`}>Request care</a><a href={`${publicSiteUrl}/privacy`}>Privacy policy</a><a href={`${publicSiteUrl}/terms`}>Terms of use</a></nav>
          <div className="admin-email-preview__socials"><a href={`https://www.facebook.com/sharer/sharer.php?u=${publicSiteShareUrl}`} aria-label="Share Cedar on Facebook">f</a><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${publicSiteShareUrl}`} aria-label="Share Cedar on LinkedIn">in</a><a href={`https://wa.me/?text=${publicSiteShareMessage}`} aria-label="Share Cedar on WhatsApp">wa</a></div>
          <small>Cedar Healthcare, LLC · 7412 N Western Ave, Chicago, IL 60645<br />224-204-3281 · cedarhealthcarehome@gmail.com</small>
        </footer>
      </article>
    </section>
  )
}

function NewsletterView({ draft, subscribers, campaigns, busy, onUpdate, onSend }) {
  return (
    <section className="admin-workspace"><div className="admin-page-heading"><div><p className="admin-kicker">Cedar notes</p><h2>Newsletter</h2><p>Write an update, send yourself a test, then send it to subscribers.</p></div><span className="admin-audience-count"><strong>{subscribers.length}</strong> subscribers</span></div><div className="admin-newsletter-grid"><div className="admin-panel admin-newsletter-compose"><label>Subject<input value={draft.subject} onChange={(event) => onUpdate('subject', event.target.value)} maxLength="200" placeholder="A little care in your inbox" /></label><label>Message<textarea value={draft.body} onChange={(event) => onUpdate('body', event.target.value)} rows="12" maxLength="10000" placeholder="Write your update…" /></label><div className="admin-compose-footer"><small>Draft saves automatically on this device.</small><div><button className="admin-secondary-button" type="button" disabled={busy} onClick={() => onSend('test')}>Send test to me</button><button className="admin-primary-button" type="button" disabled={busy || !subscribers.length} onClick={() => onSend('send')}>Send to all subscribers</button></div></div></div><aside className="admin-panel admin-newsletter-aside"><p className="admin-kicker">Audience</p><h3>{subscribers.length} subscribers</h3><p>People who signed up through the Cedar public website.</p><div className="admin-subscriber-list">{subscribers.slice(0, 8).map((subscriber) => <div key={subscriber.id}><span>{subscriber.email.slice(0, 1).toUpperCase()}</span><strong>{subscriber.email}</strong><small>{displayDate(subscriber.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</small></div>)}{!subscribers.length && <small>No subscribers yet.</small>}</div></aside></div><div className="admin-panel admin-campaign-history"><p className="admin-kicker">Recent sends</p><h3>Past newsletters</h3>{campaigns.length ? campaigns.map((campaign) => <div className="admin-campaign-row" key={campaign.id}><span><strong>{campaign.subject}</strong><small>{displayDate(campaign.sent_at, { dateStyle: 'medium', timeStyle: 'short' })}</small></span><em>{campaign.recipient_count} recipients</em></div>) : <p className="admin-muted">Sent campaigns will appear here.</p>}</div></section>
  )
}

export default AdminPage