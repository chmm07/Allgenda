import { describe,expect,it } from 'vitest'
import type { Appointment,AppointmentException,Task } from '../src/lib/database.types'
import { conflicts,localToInstant,occurrencesInRange,taskGroups,validateAppointment } from '../src/lib/scheduling'

const appointment:Appointment={id:'serie',user_id:'ficticio',environment_id:'ambiente',title:'Reunião fictícia',starts_at:'2026-03-01T14:00:00Z',ends_at:'2026-03-01T14:30:00Z',timezone:'America/New_York',frequency:'weekly',repeat_interval:1,repeat_until:null,created_at:'2026-01-01Z',updated_at:'2026-01-01Z'}
describe('fusos, recorrência e conflitos',()=>{
  it('recorrência mantém 09h local através do início do horário de verão',()=>{
    const items=occurrencesInRange([appointment],[],'2026-03-01T00:00Z','2026-03-20T00:00Z')
    expect(items.map(item=>item.starts_at)).toEqual(['2026-03-01T14:00:00Z','2026-03-08T13:00:00Z','2026-03-15T13:00:00Z'])
  })
  it('rejeita entrada local inexistente ou ambígua',()=>{
    expect(()=>localToInstant('2026-03-08T02:30','America/New_York')).toThrow()
    expect(()=>localToInstant('2026-11-01T01:30','America/New_York')).toThrow()
    expect(localToInstant('2026-03-08T09:00','America/New_York')).toBe('2026-03-08T13:00:00Z')
  })
  it('31 mensal pula meses sem o dia, respeitando fim inclusivo',()=>{
    const series={...appointment,starts_at:'2026-01-31T12:00Z',ends_at:'2026-01-31T12:30Z',timezone:'UTC',frequency:'monthly' as const,repeat_until:'2026-05-31'}
    expect(occurrencesInRange([series],[],'2026-01-01T00:00Z','2026-07-01T00:00Z').map(item=>item.starts_at)).toEqual(['2026-01-31T12:00:00Z','2026-03-31T12:00:00Z','2026-05-31T12:00:00Z'])
  })
  it('exceção movida aparece na janela mesmo quando origem está fora',()=>{
    const override:AppointmentException={appointment_id:appointment.id,user_id:appointment.user_id,original_start:'2026-03-01T14:00:00Z',title:'Movida',starts_at:'2026-03-25T12:00:00Z',ends_at:'2026-03-25T12:30:00Z',timezone:'America/New_York',cancelled:false,created_at:'2026-01-01Z',updated_at:'2026-01-01Z'}
    const items=occurrencesInRange([appointment],[override],'2026-03-25T00:00Z','2026-03-26T00:00Z')
    expect(items.map(item=>item.title)).toEqual(['Movida'])
    expect(occurrencesInRange([appointment],[{...override,cancelled:true}],'2026-03-01T00:00Z','2026-03-02T00:00Z')).toEqual([])
  })
  it('exceção não duplica a ocorrência original',()=>{
    const override:AppointmentException={...appointment,appointment_id:appointment.id,original_start:appointment.starts_at,title:'Editada',cancelled:false}
    expect(occurrencesInRange([appointment],[override],'2026-03-01T00:00Z','2026-03-02T00:00Z').map(item=>item.title)).toEqual(['Editada'])
  })
  it('detecta sobreposição e aceita horários adjacentes',()=>{
    const second={...appointment,id:'segunda',starts_at:'2026-03-01T14:15:00Z',ends_at:'2026-03-01T14:45:00Z',frequency:'none' as const}
    const adjacent={...second,id:'terceira',starts_at:'2026-03-01T14:45:00Z',ends_at:'2026-03-01T15:00:00Z'}
    expect(conflicts(occurrencesInRange([appointment,second,adjacent],[],'2026-03-01T00:00Z','2026-03-02T00:00Z'))).toHaveLength(1)
  })
  it('gera séries antigas sem percorrer todos os anos',()=>{
    const old={...appointment,starts_at:'2000-03-01T14:00Z',ends_at:'2000-03-01T14:30Z',frequency:'daily' as const}
    expect(occurrencesInRange([old],[],'2026-03-01T00:00Z','2026-03-08T00:00Z')).toHaveLength(7)
  })
  it('valida duração, ambiente, fim de recorrência e intervalo',()=>{
    expect(()=>validateAppointment({...appointment,ends_at:appointment.starts_at})).toThrow()
    expect(()=>validateAppointment({...appointment,environment_id:''})).toThrow()
    expect(()=>validateAppointment({...appointment,repeat_until:'2026-02-01'})).toThrow()
    expect(()=>validateAppointment({...appointment,repeat_interval:1.5})).toThrow()
  })
  it('separa sem prazo, futuras, atrasadas e concluídas',()=>{
    const base:Task={id:'a',user_id:'u',environment_id:'e',title:'Fictícia',due_at:null,completed:false,created_at:'2026-01-01Z',updated_at:'2026-01-01Z'}
    const groups=taskGroups([base,{...base,id:'b',due_at:'2026-01-01T00:00Z'},{...base,id:'c',due_at:'2027-01-01T00:00Z'},{...base,id:'d',completed:true}],Date.parse('2026-10-09T00:00Z'))
    expect(groups.undated.map(item=>item.id)).toEqual(['a']);expect(groups.overdue.map(item=>item.id)).toEqual(['b']);expect(groups.upcoming.map(item=>item.id)).toEqual(['c']);expect(groups.completed.map(item=>item.id)).toEqual(['d'])
  })
})
