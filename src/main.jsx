import React, { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import HomePage from './pages/HomePage.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import { SiteSplash } from './components/UI.jsx'
import './styles/main.css'
import './styles/professional.css'

const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const LegalPage = lazy(() => import('./pages/LegalPage.jsx'))
const currentPath = window.location.pathname.replace(/\/+$/, '')
const isAdminRoute = currentPath === '/admin'
const isLegalRoute = currentPath === '/privacy' || currentPath === '/terms'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
}

function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      {showSplash && <SiteSplash timed />}
    <ToastProvider>
      {isAdminRoute
        ? <Suspense fallback={<SiteSplash />}><AdminPage /></Suspense>
        : isLegalRoute
          ? <Suspense fallback={<SiteSplash />}><LegalPage /></Suspense>
          : <HomePage />}
    </ToastProvider>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
