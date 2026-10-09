export type AppEnvironment = 'development' | 'test' | 'production'
export type AppConfig = { url: string; key: string; environment: AppEnvironment }
export type ConfigResult = { config: AppConfig; error?: never } | { config?: never; error: string }

export function readConfig(env: Record<string, unknown>): ConfigResult {
  const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : ''
  const key = typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === 'string' ? env.VITE_SUPABASE_PUBLISHABLE_KEY.trim() : ''
  const environment = env.VITE_APP_ENV
  if (!url || !key) return { error: 'A conexão ainda não foi configurada.' }
  if (environment !== 'development' && environment !== 'test' && environment !== 'production') {
    return { error: 'O ambiente de execução precisa ser configurado.' }
  }
  try {
    const parsed = new URL(url)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) throw new Error()
    if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:' && environment === 'development')) throw new Error()
  } catch {
    return { error: 'A URL da conexão é inválida para este ambiente.' }
  }
  // Defesa contra configuração acidental de chave administrativa pública.
  if (!key.startsWith('sb_publishable_')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
      if (payload.role !== 'anon') throw new Error()
    } catch {
      return { error: 'Use somente uma chave pública publishable ou anon.' }
    }
  }
  return { config: { url, key, environment } }
}
