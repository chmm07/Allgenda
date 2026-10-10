import {createClient} from 'npm:@supabase/supabase-js@2.117.3'
import {calendarAccessToken,CalendarAuthorizationError} from '../_shared/calendar-tokens.ts'
import {googleCalendarClient,CalendarApiError} from '../_shared/google-calendar.ts'
import {synchronizeCalendar,type SyncState} from '../_shared/calendar-sync.ts'
Deno.serve(async(request:Request)=>{
  const origin=request.headers.get('Origin')??'',allowed=(Deno.env.get('APP_ORIGINS')??'').split(',').map(value=>value.trim())
  const headers:Record<string,string>={'Content-Type':'application/json','Vary':'Origin'}
  if(allowed.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'})
  const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers})
  if(origin&&!allowed.includes(origin))return reply(403,{error:'Origem não autorizada.'})
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers})
  if(request.method!=='POST')return reply(405,{error:'Método não permitido.'})
  const authorization=request.headers.get('Authorization')
  if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Sessão necessária.'})
  const url=Deno.env.get('SUPABASE_URL'),publicKey=Deno.env.get('SUPABASE_ANON_KEY'),adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),clientId=Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID'),clientSecret=Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET'),encryptionKey=Deno.env.get('CALENDAR_TOKEN_ENCRYPTION_KEY')
  if(!url||!publicKey||!adminKey||!clientId||!clientSecret||!encryptionKey)return reply(503,{error:'Google Calendar ainda não está configurado.'})
  let active:{owner:string;binding:string;lease:string}|undefined
  const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}})
  try{
    const caller=createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}})
    const {data:{user},error}=await caller.auth.getUser(authorization.slice(7))
    if(error||!user)return reply(401,{error:'Sessão inválida.'})
    const {data:access}=await caller.rpc('has_app_access')
    if(access!==true)return reply(403,{error:'Acesso indisponível.'})
    const text=await request.text();if(text.length>8192)return reply(400,{error:'Solicitação muito grande.'})
    const body=JSON.parse(text)
    if(!['list','configure','sync'].includes(body.action)||typeof body.account_id!=='string')return reply(400,{error:'Solicitação inválida.'})
    const {data:account,error:accountError}=await caller.from('google_accounts').select('id').eq('id',body.account_id).single()
    if(accountError||!account)return reply(404,{error:'Conta indisponível.'})
    const {data:ciphertext,error:credentialError}=await admin.rpc('calendar_credentials',{owner_id:user.id,target_account:account.id})
    if(credentialError||typeof ciphertext!=='string')throw new Error('Credencial indisponível')
    const token=await calendarAccessToken({ciphertext,encryptionKey,clientId,clientSecret,save:async(previous,next)=>{
      const {error}=await admin.rpc('calendar_credentials',{owner_id:user.id,target_account:account.id,previous_cipher:previous,next_cipher:next});if(error)throw new Error('Renovação não persistida')
    }})
    const google=googleCalendarClient(token),calendars=await google.calendars()
    if(body.action==='list')return reply(200,{calendars})
    if(body.action==='configure'){
      const calendar=calendars.find(item=>item.id===body.calendar_id)
      if(!calendar||typeof body.environment_id!=='string'||typeof body.enabled!=='boolean'||typeof body.confirmed!=='boolean')return reply(400,{error:'Escolha um calendário editável e um ambiente.'})
      const {data,error}=await caller.rpc('configure_calendar',{target_account:account.id,target_calendar:calendar.id,target_name:calendar.summary,target_environment:body.environment_id,activate:body.enabled,confirmed:body.confirmed})
      if(error)return reply(409,{error:'Não foi possível salvar. Confira a associação; cada ambiente utiliza um calendário.'})
      return reply(200,{id:data})
    }
    if(typeof body.binding_id!=='string')return reply(400,{error:'Calendário necessário.'})
    const {data:binding,error:bindingError}=await caller.from('calendar_bindings').select('id,account_id,calendar_id').eq('id',body.binding_id).eq('account_id',account.id).single()
    if(bindingError||!binding||!calendars.some(item=>item.id===binding.calendar_id))return reply(404,{error:'Calendário indisponível ou sem permissão de edição.'})
    const {data:state,error:beginError}=await admin.rpc('calendar_sync',{owner_id:user.id,target_binding:binding.id,operation:'begin'})
    if(beginError)return reply(409,{error:'Calendário pausado ou sincronização em andamento. Recarregue e tente novamente.'})
    active={owner:user.id,binding:binding.id,lease:state.lease}
    const result=await synchronizeCalendar(state as SyncState,google,async(operation,payload)=>{
      const {data,error}=await admin.rpc('calendar_sync',{owner_id:user.id,target_binding:binding.id,operation,payload})
      if(error)throw new Error('Estado local mudou; repita a sincronização.')
      return data
    })
    active=undefined
    return reply(200,result)
  }catch(error){
    if(active)await admin.rpc('calendar_sync',{owner_id:active.owner,target_binding:active.binding,operation:'fail',payload:{lease:active.lease}})
    if(error instanceof CalendarAuthorizationError)return reply(401,{error:error.message})
    if(error instanceof CalendarApiError)return reply(error.status===412?409:503,{error:error.status===401?'Reconecte esta conta Google.':error.status===412?'O evento mudou no Google durante a sincronização. Repita para usar a versão mais recente.':'Google Calendar indisponível. Repita mais tarde.'})
    return reply(409,{error:'A sincronização não foi concluída. Dados pendentes foram preservados. Confira a associação, as alterações da série e tente novamente.'})
  }
})
