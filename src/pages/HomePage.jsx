import { useEffect, useState } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { Brand, FormStatus, Icon, PortalLink, SearchableSelect } from '../components/UI.jsx'
import { defaultSiteContent } from '../data/adminDefaults.js'
import { useToast } from '../components/ToastProvider.jsx'
import { supabase } from '../supabaseClient.js'

const phoneNumber = '224-204-3281'
const phoneLink = 'tel:+12242043281'
const emailAddress = 'cedarhealthcarehome@gmail.com'
const contactEmailAddresses = [
  'support@cedarhealthcarehome.com',
  'admin@cedarhealthcarehome.com',
  'info@cedarhealthcarehome.com',
  emailAddress,
]
const whatsappContactUrl = `https://wa.me/12242043281?text=${encodeURIComponent('Hello Cedar Healthcare, I would like to learn more about your home care services.')}`
const cardAosAnimations = ['fade-up', 'zoom-in', 'fade-down']
const cardAosByKey = new Map()
const fallbackStorySlides = [
  { id: 'cedar-home', story: 'Home is more than a place. It’s where people feel like themselves.', name: 'Cedar Healthcare', relationship: 'Our approach', isFallback: true },
  { id: 'cedar-independence', story: 'Care should protect your independence and make room for what matters most.', name: 'Cedar Healthcare', relationship: 'Our promise', isFallback: true },
  { id: 'cedar-seen', story: 'Good care begins with being seen.', name: 'Cedar Healthcare', relationship: 'Our belief', isFallback: true },
  { id: 'cedar-routine', story: 'Thoughtful everyday support should fit your routine.', name: 'Cedar Healthcare', relationship: 'Everyday care', isFallback: true },
  { id: 'cedar-listen', story: 'A care team that listens and follows through.', name: 'Cedar Healthcare', relationship: 'Here when it matters', isFallback: true },
]

function getCardAosAnimation(key) {
  if (!cardAosByKey.has(key)) {
    cardAosByKey.set(key, cardAosAnimations[Math.floor(Math.random() * cardAosAnimations.length)])
  }
  return cardAosByKey.get(key)
}

async function fetchPublishedTestimonials() {
  try {
    const apiResponse = await fetch('/api/testimonials')
    if (apiResponse.ok && apiResponse.headers.get('content-type')?.includes('application/json')) {
      return apiResponse.json()
    }
  } catch {
    // Vite's static dev server does not provide Vercel API routes.
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !publishableKey) throw new Error('Stories are temporarily unavailable.')

  const url = new URL('/rest/v1/testimonials', supabaseUrl)
  url.searchParams.set('select', 'id,name,relationship,story,rating,location,created_at')
  url.searchParams.set('is_published', 'eq.true')
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', '5')
  const response = await fetch(url, { headers: { apikey: publishableKey } })
  if (!response.ok) throw new Error('Stories are temporarily unavailable.')
  return { testimonials: await response.json() }
}

