import {CalendarApiError, type GoogleEvent, type googleCalendarClient} from './google-calendar.ts'
import {fromGoogle,newestSide,toGoogle,UnsupportedCalendarEvent,type CalendarAppointment} from './calendar-codec.ts'
import {synchronizeExceptions,type CalendarException,type ExceptionLink,type ExceptionReset} from './calendar-exceptions.ts'

export type SyncState={lease:string;binding:{id:string;calendar_id:string;environment_id:string|null;sync_token:string|null};appointments:CalendarAppointment[];exceptions:CalendarException[];exception_links?:ExceptionLink[];exception_resets?:ExceptionReset[];links:{appointment_id:string;google_id:string;etag:string;local_updated_at:string}[];tombstones:{appointment_id:string;deleted_at:string}[]}
type Rpc=(operation:string,payload:Record<string,unknown>)=>Promise<unknown>
const sameTime=(a:string,b:string)=>Date.parse(a)===Date.parse(b)

// Cursor só avança após todos os itens suportados. Escritas parciais são recuperáveis
// por ID estável, CAS local, ETag remoto e links persistidos em transações.
export async function synchronizeCalendar(state:SyncState,google:ReturnType<typeof googleCalendarClient>,rpc:Rpc,options:{now?:()=>number;uuid?:()=>string}={}) {
  const now=options.now??Date.now,start=now(),uuid=options.uuid??(()=>crypto.randomUUID())
  const deadline=()=>{if(now()-start>80000)throw new Error('O lote precisa continuar. Repita a sincronização.')}
  const transition=(operation:string,payload:Record<string,unknown>)=>{deadline();return rpc(operation,{lease:state.lease,...payload})}
  const parents=new Map(state.appointments.map(item=>[item.id,item])),parentLinks=new Map(state.links.map(link=>[link.appointment_id,link.google_id]))
  let page:Awaited<ReturnType<typeof google.events>>
  try{page=await google.events(state.binding.calendar_id,state.binding.sync_token??undefined)}catch(error){
    if(!(error instanceof CalendarApiError)||error.status!==410)throw error
    page=await google.events(state.binding.calendar_id)
  }
  const remote=new Map(page.events.map(event=>[event.id,event]))
  const seen=new Set<string>(),linkedLocal=new Set<string>()
  let imported=0,exported=0,deleted=0,skipped=0
  const get=async(id:string)=>{
    deadline()
    if(remote.has(id))return remote.get(id)!
    try{return await google.get(state.binding.calendar_id,id)}catch(error){
      if(error instanceof CalendarApiError&&(error.status===404||error.status===410))return {id,etag:'',status:'cancelled'} satisfies GoogleEvent
      throw error
    }
  }
  const version=(local:CalendarAppointment|null,tombstone?:{deleted_at:string})=>({expected_updated_at:local?.updated_at??null,expected_deleted_at:tombstone?.deleted_at??null})
  const check=(id:string,local:CalendarAppointment|null,tombstone?:{deleted_at:string})=>transition('check',{appointment_id:id,...version(local,tombstone)})
  const recreate=async(local:CalendarAppointment,deletedId:string)=>{
    // Novo ID determinístico após exclusão: o Google não reutiliza IDs cancelados.
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${state.binding.id}:${local.id}:${deletedId}`))
    const id=Array.from(new Uint8Array(digest)).map(value=>value.toString(16).padStart(2,'0')).join('').slice(0,32)
    await check(local.id,local)
    try{return await google.create(state.binding.calendar_id,id,toGoogle(local,state.binding.id))}catch(error){
      if(!(error instanceof CalendarApiError)||error.status!==409)throw error
      const existing=await google.get(state.binding.calendar_id,id)
      if(existing.status==='cancelled'||existing.extendedProperties?.private?.allgenda_id!==local.id||existing.extendedProperties.private.allgenda_binding!==state.binding.id)throw new Error('Identificador ocupado; dados preservados.',{cause:error})
      return newestSide(local.updated_at,existing.updated)==='local'?await google.update(state.binding.calendar_id,existing.id,toGoogle(local,state.binding.id),existing.etag):existing
    }
  }
  const persist=async(local:CalendarAppointment,event:GoogleEvent,operation='ack',tombstone?:{deleted_at:string})=>{
    if(!event.etag?.trim()||event.etag.trim()==='*')throw new Error('Resposta Google sem versão específica.')
    const result=await transition(operation,{appointment_id:local.id,...version(operation==='remote'&&tombstone?null:local,tombstone),google_id:event.id,etag:event.etag,google_updated_at:event.updated??null,...(operation==='remote'?{value:fromGoogle(event,state.binding.environment_id!)}:{})}) as CalendarAppointment
    parents.set(local.id,result?.id?result:local);parentLinks.set(local.id,event.id)
  }
  const exceptionTransition:Rpc=async(operation,payload)=>{
    const result=await transition(operation,payload) as CalendarException
    const matches=(item:{appointment_id:string;original_start:string})=>item.appointment_id===payload.appointment_id&&Date.parse(item.original_start)===Date.parse(payload.original_start as string)
    if(operation==='exception_forget')state.exception_links=(state.exception_links??[]).filter(item=>!matches(item))
    if(operation==='exception_remote'&&result?.appointment_id)state.exceptions=[...state.exceptions.filter(item=>!matches(item)),result]
    if(operation==='exception_ack'||operation==='exception_remote')state.exception_links=[...(state.exception_links??[]).filter(item=>!matches(item)),{appointment_id:payload.appointment_id as string,original_start:payload.original_start as string,google_id:payload.google_id as string,etag:(payload.etag as string)||null,local_updated_at:operation==='exception_remote'?result?.updated_at??null:(payload.expected_updated_at as string|null),local_deleted_at:payload.expected_deleted_at as string|null}]
    return result
  }
  // Restaurar exceções antes do PATCH da série evita tratar alterações causadas
  // pelo próprio PATCH como edições Google posteriores à confirmação local.
  const pendingResets=(state.exception_resets??[]).filter(reset=>!state.exceptions.some(item=>item.appointment_id===reset.appointment_id&&sameTime(item.original_start,reset.original_start))&&(state.exception_links??[]).some(link=>link.appointment_id===reset.appointment_id&&sameTime(link.original_start,reset.original_start)&&Date.parse(link.local_deleted_at??'')!==Date.parse(reset.deleted_at)))
  const resetParents=new Map<string,CalendarAppointment>()
  for(const reset of pendingResets){
    const local=parents.get(reset.appointment_id),parentId=parentLinks.get(reset.appointment_id)
    if(!local||!parentId)continue
    const original=fromGoogle(await get(parentId),state.binding.environment_id!)
    if(!sameTime(original.starts_at,local.starts_at)||original.timezone!==local.timezone||original.frequency!==local.frequency||original.repeat_interval!==local.repeat_interval||original.repeat_until!==local.repeat_until)throw new Error('Mudança de horário ou regra da série com exceções exige verificar o remapeamento Google; dados preservados.')
    resetParents.set(local.id,local)
  }
  if(resetParents.size){
    const restored=await synchronizeExceptions({parents:resetParents,parentLinks,exceptions:[],links:(state.exception_links??[]).filter(link=>pendingResets.some(reset=>reset.appointment_id===link.appointment_id&&sameTime(reset.original_start,link.original_start))),resets:pendingResets,events:page.events,google,calendar:state.binding.calendar_id,rpc:exceptionTransition,deadline})
    imported+=restored.imported;exported+=restored.exported
  }
  for(const link of state.links){
    deadline();seen.add(link.google_id);linkedLocal.add(link.appointment_id)
    const local=state.appointments.find(item=>item.id===link.appointment_id)??null
    const tombstone=state.tombstones.find(item=>item.appointment_id===link.appointment_id)
    const event=await get(link.google_id)
    const remoteDeleted=event.status==='cancelled',remoteChanged=event.etag!==link.etag
    if(!local){
      if(!tombstone)throw new Error('Item mudou de ambiente. A associação anterior precisa ser revisada; nada será excluído automaticamente.')
      if(remoteDeleted){await transition('delete_local',{appointment_id:link.appointment_id,...version(null,tombstone)});continue}
      if(remoteChanged&&newestSide(tombstone.deleted_at,event.updated)==='remote'){
        if(!state.binding.environment_id)throw new Error('Calendário mudou após exclusão do ambiente; preserve e revise no Google.')
        const restored={...fromGoogle(event,state.binding.environment_id),id:link.appointment_id,user_id:'',updated_at:tombstone.deleted_at}
        await persist(restored,event,'remote',tombstone);imported++
      }else{
        await check(link.appointment_id,null,tombstone)
        await google.remove(state.binding.calendar_id,event.id,event.etag,true)
        await transition('delete_local',{appointment_id:link.appointment_id,...version(null,tombstone)});deleted++
      }
      continue
    }
    const localChanged=!sameTime(local.updated_at,link.local_updated_at)
    if(remoteDeleted){
      if(localChanged){
        if(newestSide(local.updated_at,event.updated)==='local'){
          await persist(local,await recreate(local,event.id),'remote');exported++;continue
        }
      }
      await transition('delete_remote',{appointment_id:local.id,...version(local)});parents.delete(local.id);parentLinks.delete(local.id);deleted++;continue
    }
    if(!remoteChanged&&!localChanged)continue
    if(remoteChanged&&(!localChanged||newestSide(local.updated_at,event.updated)==='remote')){
      await persist(local,event,'remote');imported++
    }else{
      await check(local.id,local)
      const saved=await google.update(state.binding.calendar_id,event.id,toGoogle(local,state.binding.id),event.etag)
      await persist(local,saved);exported++
    }
  }
  // Eventos novos do Google recebem UUID local do servidor; propriedades externas
  // nunca autorizam acesso a um UUID arbitrário de outro usuário.
  for(const event of page.events){
    deadline()
    if(seen.has(event.id)||event.status==='cancelled'||event.recurringEventId)continue
    if(!state.binding.environment_id)continue
    const hinted=event.extendedProperties?.private
    const local=hinted?.allgenda_binding===state.binding.id?state.appointments.find(item=>item.id===hinted.allgenda_id):undefined
    if(local){
      if(newestSide(local.updated_at,event.updated)==='local'){
        await check(local.id,local)
        const saved=await google.update(state.binding.calendar_id,event.id,toGoogle(local,state.binding.id),event.etag);await persist(local,saved);exported++
      }else{await persist(local,event,'remote');imported++}
      linkedLocal.add(local.id);continue
    }
    const tombstone=hinted?.allgenda_binding===state.binding.id?state.tombstones.find(item=>item.appointment_id===hinted.allgenda_id):undefined
    if(tombstone){
      if(newestSide(tombstone.deleted_at,event.updated)==='local'){await check(tombstone.appointment_id,null,tombstone);await google.remove(state.binding.calendar_id,event.id,event.etag,true);deleted++;continue}
    }
    try{
      const value=fromGoogle(event,state.binding.environment_id)
      const id=tombstone?.appointment_id??uuid()
      const result=await transition('remote',{appointment_id:id,...version(null,tombstone),value,google_id:event.id,etag:event.etag,google_updated_at:event.updated??null}) as CalendarAppointment
      parents.set(id,result?.id?result:{...value,id,user_id:'',updated_at:event.updated??new Date(now()).toISOString()});parentLinks.set(id,event.id);imported++
    }catch(error){if(error instanceof UnsupportedCalendarEvent){skipped++;continue}throw error}
  }
  for(const local of state.appointments){
    deadline();if(linkedLocal.has(local.id))continue
    await check(local.id,local)
    let event:GoogleEvent
    try{event=await google.create(state.binding.calendar_id,local.id,toGoogle(local,state.binding.id))}catch(error){
      if(!(error instanceof CalendarApiError)||error.status!==409)throw error
      event=await google.get(state.binding.calendar_id,local.id.replace(/-/g,'').toLowerCase())
      if(event.status==='cancelled'){
        throw new Error('ID Google cancelado sem vínculo confirmado; item local preservado.',{cause:error})
      }
      if(event.extendedProperties?.private?.allgenda_id!==local.id||event.extendedProperties.private.allgenda_binding!==state.binding.id)throw new Error('Identificador Google ocupado; nenhum evento alheio será sobrescrito.',{cause:error})
      if(newestSide(local.updated_at,event.updated)==='remote'){await persist(local,event,'remote');imported++;continue}
      event=await google.update(state.binding.calendar_id,event.id,toGoogle(local,state.binding.id),event.etag)
    }
    await persist(local,event);exported++
  }
  // A prévia do delta é anterior à restauração. Ler a versão atual das
  // ocorrências já tratadas evita reimportar a exceção que acabamos de remover.
  const exceptionEvents=page.events.filter(event=>!pendingResets.some(reset=>resetParents.has(reset.appointment_id)&&parentLinks.get(reset.appointment_id)===event.recurringEventId&&!!event.originalStartTime?.dateTime&&sameTime(reset.original_start,event.originalStartTime.dateTime)))
  const exceptions=await synchronizeExceptions({parents,parentLinks,exceptions:state.exceptions,links:state.exception_links??[],resets:state.exception_resets??[],events:exceptionEvents,google,calendar:state.binding.calendar_id,rpc:exceptionTransition,deadline})
  imported+=exceptions.imported;exported+=exceptions.exported;skipped+=exceptions.skipped
  const warning=skipped?`${skipped} eventos de dia inteiro ou recorrência avançada preservados somente no Google.`:''
  await transition('finish',{sync_token:page.syncToken,warning})
  return {imported,exported,deleted,skipped,warning}
}
