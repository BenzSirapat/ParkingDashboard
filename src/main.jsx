import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { LangProvider } from './lib/i18n.jsx'
import { SiteProvider } from './lib/siteContext.jsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <SiteProvider>
            <App />
          </SiteProvider>
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