const heroSlideCandidates = [
  {
    image: '/cedar-logo.jpeg',
    alt: 'Cedar Healthcare logo',
    position: 'center',
    mobilePosition: 'center',
    brandSlide: true,
    eyebrow: 'Personalized home care in Chicago',
    title: <>Support shaped<br />around <em>your life.</em></>,
    description: 'From daily routines to changing health needs, Cedar offers thoughtful support to help you feel comfortable, connected, and cared for at home.',
    imageCaption: 'Cedar Healthcare, LLC',
    noteTitle: 'Care that fits your day.',
    noteDescription: 'Here when it matters.',
  },
  {
    image: 'https://images.pexels.com/photos/8088906/pexels-photo-8088906.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A caregiver sharing a reassuring moment with an older adult',
    position: '52% 40%',
    mobilePosition: '55% 38%',
    eyebrow: 'Personal support, every day',
    title: <>Care that meets<br />you <em>where you are.</em></>,
    description: 'From daily routines to changing health needs, our team is here with care that feels personal.',
    imageCaption: 'Care made personal',
    noteTitle: 'Attentive, everyday care.',
    noteDescription: 'Support for your daily needs.',
  },
  {
    image: 'https://images.pexels.com/photos/6129242/pexels-photo-6129242.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A caregiver comforting a client at home',
    position: '48% 42%',
    mobilePosition: '38% 36%',
    eyebrow: 'Personal care, your way',
    title: <>Support that<br />respects <em>your pace.</em></>,
    description: 'From morning routines to winding down, care should fit the way you want to live.',
    imageCaption: 'Care that fits your day',
    noteTitle: 'Your routine, your way.',
    noteDescription: 'Support that feels comfortable.',
  },
  {
    image: 'https://images.pexels.com/photos/6129106/pexels-photo-6129106.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A clinician speaking with a client while holding a clipboard',
    position: '48% 38%',
    mobilePosition: '55% 30%',
    eyebrow: 'Care starts with listening',
    title: <>Your needs<br />come <em>first.</em></>,
    description: 'We take time to understand what matters to you and your family before care begins.',
    imageCaption: 'A conversation that matters',
    noteTitle: 'We listen first.',
    noteDescription: 'Care shaped around you.',
  },
  {
    image: 'https://images.pexels.com/photos/8088906/pexels-photo-8088906.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A caregiver sharing a reassuring moment with an older adult',
    position: '47% 42%',
    mobilePosition: '58% 34%',
    eyebrow: 'Here through every season',
    title: <>Steady support<br />for <em>changing needs.</em></>,
    description: 'When health needs change, a familiar and dependable care team can make each day feel more manageable.',
    imageCaption: 'Steady support, day by day',
    noteTitle: 'A team by your side.',
    noteDescription: 'Through every change.',
  },
  {
    image: 'https://images.pexels.com/photos/7446778/pexels-photo-7446778.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A care professional speaking with clients around a table',
    position: '52% 43%',
    mobilePosition: '56% 37%',
    eyebrow: 'A little room to breathe',
    title: <>More support<br />for the <em>whole family.</em></>,
    description: 'Thoughtful help at home can give loved ones more time to connect and less to manage alone.',
    imageCaption: 'Support for everyone',
    noteTitle: 'You are not alone.',
    noteDescription: 'We are here to help.',
  },
  {
    image: 'https://images.pexels.com/photos/6129106/pexels-photo-6129106.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A clinician speaking with a client while holding a clipboard',
    position: '62% 34%',
    mobilePosition: '64% 30%',
    eyebrow: 'A plan made for you',
    title: <>Care that sees<br /><em>the whole person.</em></>,
    description: 'Your preferences, routines, and goals all belong in a care plan that feels personal.',
    imageCaption: 'Care made personal',
    noteTitle: 'Every detail matters.',
    noteDescription: 'Your voice shapes the plan.',
  },
  {
    image: 'https://images.pexels.com/photos/6129242/pexels-photo-6129242.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A caregiver comforting a client at home',
    position: '62% 39%',
    mobilePosition: '28% 34%',
    eyebrow: 'Comfort in familiar places',
    title: <>Feel more at ease<br />right <em>where you are.</em></>,
    description: 'Home can remain a place of comfort with practical, compassionate support close by.',
    imageCaption: 'Comfort at home',
    noteTitle: 'Familiar feels good.',
    noteDescription: 'Care close to home.',
  },
  {
    image: 'https://images.pexels.com/photos/8088906/pexels-photo-8088906.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A caregiver sharing a reassuring moment with an older adult',
    position: '42% 42%',
    mobilePosition: '48% 38%',
    eyebrow: 'Companionship that connects',
    title: <>Good company.<br /><em>Brighter days.</em></>,
    description: 'Meaningful conversation and a reassuring presence can make ordinary moments feel special.',
    imageCaption: 'A caring presence',
    noteTitle: 'Connection matters.',
    noteDescription: 'A friendly face each day.',
  },
  {
    image: 'https://images.pexels.com/photos/7446778/pexels-photo-7446778.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A care professional speaking with clients around a table',
    position: '43% 40%',
    mobilePosition: '46% 34%',
    eyebrow: 'Practical help, thoughtful care',
    title: <>A little help<br />with <em>everyday life.</em></>,
    description: 'From meals to light household tasks, everyday assistance can help home feel easier.',
    imageCaption: 'Help with the everyday',
    noteTitle: 'The little things count.',
    noteDescription: 'Everyday help at home.',
  },
  {
    image: 'https://images.pexels.com/photos/6129106/pexels-photo-6129106.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A clinician speaking with a client while holding a clipboard',
    position: '54% 44%',
    mobilePosition: '49% 38%',
    eyebrow: 'Professional care, human connection',
    title: <>Skilled support.<br /><em>Personal attention.</em></>,
    description: 'Professional health support works best when it comes with patience, respect, and clear communication.',
    imageCaption: 'Professional and personal',
    noteTitle: 'Care you can count on.',
    noteDescription: 'Skilled, compassionate support.',
  },
  {
    image: 'https://images.pexels.com/photos/8088906/pexels-photo-8088906.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A caregiver sharing a reassuring moment with an older adult',
    position: '56% 32%',
    mobilePosition: '58% 32%',
    eyebrow: 'A team that follows through',
    title: <>Thoughtful care.<br /><em>Peace of mind.</em></>,
    description: 'We listen, communicate, and show up with steady support for the people who matter most.',
    imageCaption: 'A team you can trust',
    noteTitle: 'Here when it matters.',
    noteDescription: 'A little more peace of mind.',
  },
  {
    image: 'https://images.pexels.com/photos/7446778/pexels-photo-7446778.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A care professional speaking with clients around a table',
    position: '58% 34%',
    mobilePosition: '52% 42%',
    eyebrow: 'Start with a conversation',
    title: <>Let’s find care<br />that feels <em>right.</em></>,
    description: 'Tell us what would help. We are ready to listen and talk through the next step together.',
    imageCaption: 'Let’s talk about care',
    noteTitle: 'A conversation can help.',
    noteDescription: 'We are ready when you are.',
  },
  {
    image: 'https://images.pexels.com/photos/18459193/pexels-photo-18459193.jpeg?auto=compress&cs=tinysrgb&w=1400',
    alt: 'A caregiver serving tea to an older woman at home',
    position: '52% 38%',
    mobilePosition: '52% 35%',
    eyebrow: 'Thoughtful help in everyday moments',
    title: <>A little help.<br />A lot more <em>comfort.</em></>,
    description: 'Practical, personal support can make familiar routines feel easier and more reassuring.',
    imageCaption: 'Small moments, thoughtful care',
    noteTitle: 'A thoughtful touch.',
    noteDescription: 'Everyday help at home.',
  },
  {
    image: 'https://images.pexels.com/photos/7345476/pexels-photo-7345476.jpeg?auto=compress&cs=tinysrgb&w=1400',
    alt: 'A healthcare worker checking an older man’s blood pressure at home',
    position: '50% 40%',
    mobilePosition: '52% 36%',
    eyebrow: 'Professional care, human connection',
    title: <>Skilled support.<br /><em>Personal attention.</em></>,
    description: 'Health support delivered with patience, respect, and clear communication.',
    imageCaption: 'Professional and personal',
    noteTitle: 'Care you can count on.',
    noteDescription: 'Skilled, compassionate support.',
  },
]
const heroSlides = heroSlideCandidates.reduce((uniqueSlides, slide) => {
  if (slide.brandSlide || !uniqueSlides.some((item) => item.image === slide.image)) uniqueSlides.push(slide)
  return uniqueSlides
}, [])
const services = [
  {
    title: 'Personal care',
    description: 'Respectful help with bathing, dressing, grooming, mobility, and the daily routines that matter to you.',
    icon: 'care',
  },
  {
    title: 'Skilled nursing',
    description: 'Skilled health support and wellness check-ins, delivered with clear communication and personal attention.',
    icon: 'health',
  },
  {
    title: 'Specialized care',
    description: 'Personalized support for chronic conditions, recovery after a hospital stay, and changing health needs.',
    icon: 'heart',
  },
  {
    title: 'Companionship',
    description: 'Friendly company, conversation, and a reassuring presence that can bring more connection to the day.',
    icon: 'people',
  },
  {
    title: 'Homemaker services',
    description: 'Practical help with meal preparation, light housekeeping, and everyday errands around the home.',
    icon: 'home',
  },
  {
    title: '24/7 availability',
    description: 'Talk with our team about scheduling options, including around-the-clock support, for your family’s needs.',
    icon: 'clock',
  },
]

