import { useEffect, useState } from 'react'
import { privacyPolicy, termsOfUse } from '../data/legalContent.js'

const publicSiteUrl = 'https://www.cedarhealthcarehome.com'

function LegalPage() {
  const isTerms = window.location.pathname.replace(/\/+$/, '') === '/terms'
  const policyKey = isTerms ? 'termsOfUse' : 'privacyPolicy'
  const fallbackPolicy = isTerms ? termsOfUse : privacyPolicy
  const [policy, setPolicy] = useState(fallbackPolicy)

  useEffect(() => {
    let active = true
    fetch('/api/site-content')
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        const publishedPolicy = result?.content?.[policyKey]
        if (active && publishedPolicy?.title && Array.isArray(publishedPolicy.sections)) setPolicy(publishedPolicy)
      })
      .catch(() => {})

    return () => { active = false }
  }, [policyKey])

  useEffect(() => {
    const slug = isTerms ? 'terms' : 'privacy'
    const pageUrl = `${publicSiteUrl}/${slug}`
    const description = `${policy.title} for Cedar Healthcare, LLC in Chicago, Illinois.`
    document.title = `${policy.title} | Cedar Healthcare`

    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) canonical.href = pageUrl

    const descriptionTag = document.querySelector('meta[name="description"]')
    if (descriptionTag) descriptionTag.content = description

    for (const [selector, content] of [
      ['meta[property="og:url"]', pageUrl],
      ['meta[property="og:title"]', document.title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', document.title],
      ['meta[name="twitter:description"]', description],
    ]) {
      const tag = document.querySelector(selector)
      if (tag) tag.content = content
    }
  }, [isTerms, policy.title])

  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">
          <a className="brand" href="/" aria-label="Cedar Healthcare home">
            <img className="brand__logo" src="/cedar-logo.jpeg" alt="Cedar Healthcare, LLC" />
          </a>
          <a className="button button--small button--green" href="/#contact">Contact Cedar</a>
        </div>
      </header>
      <main className="legal-page section-pad">
        <article className="container legal-page__content">
          <header className="legal-page__heading">
            <p className="eyebrow"><span className="eyebrow__line" /> Cedar Healthcare, LLC</p>
            <h1>{policy.title}</h1>
            <p className="legal-page__updated">Last updated {policy.updated}</p>
          </header>
          <p className="legal-page__intro">{policy.introduction}</p>
          {policy.sections.map((section) => (
            <section className="legal-page__section" key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          <nav className="legal-page__links" aria-label="Legal pages">
            <a href="/privacy">Privacy policy</a>
            <a href="/terms">Terms of use</a>
            <a href="/">Cedar Healthcare home</a>
          </nav>
        </article>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="site-footer__bottom">
            <span>© {new Date().getFullYear()} Cedar Healthcare, LLC. All rights reserved.</span>
            <span>7412 N Western Ave, Chicago, IL 60645 · 224-204-3281</span>
          </div>
        </div>
      </footer>
    </>
  )
}

export default LegalPage