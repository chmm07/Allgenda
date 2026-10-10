import {decryptSecret, encryptSecret} from './calendar-crypto.ts'

type Tokens = {access_token: string; refresh_token: string; expires_at: number}
export class CalendarAuthorizationError extends Error {
  constructor(){super('Reconecte esta conta Google para renovar a autorização.')}
}
export async function calendarAccessToken(options: {
  ciphertext: string; encryptionKey: string; clientId: string; clientSecret: string;
  save: (previous: string, next: string) => Promise<void>; fetcher?: typeof fetch; now?: number;
}) {
  const now=options.now??Date.now()
  const tokens=await decryptSecret(options.ciphertext, options.encryptionKey) as Tokens
  if(!tokens || typeof tokens.access_token!=='string' || typeof tokens.refresh_token!=='string' || !Number.isFinite(tokens.expires_at))throw new CalendarAuthorizationError()
  if(tokens.expires_at>now+60000)return tokens.access_token
  const response=await (options.fetcher??fetch)('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, signal:AbortSignal.timeout(20000),
    body:new URLSearchParams({client_id:options.clientId,client_secret:options.clientSecret,refresh_token:tokens.refresh_token,grant_type:'refresh_token'}),
  })
  if(response.status===400 || response.status===401)throw new CalendarAuthorizationError()
  if(!response.ok)throw new Error('Não foi possível renovar a conexão. Tente novamente.')
  const next=await response.json()
  if(typeof next.access_token!=='string'||!next.access_token||typeof next.expires_in!=='number'||next.expires_in<=0)throw new Error('Resposta de renovação inválida.')
  const value:Tokens={access_token:next.access_token,refresh_token:typeof next.refresh_token==='string'&&next.refresh_token?next.refresh_token:tokens.refresh_token,expires_at:now+next.expires_in*1000}
  await options.save(options.ciphertext,await encryptSecret(value,options.encryptionKey))
  return value.access_token
}
