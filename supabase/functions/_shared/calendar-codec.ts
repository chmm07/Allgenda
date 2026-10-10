import {Temporal} from '@js-temporal/polyfill'
import type {GoogleEvent} from './google-calendar.ts'

export type CalendarAppointment={id:string;user_id:string;environment_id:string;title:string;starts_at:string;ends_at:string;timezone:string;frequency:'none'|'daily'|'weekly'|'monthly';repeat_interval:number;repeat_until:string|null;updated_at:string}
export class UnsupportedCalendarEvent extends Error {
  constructor(){super('Evento de dia inteiro ou recorrência avançada: preservado no Google, fora do escopo atual.')}
}
export function fromGoogle(event:GoogleEvent, environment:string):Omit<CalendarAppointment,'id'|'user_id'|'updated_at'> {
  if(event.recurringEventId||!event.start?.dateTime||!event.end?.dateTime||!event.summary?.trim())throw new UnsupportedCalendarEvent()
  const timezone=event.start.timeZone??'UTC'
  const start=Temporal.Instant.from(event.start.dateTime),end=Temporal.Instant.from(event.end.dateTime)
  if(Temporal.Instant.compare(end,start)<=0)throw new UnsupportedCalendarEvent()
  const local=start.toZonedDateTimeISO(timezone)
  let frequency:CalendarAppointment['frequency']='none',repeat_interval=1,repeat_until:string|null=null
  if(event.recurrence?.length){
    if(event.recurrence.length!==1||!event.recurrence[0].startsWith('RRULE:'))throw new UnsupportedCalendarEvent()
    const fields=event.recurrence[0].slice(6).split(';').map(part=>part.split('='))
    if(fields.some(pair=>pair.length!==2)||new Set(fields.map(pair=>pair[0])).size!==fields.length)throw new UnsupportedCalendarEvent()
    const rule=Object.fromEntries(fields)
    const choices:Record<string,CalendarAppointment['frequency']>={DAILY:'daily',WEEKLY:'weekly',MONTHLY:'monthly'}
    frequency=choices[rule.FREQ]
    if(!frequency||Object.keys(rule).some(key=>!['FREQ','INTERVAL','UNTIL','BYDAY','BYMONTHDAY','WKST'].includes(key)))throw new UnsupportedCalendarEvent()
    repeat_interval=Number(rule.INTERVAL??1)
    if(!Number.isSafeInteger(repeat_interval)||repeat_interval<1)throw new UnsupportedCalendarEvent()
    if(rule.BYDAY&&(frequency!=='weekly'||rule.BYDAY!==['MO','TU','WE','TH','FR','SA','SU'][local.dayOfWeek-1]))throw new UnsupportedCalendarEvent()
    if(rule.BYMONTHDAY&&(frequency!=='monthly'||Number(rule.BYMONTHDAY)!==local.day))throw new UnsupportedCalendarEvent()
    if(rule.UNTIL){
      if(!/^\d{8}T\d{6}Z$/.test(rule.UNTIL))throw new UnsupportedCalendarEvent()
      const raw=rule.UNTIL
      const until=Temporal.Instant.from(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T${raw.slice(9,11)}:${raw.slice(11,13)}:${raw.slice(13,15)}Z`)
      // A data final local só é representável quando inclui a ocorrência desse dia.
      const date=until.toZonedDateTimeISO(timezone).toPlainDate()
      const last=date.toPlainDateTime(local.toPlainTime()).toZonedDateTime(timezone,{disambiguation:'reject'}).toInstant()
      if(Temporal.Instant.compare(until,last)<0||Temporal.PlainDate.compare(date,local.toPlainDate())<0)throw new UnsupportedCalendarEvent()
      repeat_until=date.toString()
    }
  }
  return {environment_id:environment,title:event.summary.trim(),starts_at:start.toString(),ends_at:end.toString(),timezone,frequency,repeat_interval,repeat_until}
}
export function toGoogle(item:CalendarAppointment,binding:string):Omit<GoogleEvent,'id'|'etag'> {
  const recurrence:string[]=[]
  if(item.frequency!=='none'){
    let rule=`RRULE:FREQ=${item.frequency.toUpperCase()};INTERVAL=${item.repeat_interval}`
    if(item.repeat_until){
      const until=Temporal.PlainDate.from(item.repeat_until).add({days:1}).toZonedDateTime(item.timezone).toInstant().subtract({seconds:1}).toString({smallestUnit:'second'}).replace(/[-:]/g,'')
      rule+=`;UNTIL=${until}`
    }
    recurrence.push(rule)
  }
  return {summary:item.title,start:{dateTime:item.starts_at,timeZone:item.timezone},end:{dateTime:item.ends_at,timeZone:item.timezone},recurrence,extendedProperties:{private:{allgenda_id:item.id,allgenda_binding:binding}}}
}
export function newestSide(local:string,remote:string|undefined):'local'|'remote' {
  const a=Date.parse(local),b=Date.parse(remote??'')
  if(!Number.isFinite(a)||!Number.isFinite(b))throw new Error('Versão sem data confiável; nenhuma alteração será sobrescrita.')
  return a>b?'local':'remote'
}
