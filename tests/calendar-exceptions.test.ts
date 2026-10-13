import {describe,expect,it,vi} from 'vitest'
import {isSeriesOccurrence,synchronizeExceptions,type CalendarException,type ExceptionLink,type ExceptionReset} from '../supabase/functions/_shared/calendar-exceptions'
import {CalendarApiError,type GoogleEvent} from '../supabase/functions/_shared/google-calendar'
const parent={id:'parent',user_id:'user',environment_id:'env',title:'Série fictícia',starts_at:'2026-10-10T12:00Z',ends_at:'2026-10-10T12:30Z',timezone:'America/Fortaleza',frequency:'weekly' as const,repeat_interval:1,repeat_until:null,updated_at:'2026-10-10T11:00Z'}
const original='2026-10-17T12:00:00Z'
const local:CalendarException={appointment_id:parent.id,original_start:original,title:'Exceção local',starts_at:'2026-10-17T13:00Z',ends_at:'2026-10-17T13:30Z',timezone:parent.timezone,cancelled:false,updated_at:'2026-10-10T12:00Z'}
const remote:GoogleEvent={id:'instance',etag:'remote-version',recurringEventId:'google-parent',originalStartTime:{dateTime:original},summary:'Exceção remota',start:{dateTime:'2026-10-17T14:00Z',timeZone:parent.timezone},end:{dateTime:'2026-10-17T14:30Z',timeZone:parent.timezone},updated:'2026-10-10T13:00Z'}
const link:ExceptionLink={appointment_id:parent.id,original_start:original,google_id:'instance',etag:'previous',local_updated_at:'2026-10-10T10:00Z',local_deleted_at:null}
function setup(changes:{exceptions?:CalendarException[];links?:ExceptionLink[];resets?:ExceptionReset[];events?:GoogleEvent[]}={}){
  const google={events:vi.fn(),calendars:vi.fn(),create:vi.fn(),get:vi.fn().mockResolvedValue(remote),instance:vi.fn().mockResolvedValue(remote),update:vi.fn().mockResolvedValue(remote),remove:vi.fn().mockResolvedValue(undefined)}
  const rpc=vi.fn().mockResolvedValue({})
  const run=()=>synchronizeExceptions({parents:new Map([[parent.id,parent]]),parentLinks:new Map([[parent.id,'google-parent']]),exceptions:[],links:[],resets:[],events:[],...changes,google,calendar:'primary',rpc,deadline:()=>{}})
  return {run,google,rpc}
}
describe('ocorrências Calendar com transporte fictício',()=>{
  it.each(['cancelled','confirmed'])('instância órfã %s não causa gravação; cancelamento não vira aviso de regra avançada',async status=>{
    const {run,rpc,google}=setup({events:[{...remote,recurringEventId:'parent-removed',status}]})
    expect(await run()).toMatchObject({skipped:status==='cancelled'?0:1})
    expect(rpc).not.toHaveBeenCalled();expect(google.update).not.toHaveBeenCalled();expect(google.remove).not.toHaveBeenCalled()
  })
  it('pertença à série respeita intervalo, limite inclusivo e horário de parede no fuso',()=>{
    const fortnight={...parent,repeat_interval:2,repeat_until:'2026-10-24'}
    expect(isSeriesOccurrence(fortnight,'2026-10-17T12:00:00Z')).toBe(false)
    expect(isSeriesOccurrence(fortnight,'2026-10-24T12:00:00Z')).toBe(true)
    expect(isSeriesOccurrence(fortnight,'2026-11-07T12:00:00Z')).toBe(false)
    expect(isSeriesOccurrence(fortnight,'2026-10-24T13:00:00Z')).toBe(false)
    const dst={...parent,starts_at:'2026-03-01T14:00:00Z',timezone:'America/New_York'}
    expect(isSeriesOccurrence(dst,'2026-03-08T13:00:00Z')).toBe(true)
    expect(isSeriesOccurrence(dst,'2026-03-08T14:00:00Z')).toBe(false)
  })
  it('exporta exceção local para a instância exata, sem mudar âncora ou série',async()=>{const {run,google,rpc}=setup({exceptions:[local]});await run();expect(google.instance).toHaveBeenCalledWith('primary','google-parent',original);expect(google.update).toHaveBeenCalledWith('primary','instance',expect.objectContaining({summary:local.title,start:{dateTime:local.starts_at,timeZone:parent.timezone}}),'remote-version');expect(rpc.mock.calls.map(call=>call[0])).toEqual(['exception_check','exception_ack']);expect(rpc.mock.calls[0][1]).toMatchObject({original_start:original,expected_parent_updated_at:parent.updated_at,expected_updated_at:local.updated_at})})
  it.each(['local','remote'])('edição simultânea individual usa a versão %s',async side=>{const item={...local,updated_at:side==='local'?'2026-10-10T14:00Z':local.updated_at};const {run,google,rpc}=setup({exceptions:[item],links:[link],events:[remote]});await run();expect(rpc.mock.calls.map(call=>call[0])).toEqual(side==='local'?['exception_check','exception_ack']:['exception_remote']);expect(google.update).toHaveBeenCalledTimes(side==='local'?1:0)})
  it('cancelamento local exclui somente instância e consulta ETag final',async()=>{const {run,google,rpc}=setup({exceptions:[{...local,cancelled:true}]});google.get.mockResolvedValue({...remote,status:'cancelled',etag:'deleted-version'});await run();expect(google.remove).toHaveBeenCalledWith('primary','instance','remote-version',true);expect(google.update).not.toHaveBeenCalled();expect(rpc.mock.calls[1][1]).toMatchObject({etag:'deleted-version',google_cancelled:true})})
  it('cancelamento remoto mínimo entra como exceção própria sem versão inventada',async()=>{const cancelled={id:'instance',etag:'',status:'cancelled',recurringEventId:'google-parent',originalStartTime:{dateTime:original}};const {run,google,rpc}=setup({events:[cancelled]});await run();expect(rpc.mock.calls[0][1]).toMatchObject({value:{cancelled:true,title:parent.title,starts_at:original,ends_at:'2026-10-17T12:30:00Z'},etag:'',google_cancelled:true});expect(google.remove).not.toHaveBeenCalled()})
  it('substituição confirmada da série restaura alterações individuais no Google',async()=>{const reset={appointment_id:parent.id,original_start:original,deleted_at:'2026-10-10T14:00Z'};const {run,google,rpc}=setup({resets:[reset],links:[link],events:[remote]});await run();expect(google.update).toHaveBeenCalledWith('primary','instance',{status:'confirmed',summary:parent.title,start:{dateTime:original,timeZone:parent.timezone},end:{dateTime:'2026-10-17T12:30:00Z',timeZone:parent.timezone}},'remote-version');expect(rpc.mock.calls[1][1]).toMatchObject({expected_updated_at:null,expected_deleted_at:reset.deleted_at})})
  it('exceção remota posterior ao reset local prevalece',async()=>{const {run,google,rpc}=setup({resets:[{appointment_id:parent.id,original_start:original,deleted_at:'2026-10-10T12:00Z'}],links:[link],events:[remote]});await run();expect(rpc.mock.calls[0][0]).toBe('exception_remote');expect(google.update).not.toHaveBeenCalled()})
  it('sem data de exclusão confiável preserva edição individual local',async()=>{const {run,google,rpc}=setup({exceptions:[local],links:[link],events:[{...remote,status:'cancelled',updated:undefined}]});await expect(run()).rejects.toThrow(/data confiável/);expect(rpc).not.toHaveBeenCalled();expect(google.remove).not.toHaveBeenCalled()})
  it('412 em ocorrência não confirma vínculo nem sobrescreve sem versão',async()=>{const {run,google,rpc}=setup({exceptions:[local]});google.update.mockRejectedValue(new CalendarApiError(412));await expect(run()).rejects.toThrow();expect(rpc.mock.calls.map(call=>call[0])).toEqual(['exception_check']);expect(google.update).toHaveBeenCalledTimes(1)})
  it('CAS recusado antes do envio não toca Google',async()=>{const {run,google,rpc}=setup({exceptions:[local]});rpc.mockRejectedValueOnce(new Error('CAS'));await expect(run()).rejects.toThrow('CAS');expect(google.update).not.toHaveBeenCalled();expect(google.remove).not.toHaveBeenCalled()})
  it('vínculo de outra série continua recusado sem editar nem excluir evento alheio',async()=>{const {run,google,rpc}=setup({exceptions:[local],links:[link]});google.get.mockResolvedValue({...remote,recurringEventId:'other-parent'});await expect(run()).rejects.toThrow(/outra série/);expect(rpc).not.toHaveBeenCalled();expect(google.update).not.toHaveBeenCalled();expect(google.remove).not.toHaveBeenCalled()})
  it('instância removida pela nova recorrência não é recriada após reset',async()=>{const {run,google,rpc}=setup({resets:[{appointment_id:parent.id,original_start:original,deleted_at:'2026-10-10T14:00Z'}],links:[link]});google.get.mockRejectedValue(new CalendarApiError(404));google.instance.mockResolvedValue(null);await run();expect(rpc.mock.calls[0][0]).toBe('exception_forget');expect(google.update).not.toHaveBeenCalled()})
})
