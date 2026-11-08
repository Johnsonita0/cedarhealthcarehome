import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import HomePage from './pages/HomePage.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import './styles/main.css'
import './styles/professional.css'

const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
const isAdminRoute = window.location.pathname.replace(/\/+$/, '') === '/admin'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      {isAdminRoute
        ? <Suspense fallback={<div className="admin-loading">Loading Cedar Admin…</div>}><AdminPage /></Suspense>
        : <HomePage />}
    </ToastProvider>
  </React.StrictMode>,
)
