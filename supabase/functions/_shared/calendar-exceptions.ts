import {Temporal} from '@js-temporal/polyfill'
import {CalendarApiError,type GoogleEvent,type googleCalendarClient} from './google-calendar.ts'
import {newestSide,type CalendarAppointment} from './calendar-codec.ts'
export type CalendarException={appointment_id:string;original_start:string;title:string;starts_at:string;ends_at:string;timezone:string;cancelled:boolean;updated_at:string}
export type ExceptionLink={appointment_id:string;original_start:string;google_id:string;etag:string|null;local_updated_at:string|null;local_deleted_at:string|null}
export type ExceptionReset={appointment_id:string;original_start:string;deleted_at:string}
type ExceptionRpc=(operation:string,payload:Record<string,unknown>)=>Promise<unknown>
const exceptionKey=(parent:string,start:string)=>`${parent}|${Temporal.Instant.from(start).toString()}`
const equalTime=(one:string|null|undefined,two:string|null|undefined)=>one==null||two==null?one==null&&two==null:Date.parse(one)===Date.parse(two)
function originalValue(parent:CalendarAppointment,original:string){
  const duration=Date.parse(parent.ends_at)-Date.parse(parent.starts_at)
  return {title:parent.title,starts_at:Temporal.Instant.from(original).toString(),ends_at:Temporal.Instant.from(original).add({milliseconds:duration}).toString(),timezone:parent.timezone,cancelled:false}
}
export async function synchronizeExceptions(options:{
  parents:Map<string,CalendarAppointment>;parentLinks:Map<string,string>;exceptions:CalendarException[];links:ExceptionLink[];resets:ExceptionReset[];events:GoogleEvent[];
  google:ReturnType<typeof googleCalendarClient>;calendar:string;rpc:ExceptionRpc;deadline:()=>void;
}){
  const {parents,parentLinks,google,rpc,deadline}=options
  const local=new Map(options.exceptions.map(item=>[exceptionKey(item.appointment_id,item.original_start),item]))
  const links=new Map(options.links.map(item=>[exceptionKey(item.appointment_id,item.original_start),item]))
  const resets=new Map(options.resets.map(item=>[exceptionKey(item.appointment_id,item.original_start),item]))
  const reverse=new Map(Array.from(parentLinks,([id,googleId])=>[googleId,id]))
  const remote=new Map<string,GoogleEvent>()
  let skipped=0,imported=0,exported=0
  for(const event of options.events){
    if(!event.recurringEventId)continue
    const parent=reverse.get(event.recurringEventId)
    if(!parent||!parents.has(parent)){skipped++;continue}
    if(!event.originalStartTime?.dateTime)throw new Error('Ocorrência sem início original; série preservada.')
    remote.set(exceptionKey(parent,event.originalStartTime.dateTime),event)
  }
  const addresses=new Set([...local.keys(),...links.keys(),...resets.keys(),...remote.keys()])
  for(const address of addresses){
    deadline()
    const item=local.get(address),link=links.get(address),reset=resets.get(address)
    const [parentId,original]=address.split('|'),parent=parents.get(parentId),googleParent=parentLinks.get(parentId)
    if(!parent||!googleParent||parent.frequency==='none')continue
    const payload={appointment_id:parentId,original_start:original,expected_parent_updated_at:parent.updated_at,expected_updated_at:item?.updated_at??null,expected_deleted_at:reset?.deleted_at??null}
    let event=remote.get(address)
    const explicitRemote=!!event
    if(!event&&link){
      try{event=await google.get(options.calendar,link.google_id)}catch(error){if(!(error instanceof CalendarApiError)||![404,410].includes(error.status))throw error}
    }
    if(!event)event=await google.instance(options.calendar,googleParent,original)??undefined
    if(!event){
      if(!item&&reset){await rpc('exception_forget',payload);continue}
      throw new Error('Ocorrência não encontrada na série Google; dados preservados.')
    }
    if(event.recurringEventId&&event.recurringEventId!==googleParent)throw new Error('Ocorrência pertence a outra série; dados preservados.')
    if(event.originalStartTime?.dateTime&&!equalTime(event.originalStartTime.dateTime,original))throw new Error('Início original mudou; dados preservados.')
    const localChanged=!link||!equalTime(item?.updated_at,link.local_updated_at)||!equalTime(reset?.deleted_at,link.local_deleted_at)
    const remoteChanged=!link||(event.etag||null)!==link.etag
    if(!localChanged&&!remoteChanged)continue
    let side:'local'|'remote'
    if(!item&&!reset)side='remote'
    else if(!link&&!explicitRemote)side='local' // Instância gerada da série, sem edição individual remota.
    else if(!remoteChanged)side='local'
    else if(!localChanged)side='remote'
    else side=newestSide(item?.updated_at??reset!.deleted_at,event.updated)
    if(side==='remote'){
      const value=event.status==='cancelled'?{...originalValue(parent,original),cancelled:true}:{title:event.summary?.trim(),starts_at:event.start?.dateTime,ends_at:event.end?.dateTime,timezone:event.start?.timeZone??parent.timezone,cancelled:false}
      if(!value.title||!value.starts_at||!value.ends_at||Date.parse(value.ends_at)<=Date.parse(value.starts_at))throw new Error('Ocorrência Google incompleta; dados preservados.')
      const normal=originalValue(parent,original)
      if(!item&&reset&&!value.cancelled&&value.title===normal.title&&equalTime(value.starts_at,normal.starts_at)&&equalTime(value.ends_at,normal.ends_at)&&value.timezone===normal.timezone){
        await rpc('exception_ack',{...payload,google_id:event.id,etag:event.etag});continue
      }
      await rpc('exception_remote',{...payload,value,google_id:event.id,etag:event.etag,google_cancelled:event.status==='cancelled'});imported++
    }else{
      await rpc('exception_check',payload)
      let saved=event
      if(item?.cancelled){
        if(event.status!=='cancelled'){
          await google.remove(options.calendar,event.id,event.etag,true)
          // DELETE não devolve ETag. Ler versão final, nunca sintetizá-la.
          try{saved=await google.get(options.calendar,event.id)}catch(error){if(!(error instanceof CalendarApiError)||![404,410].includes(error.status))throw error;saved={...event,status:'cancelled',etag:''}}
        }
      }else{
        const value=item??originalValue(parent,original)
        saved=await google.update(options.calendar,event.id,{status:'confirmed',summary:value.title,start:{dateTime:value.starts_at,timeZone:value.timezone},end:{dateTime:value.ends_at,timeZone:value.timezone}},event.etag)
      }
      await rpc('exception_ack',{...payload,google_id:saved.id,etag:saved.etag,google_cancelled:saved.status==='cancelled'});exported++
    }
  }
  return {imported,exported,skipped}
}
