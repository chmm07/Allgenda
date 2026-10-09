import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { readConfig } from './lib/config'
import { createSupabase } from './lib/supabase'
import './styles/tokens.css'
import './styles/app.css'

const result = readConfig(import.meta.env)
const client = result.config ? createSupabase(result.config) : null
createRoot(document.getElementById('root')!).render(
  <StrictMode><App client={client} configError={result.error} environment={result.config?.environment} /></StrictMode>,
)
