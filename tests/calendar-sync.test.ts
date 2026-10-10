import {describe,expect,it,vi} from 'vitest'
import {synchronizeCalendar,type SyncState} from '../supabase/functions/_shared/calendar-sync'
import {fromGoogle,toGoogle,newestSide} from '../supabase/functions/_shared/calendar-codec'
import {CalendarApiError,type GoogleEvent,type googleCalendarClient} from '../supabase/functions/_shared/google-calendar'
import {calendarAccessToken,CalendarAuthorizationError} from '../supabase/functions/_shared/calendar-tokens'
import {decryptSecret,encryptSecret,randomSecret} from '../supabase/functions/_shared/calendar-crypto'
const local={id:'00000000-0000-4000-8000-000000000001',user_id:'test',environment_id:'env',title:'Fictício',starts_at:'2026-10-10T12:00:00Z',ends_at:'2026-10-10T12:30:00Z',timezone:'America/Fortaleza',frequency:'weekly' as const,repeat_interval:1,repeat_until:'2026-11-07',updated_at:'2026-10-10T11:00:00Z'}
const remote:GoogleEvent={...toGoogle(local,'binding'),id:'google',etag:'new',updated:'2026-10-10T11:30:00Z'}
function setup(changes:Partial<SyncState>={}){
  const state:SyncState={lease:'lease',binding:{id:'binding',calendar_id:'primary',environment_id:'env',sync_token:'old'},appointments:[],exceptions:[],links:[],tombstones:[],...changes}
  const google={events:vi.fn().mockResolvedValue({events:[],syncToken:'next'}),get:vi.fn().mockResolvedValue(remote),create:vi.fn().mockResolvedValue(remote),update:vi.fn().mockResolvedValue(remote),remove:vi.fn().mockResolvedValue(undefined),calendars:vi.fn(),instance:vi.fn().mockResolvedValue(null)}
  const rpc=vi.fn().mockResolvedValue({})
  const run=()=>synchronizeCalendar(state,google as ReturnType<typeof googleCalendarClient>,rpc,{uuid:()=>local.id})
  return {state,google,rpc,run}
}
describe('Calendar com transporte fictício — não é aceite Google',()=>{
  it('round trip de série conserva fuso, intervalo e data inclusiva',()=>{expect(fromGoogle(remote,'env')).toEqual({...local,id:undefined,user_id:undefined,updated_at:undefined});expect(()=>fromGoogle({...remote,recurrence:['RRULE:FREQ=WEEKLY;BYDAY=MO,WE']},'env')).toThrow();expect(()=>fromGoogle({...remote,start:{date:'2026-10-10'}},'env')).toThrow()})
  it('conflitos usam datas reais; sem data confiável preserva ambos',()=>{expect(newestSide('2026-10-10T13:00Z','2026-10-10T12:00Z')).toBe('local');expect(newestSide('2026-10-10T12:00Z','2026-10-10T13:00Z')).toBe('remote');expect(()=>newestSide(local.updated_at,undefined)).toThrow()})
  it('exporta com ID estável e confirma o cursor depois do vínculo',async()=>{const {run,google,rpc}=setup({appointments:[local]});await run();expect(google.create).toHaveBeenCalledWith('primary',local.id,toGoogle(local,'binding'));expect(rpc.mock.calls.map(call=>call[0])).toEqual(['check','ack','finish']);expect(rpc.mock.calls[0][1]).toMatchObject({expected_updated_at:local.updated_at,lease:'lease'})})
  it('importa evento e não confia no UUID enviado nas propriedades externas',async()=>{const {run,google,rpc}=setup();google.events.mockResolvedValue({events:[{...remote,extendedProperties:{private:{allgenda_id:'foreign',allgenda_binding:'binding'}}}],syncToken:'next'});await run();expect(rpc.mock.calls[0][1]).toMatchObject({appointment_id:local.id,expected_updated_at:null,google_id:'google'});expect(google.create).not.toHaveBeenCalled()})
  it.each(['local','remote'])('resolve edição simultânea pela versão %s mais recente',async side=>{const value={...local,updated_at:side==='local'?'2026-10-10T12:00Z':local.updated_at};const {run,google,rpc}=setup({appointments:[value],links:[{appointment_id:local.id,google_id:'google',etag:'old',local_updated_at:'2026-10-10T10:00Z'}]});await run();expect(rpc.mock.calls.find(call=>call[0]!=='check')?.[0]).toBe(side==='local'?'ack':'remote');expect(google.update).toHaveBeenCalledTimes(side==='local'?1:0)})
  it('propaga exclusão local confirmada com ETag consultado',async()=>{const {run,google,rpc}=setup({links:[{appointment_id:local.id,google_id:'google',etag:'old',local_updated_at:local.updated_at}],tombstones:[{appointment_id:local.id,deleted_at:'2026-10-10T13:00Z'}]});await run();expect(google.remove).toHaveBeenCalledWith('primary','google','new',true);expect(rpc.mock.calls.find(call=>call[0]!=='check')?.[0]).toBe('delete_local')})
  it('edição remota posterior à exclusão local é restaurada',async()=>{const {run,google,rpc}=setup({links:[{appointment_id:local.id,google_id:'google',etag:'old',local_updated_at:local.updated_at}],tombstones:[{appointment_id:local.id,deleted_at:'2026-10-10T11:15Z'}]});await run();expect(google.remove).not.toHaveBeenCalled();expect(rpc.mock.calls[0]).toEqual(['remote',expect.objectContaining({expected_updated_at:null,expected_deleted_at:'2026-10-10T11:15Z'})])})
  it('propaga exclusão remota quando item local não mudou',async()=>{const {run,google,rpc}=setup({appointments:[local],links:[{appointment_id:local.id,google_id:'google',etag:'old',local_updated_at:local.updated_at}]});google.get.mockResolvedValue({id:'google',etag:'deleted',status:'cancelled'});await run();expect(rpc.mock.calls.find(call=>call[0]!=='check')?.[0]).toBe('delete_remote')})
  it('410 refaz leitura completa sem apagar dados locais',async()=>{const {run,google,rpc}=setup();google.events.mockRejectedValueOnce(new CalendarApiError(410));await run();expect(google.events.mock.calls).toEqual([['primary','old'],['primary']]);expect(rpc.mock.calls.map(call=>call[0])).toEqual(['finish'])})
  it.each([412,429,500])('falha %i não avança cursor nem elimina proteção',async status=>{const {run,google,rpc}=setup({appointments:[local],links:[{appointment_id:local.id,google_id:'google',etag:'old',local_updated_at:'2026-10-10T10:00Z'}]});google.get.mockResolvedValue({...remote,etag:'old'});google.update.mockRejectedValue(new CalendarApiError(status));await expect(run()).rejects.toThrow();expect(rpc.mock.calls.map(call=>call[0])).toEqual(['check']);expect(google.update).toHaveBeenCalledTimes(1)})
  it('falha de CAS local após envio permite retry, sem anunciar conclusão',async()=>{const {run,rpc,google}=setup({appointments:[local]});rpc.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('CAS'));await expect(run()).rejects.toThrow('CAS');expect(rpc).toHaveBeenCalledTimes(2);expect(google.create).toHaveBeenCalledTimes(1);expect(rpc).not.toHaveBeenCalledWith('finish',expect.anything())})
  it('repetição de criação após 409 verifica marcador antes de vincular',async()=>{const {run,google,rpc}=setup({appointments:[local]});google.create.mockRejectedValue(new CalendarApiError(409));google.get.mockResolvedValue({...remote,extendedProperties:{private:{allgenda_id:'foreign'}}});await expect(run()).rejects.toThrow(/ocupado/);expect(rpc.mock.calls.map(call=>call[0])).toEqual(['check']);expect(google.update).not.toHaveBeenCalled()})
  it('edição local posterior à exclusão Google recria com novo ID determinístico',async()=>{const {run,google,rpc}=setup({appointments:[{...local,updated_at:'2026-10-10T14:00Z'}],links:[{appointment_id:local.id,google_id:'google',etag:'old',local_updated_at:local.updated_at}]});google.get.mockResolvedValue({id:'google',etag:'deleted',status:'cancelled',updated:'2026-10-10T13:00Z'});await run();expect(google.create.mock.calls[0][1]).toMatch(/^[a-f0-9]{32}$/);expect(google.create.mock.calls[0][1]).not.toBe(local.id.replaceAll('-',''));expect(rpc).not.toHaveBeenCalledWith('delete_remote',expect.anything());expect(rpc.mock.calls.map(call=>call[0])).toEqual(['check','remote','finish'])})
  it('exclusão Google sem data confiável não descarta edição local',async()=>{const {run,google,rpc}=setup({appointments:[{...local,updated_at:'2026-10-10T14:00Z'}],links:[{appointment_id:local.id,google_id:'google',etag:'old',local_updated_at:local.updated_at}]});google.get.mockResolvedValue({id:'google',etag:'deleted',status:'cancelled'});await expect(run()).rejects.toThrow(/data confiável/);expect(rpc).not.toHaveBeenCalled();expect(google.create).not.toHaveBeenCalled()})
  function deletedSeries(cancelled=false,reset=false){
    const original='2026-10-17T12:00:00Z',changed={...local,updated_at:'2026-10-10T14:00Z'}
    const exception={appointment_id:local.id,original_start:original,title:'Individual preservada',starts_at:'2026-10-17T13:00Z',ends_at:'2026-10-17T13:30Z',timezone:local.timezone,cancelled,updated_at:'2026-10-10T12:00Z'}
    const oldChild:GoogleEvent={id:'old-child',etag:'old-child-version',status:'cancelled',recurringEventId:'google',originalStartTime:{dateTime:original}}
    const deleted:GoogleEvent={id:'google',etag:'deleted',status:'cancelled',updated:'2026-10-10T13:00Z'}
    const result=setup({appointments:[changed],links:[{appointment_id:local.id,google_id:'google',etag:'old',local_updated_at:local.updated_at}],exceptions:reset?[]:[exception],exception_links:[{appointment_id:local.id,original_start:original,google_id:'old-child',etag:'old-child-version',local_updated_at:exception.updated_at,local_deleted_at:null}],exception_resets:reset?[{appointment_id:local.id,original_start:original,deleted_at:changed.updated_at}]:[]})
    result.google.events.mockResolvedValue({events:[deleted,oldChild],syncToken:'next'})
    result.google.get.mockResolvedValue(deleted)
    result.google.create.mockImplementation(async(_calendar,id,value)=>({...value,id,etag:'recreated-version',updated:'2026-10-10T15:00Z'}))
    result.google.instance.mockImplementation(async(_calendar,parent)=>({id:'new-child',etag:'new-child-version',recurringEventId:parent,originalStartTime:{dateTime:original},summary:changed.title,start:{dateTime:original,timeZone:local.timezone},end:{dateTime:'2026-10-17T12:30:00Z',timeZone:local.timezone}}))
    result.google.update.mockImplementation(async(_calendar,id,value)=>({...value,id,etag:'child-saved'}))
    result.rpc.mockImplementation(async operation=>operation==='remote'?{...changed,updated_at:'2026-10-10T15:01Z'}:{})
    return {...result,original,exception,changed,deleted}
  }
  it('restauração troca vínculos antes do novo pai e mantém edição individual na nova instância',async()=>{
    const {run,google,rpc,state,exception,original,changed}=deletedSeries()
    const result=await run(),newParent=google.create.mock.calls[0][1]
    expect(rpc.mock.calls.map(call=>call[0])).toEqual(['exception_forget','check','remote','exception_check','exception_ack','finish'])
    expect(rpc.mock.calls[0][1]).toMatchObject({expected_parent_updated_at:changed.updated_at,expected_updated_at:exception.updated_at,expected_deleted_at:null})
    expect(google.instance).toHaveBeenCalledWith('primary',newParent,original)
    expect(google.update).toHaveBeenCalledWith('primary','new-child',expect.objectContaining({summary:exception.title,start:{dateTime:exception.starts_at,timeZone:local.timezone}}),'new-child-version')
    expect(rpc.mock.calls[3][1]).toMatchObject({expected_parent_updated_at:'2026-10-10T15:01Z'})
    expect(state.exceptions).toEqual([exception]);expect(state.exception_links?.[0].google_id).toBe('new-child')
    expect(google.get.mock.calls.some(call=>call[1]==='old-child')).toBe(false)
    expect(result).toMatchObject({exported:2,skipped:0})
  })
  it('cancelamento individual é mantido somente na instância da série recriada',async()=>{
    const {run,google,rpc}=deletedSeries(true)
    google.get.mockImplementation(async(_calendar,id)=>id==='new-child'?{id,status:'cancelled',etag:'child-deleted'}:{id:'google',status:'cancelled',etag:'deleted',updated:'2026-10-10T13:00Z'})
    await run()
    expect(google.remove).toHaveBeenCalledExactlyOnceWith('primary','new-child','new-child-version',true)
    expect(google.update).not.toHaveBeenCalled()
    expect(rpc.mock.calls.find(call=>call[0]==='exception_ack')?.[1]).toMatchObject({google_id:'new-child',google_cancelled:true,etag:'child-deleted'})
  })
  it('reset confirmado aguarda recuperação do pai cancelado e usa a nova instância',async()=>{
    const {run,google,rpc,changed}=deletedSeries(false,true)
    await run()
    expect(rpc.mock.calls[0][1]).toMatchObject({expected_updated_at:null,expected_deleted_at:changed.updated_at})
    expect(google.update.mock.calls.map(call=>call[1])).toEqual(['new-child'])
    expect(rpc.mock.calls.find(call=>call[0]==='exception_ack')?.[1]).toMatchObject({expected_deleted_at:changed.updated_at})
  })
  it('CAS da limpeza recusado preserva exceção e impede criação/avanço do cursor',async()=>{
    const {run,rpc,google,state,exception}=deletedSeries()
    rpc.mockRejectedValueOnce(new Error('Ocorrência mudou'))
    await expect(run()).rejects.toThrow('Ocorrência mudou')
    expect(google.create).not.toHaveBeenCalled();expect(google.remove).not.toHaveBeenCalled()
    expect(state.exceptions).toEqual([exception]);expect(state.exception_links?.[0].google_id).toBe('old-child')
    expect(rpc.mock.calls.map(call=>call[0])).toEqual(['exception_forget'])
  })
  it('falha ao confirmar novo pai recupera 409 sem reimportar o pai da mesma página',async()=>{
    const {run,google,rpc,state,deleted}=deletedSeries()
    rpc.mockImplementationOnce(async()=>({})).mockImplementationOnce(async()=>({})).mockRejectedValueOnce(new Error('Gravação interrompida'))
    await expect(run()).rejects.toThrow('Gravação interrompida')
    const [,_id,value]=google.create.mock.calls[0],created={...value,id:_id,etag:'recreated-version',updated:'2026-10-10T15:00Z'}
    expect(state.exception_links).toEqual([]);expect(rpc).not.toHaveBeenCalledWith('finish',expect.anything())
    rpc.mockClear();google.create.mockRejectedValue(new CalendarApiError(409));google.get.mockResolvedValue(created)
    google.events.mockResolvedValue({events:[deleted,created],syncToken:'next'})
    await run()
    expect(google.create.mock.calls.map(call=>call[1])).toEqual([_id,_id])
    expect(rpc.mock.calls.filter(call=>call[0]==='remote')).toHaveLength(1)
    expect(rpc.mock.calls.at(-1)?.[0]).toBe('finish')
  })
  it('série convertida em item único mantém pendência sem apagar vínculos individuais',async()=>{
    const {state,run,google,rpc}=deletedSeries(false,true)
    state.appointments[0]={...state.appointments[0],frequency:'none'}
    await expect(run()).rejects.toThrow(/remapeamento/)
    expect(rpc).not.toHaveBeenCalled();expect(google.create).not.toHaveBeenCalled()
  })
  it('restaura exceção antes de editar título da série e não reimporta delta antigo',async()=>{
    const original='2026-10-17T12:00:00Z',changed={...local,title:'Novo título',updated_at:'2026-10-10T14:00Z'}
    const child:GoogleEvent={id:'child',etag:'child-old',recurringEventId:'google',originalStartTime:{dateTime:original},updated:'2026-10-10T13:00Z',summary:'Exceção antiga',start:{dateTime:original,timeZone:local.timezone},end:{dateTime:'2026-10-17T12:30:00Z',timeZone:local.timezone}}
    const {run,google,rpc}=setup({appointments:[changed],links:[{appointment_id:local.id,google_id:'google',etag:'new',local_updated_at:local.updated_at}],exception_links:[{appointment_id:local.id,original_start:original,google_id:'child',etag:'child-old',local_updated_at:'2026-10-10T13:00Z',local_deleted_at:null}],exception_resets:[{appointment_id:local.id,original_start:original,deleted_at:changed.updated_at}]})
    google.events.mockResolvedValue({events:[remote,child],syncToken:'next'})
    let current=child
    google.get.mockImplementation(async(_calendar,id)=>id==='child'?current:remote)
    google.update.mockImplementation(async(_calendar,id,value)=>{if(id==='child'){current={...child,...value,etag:'child-restored',updated:'2026-10-10T15:00Z'};return current}return {...remote,...value,etag:'parent-saved'}})
    await run()
    expect(google.update.mock.calls.map(call=>call[1])).toEqual(['child','google'])
    expect(rpc.mock.calls.map(call=>call[0])).toEqual(['exception_check','exception_ack','check','ack','finish'])
  })
  it('mudança estrutural com exceção removida preserva Google até verificar remapeamento',async()=>{
    const original='2026-10-17T12:00:00Z'
    const {run,google,rpc}=setup({appointments:[{...local,frequency:'daily',updated_at:'2026-10-10T14:00Z'}],links:[{appointment_id:local.id,google_id:'google',etag:'new',local_updated_at:local.updated_at}],exception_links:[{appointment_id:local.id,original_start:original,google_id:'child',etag:'child-old',local_updated_at:local.updated_at,local_deleted_at:null}],exception_resets:[{appointment_id:local.id,original_start:original,deleted_at:'2026-10-10T14:00Z'}]})
    await expect(run()).rejects.toThrow(/remapeamento/)
    expect(google.update).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled()
  })
})
describe('renovação cifrada com OAuth fictício',()=>{
  it('token vigente não chama Google nem regrava segredo',async()=>{const key=randomSecret(),ciphertext=await encryptSecret({access_token:'access-ficticio',refresh_token:'refresh-ficticio',expires_at:999999},key),fetcher=vi.fn(),save=vi.fn();expect(await calendarAccessToken({ciphertext,encryptionKey:key,clientId:'ficticio',clientSecret:'ficticio',fetcher,save,now:0})).toBe('access-ficticio');expect(fetcher).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled()})
  it('refresh preserva refresh token quando Google não devolve outro',async()=>{const key=randomSecret(),ciphertext=await encryptSecret({access_token:'antigo',refresh_token:'refresh-ficticio',expires_at:0},key),save=vi.fn(),fetcher=vi.fn().mockResolvedValue(Response.json({access_token:'novo',expires_in:3600}));expect(await calendarAccessToken({ciphertext,encryptionKey:key,clientId:'ficticio',clientSecret:'ficticio',fetcher,save,now:1000})).toBe('novo');expect(save.mock.calls[0][0]).toBe(ciphertext);expect(await decryptSecret(save.mock.calls[0][1],key)).toEqual({access_token:'novo',refresh_token:'refresh-ficticio',expires_at:3601000})})
  it('revogação pede reconexão e não grava token inválido',async()=>{const key=randomSecret(),ciphertext=await encryptSecret({access_token:'antigo',refresh_token:'refresh-ficticio',expires_at:0},key),save=vi.fn(),fetcher=vi.fn().mockResolvedValue(new Response(null,{status:400}));await expect(calendarAccessToken({ciphertext,encryptionKey:key,clientId:'ficticio',clientSecret:'ficticio',fetcher,save})).rejects.toBeInstanceOf(CalendarAuthorizationError);expect(save).not.toHaveBeenCalled()})
})
