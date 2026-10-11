import {createClient} from 'npm:@supabase/supabase-js@2.117.3'
import {interpretWorkersAi,workersAiConfigured,WorkersAiUnavailableError} from '../_shared/workers-ai.ts'

Deno.serve(async(request:Request)=>{
  const origin=request.headers.get('Origin')??''
  const allowed=(Deno.env.get('APP_ORIGINS')??'').split(',').map(value=>value.trim()).filter(Boolean)
  const headers:Record<string,string>={'Content-Type':'application/json','Vary':'Origin'}
  if(allowed.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'})
  const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers})
  if(origin&&!allowed.includes(origin))return respond(403,{error:'Origem não autorizada.'})
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers})
  if(request.method!=='POST')return respond(405,{error:'Método não permitido.'})
  const authorization=request.headers.get('Authorization')
  if(!authorization?.startsWith('Bearer '))return respond(401,{error:'Sessão necessária.'})
  const url=Deno.env.get('SUPABASE_URL'),publicKey=Deno.env.get('SUPABASE_ANON_KEY'),accountId=Deno.env.get('CLOUDFLARE_ACCOUNT_ID'),token=Deno.env.get('CLOUDFLARE_WORKERS_AI_TOKEN')
  if(!url||!publicKey)return respond(503,{error:'Servidor ainda não configurado.'})
  const client=createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}})
  const {data:{user},error:authError}=await client.auth.getUser(authorization.slice(7))
  if(authError||!user)return respond(401,{error:'Sessão inválida.'})
  const {data:access,error:accessError}=await client.rpc('has_app_access')
  if(accessError||access!==true)return respond(403,{error:'Acesso indisponível.'})
  if(!workersAiConfigured(accountId,token))return respond(503,{error:'Interpretação ainda não configurada.'})
  try {
    if(Number(request.headers.get('Content-Length'))>16000)return respond(413,{error:'Mensagem muito longa.'})
    const text=await request.text()
    if(text.length>16000)return respond(413,{error:'Mensagem muito longa.'})
    const body=JSON.parse(text)
    if(typeof body.message!=='string'||!body.message.trim()||body.message.length>4000||typeof body.timezone!=='string')return respond(400,{error:'Confira mensagem e fuso.'})
    new Intl.DateTimeFormat('pt-BR',{timeZone:body.timezone})
    const {data:environments,error}=await client.from('environments').select('id,name,anchor_words')
    if(error)return respond(503,{error:'Não foi possível carregar os contextos.'})
    const proposal=await interpretWorkersAi({accountId:accountId!,token:token!,message:body.message,timezone:body.timezone,environments:environments??[]})
    const {data:history,error:historyError}=await client.from('chat_history').insert({message:body.message.trim(),proposal}).select('id').single()
    if(historyError)return respond(503,{error:'Não foi possível salvar o histórico. Nenhum item foi criado.'})
    return respond(200,{proposal,history_id:history.id})
  }catch(error){return respond(502,{error:error instanceof WorkersAiUnavailableError?error.message:'Não foi possível interpretar com segurança. Revise a mensagem e tente novamente.'})}
})
