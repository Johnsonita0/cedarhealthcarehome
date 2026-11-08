import { useEffect, useState } from 'react'
import { Brand, FormStatus, Icon, PortalLink } from '../components/UI.jsx'
import { privacyPolicy, termsOfUse } from '../data/legalContent.js'

const phoneNumber = '224-204-3281'
const phoneLink = 'tel:+12242043281'
const emailAddress = 'cedarhealthcarehome@gmail.com'
const heroSlides = [
  {
    image: 'https://images.pexels.com/photos/29372733/pexels-photo-29372733.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A caregiver sharing a warm moment with an older adult',
    eyebrow: 'Compassionate home care in Chicago',
    title: <>Quality home care<br />you can <em>trust.</em></>,
    description: 'Personalized, compassionate care that helps you live safely, comfortably, and independently at home.',
    imageCaption: 'Here for you, every day',
    noteTitle: 'Care, with heart.',
    noteDescription: 'Support shaped around you.',
  },
  {
    image: 'https://images.pexels.com/photos/6129242/pexels-photo-6129242.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A home care professional helping a client feel comfortable at home',
    eyebrow: 'Care that feels like home',
    title: <>More comfort.<br />More <em>good days.</em></>,
    description: 'Thoughtful everyday support that protects your independence and makes room for what matters most.',
    imageCaption: 'Everyday help, at home',
    noteTitle: 'Comfort in familiar places.',
    noteDescription: 'Care that fits your routine.',
  },
  {
    image: 'https://images.pexels.com/photos/36706841/pexels-photo-36706841.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A family sharing a warm moment together',
    eyebrow: 'Here for you and your family',
    title: <>You don’t have<br />to do this <em>alone.</em></>,
    description: 'We listen, we show up, and we build a care plan around the person you love.',
    imageCaption: 'Stronger, together',
    noteTitle: 'Here for your family.',
    noteDescription: 'A team you can count on.',
  },
  {
    image: 'https://images.pexels.com/photos/8088906/pexels-photo-8088906.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A healthcare professional offering attentive support',
    eyebrow: 'Personal support, every day',
    title: <>Care that meets<br />you <em>where you are.</em></>,
    description: 'From daily routines to changing health needs, our team is here with care that feels personal.',
    imageCaption: 'Care made personal',
    noteTitle: 'Attentive, everyday care.',
    noteDescription: 'Support for your daily needs.',
  },
  {
    image: 'https://images.pexels.com/photos/7446778/pexels-photo-7446778.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A care professional talking with a patient',
    eyebrow: 'A team you can count on',
    title: <>A little help.<br />A lot more <em>peace.</em></>,
    description: 'Get the right support for your family, with a care team that listens and follows through.',
    imageCaption: 'A caring team by your side',
    noteTitle: 'People who listen.',
    noteDescription: 'Your needs come first.',
  },
  {
    image: 'https://images.pexels.com/photos/6129106/pexels-photo-6129106.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A calm, welcoming healthcare environment',
    eyebrow: 'Thoughtful care, close to home',
    title: <>Feel safer<br />right at <em>home.</em></>,
    description: 'We help make home a more comfortable place to live, heal, and stay connected.',
    imageCaption: 'Thoughtful care, close to home',
    noteTitle: 'Feel at ease at home.',
    noteDescription: 'A little more peace of mind.',
  },
  {
    image: 'https://images.pexels.com/photos/6753271/pexels-photo-6753271.jpeg?auto=compress&cs=tinysrgb&w=1600',
    alt: 'A healthcare professional listening to a patient',
    eyebrow: 'Your needs come first',
    title: <>Care built<br />around <em>you.</em></>,
    description: 'Start with a conversation. Together, we can find support that fits your life and your goals.',
    imageCaption: 'Listening is where care begins',
    noteTitle: 'Your story matters.',
    noteDescription: 'Care starts with listening.',
  },
]
const services = [
  {
    title: 'Personal care',
    description: 'Thoughtful help with bathing, dressing, grooming, and the routines that make a day feel like your own.',
    icon: 'care',
  },
  {
    title: 'Skilled nursing',
    description: 'Professional health support, medication reminders, and wellness check-ins from people who care.',
    icon: 'health',
  },
  {
    title: 'Specialized care',
    description: 'Steady, personalized support for chronic conditions, recovery after a hospital stay, and changing needs.',
    icon: 'heart',
  },
  {
    title: 'Companionship',
    description: 'Good company, meaningful conversation, and a reassuring presence for clients and their loved ones.',
    icon: 'people',
  },
  {
    title: 'Homemaker services',
    description: 'A little help around the home, from light housekeeping and meal preparation to everyday errands.',
    icon: 'home',
  },
  {
    title: '24/7 availability',
    description: 'Care and support when you need it, because the people you love deserve to feel safe at any hour.',
    icon: 'clock',
  },
]

