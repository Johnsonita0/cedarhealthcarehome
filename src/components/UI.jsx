import { useId, useState } from 'react'
import cedarLogo from '../images/logo/logo.jpeg'

const clientAppUrl = import.meta.env.VITE_CLIENT_APP_URL

export function Icon({ name, size = 22, className = '' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: name === 'cedar' || name === 'leaf' ? 2.1 : 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className,
  }

  const paths = {
    arrow: <><path d="M4.5 12h14" /><path d="m13 5.5 6.5 6.5-6.5 6.5" /></>,
    'arrow-up': <><path d="M12 19V5" /><path d="m5.5 11.5 6.5-6.5 6.5 6.5" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    cedar: <><path d="M19 6a9 9 0 1 0 0 12" /><circle cx="18.5" cy="5.5" r="1.8" fill="currentColor" stroke="none" /></>,
    care: <><path d="M12 21s-7.5-4.6-7.5-11a4.25 4.25 0 0 1 7.5-2.7 4.25 4.25 0 0 1 7.5 2.7c0 6.4-7.5 11-7.5 11Z" /><path d="M8.8 12h6.4M12 8.8v6.4" /></>,
    health: <><path d="M12 21s-7.5-4.6-7.5-11a4.25 4.25 0 0 1 7.5-2.7 4.25 4.25 0 0 1 7.5 2.7c0 6.4-7.5 11-7.5 11Z" /><path d="M8.7 12h6.6M12 8.7v6.6" /></>,
    heart: <><path d="M12 21s-7.5-4.6-7.5-11a4.25 4.25 0 0 1 7.5-2.7 4.25 4.25 0 0 1 7.5 2.7c0 6.4-7.5 11-7.5 11Z" /><path d="M8.5 12h7" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.6A4.4 4.4 0 0 1 7.9 14h2.2a4.4 4.4 0 0 1 4.4 4.4V20" /><path d="M16 5.2a3 3 0 0 1 0 5.7M17.5 14.2a4.2 4.2 0 0 1 3 4V20" /></>,
    home: <><path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 9v11h13V9M9 20v-6h6v6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    phone: <><path d="M7.1 3.8 9.5 7l-1.7 2a14 14 0 0 0 7.2 7.2l2-1.7 3.2 2.4-.7 3a1.8 1.8 0 0 1-2 1.3A18.8 18.8 0 0 1 3.1 6.5a1.8 1.8 0 0 1 1.3-2l2.7-.7Z" /></>,
    whatsapp: <><path d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L3.5 20l1.2-4.4a8.2 8.2 0 1 1 15.5-3.9Z" /><path d="M8.2 8.1c.3-.6.5-.6.9-.6h.5c.2 0 .4.1.5.4l.7 1.7c.1.2.1.4-.1.6l-.6.7c-.2.2-.2.4 0 .6.4.7 1 1.3 1.7 1.7.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.7-.1l1.6.8c.3.1.4.3.4.5 0 .4-.2 1.1-.7 1.5-.5.5-1.1.7-1.8.6-1-.1-2.4-.7-3.8-1.9-1.2-1-2-2.4-2.2-3.3-.2-.9.1-1.7.5-2.3Z" /></>,
    facebook: <><path d="M14 8h3V4h-3.4C10.8 4 9 5.9 9 8.8V11H6v4h3v5h4v-5h3l.7-4H13V9c0-.7.3-1 1-1Z" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    linkedin: <><path d="M5 9v10M5 5v.1M10 19v-6a4 4 0 0 1 8 0v6M10 10v9" /><circle cx="5" cy="5" r="1" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    leaf: <><path d="M19 6a9 9 0 1 0 0 12" /><circle cx="18.5" cy="5.5" r="1.8" fill="currentColor" stroke="none" /></>,
    quote: <><path d="M8.5 11H4.8A1.8 1.8 0 0 1 3 9.2V5.8A1.8 1.8 0 0 1 4.8 4h3.4A1.8 1.8 0 0 1 10 5.8v5.4A5.8 5.8 0 0 1 4.2 17" /><path d="M20 11h-3.7a1.8 1.8 0 0 1-1.8-1.8V5.8A1.8 1.8 0 0 1 16.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v5.4a5.8 5.8 0 0 1-5.8 5.8" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  }

  return <svg {...common}>{paths[name] ?? paths.leaf}</svg>
}

