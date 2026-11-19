import { useEffect, useRef } from 'react'

const publicPages = new Set(['/', '/privacy', '/terms'])

function getPublicPage() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return publicPages.has(path) ? path : null
}

function getSectionKey(element) {
  return (element.dataset.analyticsSection || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function VisitorAnalytics() {
  const reportedEventError = useRef(false)
  const trackedSections = useRef(new Set())
  const recordedPage = useRef(null)

  useEffect(() => {
    const page = getPublicPage()
    if (!page || recordedPage.current === page) return undefined
    recordedPage.current = page

    async function recordEvent(section = '') {
      try {
        const response = await fetch('/api/visitor-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page, section }),
          keepalive: true,
        })
        if (!response.ok) throw new Error(`Visitor analytics request failed with status ${response.status}.`)
      } catch (error) {
        if (!reportedEventError.current) {
          reportedEventError.current = true
          console.error('Anonymous visitor analytics could not be recorded:', error)
        }
      }
    }

    void recordEvent()
    const main = document.querySelector('main')
    if (!main || !('IntersectionObserver' in window)) return undefined

    const sections = Array.from(main.querySelectorAll('section[data-analytics-section]'))
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const section = getSectionKey(entry.target)
        if (!section || trackedSections.current.has(section)) continue
        trackedSections.current.add(section)
        void recordEvent(section)
      }
    }, { threshold: 0.35 })

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return null
}

export default VisitorAnalytics
