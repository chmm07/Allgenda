import {createClient} from 'npm:@supabase/supabase-js@2.117.3'
import {encryptSecret,hashSecret,randomSecret} from '../_shared/calendar-crypto.ts'
Deno.serve(async(request:Request)=>{
  const origin=request.headers.get('Origin')??'';const allowed=(Deno.env.get('APP_ORIGINS')??'').split(',').map(value=>value.trim());const headers:Record<string,string>={'Content-Type':'application/json','Vary':'Origin'}
  if(allowed.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'})
  const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers})
  if(origin&&!allowed.includes(origin))return reply(403,{error:'Origem não autorizada.'})
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers})
  if(request.method!=='POST')return reply(405,{error:'Método não permitido.'})
  const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Sessão necessária.'})
  const url=Deno.env.get('SUPABASE_URL'),publicKey=Deno.env.get('SUPABASE_ANON_KEY'),adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),clientId=Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID'),redirect=Deno.env.get('GOOGLE_CALENDAR_REDIRECT_URI'),encryption=Deno.env.get('CALENDAR_TOKEN_ENCRYPTION_KEY')
  if(!url||!publicKey||!adminKey||!clientId||!redirect||!encryption)return reply(503,{error:'Conexão Calendar ainda não configurada.'})
  try{
    const caller=createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}})
    const {data:{user},error}=await caller.auth.getUser(authorization.slice(7));if(error||!user)return reply(401,{error:'Sessão inválida.'})
    const {data:access}=await caller.rpc('has_app_access');if(access!==true)return reply(403,{error:'Acesso indisponível.'})
    const state=randomSecret(),verifier=randomSecret();const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {error:stateError}=await admin.rpc('calendar_oauth_begin',{owner_id:user.id,state_hash:await hashSecret(state),verifier_ciphertext:await encryptSecret(verifier,encryption)})
    if(stateError)return reply(503,{error:'Não foi possível iniciar a conexão.'})
    const params=new URLSearchParams({client_id:clientId,redirect_uri:redirect,response_type:'code',scope:'openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly',state,code_challenge:await hashSecret(verifier),code_challenge_method:'S256',access_type:'offline',prompt:'consent select_account'})
    return reply(200,{url:`https://accounts.google.com/o/oauth2/v2/auth?${params}`})
  }catch{return reply(503,{error:'Não foi possível iniciar a conexão com segurança.'})}
})