const faqs = [
  {
    question: 'What services do you offer?',
    answer: 'We offer personal care, skilled nursing, specialized care, companionship, homemaker services, and 24/7 availability.',
  },
  {
    question: 'How do I request care?',
    answer: 'Send us a care request using the form on this page or call us at 224-204-3281. Our team will be in touch to learn more about your needs.',
  },
  {
    question: 'Where does Cedar Healthcare provide care?',
    answer: 'Our office is in Chicago, Illinois. Call our team to talk about care availability in your area.',
  },
  {
    question: 'Can I talk with someone before choosing a service?',
    answer: 'Absolutely. Call us or send a request and we will help you explore the options that may be right for you and your family.',
  },
]

function HomePage() {
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)
  const [requestStatus, setRequestStatus] = useState(null)
  const [newsletterStatus, setNewsletterStatus] = useState(null)
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const [storyStatus, setStoryStatus] = useState(null)
  const [legalModal, setLegalModal] = useState(null)
  const [testimonials, setTestimonials] = useState([])
  const [storiesError, setStoriesError] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/testimonials')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load testimonials')
        return response.json()
      })
      .then((data) => {
        if (active) setTestimonials(data.testimonials)
      })
      .catch(() => {
        if (active) setStoriesError(true)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveHeroSlide((currentSlide) => (
        (currentSlide + 1 + Math.floor(Math.random() * (heroSlides.length - 1))) % heroSlides.length
      ))
    }, 6000)

    return () => window.clearInterval(intervalId)
  }, [])

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
    }, 6000)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (!newsletterModalOpen && !storyOpen && !legalModal) return undefined

    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (legalModal) {
        setLegalModal(null)
      } else if (storyOpen) {
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
  }, [newsletterModalOpen, storyOpen, legalModal])

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
    } catch (error) {
      setRequestStatus({ type: 'error', message: error.message })
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
    } catch (error) {
      setNewsletterStatus({ type: 'error', message: error.message })
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
      setStoryStatus({
        type: result.notificationSent ? 'success' : 'notice',
        message: result.notificationSent
          ? 'Thank you for sharing. Your story has been sent for review before it is published.'
          : 'Your story was saved, but our team could not be notified. Please call us to follow up.',
      })
    } catch (error) {
      setStoryStatus({ type: 'error', message: error.message })
    }
  }

  const navLinks = [
    ['Services', '#services'],
    ['Our story', '#about'],
    ['Stories', '#stories'],
    ['FAQs', '#faq'],
    ['Contact', '#contact'],
  ]
  const heroSlide = heroSlides[activeHeroSlide]
  const shareUrl = typeof window === 'undefined' ? '' : encodeURIComponent(window.location.origin)
  const legalDocument = legalModal === 'privacy' ? privacyPolicy : termsOfUse

  function closeNewsletterModal() {
    setNewsletterModalOpen(false)
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
            <a className="header-whatsapp" href="https://wa.me/12242043281" target="_blank" rel="noreferrer" aria-label="Chat with Cedar Healthcare on WhatsApp"><Icon name="whatsapp" size={19} /><span>WhatsApp</span></a>
            <PortalLink className="button button--small button--green header-app-link" compact />
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="container hero__grid">
            <div className="hero__visual">
              <div className="hero__image-wrap">
                {heroSlides.map((slide, index) => (
                  <img
                    className={`hero__slide${index === activeHeroSlide ? ' hero__slide--active' : ''}`}
                    key={slide.image}
                    src={slide.image}
                    alt={slide.alt}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    aria-hidden={index !== activeHeroSlide}
                  />
                ))}
                <div className="hero__copy">
                  <p className="eyebrow"><span className="eyebrow__line" /> {heroSlide.eyebrow}</p>
                  <h1>{heroSlide.title}</h1>
                  <p className="hero__intro">{heroSlide.description}</p>
                  <div className="hero__actions">
                    <a className="button button--green" href="#contact">Let’s talk about care</a>
                    <PortalLink className="button button--outline" />
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
              <p className="eyebrow"><span className="eyebrow__line" /> Care for the whole you</p>
              <h2>Support for every<br /><em>part of life.</em></h2>
              <p>Every person is different. We take time to understand what matters to you, then build care around it.</p>
            </div>
            <div className="services__grid">
              {services.map((service) => (
                <article className="service-card" key={service.title}>
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
              <h2>Good care begins<br />with <em>being seen.</em></h2>
              <p>Home is more than a place. It’s where people feel like themselves. We’re here to help make more good days at home possible.</p>
              <a className="button button--cream" href="#contact">Meet your care team</a>
              <span className="about__leaf" aria-hidden="true"><Icon name="leaf" size={100} /></span>
            </div>
            <div className="about__values">
              <article className="value-card">
                <span className="value-card__label">Our mission</span>
                <h3>Care with purpose.</h3>
                <p>To deliver exceptional home care services that promote dignity, independence, and better health for every individual we serve.</p>
              </article>
              <article className="value-card value-card--sage">
                <span className="value-card__label">Our vision</span>
                <h3>A brighter kind of care.</h3>
                <p>To be a trusted leader in home care, known for our compassion, integrity, and commitment to enriching lives in our communities.</p>
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
            {testimonials.length > 0 ? (
              <div className="stories__grid">
                {testimonials.map((item) => (
                  <article className="story-card" key={item.id}>
                    <Icon name="quote" size={23} className="story-card__quote" />
                    <p className="story-card__text">{item.story}</p>
                    <div className="story-card__author">
                      <span className="story-card__avatar">{(item.name || 'C').charAt(0).toUpperCase()}</span>
                      <span><strong>{item.name}</strong><small>{item.relationship}</small></span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={`stories__empty${storiesError ? ' stories__empty--error' : ''}`}>
                <span className="stories__empty-icon"><Icon name={storiesError ? 'heart' : 'quote'} size={25} /></span>
                <div>
                  <h3>{storiesError ? 'Stories are taking a little break.' : 'This page is ready for your story.'}</h3>
                  <p>{storiesError ? 'Please check back soon, or call our team if you have a question.' : 'When a family chooses to share their experience, we’ll make room for it here.'}</p>
                </div>
                {!storiesError && <button className="text-link" type="button" onClick={() => { setStoryOpen(true); setStoryStatus(null) }}>Share your experience</button>}
              </div>
            )}
            {testimonials.length > 0 && <button className="text-link stories__share" type="button" onClick={() => { setStoryOpen(true); setStoryStatus(null) }}>Share your experience</button>}
          </div>
        </section>

        <section className="faq section-pad" id="faq">
          <div className="container faq__grid">
            <div className="faq__intro">
              <p className="eyebrow"><span className="eyebrow__line" /> Here to make it clearer</p>
              <h2>A few things<br />you might be <em>wondering.</em></h2>
              <p>It’s okay to have questions. If you can’t find what you’re looking for, just reach out and ask.</p>
              <a className="text-link" href="#contact">Ask us anything <Icon name="arrow" size={16} /></a>
            </div>
            <div className="faq__list">
              {faqs.map((faq, index) => (
                <details className="faq-item" key={faq.question} open={index === 0}>
                  <summary><span>{faq.question}</span><span className="faq-item__toggle" aria-hidden="true" /></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="contact section-pad" id="contact">
          <div className="container">
            <div className="contact__heading">
              <p className="eyebrow eyebrow--light"><span className="eyebrow__line" /> One conversation can be a start</p>
              <h2>Let’s find the care<br />that feels <em>right.</em></h2>
              <p>Tell us a little about what you need. A real person from our team will be in touch.</p>
            </div>
            <div className="contact__grid">
              <div className="contact__details">
                <a className="contact-card" href={phoneLink}>
                  <span className="contact-card__icon"><Icon name="phone" size={20} /></span>
                  <span><small>We’re here to talk</small><strong>{phoneNumber}</strong></span>
                  <Icon name="arrow" size={16} className="contact-card__arrow" />
                </a>
                <a className="contact-card" href={`mailto:${emailAddress}`}>
                  <span className="contact-card__icon"><Icon name="mail" size={20} /></span>
                  <span><small>Send us a note</small><strong>{emailAddress}</strong></span>
                  <Icon name="arrow" size={16} className="contact-card__arrow" />
                </a>
                <div className="contact-card contact-card--address">
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
              <a href={`mailto:${emailAddress}`}>{emailAddress}</a>
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
              <button type="button" onClick={() => setLegalModal('privacy')}>Privacy policy</button>
              <button type="button" onClick={() => setLegalModal('terms')}>Terms of use</button>
            </div>
          </div>
        </div>
      </footer>

      <nav className="mobile-nav" aria-label="Quick navigation">
        {[['Home', '#home', 'leaf'], ['Services', '#services', 'health'], ['Stories', '#stories', 'quote'], ['FAQ', '#faq', 'spark'], ['Contact', '#contact', 'mail']].map(([label, href, icon]) => (
          <a href={href} key={label}><Icon name={icon} size={19} /><span>{label}</span></a>
        ))}
      </nav>

      <a
        className="desktop-whatsapp-float"
        href="https://wa.me/12242043281"
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
            <span className="newsletter-modal__icon"><Icon name="leaf" size={24} /></span>
            <p className="eyebrow"><span className="eyebrow__line" /> A little care in your inbox</p>
            <h2 id="newsletter-modal-title">Good things, growing.</h2>
            <p className="newsletter-modal__intro">Get thoughtful care tips and occasional updates from Cedar Healthcare. No noise, just a little something helpful.</p>
            <form className="newsletter-form newsletter-modal__form" onSubmit={submitNewsletter}>
              <label className="sr-only" htmlFor="newsletter-modal-email">Your email address</label>
              <div className="newsletter-form__row">
                <input id="newsletter-modal-email" name="email" type="email" autoComplete="email" placeholder="Your email address" maxLength="254" required />
                <button className="button button--green" type="submit">Subscribe</button>
              </div>
              <p className="newsletter-form__note">Unsubscribe any time. See our <button type="button" onClick={() => setLegalModal('privacy')}>Privacy Policy</button>.</p>
              <FormStatus status={newsletterStatus} />
              <input className="form-trap" type="text" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
            </form>
          </section>
        </div>
      )}

      {legalModal && (
        <div className="modal-backdrop legal-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLegalModal(null) }}>
          <section className="legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">
            <header className="legal-modal__header">
              <div>
                <p className="eyebrow"><span className="eyebrow__line" /> Cedar Healthcare, LLC</p>
                <h2 id="legal-modal-title">{legalDocument.title}</h2>
                <p className="legal-modal__updated">Last updated {legalDocument.updated}</p>
              </div>
              <button type="button" className="story-modal__close" aria-label={`Close ${legalDocument.title}`} onClick={() => setLegalModal(null)}><Icon name="close" /></button>
            </header>
            <div className="legal-modal__body">
              <p className="legal-modal__introduction">{legalDocument.introduction}</p>
              {legalDocument.sections.map((section) => (
                <section className="legal-modal__section" key={section.title}>
                  <h3>{section.title}</h3>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
            </div>
            <footer className="legal-modal__footer">
              <span>Questions? <a href={`mailto:${emailAddress}`}>{emailAddress}</a></span>
              <button type="button" className="button button--green" onClick={() => setLegalModal(null)}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}

export default HomePage
