import { useEffect, useRef, useState } from 'react'

const referencePattern = /^CED-\d{2}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i
const statusDetails = {
  new: {
    label: 'Application received',
    detail: 'Your application is in our review queue. Cedar will contact you if there is an update.',
  },
  contacted: {
    label: 'Contacted',
    detail: 'Cedar has marked that the team has reached out to you.',
  },
  accepted: {
    label: 'Accepted',
    detail: 'Your caregiver application has been accepted. Please check your email for next steps.',
  },
}

function VerifyPage() {
  const [initialReference] = useState(() => new URLSearchParams(window.location.search).get('reference') || '')
  const [reference, setReference] = useState(initialReference)
  const [applicationStatus, setApplicationStatus] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const initialLookupStarted = useRef(false)

  async function lookupStatus(value) {
    const candidate = value.trim().toUpperCase()
    setError('')
    setApplicationStatus(null)
    if (!referencePattern.test(candidate)) {
      setError('Enter the reference code from your confirmation email (for example, CED-26-ABCD1-EFGH2).')
      return
    }

    setReference(candidate)
    setLoading(true)
    try {
      const response = await fetch('/api/verify-caregiver-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: candidate }),
      })
      let result
      try {
        result = await response.json()
      } catch {
        throw new Error('The status service returned an invalid response. Please try again later.')
      }
      if (!response.ok) throw new Error(result.error || 'We could not check your application status.')
      setApplicationStatus(result.status)
    } catch (requestError) {
      setError(requestError.message || 'We could not check your application status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'Check caregiver application status | Cedar Healthcare'
    const robots = document.querySelector('meta[name="robots"]')
    if (robots) robots.content = 'noindex, nofollow'
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) canonical.href = `${window.location.origin}/verify`
  }, [])

  useEffect(() => {
    if (!initialReference || initialLookupStarted.current) return
    initialLookupStarted.current = true
    void lookupStatus(initialReference)
  }, [initialReference])

  function submitLookup(event) {
    event.preventDefault()
    void lookupStatus(reference)
  }

  const status = applicationStatus ? statusDetails[applicationStatus] : null

  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">
          <a className="brand" href="/" aria-label="Cedar Healthcare home">
            <img className="brand__logo" src="/cedar-logo.jpeg" alt="Cedar Healthcare, LLC" />
          </a>
          <a className="button button--small button--green" href="/#caregivers">Caregiver applications</a>
        </div>
      </header>
      <main className="verify-page section-pad">
        <div className="container">
          <section className="verify-card" aria-labelledby="verify-title">
            <p className="eyebrow"><span className="eyebrow__line" /> Cedar Healthcare, LLC</p>
            <h1 id="verify-title">Check your application status</h1>
            <p className="verify-card__intro">Enter the professional reference code from your caregiver application confirmation email.</p>
            <form className="verify-form" onSubmit={submitLookup}>
              <label htmlFor="caregiver-reference">Application reference code</label>
              <input
                id="caregiver-reference"
                value={reference}
                onChange={(event) => {
                  setReference(event.target.value.toUpperCase())
                  setApplicationStatus(null)
                  setError('')
                }}
                autoComplete="off"
                spellCheck="false"
                maxLength="18"
                placeholder="CED-26-ABCD1-EFGH2"
                required
              />
              <button className="button button--green" type="submit" disabled={loading}>
                {loading ? 'Checking…' : 'Check status'}
              </button>
            </form>
            {error && <p className="verify-message verify-message--error" role="alert">{error}</p>}
            {loading && <p className="verify-message" role="status">Checking your application…</p>}
            {status && (
              <section className="verify-result" aria-live="polite">
                <span className="verify-result__label">Current status</span>
                <h2>{status.label}</h2>
                <p>{status.detail}</p>
                <p className="verify-result__reference">Reference: <code>{reference}</code></p>
              </section>
            )}
            <p className="verify-card__help">Need help? Call Cedar Healthcare at <a href="tel:+12242043281">224-204-3281</a>.</p>
          </section>
        </div>
      </main>
    </>
  )
}

export default VerifyPage