function HomePage() {
  const { showToast } = useToast()
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0)
  const [testimonialCarouselPaused, setTestimonialCarouselPaused] = useState(false)
  const [requestStatus, setRequestStatus] = useState(null)
  const [newsletterStatus, setNewsletterStatus] = useState(null)
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const [storyRating, setStoryRating] = useState(5)
  const [storyStatus, setStoryStatus] = useState(null)
  const [testimonials, setTestimonials] = useState([])
  const [storiesError, setStoriesError] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [siteContent, setSiteContent] = useState(null)
  const [caregiverForm, setCaregiverForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    careType: '',
  })
  const [caregiverSubmitting, setCaregiverSubmitting] = useState(false)
  const [caregiverStatus, setCaregiverStatus] = useState(null)
  const [caregiverReceipt, setCaregiverReceipt] = useState(null)

  useEffect(() => {
    const root = document.documentElement
    let initialized = false
    if (
      typeof window.matchMedia !== 'function'
      || typeof window.IntersectionObserver !== 'function'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return undefined

    try {
      AOS.init({ duration: 750, easing: 'ease-out-cubic', once: true, offset: 70 })
      root.classList.add('aos-ready')
      initialized = true
    } catch (error) {
      console.error('Scroll animations could not be initialized.', error)
      root.classList.remove('aos-ready')
    }

    return () => {
      if (!initialized) return
      root.classList.remove('aos-ready')
      AOS.refreshHard()
    }
  }, [])

  useEffect(() => {
    if (document.documentElement.classList.contains('aos-ready')) AOS.refreshHard()
  }, [testimonials])

  useEffect(() => {
    const slideCount = testimonials.length + fallbackStorySlides.length
    if (
      slideCount < 2
      || testimonialCarouselPaused
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) return undefined

    const intervalId = window.setInterval(() => {
      setActiveTestimonialIndex((currentIndex) => (currentIndex + 1) % slideCount)
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [testimonials.length, testimonialCarouselPaused])

  useEffect(() => {
    let active = true
    fetchPublishedTestimonials()
      .then((data) => {
        if (active) setTestimonials(data.testimonials)
      })
      .catch(() => {
        if (active) setStoriesError(true)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/site-content')
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && result?.content && Object.keys(result.content).length) setSiteContent(result.content)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActiveHeroSlide((currentSlide) => (currentSlide + 1) % heroSlides.length)
    }, 8000)

    return () => window.clearTimeout(timeoutId)
  }, [activeHeroSlide])

  useEffect(() => {
    const updateBackToTopVisibility = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true })
    updateBackToTopVisibility()
    return () => window.removeEventListener('scroll', updateBackToTopVisibility)
  }, [])

  useEffect(() => {
    if (window.localStorage.getItem('cedar-newsletter-subscribed') === 'true') return undefined

    const timeoutId = window.setTimeout(() => {
      setNewsletterModalOpen(true)
    }, 12000)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (!newsletterModalOpen && !storyOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (storyOpen) {
        setStoryOpen(false)
      } else if (newsletterModalOpen) {
        setNewsletterModalOpen(false)
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [newsletterModalOpen, storyOpen])

  async function submitRequest(event) {
    event.preventDefault()
    setRequestStatus({ type: 'loading', message: 'Sending your request…' })
    const form = event.currentTarget
    const formData = new FormData(form)
    try {
      const response = await fetch('/api/request-care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Your request could not be sent. Please call us instead.')
      form.reset()
      setRequestStatus({
        type: result.notificationSent ? 'success' : 'notice',
        message: result.notificationSent
          ? 'Thank you. Your care request is on its way to our team.'
          : 'Your request was saved, but our team could not be notified by email. Please call us if your request is urgent.',
      })
      showToast(
        result.notificationSent
          ? 'Your care request was sent. Cedar will be in touch soon.'
          : 'Your request was saved, but Cedar could not be notified by email.',
        result.notificationSent ? 'success' : 'warning',
      )
    } catch (error) {
      setRequestStatus({ type: 'error', message: error.message })
      showToast(error.message || 'We could not send your request. Please try again.', 'error')
    }
  }

  async function submitNewsletter(event) {
    event.preventDefault()
    setNewsletterStatus({ type: 'loading', message: 'Adding you to the list…' })
    const form = event.currentTarget
    const email = new FormData(form).get('email')
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'We could not complete your subscription.')
      form.reset()
      window.localStorage.setItem('cedar-newsletter-subscribed', 'true')
      setNewsletterStatus({
        type: result.emailSent ? 'success' : 'notice',
        message: result.emailSent
          ? 'You’re on the list. Look out for a welcome note from Cedar.'
          : 'You’re subscribed, but we could not send a confirmation email just now.',
      })
      showToast(
        result.emailSent ? 'You’re subscribed. Look out for a welcome note.' : 'You’re subscribed, but we could not send a confirmation email.',
        result.emailSent ? 'success' : 'warning',
      )
    } catch (error) {
      setNewsletterStatus({ type: 'error', message: error.message })
      showToast(error.message || 'We could not complete your subscription. Please try again.', 'error')
    }
  }

  async function submitCaregiverApplication(event) {
    event.preventDefault()
    if (caregiverSubmitting) return
    const formData = new FormData(event.currentTarget)
    if ([caregiverForm.fullName, caregiverForm.email, caregiverForm.phone, caregiverForm.gender, caregiverForm.careType].some((value) => !value.trim())) {
      setCaregiverStatus({ type: 'error', message: 'Please complete all fields before submitting your application.' })
      return
    }

    const payload = {
      full_name: caregiverForm.fullName.trim(),
      email: caregiverForm.email.trim(),
      phone: caregiverForm.phone.trim(),
      gender: caregiverForm.gender,
      role: caregiverForm.careType,
    }

    setCaregiverSubmitting(true)
    setCaregiverStatus({ type: 'loading', message: 'Submitting your application…' })
    try {
      const response = await fetch('/api/caregiver-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, website: formData.get('website') || '' }),
      })
      let result
      try {
        result = await response.json()
      } catch {
        throw new Error('The caregiver service returned an invalid response. Please try again later.')
      }
      if (!response.ok) throw new Error(result.error || 'We could not submit your application right now. Please try again.')

      if (result.referenceCode) {
        setCaregiverReceipt({
          ...payload,
          fullName: payload.full_name,
          referenceCode: result.referenceCode,
          confirmationEmailSent: result.confirmationEmailSent,
          adminNotificationSent: result.adminNotificationSent,
        })
        setCaregiverStatus(null)
      } else {
        setCaregiverReceipt(null)
        setCaregiverStatus({ type: 'success', message: 'Thank you. Your application has been received.' })
      }
      setCaregiverForm({ fullName: '', email: '', phone: '', gender: '', careType: '' })
      showToast('Your caregiver application has been submitted.', 'success')
    } catch (error) {
      setCaregiverStatus({ type: 'error', message: error.message || 'We could not submit your application right now. Please try again.' })
      showToast(error.message || 'We could not submit your application right now.', 'error')
    } finally {
      setCaregiverSubmitting(false)
    }
  }

  async function submitStory(event) {
    event.preventDefault()
    setStoryStatus({ type: 'loading', message: 'Sending your story…' })
    const form = event.currentTarget
    const formData = new FormData(form)
    try {
      const response = await fetch('/api/share-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Your story could not be sent. Please try again.')
      form.reset()
      setStoryRating(5)
      setStoryStatus({
        type: result.notificationSent ? 'success' : 'notice',
        message: result.notificationSent
          ? 'Thank you for sharing. Your story has been sent for review before it is published.'
          : 'Your story was saved, but our team could not be notified. Please call us to follow up.',
      })
      showToast(
        result.notificationSent ? 'Thank you. Your story is on its way for review.' : 'Your story was saved, but the team could not be notified.',
        result.notificationSent ? 'success' : 'warning',
      )
    } catch (error) {
      setStoryStatus({ type: 'error', message: error.message })
      showToast(error.message || 'We could not send your story. Please try again.', 'error')
    }
  }

  const navLinks = [
    ['Services', '#services'],
    ['Our story', '#about'],
    ['Caregivers', '#caregivers'],
    ['Stories', '#stories'],
    ['FAQs', '#faq'],
    ['Contact', '#contact'],
  ]
  const carouselSlides = heroSlides.map((slide, index) => {
    if (index !== 0 || !siteContent?.hero) return slide
    return {
      ...slide,
      image: siteContent.hero.image || slide.image,
      imageCaption: siteContent.hero.eyebrow || slide.imageCaption,
      eyebrow: siteContent.hero.eyebrow || slide.eyebrow,
      title: siteContent.hero.headline || slide.title,
      description: siteContent.hero.introduction || slide.description,
      primaryLabel: siteContent.hero.primaryLabel || slide.primaryLabel,
      primaryUrl: siteContent.hero.primaryUrl || slide.primaryUrl,
      secondaryLabel: siteContent.hero.secondaryLabel || slide.secondaryLabel,
      secondaryUrl: siteContent.hero.secondaryUrl || slide.secondaryUrl,
    }
  })
  const heroSlide = carouselSlides[activeHeroSlide]
  const carouselStories = [...testimonials, ...fallbackStorySlides]
  const carouselIndex = carouselStories.length ? activeTestimonialIndex % carouselStories.length : 0
  const pageFaqs = siteContent?.faqs || defaultSiteContent.faqs
  const shareUrl = typeof window === 'undefined' ? '' : encodeURIComponent(window.location.origin)
  function closeNewsletterModal() {
    setNewsletterModalOpen(false)
  }

  function openStoryForm() {
    setStoryOpen(true)
    setStoryStatus(null)
    setStoryRating(5)
  }

  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            {navLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <div className="site-header__actions">
            <a className="header-phone" href={phoneLink}><Icon name="phone" size={16} /> <span>{phoneNumber}</span></a>
            <a className="header-whatsapp" href={whatsappContactUrl} target="_blank" rel="noreferrer" aria-label="Chat with Cedar Healthcare on WhatsApp"><Icon name="whatsapp" size={19} /><span>WhatsApp</span></a>
            <PortalLink className="button button--small button--green header-app-link" compact />
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="container hero__grid">
            <div className="hero__visual">
              <div className={`hero__image-wrap${heroSlide.brandSlide ? ' hero__image-wrap--brand' : ''}`}>
                {carouselSlides.map((slide, index) => (
                  <img
                    className={`hero__slide${index === activeHeroSlide ? ' hero__slide--active' : ''}${slide.brandSlide ? ' hero__slide--brand' : ''}`}
                    key={`${slide.image}-${index}`}
                    src={slide.image}
                    alt={slide.alt}
                    style={{
                      '--hero-image-position': slide.position,
                      '--hero-image-position-mobile': slide.mobilePosition,
                    }}
                    fetchPriority={index === activeHeroSlide ? 'high' : 'auto'}
                    aria-hidden={index !== activeHeroSlide}
                  />
                ))}
                <div className="hero__copy">
                  <p className="eyebrow"><span className="eyebrow__line" /> {heroSlide.eyebrow}</p>
                  <h1>{heroSlide.title}</h1>
                  <p className="hero__intro">{heroSlide.description}</p>
                  <div className="hero__badges" aria-label="Care standards and caregiver welcome">
                    <span className="hero__badge">Licensed &amp; Insured</span>
                    <span className="hero__badge hero__badge--ghost">Caregivers Welcome</span>
                  </div>
                  <div className="hero__actions">
                    <a className="button button--green" href={heroSlide.primaryUrl || '#contact'}>{heroSlide.primaryLabel || 'Let’s talk about care'}</a>
                    <PortalLink className="button button--outline" label={heroSlide.secondaryLabel} url={heroSlide.secondaryUrl} />
                  </div>
                  <div className="hero__reassurance">
                    <span className="hero__reassurance-icon"><Icon name="heart" size={18} /></span>
                    <span>Care that honors the person<br /><strong>behind every care plan.</strong></span>
                  </div>
                </div>
                <span className="hero__image-tag"><Icon name="spark" size={17} /> {heroSlide.imageCaption}</span>
              </div>
            </div>
          </div>
          <div className="container hero__foot">
            <span>Thoughtful care, right where you belong.</span>
            <a href="#services">Explore what we do <Icon name="arrow" size={15} /></a>
          </div>
        </section>

        <section className="services section-pad" id="services">
          <div className="container">
            <div className="section-heading section-heading--center">
              <p className="eyebrow"><span className="eyebrow__line" /> Home care in Chicago, Illinois</p>
              <h2>Care that fits<br /><em>real life.</em></h2>
              <p>From everyday assistance to skilled and specialized support, Cedar’s services are shaped around each person’s needs, routines, and goals.</p>
            </div>
            <div className="services__grid">
              {services.map((service) => (
                <article className="service-card" data-aos={getCardAosAnimation(`service-${service.title}`)} key={service.title}>
                  <div className="service-card__top">
                    <span className="service-card__icon"><Icon name={service.icon} size={23} /></span>
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
            <div className="services__bottom">
              <span>Not sure where to start? We’re happy to help you find your way.</span>
              <a className="text-link" href="#contact">Talk with our team <Icon name="arrow" size={16} /></a>
            </div>
          </div>
        </section>

        <section className="about section-pad" id="about">
          <div className="container about__grid">
            <div className="about__intro">
              <p className="eyebrow eyebrow--light"><span className="eyebrow__line" /> A little about Cedar</p>
              <h2>Good care begins<br />with <em>being heard.</em></h2>
              <p>Home is personal. We take time to understand what matters to each person and their family, then provide support that respects their routines and choices.</p>
              <a className="button button--cream" href="#contact">Meet your care team</a>
              <span className="about__leaf" aria-hidden="true"><Icon name="leaf" size={100} /></span>
            </div>
            <div className="about__values">
              <article className="value-card" data-aos={getCardAosAnimation('mission-card')}>
                <span className="value-card__label">Our mission</span>
                <h3>Care with purpose.</h3>
                <p>To provide attentive home care that supports dignity, independence, and well-being, one person’s needs at a time.</p>
              </article>
              <article className="value-card value-card--sage" data-aos={getCardAosAnimation('vision-card')}>
                <span className="value-card__label">Our vision</span>
                <h3>A brighter kind of care.</h3>
                <p>A community where individuals and families can find dependable, compassionate support at home through every season of life.</p>
              </article>
              <div className="about__signoff"><span className="about__signoff-dot" /> Rooted in compassion. Here when it matters.</div>
            </div>
          </div>
        </section>

        <section className="stories section-pad" id="stories">
          <div className="container">
            <div className="section-heading section-heading--row">
              <div>
                <p className="eyebrow"><span className="eyebrow__line" /> The Cedar community</p>
                <h2>Care is personal.<br /><em>So are our stories.</em></h2>
              </div>
              <p className="section-heading__aside">Every family’s experience is their own. We share stories only with permission, and every story is reviewed before it appears here.</p>
            </div>
            {carouselStories.length > 0 ? (
              <div
                className="stories__carousel"
                aria-label={testimonials.length ? 'Testimonials and the Cedar approach' : 'The Cedar approach'}
                aria-roledescription="carousel"
                onMouseEnter={() => setTestimonialCarouselPaused(true)}
                onMouseLeave={() => setTestimonialCarouselPaused(false)}
                onFocusCapture={() => setTestimonialCarouselPaused(true)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setTestimonialCarouselPaused(false)
                }}
              >
                <button className="stories__carousel-arrow stories__carousel-arrow--previous" type="button" aria-label="Previous story" disabled={carouselStories.length < 2} onClick={() => setActiveTestimonialIndex((carouselIndex + carouselStories.length - 1) % carouselStories.length)}><Icon name="arrow" size={19} /></button>
                {(() => {
                  const item = carouselStories[carouselIndex]
                  if (!item) return null
                  const isFallback = Boolean(item.isFallback)
                  return (
                    <article className={`story-card stories__carousel-card${isFallback ? ' stories__carousel-card--fallback' : ''}`} data-aos={getCardAosAnimation(`story-${item.id}`)} key={item.id} aria-roledescription="slide" aria-label={`${carouselIndex + 1} of ${carouselStories.length}`}>
                      {isFallback && <small className="stories__fallback-label">The Cedar approach</small>}
                      <Icon name="quote" size={23} className="story-card__quote" />
                      {!isFallback && <div className="story-card__rating" aria-label={`${item.rating || 5} out of 5 stars`}>{'★'.repeat(item.rating || 5)}<span>{'★'.repeat(5 - (item.rating || 5))}</span></div>}
                      <p className="story-card__text">{item.story}</p>
                      <div className="story-card__author">
                        <span className="story-card__avatar">{(item.name || 'C').charAt(0).toUpperCase()}</span>
                        <span><strong>{item.name}</strong><small>{item.relationship}{item.location ? ` · ${item.location}` : ''}</small></span>
                      </div>
                    </article>
                  )
                })()}
                <button className="stories__carousel-arrow" type="button" aria-label="Next story" disabled={carouselStories.length < 2} onClick={() => setActiveTestimonialIndex((carouselIndex + 1) % carouselStories.length)}><Icon name="arrow" size={19} /></button>
                {carouselStories.length > 1 && <div className="stories__carousel-controls"><div>{carouselStories.map((item, index) => <button type="button" key={item.id} className={index === carouselIndex ? 'is-active' : ''} aria-label={`Show story ${index + 1}`} aria-current={index === carouselIndex ? 'true' : undefined} onClick={() => setActiveTestimonialIndex(index)} />)}</div></div>}
              </div>
            ) : (
              <div className={`stories__empty${storiesError ? ' stories__empty--error' : ''}`}>
                <span className="stories__empty-icon"><Icon name={storiesError ? 'heart' : 'quote'} size={25} /></span>
                <div>
                  <h3>{storiesError ? 'Stories are taking a little break.' : 'This page is ready for your story.'}</h3>
                  <p>{storiesError ? 'Please check back soon, or call our team if you have a question.' : 'When a family chooses to share their experience, we’ll make room for it here.'}</p>
                </div>
                {!storiesError && <button className="text-link" type="button" onClick={openStoryForm}>Share your experience</button>}
              </div>
            )}
            {!storiesError && <button className="text-link stories__share" type="button" onClick={openStoryForm}>Share your experience</button>}
          </div>
        </section>

        <section className="faq section-pad" id="faq">
          <div className="container faq__grid">
            <div className="faq__intro">
              <p className="eyebrow"><span className="eyebrow__line" /> Here to make it clearer</p>
              <h2>A few things<br />you might be <em>wondering.</em></h2>
              <p>From choosing a service to understanding the next step, our team is here to help make things clearer.</p>
              <a className="text-link" href="#contact">Ask us anything <Icon name="arrow" size={16} /></a>
            </div>
            <div className="faq__list">
              {pageFaqs.map((faq, index) => (
                <details className="faq-item" data-aos={getCardAosAnimation(`faq-${faq.question}`)} key={faq.question} name="cedar-faq" open={index === 0}>
                  <summary><span>{faq.question}</span><span className="faq-item__toggle" aria-hidden="true" /></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="caregiver section-pad" id="caregivers">
          <div className="container caregiver__grid">
            <div className="caregiver__copy">
              <p className="eyebrow eyebrow--light"><span className="eyebrow__line" /> Join our team</p>
              <h2>Caregivers are welcome here.</h2>
              <p>We are building a compassionate home care team that treats clients with respect, patience, and dignity. If you care deeply about helping people thrive at home, we would love to hear from you.</p>
              <ul>
                <li>Licensed &amp; insured home care agency</li>
                <li>Supportive, professional team culture</li>
                <li>Meaningful client relationships and flexible scheduling</li>
              </ul>
            </div>
            {caregiverReceipt ? (
              <section className="caregiver-form caregiver-success" aria-labelledby="caregiver-success-title">
                <p className="eyebrow"><span className="eyebrow__line" /> Submission complete</p>
                <h3 id="caregiver-success-title">Thank you, {caregiverReceipt.fullName}</h3>
                <p className="caregiver-success__message">Your caregiver application has been successfully submitted.</p>
                <dl>
                  <div><dt>Full name</dt><dd>{caregiverReceipt.fullName}</dd></div>
                  <div><dt>Email</dt><dd>{caregiverReceipt.email}</dd></div>
                  <div><dt>WhatsApp</dt><dd>{caregiverReceipt.phone}</dd></div>
                  <div><dt>Gender</dt><dd>{caregiverReceipt.gender}</dd></div>
                  <div><dt>Pronouns</dt><dd>{caregiverReceipt.gender === 'Male' ? 'He/him' : 'She/her'}</dd></div>
                  <div><dt>Care service</dt><dd>{caregiverReceipt.role}</dd></div>
                  <div><dt>Reference</dt><dd><code>{caregiverReceipt.referenceCode}</code></dd></div>
                </dl>
                <a className="button button--green" href={`/verify?reference=${encodeURIComponent(caregiverReceipt.referenceCode)}`}>Verify application status</a>
                <p className="caregiver-success__email">
                  {caregiverReceipt.confirmationEmailSent
                    ? `A confirmation email was sent to ${caregiverReceipt.email} with a link to verify your application status.`
                    : `Your application was saved, but we could not send the confirmation email to ${caregiverReceipt.email}. Keep your reference and contact Cedar if you need help.`}
                </p>
                <p className="caregiver-success__email">
                  {caregiverReceipt.adminNotificationSent
                    ? 'Cedar’s team has also been notified by email.'
                    : 'Cedar’s team could not be notified by email. Please contact us so we can follow up.'}
                </p>
                <button className="button button--outline" type="button" onClick={() => setCaregiverReceipt(null)}>Return to form</button>
              </section>
            ) : (
            <form className="caregiver-form" onSubmit={submitCaregiverApplication} aria-busy={caregiverSubmitting}>
              <div className="contact-form__top"><span>Apply to join Cedar</span></div>
              <input className="form-trap" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
              <label htmlFor="caregiver-name">Full name <span>*</span></label>
              <input id="caregiver-name" value={caregiverForm.fullName} onChange={(event) => { setCaregiverReceipt(null); setCaregiverForm((current) => ({ ...current, fullName: event.target.value })) }} placeholder="Your full name" maxLength="120" autoComplete="name" required />

              <label htmlFor="caregiver-email">Email address <span>*</span></label>
              <input id="caregiver-email" type="email" value={caregiverForm.email} onChange={(event) => { setCaregiverReceipt(null); setCaregiverForm((current) => ({ ...current, email: event.target.value })) }} placeholder="you@example.com" maxLength="160" autoComplete="email" required />

              <label htmlFor="caregiver-phone">WhatsApp phone number <span>*</span></label>
              <input id="caregiver-phone" type="tel" value={caregiverForm.phone} onChange={(event) => { setCaregiverReceipt(null); setCaregiverForm((current) => ({ ...current, phone: event.target.value })) }} placeholder="+1 224 204 3281" maxLength="32" autoComplete="tel" inputMode="tel" required />

              <label htmlFor="caregiver-gender">Gender <span>*</span></label>
              <SearchableSelect
                id="caregiver-gender"
                value={caregiverForm.gender}
                options={['Male', 'Female'].map((gender) => ({ value: gender, label: gender }))}
                onChange={(gender) => { setCaregiverReceipt(null); setCaregiverForm((current) => ({ ...current, gender })) }}
                placeholder="Select gender"
              />

              <label htmlFor="caregiver-care-type">Which care service are you applying for? <span>*</span></label>
              <SearchableSelect
                id="caregiver-care-type"
                value={caregiverForm.careType}
                options={services.map((service) => ({ value: service.title, label: service.title }))}
                onChange={(careType) => { setCaregiverReceipt(null); setCaregiverForm((current) => ({ ...current, careType })) }}
                placeholder="Search care services..."
              />
              <div className="contact-form__bottom">
                <button className="button button--green" type="submit" disabled={caregiverSubmitting}>
                  {caregiverSubmitting ? 'Submitting…' : 'Apply now'}
                </button>
                <span>We review applications with care and confidentiality.</span>
              </div>
              <FormStatus status={caregiverStatus} />
            </form>
            )}
          </div>
        </section>

        <section className="contact section-pad" id="contact">
          <div className="container">
            <div className="contact__heading">
              <p className="eyebrow eyebrow--light"><span className="eyebrow__line" /> One conversation can be a start</p>
              <h2>Let’s find the care<br />that feels <em>right.</em></h2>
              <p>Tell us what kind of help would make a difference. Our team will listen and talk through services and availability with you.</p>
            </div>
            <div className="contact__grid">
              <div className="contact__details">
                <a className="contact-card" data-aos={getCardAosAnimation('contact-phone')} href={phoneLink}>
                  <span className="contact-card__icon"><Icon name="phone" size={20} /></span>
                  <span><small>We’re here to talk</small><strong>{phoneNumber}</strong></span>
                  <Icon name="arrow" size={16} className="contact-card__arrow" />
                </a>
                <a className="contact-card" data-aos={getCardAosAnimation('contact-whatsapp')} href={whatsappContactUrl} target="_blank" rel="noreferrer">
                  <span className="contact-card__icon"><Icon name="whatsapp" size={20} /></span>
                  <span><small>Message us on WhatsApp</small><strong>{phoneNumber}</strong></span>
                  <Icon name="arrow" size={16} className="contact-card__arrow" />
                </a>
                <a className="contact-card" data-aos={getCardAosAnimation('contact-email')} href={`mailto:${emailAddress}`}>
                  <span className="contact-card__icon"><Icon name="mail" size={20} /></span>
                  <span><small>Send us a note</small><strong>{emailAddress}</strong></span>
                  <Icon name="arrow" size={16} className="contact-card__arrow" />
                </a>
                <div className="contact-card contact-card--address" data-aos={getCardAosAnimation('contact-address')}>
                  <span className="contact-card__icon"><Icon name="pin" size={20} /></span>
                  <span><small>Come say hello</small><strong>7412 N Western Ave<br />Chicago, IL 60645</strong></span>
                </div>
                <div className="contact__hours"><span className="contact__hours-dot" /> Here for you, day or night.</div>
              </div>
              <form className="contact-form" onSubmit={submitRequest}>
                <div className="contact-form__top"><span>Tell us how we can help</span><span className="contact-form__required">* Required fields</span></div>
                <label htmlFor="care-name">Your name <span>*</span></label>
                <input id="care-name" name="name" autoComplete="name" placeholder="How should we address you?" maxLength="120" required />
                <label htmlFor="care-contact">Phone or email <span>*</span></label>
                <input id="care-contact" name="contact" autoComplete="email" placeholder="The best way to reach you" maxLength="160" required />
                <label htmlFor="care-whatsapp">WhatsApp number <span className="story-form__optional">Optional</span></label>
                <input id="care-whatsapp" name="whatsappNumber" type="tel" autoComplete="tel" inputMode="tel" placeholder="Include your country code, e.g. +1 224 204 3281" maxLength="25" />
                <label htmlFor="care-message">How can we help? <span>*</span></label>
                <textarea id="care-message" name="message" rows="3" placeholder="Tell us a little about the care you’re looking for…" maxLength="2000" required />
                <div className="contact-form__bottom">
                  <button className="button button--green" type="submit">Send a care request</button>
                  <span>We’ll get back to you as soon as we can.</span>
                </div>
                <FormStatus status={requestStatus} />
                <input className="form-trap" type="text" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
              </form>
            </div>
          </div>
        </section>

        <section className="newsletter" aria-labelledby="newsletter-title">
          <div className="container newsletter__inner">
            <div className="newsletter__copy">
              <span className="newsletter__icon"><Icon name="leaf" size={23} /></span>
              <div><p className="eyebrow">A little care in your inbox</p><h2 id="newsletter-title">Good things, growing.</h2><p>Care tips and thoughtful updates from Cedar Healthcare.</p></div>
            </div>
            <form className="newsletter-form" onSubmit={submitNewsletter}>
              <label className="sr-only" htmlFor="newsletter-email">Your email address</label>
              <div className="newsletter-form__row">
                <input id="newsletter-email" name="email" type="email" autoComplete="email" placeholder="Your email address" maxLength="254" required />
                <button className="button button--green" type="submit">Subscribe</button>
              </div>
              <p className="newsletter-form__note">Occasional notes from Cedar. Unsubscribe any time.</p>
              <FormStatus status={newsletterStatus} />
              <input className="form-trap" type="text" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="site-footer__main">
            <div className="site-footer__brand">
              <Brand light />
              <p>Personalized, compassionate home care<br />for the people and moments that matter.</p>
            </div>
            <div className="site-footer__links">
              <span>Explore</span>
              <a href="#services">Our services</a>
              <a href="#about">Our mission</a>
              <a href="#faq">FAQs</a>
            </div>
            <div className="site-footer__links">
              <span>Get in touch</span>
              <a href={phoneLink}>{phoneNumber}</a>
              {contactEmailAddresses.map((email) => <a href={`mailto:${email}`} key={email}>{email}</a>)}
              <a href="https://maps.google.com/?q=7412+N+Western+Ave+Chicago+IL+60645" target="_blank" rel="noreferrer">7412 N Western Ave, Chicago, IL</a>
            </div>
            <div className="site-footer__social">
              <span>Share Cedar</span>
              <div className="site-footer__social-links">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noreferrer" aria-label="Share Cedar on Facebook"><Icon name="facebook" size={17} /></a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noreferrer" aria-label="Share Cedar on LinkedIn"><Icon name="linkedin" size={17} /></a>
                <a href={`https://wa.me/?text=${encodeURIComponent(`Learn more about Cedar Healthcare: ${typeof window === 'undefined' ? '' : window.location.origin}`)}`} target="_blank" rel="noreferrer" aria-label="Share Cedar on WhatsApp"><Icon name="whatsapp" size={18} /></a>
              </div>
            </div>
          </div>
          <div className="site-footer__bottom">
            <span>© {new Date().getFullYear()} Cedar Healthcare, LLC. All rights reserved.</span>
            <div>
              <a href="/privacy">Privacy policy</a>
              <a href="/terms">Terms of use</a>
            </div>
          </div>
        </div>
      </footer>

      <nav className="mobile-nav" aria-label="Quick navigation">
        {[['Home', '#home', 'cedar'], ['Services', '#services', 'health'], ['Stories', '#stories', 'quote'], ['FAQ', '#faq', 'spark'], ['Contact', '#contact', 'mail']].map(([label, href, icon]) => (
          <a href={href} key={label}><Icon name={icon} size={19} /><span>{label}</span></a>
        ))}
      </nav>

      <a
        className="desktop-whatsapp-float"
        href={whatsappContactUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Cedar Healthcare on WhatsApp"
      >
        <Icon name="whatsapp" size={25} />
      </a>

      {showBackToTop && (
        <button
          className="desktop-back-to-top"
          type="button"
          aria-label="Scroll back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Icon name="arrow-up" size={21} />
        </button>
      )}

      {storyOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setStoryOpen(false) }}>
          <section className="story-modal" role="dialog" aria-modal="true" aria-labelledby="story-modal-title">
            <button type="button" className="story-modal__close" aria-label="Close form" onClick={() => setStoryOpen(false)}><Icon name="close" /></button>
            <p className="eyebrow"><span className="eyebrow__line" /> Your experience matters</p>
            <h2 id="story-modal-title">Share your story.</h2>
            <p className="story-modal__intro">Your story will only be published after our team reviews it and gets your permission.</p>
            <form className="story-form" onSubmit={submitStory}>
              <label htmlFor="story-name">Your name <span>*</span></label>
              <input id="story-name" name="name" autoComplete="name" maxLength="120" required />
              <label htmlFor="story-relationship">Your relationship to Cedar <span>*</span></label>
              <input id="story-relationship" name="relationship" placeholder="For example, client or family member" maxLength="120" required />
              <fieldset className="story-rating">
                <legend>Your rating <span>*</span></legend>
                <div role="radiogroup" aria-label="Rating from one to five stars">
                  {[1, 2, 3, 4, 5].map((rating) => <label className={`story-rating__choice${rating <= storyRating ? ' is-selected' : ''}`} key={rating}><input type="radio" name="rating" value={rating} checked={storyRating === rating} onChange={() => setStoryRating(rating)} required /><span aria-hidden="true">★</span><span className="sr-only">{rating} {rating === 1 ? 'star' : 'stars'}</span></label>)}
                </div>
                <small>{storyRating} out of 5 stars</small>
              </fieldset>
              <label htmlFor="story-location">Neighborhood or city <span className="story-form__optional">Optional</span></label>
              <input id="story-location" name="location" placeholder="For example, Chicago, IL" maxLength="100" />
              <label htmlFor="story-message">Your experience <span>*</span></label>
              <textarea id="story-message" name="story" rows="4" maxLength="2000" required />
              <button className="button button--green" type="submit">Send for review</button>
              <FormStatus status={storyStatus} />
              <input className="form-trap" type="text" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
            </form>
          </section>
        </div>
      )}

      {newsletterModalOpen && (
        <div className="modal-backdrop newsletter-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeNewsletterModal() }}>
          <section className="newsletter-modal" role="dialog" aria-modal="true" aria-labelledby="newsletter-modal-title">
            <button type="button" className="story-modal__close" aria-label="Close newsletter signup" onClick={closeNewsletterModal}><Icon name="close" /></button>
            <span className="newsletter-modal__icon" aria-hidden="true">C</span>
            <p className="eyebrow"><span className="eyebrow__line" /> A little care in your inbox</p>
            <h2 id="newsletter-modal-title">Good things, growing.</h2>
            <p className="newsletter-modal__intro">Get thoughtful care tips and occasional updates from Cedar Healthcare. No noise, just a little something helpful.</p>
            <form className="newsletter-form newsletter-modal__form" onSubmit={submitNewsletter}>
              <label className="sr-only" htmlFor="newsletter-modal-email">Your email address</label>
              <div className="newsletter-form__row">
                <input id="newsletter-modal-email" name="email" type="email" autoComplete="email" placeholder="Your email address" maxLength="254" required />
                <button className="button button--green" type="submit">Subscribe</button>
              </div>
              <p className="newsletter-form__note">Unsubscribe any time. See our <a href="/privacy">Privacy Policy</a>.</p>
              <FormStatus status={newsletterStatus} />
              <input className="form-trap" type="text" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
            </form>
          </section>
        </div>
      )}

    </>
  )
}

export default HomePage
