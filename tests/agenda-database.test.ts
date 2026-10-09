import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest'
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002'
let db:PGlite,env:string
async function asUser(id:string){await db.exec('reset role;set role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id])}
beforeAll(async()=>{
  db=new PGlite()
  await db.exec(`create role anon;create role authenticated;create role supabase_auth_admin;create role service_role;create schema auth;grant usage on schema public,auth to anon,authenticated;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create table auth.identities(user_id uuid,provider text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`)
  for(const file of ['202610090001_initial.sql','202610090002_agenda.sql','202610090003_chat.sql','202610090004_calendar_accounts.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'))
  await db.query("insert into auth.users values($1,'a@example.test',now()),($2,'b@example.test',now());",[a,b]);await db.query("insert into auth.identities values($1,'google'),($2,'google')",[a,b]);await db.exec("insert into private.invited_users(slot,email) values(1,'a@example.test'),(2,'b@example.test')")
})
beforeEach(async()=>{await db.exec('reset role;truncate public.environments cascade;truncate public.chat_history;');await asUser(a);env=(await db.query<{id:string}>("insert into public.environments(name,anchor_words) values('Fictício',array['um','dois','três']) returning id")).rows[0].id})
afterAll(async()=>{await db?.close()})
async function event(){return (await db.query<{id:string}>("insert into public.appointments(environment_id,title,starts_at,ends_at,timezone,frequency) values($1,'Fictício','2026-10-09T12:00Z','2026-10-09T12:30Z','America/Fortaleza','weekly') returning id",[env])).rows[0].id}
describe('agenda no PostgreSQL',()=>{
  it('datas infinitas são rejeitadas antes de corromper a visualização',async()=>{
    await expect(db.query("insert into public.tasks(environment_id,title,due_at) values($1,'Fictício','infinity')",[env])).rejects.toThrow(/check constraint/)
    const id=await event()
    await expect(db.query("update public.appointments set ends_at='infinity' where id=$1",[id])).rejects.toThrow(/check constraint/)
  })
  it('revogação durante OAuth impede guardar credenciais',async()=>{
    await db.exec('reset role;')
    await db.query('delete from private.invited_users where slot=2')
    await db.exec('set role service_role;')
    await expect(db.query('select public.calendar_account_store($1,$2,$3,$4)',[b,'sub-ficticio','b@example.test','cipher-ficticio'])).rejects.toThrow(/revogado/)
    await db.exec("reset role;insert into private.invited_users(slot,email) values(2,'b@example.test');")
  })
  it('OAuth state é one-time e usuário não lê tokens/não invoca admin',async()=>{
    await expect(db.query('select * from private.google_credentials')).rejects.toThrow(/permission denied/)
    await expect(db.query('select public.calendar_oauth_claim($1)',['estado'])).rejects.toThrow(/permission denied/)
    await db.exec('reset role;set role service_role;')
    await db.query('select public.calendar_oauth_begin($1,$2,$3)',[a,'estado-ficticio','cipher-ficticio'])
    const state=(await db.query<{state:{user_id:string}}>('select public.calendar_oauth_claim($1) as state',['estado-ficticio'])).rows[0].state
    expect(state.user_id).toBe(a)
    await expect(db.query('select public.calendar_oauth_claim($1)',['estado-ficticio'])).rejects.toThrow(/inválido/)
  })

  it('chat confirmado é atômico/idempotente e outro usuário não confirma',async()=>{
    const proposal={kind:'task',title:'Tarefa pelo chat',environment_id:env,due_at:null}
    const id=(await db.query<{id:string}>('insert into public.chat_history(message,proposal) values($1,$2) returning id',['Mensagem fictícia',JSON.stringify(proposal)])).rows[0].id
    await asUser(b)
    await expect(db.query('select public.resolve_chat($1,$2::jsonb,false)',[id,JSON.stringify(proposal)])).rejects.toThrow(/indisponível/)
    await asUser(a)
    const one=(await db.query<{result:unknown}>('select public.resolve_chat($1,$2::jsonb,false) as result',[id,JSON.stringify(proposal)])).rows[0].result
    const two=(await db.query<{result:unknown}>('select public.resolve_chat($1,$2::jsonb,false) as result',[id,JSON.stringify(proposal)])).rows[0].result
    expect(two).toEqual(one);expect((await db.query('select * from public.tasks')).rows).toHaveLength(1)
    await expect(db.query('select public.resolve_chat($1,$2::jsonb,true)',[id,JSON.stringify(proposal)])).rejects.toThrow(/já confirmada/)
  })
  it('chat inválido não cria item, e rejeição não permite confirmação',async()=>{
    const proposal={kind:'task',title:'',environment_id:env}
    const id=(await db.query<{id:string}>('insert into public.chat_history(message,proposal) values($1,$2) returning id',['Mensagem fictícia',JSON.stringify(proposal)])).rows[0].id
    await expect(db.query('select public.resolve_chat($1,$2::jsonb,false)',[id,JSON.stringify(proposal)])).rejects.toThrow(/check constraint/)
    expect((await db.query('select * from public.tasks')).rows).toEqual([])
    await db.query('select public.resolve_chat($1,$2::jsonb,true)',[id,JSON.stringify(proposal)])
    await expect(db.query('select public.resolve_chat($1,$2::jsonb,false)',[id,JSON.stringify({...proposal,title:'Corrigido'})])).rejects.toThrow(/rejeitada/)
  })

  it('tarefa e compromisso persistem com dono da sessão',async()=>{
    await db.query("insert into public.tasks(environment_id,title) values($1,'Tarefa')",[env]);await event()
    expect((await db.query<{user_id:string}>('select user_id from public.tasks')).rows[0].user_id).toBe(a)
    expect((await db.query('select * from public.appointments')).rows).toHaveLength(1)
  })
  it('não permite referenciar ambiente de outro usuário',async()=>{
    await asUser(b)
    await expect(db.query("insert into public.tasks(environment_id,title) values($1,'Intrusão')",[env])).rejects.toThrow(/foreign key/)
  })
  it('outro usuário não lê, edita, exclui ou cria exceção da série',async()=>{
    const id=await event();await asUser(b)
    expect((await db.query('select * from public.appointments')).rows).toEqual([])
    expect((await db.query('delete from public.appointments where id=$1 returning id',[id])).rows).toEqual([])
    await expect(db.query("insert into public.appointment_exceptions(appointment_id,original_start,title,starts_at,ends_at,timezone) values($1,'2026-10-09T12:00Z','Intrusão','2026-10-09T12:00Z','2026-10-09T12:30Z','UTC')",[id])).rejects.toThrow(/foreign key/)
    await expect(db.query('select public.environment_impact($1)',[env])).rejects.toThrow(/indisponível/)
    await expect(db.query("select public.delete_environment_confirmed($1,'{}'::jsonb)",[env])).rejects.toThrow(/indisponível/)
  })
  it('rejeita duração não positiva, timezone inválido e recorrência inválida',async()=>{
    await expect(db.query("insert into public.appointments(environment_id,title,starts_at,ends_at,timezone) values($1,'Fictício','2026-10-09T12:00Z','2026-10-09T12:00Z','UTC')",[env])).rejects.toThrow(/check constraint/)
    const id=await event()
    await expect(db.query("update public.appointments set timezone='Inventado' where id=$1",[id])).rejects.toThrow(/check constraint/)
    await expect(db.query('update public.appointments set repeat_interval=0 where id=$1',[id])).rejects.toThrow(/check constraint/)
    await expect(db.query("update public.appointments set repeat_until='2020-01-01' where id=$1",[id])).rejects.toThrow(/check constraint/)
  })
  it('exclusão direta de ambiente é recusada; RPC remove itens atomicamente',async()=>{
    await event();await db.query("insert into public.tasks(environment_id,title) values($1,'Tarefa afetada')",[env])
    await expect(db.query('delete from public.environments where id=$1',[env])).rejects.toThrow(/permission denied/)
    const impact=(await db.query<{impact:unknown}>('select public.environment_impact($1) as impact',[env])).rows[0].impact
    await db.query('select public.delete_environment_confirmed($1,$2::jsonb)',[env,JSON.stringify(impact)])
    expect((await db.query('select * from public.tasks')).rows).toEqual([]);expect((await db.query('select * from public.appointments')).rows).toEqual([])
  })
  it('mudança no impacto exige nova confirmação e não perde dados',async()=>{
    const impact=(await db.query<{impact:unknown}>('select public.environment_impact($1) as impact',[env])).rows[0].impact
    await event()
    await expect(db.query('select public.delete_environment_confirmed($1,$2::jsonb)',[env,JSON.stringify(impact)])).rejects.toThrow(/mudaram/)
    expect((await db.query('select * from public.appointments')).rows).toHaveLength(1)
  })
})
