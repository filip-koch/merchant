import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'
import { MerchantProvider } from './context/MerchantContext.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MerchantProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </MerchantProvider>
  </StrictMode>
)
