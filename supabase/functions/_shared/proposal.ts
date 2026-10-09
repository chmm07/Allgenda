export type Proposal = {
  kind:'task'|'appointment'; title:string; environment_id:string|null; due_at:string|null;
  starts_at:string|null; ends_at:string|null; timezone:string;
  frequency:'none'|'daily'|'weekly'|'monthly'; repeat_interval:number; repeat_until:string|null;
}
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value)
export function parseProposal(value:unknown,environmentIds:string[],timezone:string):Proposal {
  if(!object(value)||!['task','appointment'].includes(String(value.kind))||typeof value.title!=='string'||!value.title.trim())throw new Error('Resposta sem ação válida.')
  const optional=(name:string)=>{
    const item=value[name]
    if(item===null||item===undefined||item==='')return null
    if(typeof item!=='string')throw new Error('Campo inválido.')
    return item
  }
  const environment=optional('environment_id')
  if(environment&&!environmentIds.includes(environment))throw new Error('Ambiente inválido.')
  const zone=optional('timezone')??timezone
  new Intl.DateTimeFormat('pt-BR',{timeZone:zone})
  const timestamp=(name:string)=>{
    const item=optional(name)
    if(item&&!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(item))throw new Error('Data sem fuso.')
    if(item&&!Number.isFinite(Date.parse(item)))throw new Error('Data inválida.')
    if(item){
      const match=item.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/)
      if(!match||new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0,10)!==match[1]||Number(match[2])>23||Number(match[3])>59||Number(match[4]??0)>59)throw new Error('Data inválida.')
    }
    return item
  }
  const frequency=value.frequency??'none'
  const interval=value.repeat_interval??1
  if(!['none','daily','weekly','monthly'].includes(String(frequency))||typeof interval!=='number'||!Number.isSafeInteger(interval)||interval<1)throw new Error('Recorrência inválida.')
  return {kind:value.kind as Proposal['kind'],title:value.title.trim(),environment_id:environment,due_at:timestamp('due_at'),starts_at:timestamp('starts_at'),ends_at:timestamp('ends_at'),timezone:zone,frequency:frequency as Proposal['frequency'],repeat_interval:interval,repeat_until:optional('repeat_until')}
}
