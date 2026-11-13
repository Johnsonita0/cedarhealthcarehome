import { createContext, useContext, useEffect, useState } from 'react'
import { Icon } from './UI.jsx'
import '../styles/toast.css'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)

  function showToast(message, type = 'info') {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, message, type }].slice(-4))
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000)
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  useEffect(() => {
    const handleOffline = () => {
      setOnline(false)
      showToast('You are offline. Some actions may be unavailable.', 'warning')
    }
    const handleOnline = () => {
      setOnline(true)
      showToast('Connection restored.', 'success')
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ online, showToast }}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div className={`app-toast app-toast--${toast.type}`} key={toast.id} role="status">
            <span className="app-toast__icon"><Icon name={toast.type === 'success' ? 'health' : toast.type === 'warning' ? 'spark' : toast.type === 'error' ? 'close' : 'leaf'} size={18} /></span>
            <span className="app-toast__message">{toast.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}><Icon name="close" size={15} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

export function NetworkStatus() {
  const { online } = useToast()
  return <span className={`admin-network-status${online ? '' : ' is-offline'}`}><span />{online ? 'Online' : 'Offline'}</span>
}