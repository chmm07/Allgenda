import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readConfig } from './src/lib/config.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (env.VITE_SUPABASE_URL || env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    const result = readConfig(env)
    // Rejeitar chave administrativa antes de ela entrar no bundle.
    if (result.error) throw new Error(result.error)
  }
  return { plugins: [react()], server: { port: 5173, strictPort: true }, build: {rolldownOptions:{input:{app:'index.html',design:'design-system.html'}}} }
})
