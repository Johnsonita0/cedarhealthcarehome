import { useEffect, useState } from 'react'
import { Icon } from './UI.jsx'
import { useToast } from './ToastProvider.jsx'
import { supabase } from '../supabaseClient.js'
import '../styles/visitor-tracker.css'

const pageSize = 1000
const maxEvents = 5000

function formatLabel(value) {
  if (value === '/') return 'Home'
  if (value === '/privacy') return 'Privacy policy'
  if (value === '/terms') return 'Terms of use'
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function aggregateKey(aggregate) {
  return [aggregate.visit_date, aggregate.page, aggregate.section, aggregate.device_type, aggregate.country, aggregate.region].join('|')
}

function VisitorTracker() {
  const { showToast } = useToast()
  const [aggregates, setAggregates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [deletingVisitors, setDeletingVisitors] = useState(() => new Set())

  async function loadVisitors() {
    if (!supabase) {
      setError('Supabase is not configured. Visitor analytics cannot be loaded.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const records = []
    const expiresAfter = new Date().toISOString()
    for (let offset = 0; offset < maxEvents; offset += pageSize) {
      const { data, error: queryError } = await supabase
        .from('visitor_analytics')
        .select('visit_date,page,section,device_type,country,region,visit_count')
        .gt('expires_at', expiresAfter)
        .order('visit_date', { ascending: false })
        .order('visit_count', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (queryError) {
        setError(queryError.message)
        setLoading(false)
        return
      }

      records.push(...(data || []))
      if (!data || data.length < pageSize) break
    }
    setTruncated(records.length === maxEvents)
    setAggregates(records)
    setLoading(false)
  }

  useEffect(() => {
    void loadVisitors()
  }, [])

  async function deleteAggregate(aggregate) {
    if (!window.confirm('Delete this anonymous daily aggregate? Individual visitor records are not stored.')) return
    const key = aggregateKey(aggregate)
    setDeletingVisitors((current) => new Set(current).add(key))
    const { error: deleteError } = await supabase
      .from('visitor_analytics')
      .delete()
      .match({
        visit_date: aggregate.visit_date,
        page: aggregate.page,
        section: aggregate.section,
        device_type: aggregate.device_type,
        country: aggregate.country,
        region: aggregate.region,
      })

    setDeletingVisitors((current) => {
      const next = new Set(current)
      next.delete(key)
      return next
    })
    if (deleteError) {
      showToast(`Visitor records could not be deleted: ${deleteError.message}`, 'error')
      return
    }
    setAggregates((current) => current.filter((item) => aggregateKey(item) !== key))
    showToast('Anonymous daily aggregate deleted.', 'success')
  }

  const visitCount = aggregates.reduce((total, aggregate) => total + Number(aggregate.visit_count), 0)

  return (
    <section className="admin-visitor-tracker admin-workspace" aria-labelledby="visitor-tracker-title">
      <header className="admin-visitor-tracker__heading">
        <div>
          <p className="admin-kicker">Anonymous analytics</p>
          <h2 id="visitor-tracker-title">Visitor tracker</h2>
          <p>Daily totals by public page or section, device category, and coarse location. No visitor IDs, IP addresses, or full browser identifiers are stored. Individual visitors cannot be identified or deleted.</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={() => void loadVisitors()} disabled={loading}>
          <Icon name="search" size={16} /> Refresh
        </button>
      </header>

      <div className="admin-visitor-tracker__summary" aria-live="polite">
        <div><span>Anonymous daily groups</span><strong>{aggregates.length}</strong></div>
        <div><span>Recorded page and section visits</span><strong>{visitCount}</strong></div>
      </div>

      {error && <p className="admin-visitor-tracker__error" role="alert">{error}</p>}
      {loading ? (
        <div className="admin-empty-state"><p>Loading visitor records…</p></div>
      ) : !error && !aggregates.length ? (
        <div className="admin-empty-state">
          <Icon name="people" size={28} />
          <h3>No visits recorded yet</h3>
          <p>Anonymous totals will appear after the first public page or section visit.</p>
        </div>
      ) : (
        <>
          {truncated && <p className="admin-visitor-tracker__limit">Showing the latest {maxEvents.toLocaleString()} anonymous daily groups.</p>}
          <div className="admin-visitor-tracker__list">
            {aggregates.map((aggregate) => {
              const key = aggregateKey(aggregate)
              const location = [aggregate.region === 'unknown' ? null : aggregate.region, aggregate.country === 'ZZ' ? null : aggregate.country].filter(Boolean).join(', ') || 'Not available'
              return (
                <article className="admin-visitor-card" key={key}>
                  <header className="admin-visitor-card__heading">
                    <div>
                      <p className="admin-kicker">{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${aggregate.visit_date}T00:00:00Z`))}</p>
                      <h3>{aggregate.device_type}</h3>
                    </div>
                    <button
                      className="admin-danger-button"
                      type="button"
                      disabled={deletingVisitors.has(key)}
                      onClick={() => void deleteAggregate(aggregate)}
                    >
                      <Icon name="trash" size={15} /> {deletingVisitors.has(key) ? 'Deleting…' : 'Delete'}
                    </button>
                  </header>
                  <dl className="admin-visitor-card__details">
                    <div><dt>Approximate location</dt><dd>{location}</dd></div>
                    <div><dt>Device</dt><dd>{aggregate.device_type}</dd></div>
                    <div><dt>Visits</dt><dd>{Number(aggregate.visit_count).toLocaleString()}</dd></div>
                  </dl>
                  <div className="admin-visitor-card__history">
                    <strong>Page</strong>
                    <p>{formatLabel(aggregate.page)}</p>
                    <strong>Section</strong>
                    <p>{aggregate.section ? formatLabel(aggregate.section) : 'Page view'}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

export default VisitorTracker
