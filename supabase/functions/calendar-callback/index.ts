import {createClient} from 'npm:@supabase/supabase-js@2.117.3'
import {decryptSecret,encryptSecret,hashSecret} from '../_shared/calendar-crypto.ts'
Deno.serve(async(request:Request)=>{
  if(request.method!=='GET')return new Response('Método não permitido',{status:405})
  const url=Deno.env.get('SUPABASE_URL'),adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),clientId=Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID'),secret=Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET'),redirect=Deno.env.get('GOOGLE_CALENDAR_REDIRECT_URI'),encryption=Deno.env.get('CALENDAR_TOKEN_ENCRYPTION_KEY'),appUrl=Deno.env.get('APP_URL')
  if(!url||!adminKey||!clientId||!secret||!redirect||!encryption||!appUrl)return new Response('Integração ainda não configurada',{status:503})
  const result=(status:string)=>Response.redirect(`${appUrl.replace(/\/$/,'')}?calendar=${status}`,303)
  try{
    const params=new URL(request.url).searchParams;const state=params.get('state'),code=params.get('code')
    if(!state)return result('error')
    const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:claim,error}=await admin.rpc('calendar_oauth_claim',{target_hash:await hashSecret(state)})
    if(error||!claim||!code||params.has('error'))return result('error')
    const verifier=await decryptSecret(claim.verifier_ciphertext,encryption);if(typeof verifier!=='string')return result('error')
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(20000),body:new URLSearchParams({client_id:clientId,client_secret:secret,code,code_verifier:verifier,grant_type:'authorization_code',redirect_uri:redirect})})
    if(!tokenResponse.ok)return result('error')
    const tokens=await tokenResponse.json();if(typeof tokens.access_token!=='string'||typeof tokens.refresh_token!=='string'||typeof tokens.expires_in!=='number')return result('error')
    const identityResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${tokens.access_token}`},signal:AbortSignal.timeout(20000)})
    if(!identityResponse.ok)return result('error')
    const identity=await identityResponse.json();if(typeof identity.sub!=='string'||typeof identity.email!=='string'||identity.email_verified!==true)return result('error')
    const cipher=await encryptSecret({access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_at:Date.now()+tokens.expires_in*1000},encryption)
    const {error:storeError}=await admin.rpc('calendar_account_store',{owner_id:claim.user_id,subject:identity.sub,account_email:identity.email,cipher})
    return result(storeError?'error':'connected')
  }catch{return result('error')}
})