export function SearchableSelect({ id, value, options, onChange, placeholder = 'Search options...', className = '', ...inputProps }) {
  const listboxId = useId()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const selectedOption = options.find((option) => String(option.value) === String(value))
  const visibleOptions = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))

  function chooseOption(option) {
    onChange(option.value)
    setQuery('')
    setIsOpen(false)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((current) => Math.min(current < 0 ? 0 : current + 1, visibleOptions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((current) => current < 0 ? Math.max(visibleOptions.length - 1, 0) : Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && isOpen && visibleOptions.length) {
      event.preventDefault()
      chooseOption(visibleOptions[activeIndex] || visibleOptions[0])
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      setQuery('')
      setIsOpen(false)
    }
  }

  return (
    <div className={`searchable-select${className ? ` ${className}` : ''}`}>
      <div className="searchable-select__control">
        <input
          {...inputProps}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={isOpen && visibleOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          value={isOpen ? query : selectedOption?.label || ''}
          placeholder={isOpen ? placeholder : selectedOption?.label || placeholder}
          onFocus={() => { setQuery(''); setIsOpen(true); setActiveIndex(-1) }}
          onChange={(event) => { setQuery(event.target.value); setIsOpen(true); setActiveIndex(-1) }}
          onKeyDown={handleKeyDown}
          onBlur={() => { setQuery(''); setIsOpen(false) }}
        />
        <Icon name="search" size={16} className="searchable-select__icon" />
      </div>
      {isOpen && (
        <ul className="searchable-select__options" id={listboxId} role="listbox">
          {visibleOptions.length ? visibleOptions.map((option, index) => (
            <li
              className={index === activeIndex ? 'is-active' : ''}
              id={`${listboxId}-${index}`}
              key={option.value}
              role="option"
              aria-selected={String(option.value) === String(value)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(option)}
            >
              {option.label}
            </li>
          )) : <li className="searchable-select__empty" role="presentation">No matches found</li>}
        </ul>
      )}
    </div>
  )
}

export function Brand({ light = false }) {
  return (
    <a className={`brand${light ? ' brand--light' : ''}`} href="#home" aria-label="Cedar Healthcare home">
      <img className="brand__logo" src={cedarLogo} alt="Cedar Healthcare, LLC" />
    </a>
  )
}

export function SiteSplash({ timed = false }) {
  const progressClass = timed ? '' : ' site-splash__progress-fill--indeterminate'

  return (
    <div className={`site-splash${timed ? ' site-splash--timed' : ''}`} role="status" aria-live="polite">
      <img className="site-splash__logo" src="/cedar-logo.jpeg" alt="Cedar Healthcare" />
      <div className="site-splash__progress" aria-hidden="true">
        <span className={`site-splash__progress-fill${progressClass}`} />
      </div>
      <span className="sr-only">Loading Cedar Healthcare</span>
    </div>
  )
}

export function PortalLink({ className = 'button button--outline', compact = false, label = 'Open App', url = '' }) {
  const [notice, setNotice] = useState(false)
  const buttonLabel = notice ? (compact ? 'Coming soon' : 'Client app coming soon') : label
  const resolvedUrl = url || clientAppUrl

  if (resolvedUrl) {
    const external = /^https?:\/\//i.test(resolvedUrl)
    return <a className={className} href={resolvedUrl} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{buttonLabel}</a>
  }

  return (
    <button className={className} type="button" onClick={() => setNotice(true)}>
      {buttonLabel}
      {notice && <span className="sr-only" role="status">The client app link will be available soon. Please call Cedar Healthcare for help.</span>}
    </button>
  )
}

export function FormStatus({ status }) {
  if (!status) return null
  return <p className={`form-status form-status--${status.type}`} role="status">{status.message}</p>
}
