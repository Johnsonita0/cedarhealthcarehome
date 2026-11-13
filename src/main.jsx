import React, { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import HomePage from './pages/HomePage.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import { SiteSplash } from './components/UI.jsx'
import './styles/main.css'
import './styles/professional.css'

const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const LegalPage = lazy(() => import('./pages/LegalPage.jsx'))
const VerifyPage = lazy(() => import('./pages/VerifyPage.jsx'))
const currentPath = window.location.pathname.replace(/\/+$/, '')
const isHomeRoute = currentPath === ''
const isAdminRoute = currentPath === '/admin'
const isLegalRoute = currentPath === '/privacy' || currentPath === '/terms'
const isVerifyRoute = currentPath === '/verify'

function shouldShowEntrySplash() {
  if (!isHomeRoute && !isAdminRoute) return false

  const isRefresh = window.performance.getEntriesByType('navigation')[0]?.type === 'reload'
  try {
    const alreadyShown = window.sessionStorage.getItem('cedar-entry-splash-shown') === 'true'
    if (alreadyShown && !isRefresh) return false
    window.sessionStorage.setItem('cedar-entry-splash-shown', 'true')
    return true
  } catch {
    return true
  }
}

const showEntrySplash = shouldShowEntrySplash()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
}

function App() {
  const [showSplash, setShowSplash] = useState(showEntrySplash)

  useEffect(() => {
    if (!showEntrySplash) return undefined
    const timer = window.setTimeout(() => setShowSplash(false), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      {showSplash && <SiteSplash timed />}
    <ToastProvider>
      {isAdminRoute
        ? <Suspense fallback={null}><AdminPage /></Suspense>
        : isVerifyRoute
          ? <Suspense fallback={null}><VerifyPage /></Suspense>
        : isLegalRoute
          ? <Suspense fallback={null}><LegalPage /></Suspense>
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
