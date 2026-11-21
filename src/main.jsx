import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { LangProvider } from './lib/i18n.jsx'
import { SiteProvider } from './lib/siteContext.jsx'
import { MasterDataProvider } from './lib/masterData.jsx'
import './styles/index.css'

// Vite injects BASE_URL from `base` in vite.config.js (driven by VITE_BASE).
// A relative base ('./') has no meaning for the router, so fall back to root.
// The trailing slash is dropped so both /dashboard and /dashboard/ match — with
// "/dashboard/" the router renders nothing for a bare /dashboard.
const base = import.meta.env.BASE_URL.startsWith('/') ? import.meta.env.BASE_URL : '/'
const basename = base.length > 1 ? base.replace(/\/+$/, '') : '/'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <LangProvider>
        <SiteProvider>
          <AuthProvider>
            <MasterDataProvider>
              <App />
            </MasterDataProvider>
          </AuthProvider>
        </SiteProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
