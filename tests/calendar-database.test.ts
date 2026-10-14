import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest'
import {synchronizeCalendar,type SyncState} from '../supabase/functions/_shared/calendar-sync'
import {toGoogle} from '../supabase/functions/_shared/calendar-codec'
import {CalendarApiError,type GoogleEvent,type googleCalendarClient} from '../supabase/functions/_shared/google-calendar'
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002'
let db:PGlite,environment:string,account:string,binding:string
async function asUser(id:string){await db.exec('reset role;set role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id])}
async function configure(env=environment,confirmed=true){return (await db.query<{id:string}>('select public.configure_calendar($1,$2,$3,$4,true,$5) as id',[account,'primary','Fictício',env,confirmed])).rows[0].id}
async function sync(operation:string,payload:Record<string,unknown>={}){await db.exec('reset role;set role service_role;');return (await db.query<{value:Record<string,unknown>}>('select public.calendar_sync($1,$2,$3,$4::jsonb) as value',[a,binding,operation,JSON.stringify(payload)])).rows[0].value}
beforeAll(async()=>{
  db=new PGlite()
  await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;create role service_role;create schema auth;grant usage on schema public,auth to anon,authenticated;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create table auth.identities(user_id uuid,provider text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`)
  for(const file of ['202610090001_initial.sql','202610090002_agenda.sql','202610090003_chat.sql','202610090004_calendar_accounts.sql','202610100005_series_edit.sql','202610100006_calendar_selection.sql','202610100007_calendar_sync.sql','202610140008_calendar_jobs.sql','202610140009_calendar_job_auth.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
  await db.query("insert into auth.users values($1,'a@example.test',now()),($2,'b@example.test',now());",[a,b]);await db.query("insert into auth.identities values($1,'google'),($2,'google')",[a,b]);await db.exec("insert into private.invited_users(slot,email) values(1,'a@example.test'),(2,'b@example.test')")
})
beforeEach(async()=>{await db.exec('reset role;truncate public.environments cascade;truncate public.google_accounts cascade;truncate private.calendar_tombstones;');await asUser(a);environment=(await db.query<{id:string}>("insert into public.environments(name,anchor_words) values('Fictício',array['um','dois','três']) returning id")).rows[0].id;await db.exec('reset role;set role service_role;');account=(await db.query<{id:string}>("select public.calendar_account_store($1,'subject-test','calendar@example.test','cipher-ficticio') as id",[a])).rows[0].id;await asUser(a);binding=await configure()})
afterAll(async()=>{await db?.close()})
describe('Calendar SQL real com Auth fictício — não é Supabase remoto',()=>{
  async function nextJob(){await db.exec('reset role;set role service_role;');return (await db.query<{value:{id:string}|null}>('select public.calendar_next_sync() as value')).rows[0].value}
  it('prova administrativa é invoker e não concede acesso a JWT de usuário ou anon',async()=>{
    await expect(db.query('select public.calendar_job_access()')).rejects.toThrow(/permission denied/)
    await db.exec('reset role;set role anon;');await expect(db.query('select public.calendar_job_access()')).rejects.toThrow(/permission denied/)
    await db.exec('reset role;set role service_role;');expect((await db.query<{value:boolean}>('select public.calendar_job_access() as value')).rows).toEqual([{value:true}])
    await db.exec('reset role;');expect((await db.query<{value:boolean}>('select public.calendar_job_access() as value')).rows).toEqual([{value:false}])
  })
  it('fila administrativa não é acessível ao usuário e nunca expõe last_attempted_at',async()=>{
    await expect(db.query('select public.calendar_next_sync()')).rejects.toThrow(/permission denied/)
    await expect(db.query('select last_attempted_at from public.calendar_bindings')).rejects.toThrow(/permission denied/)
    expect(await nextJob()).toMatchObject({id:binding})
    expect(await nextJob()).toBeNull()
  })
  it('fila ignora pausa, lease ocupado e convite revogado',async()=>{
    await db.exec('reset role');await db.query('update public.calendar_bindings set enabled=false where id=$1',[binding]);expect(await nextJob()).toBeNull()
    await db.exec('reset role');await db.query("update public.calendar_bindings set enabled=true,lease_until=now()+interval '2 minutes' where id=$1",[binding]);expect(await nextJob()).toBeNull()
    await db.exec("reset role;update public.calendar_bindings set lease_until=null;delete from private.invited_users where email='a@example.test'")
    try{expect(await nextJob()).toBeNull()}finally{await db.exec("reset role;insert into private.invited_users(slot,email) values(1,'a@example.test')")}
  })
  it('fila dá vez à associação mais antiga mesmo após falha em outra',async()=>{
    await db.exec('reset role');await db.query("update public.calendar_bindings set last_attempted_at=now()-interval '5 minutes' where id=$1",[binding])
    await asUser(a);const env=(await db.query<{id:string}>("insert into public.environments(name,anchor_words) values('Segundo fictício',array['um','dois','três']) returning id")).rows[0].id
    const other=(await db.query<{id:string}>('select public.configure_calendar($1,$2,$3,$4,true,true) as id',[account,'other','Outro',env])).rows[0].id
    expect(await nextJob()).toMatchObject({id:other});expect(await nextJob()).toMatchObject({id:binding})
  })
  async function linkedSeries(){
    await asUser(a)
    const item=(await db.query<{value:Record<string,unknown>}>("insert into public.appointments(environment_id,title,starts_at,ends_at,timezone,frequency) values($1,'Série fictícia','2026-10-10T12:00Z','2026-10-10T12:30Z','UTC','weekly') returning to_jsonb(appointments) as value",[environment])).rows[0].value
    const state=await sync('begin')
    await sync('ack',{lease:state.lease,appointment_id:item.id,expected_updated_at:item.updated_at,expected_deleted_at:null,google_id:'parent',etag:'parent-version'})
    const payload={lease:state.lease,appointment_id:item.id,original_start:'2026-10-17T12:00Z',expected_parent_updated_at:item.updated_at,expected_updated_at:null,expected_deleted_at:null,google_id:'instance',etag:'instance-version'}
    const value={title:'Ocorrência fictícia',starts_at:'2026-10-17T13:00Z',ends_at:'2026-10-17T13:30Z',timezone:'UTC',cancelled:false}
    return {item,state,payload,value}
  }
  it('ocorrência é transacional, tem proprietário derivado e CAS independente',async()=>{const {payload,value}=await linkedSeries();await sync('exception_remote',{...payload,value:{...value,user_id:b}});await asUser(a);expect((await db.query<{user_id:string}>('select user_id from public.appointment_exceptions')).rows).toEqual([{user_id:a}]);await expect(sync('exception_remote',{...payload,value:{...value,title:'Desatualizado'}})).rejects.toThrow(/Ocorrência mudou/);await asUser(a);expect((await db.query<{title:string}>('select title from public.appointment_exceptions')).rows[0].title).toBe(value.title)})
  it('ocorrência inválida não deixa exceção nem vínculo parcial',async()=>{const {payload,value}=await linkedSeries();await expect(sync('exception_remote',{...payload,value:{...value,ends_at:value.starts_at}})).rejects.toThrow();await db.exec('reset role');expect((await db.query('select * from private.calendar_exception_links')).rows).toEqual([]);expect((await db.query('select * from public.appointment_exceptions')).rows).toEqual([])})
  it('conversão confirmada limpa vínculo antigo sem autorizar nova exceção em item único',async()=>{
    const {item,payload,value,state}=await linkedSeries();await sync('exception_remote',{...payload,value});await sync('fail',{lease:state.lease});await asUser(a)
    const exceptions=(await db.query<{value:unknown}>('select to_jsonb(e) as value from public.appointment_exceptions e')).rows.map(row=>row.value)
    await db.query('select public.replace_appointment_series($1,$2::jsonb,$3::timestamptz,$4::jsonb)',[item.id,JSON.stringify({...item,frequency:'none',repeat_interval:1,repeat_until:null}),item.updated_at,JSON.stringify(exceptions)])
    const snapshot=await sync('begin') as unknown as SyncState
    const next={...payload,lease:snapshot.lease,expected_parent_updated_at:snapshot.appointments[0].updated_at,expected_updated_at:null,expected_deleted_at:snapshot.exception_resets![0].deleted_at}
    await sync('exception_check',next);await sync('exception_forget',next)
    await expect(sync('exception_remote',{...next,value})).rejects.toThrow(/Série indisponível/)
    await db.exec('reset role');expect((await db.query('select * from private.calendar_exception_links')).rows).toEqual([])
  })
  it('cancelamento remoto sem ETag não inventa versão e reset confirmado fica no journal',async()=>{const {item,payload,value,state}=await linkedSeries();await sync('exception_remote',{...payload,value:{...value,cancelled:true},etag:'',google_cancelled:true});await db.exec('reset role');expect((await db.query<{etag:string|null}>('select etag from private.calendar_exception_links')).rows[0].etag).toBeNull();await sync('fail',{lease:state.lease});await asUser(a);const exceptions=(await db.query<{value:unknown}>('select to_jsonb(e) as value from public.appointment_exceptions e')).rows.map(row=>row.value);await db.query('select public.replace_appointment_series($1,$2::jsonb,$3::timestamptz,$4::jsonb)',[item.id,JSON.stringify({...item,title:'Confirmada'}),item.updated_at,JSON.stringify(exceptions)]);const next=await sync('begin');expect(next.exception_resets).toHaveLength(1);expect(next.exceptions).toEqual([])})
  it.each([false,true])('restaura série excluída mantendo exceção no SQL; interrupção antes do vínculo: %s',async interrupted=>{
    const {item,payload,value,state}=await linkedSeries()
    await sync('exception_remote',{...payload,value})
    await sync('fail',{lease:state.lease});await asUser(a)
    await db.query("update public.appointments set title='Local mais recente' where id=$1",[item.id])
    const snapshot=await sync('begin') as unknown as SyncState
    const appointment=snapshot.appointments[0],exception=snapshot.exceptions[0]
    const deleted:GoogleEvent={id:'parent',etag:'deleted',status:'cancelled',updated:new Date(Date.parse(appointment.updated_at)-1000).toISOString()}
    let created:GoogleEvent|undefined
    const google={events:vi.fn().mockResolvedValue({events:[deleted],syncToken:'cursor-completo'}),get:vi.fn(async()=>created!),create:vi.fn(async(_calendar:string,id:string)=>{
      if(created)throw new CalendarApiError(409)
      created={...toGoogle(appointment,binding),id,etag:'recreated',updated:new Date().toISOString()};return created
    }),instance:vi.fn(async(_calendar:string,parent:string)=>({id:'new-instance',etag:'generated',recurringEventId:parent,originalStartTime:{dateTime:exception.original_start},summary:appointment.title,start:{dateTime:exception.original_start,timeZone:appointment.timezone},end:{dateTime:'2026-10-17T12:30:00Z',timeZone:appointment.timezone}})),update:vi.fn(async(_calendar:string,id:string,draft:Partial<GoogleEvent>)=>({...draft,id,etag:'individual-saved'} as GoogleEvent)),remove:vi.fn(),calendars:vi.fn()}
    let fail=interrupted
    const transition=async(operation:string,data:Record<string,unknown>)=>{if(operation==='remote'&&fail){fail=false;throw new Error('Interrupção fictícia')}return sync(operation,data)}
    const run=(input:SyncState)=>synchronizeCalendar(input,google as ReturnType<typeof googleCalendarClient>,transition)
    if(interrupted){
      await expect(run(snapshot)).rejects.toThrow('Interrupção fictícia')
      await db.exec('reset role')
      expect((await db.query<{google_id:string}>('select google_id from private.calendar_links')).rows[0].google_id).toBe('parent')
      expect((await db.query('select * from private.calendar_exception_links')).rows).toEqual([])
      expect((await db.query<{sync_token:string|null}>('select sync_token from public.calendar_bindings')).rows[0].sync_token).toBeNull()
      await sync('fail',{lease:snapshot.lease})
      google.events.mockResolvedValue({events:[deleted,created!],syncToken:'cursor-completo'})
      await run(await sync('begin') as unknown as SyncState)
    }else await run(snapshot)
    await db.exec('reset role')
    expect((await db.query<{value:unknown}>('select to_jsonb(e) as value from public.appointment_exceptions e')).rows[0].value).toEqual(exception)
    expect((await db.query<{google_id:string}>('select google_id from private.calendar_links')).rows[0].google_id).toBe(created!.id)
    expect((await db.query<{google_id:string}>('select google_id from private.calendar_exception_links')).rows[0].google_id).toBe('new-instance')
    expect((await db.query<{sync_token:string}>('select sync_token from public.calendar_bindings')).rows[0].sync_token).toBe('cursor-completo')
    expect(google.instance).toHaveBeenCalledWith('primary',created!.id,new Date(exception.original_start).toISOString().replace('.000Z','Z'))
    expect(google.update).toHaveBeenCalledWith('primary','new-instance',expect.objectContaining({summary:exception.title}),'generated')
    expect(google.remove).not.toHaveBeenCalled()
    await asUser(b);expect((await db.query('select id from public.appointments')).rows).toEqual([])
  })
  it('configuração exige confirmação, ambiente próprio e associação única',async()=>{await expect(configure(environment,false)).rejects.toThrow(/Confirme/);await expect(db.query('select public.configure_calendar($1,$2,$3,$4,true,true)',[account,'other','Outro',environment])).rejects.toThrow(/duplicate key/);await asUser(b);await expect(configure()).rejects.toThrow(/indisponível/);expect((await db.query('select id from public.calendar_bindings')).rows).toEqual([])})
  it('tokens/cursor/lease não são acessíveis ao cliente; CAS é exclusivo do servidor',async()=>{await expect(db.query('select sync_token from public.calendar_bindings')).rejects.toThrow(/permission denied/);await expect(db.query('select public.calendar_credentials($1,$2)',[a,account])).rejects.toThrow(/permission denied/);await db.exec('reset role;set role service_role;');await expect(db.query('select public.calendar_credentials($1,$2,$3,$4)',[a,account,'stale','next'])).rejects.toThrow(/Credencial mudou/);expect((await db.query<{cipher:string}>('select public.calendar_credentials($1,$2) as cipher',[a,account])).rows[0].cipher).toBe('cipher-ficticio');await expect(db.query('select public.calendar_credentials($1,$2)',[b,account])).rejects.toThrow(/indisponível/)})
  it('lease bloqueia concorrência e cursor não avança em falha',async()=>{const state=await sync('begin');await expect(sync('begin')).rejects.toThrow(/andamento/);await expect(sync('finish',{lease:crypto.randomUUID(),sync_token:'next'})).rejects.toThrow(/expirou/);await sync('fail',{lease:state.lease});await asUser(a);expect((await db.query<{value:string|null}>('select last_synced_at as value from public.calendar_bindings')).rows[0].value).toBeNull();await sync('begin')})
  it('importação é atômica; UUID alheio e ambiente fornecido no payload não mudam dono',async()=>{const state=await sync('begin'),id=crypto.randomUUID(),value={title:'Importado',starts_at:'2026-10-10T12:00Z',ends_at:'2026-10-10T12:30Z',timezone:'America/Fortaleza',frequency:'weekly',repeat_interval:1,repeat_until:null,environment_id:crypto.randomUUID(),user_id:b};await sync('remote',{lease:state.lease,appointment_id:id,expected_updated_at:null,expected_deleted_at:null,value,google_id:'remote',etag:'version'});await asUser(a);expect((await db.query('select user_id,environment_id,title from public.appointments')).rows).toEqual([{user_id:a,environment_id:environment,title:'Importado'}]);await asUser(b);expect((await db.query('select id from public.appointments')).rows).toEqual([])})
  it('edição local após snapshot recusa sobrescrita e mantém cursor',async()=>{await asUser(a);const item=(await db.query<{id:string;updated_at:Date}>("insert into public.appointments(environment_id,title,starts_at,ends_at,timezone) values($1,'Antes','2026-10-10T12:00Z','2026-10-10T12:30Z','UTC') returning id,updated_at",[environment])).rows[0];const state=await sync('begin');await asUser(a);await db.query("update public.appointments set title='Depois' where id=$1",[item.id]);await expect(sync('ack',{lease:state.lease,appointment_id:item.id,expected_updated_at:item.updated_at,expected_deleted_at:null,google_id:'remote',etag:'version'})).rejects.toThrow(/mudou/);await asUser(a);expect((await db.query<{title:string}>('select title from public.appointments')).rows[0].title).toBe('Depois')})
  it('exclusão de ambiente preserva journal para propagação e não bloqueia CRUD',async()=>{await asUser(a);await db.query("insert into public.appointments(environment_id,title,starts_at,ends_at,timezone) values($1,'Fictício','2026-10-10T12:00Z','2026-10-10T12:30Z','UTC')",[environment]);const impact=(await db.query<{value:unknown}>('select public.environment_impact($1) as value',[environment])).rows[0].value;await db.query('select public.delete_environment_confirmed($1,$2::jsonb)',[environment,JSON.stringify(impact)]);expect((await db.query('select id from public.environments')).rows).toEqual([]);const state=await sync('begin');expect(state.tombstones).toHaveLength(1);expect(state.appointments).toEqual([]);expect(state.binding).toMatchObject({enabled:false,environment_id:null,removed_environment_id:environment})})
  it('revogação bloqueia servidor e cliente mesmo com lease anterior',async()=>{const state=await sync('begin');await db.exec("reset role;delete from private.invited_users where email='a@example.test'");try{await expect(sync('finish',{lease:state.lease,sync_token:'next'})).rejects.toThrow(/revogado/);await asUser(a);expect((await db.query('select id from public.calendar_bindings')).rows).toEqual([])}finally{await db.exec("reset role;insert into private.invited_users(slot,email) values(1,'a@example.test')")}})
})
