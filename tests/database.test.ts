import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// PostgreSQL real embutido, Auth mínimo de teste. Não verifica JWT/HTTP/OAuth.
const ids = {
  a: '00000000-0000-4000-8000-000000000001',
  b: '00000000-0000-4000-8000-000000000002',
  outsider: '00000000-0000-4000-8000-000000000003',
  unverified: '00000000-0000-4000-8000-000000000004',
  password: '00000000-0000-4000-8000-000000000005',
}
let db: PGlite

async function asUser(id: string, role = 'authenticated') {
  await db.exec(`reset role; set role ${role};`)
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
}
async function create(name = 'Contexto fictício') {
  const { rows } = await db.query<{ id: string; user_id: string }>("insert into public.environments (name, anchor_words) values ($1, array['revisão','educação','bem-estar']) returning id, user_id", [name])
  return rows[0]
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon;
    create role authenticated;
    create role supabase_auth_admin;
    create schema auth;
    grant usage on schema public, auth to anon, authenticated, supabase_auth_admin;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create table auth.identities (user_id uuid references auth.users(id), provider text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `)
  await db.exec(await readFile(new URL('../supabase/migrations/202610090001_initial.sql', import.meta.url), 'utf8'))
  for (const [key, id] of Object.entries(ids)) {
    await db.query('insert into auth.users values ($1, $2, $3)', [id, `${key}@example.test`, key === 'unverified' ? null : new Date().toISOString()])
    await db.query('insert into auth.identities values ($1, $2)', [id, key === 'password' ? 'email' : 'google'])
  }
})

beforeEach(async () => {
  await db.exec('reset role; truncate public.environments; delete from private.invited_users;')
  await db.exec("insert into private.invited_users(slot,email) values (1,'a@example.test'),(2,'b@example.test'),(3,'unverified@example.test'),(4,'password@example.test');")
  await asUser(ids.a)
})
afterAll(async () => { await db?.close() })

describe('migração, RLS e grants', () => {
  it('deriva identidade e persiste criação/edição entre consultas', async () => {
    const row = await create()
    expect(row.user_id).toBe(ids.a)
    await db.query('update public.environments set name=$1 where id=$2', ['Contexto atualizado', row.id])
    await asUser(ids.a)
    const { rows } = await db.query<{ name: string; anchor_words: string[] }>('select name, anchor_words from public.environments')
    expect(rows).toEqual([{ name: 'Contexto atualizado', anchor_words: ['revisão', 'educação', 'bem-estar'] }])
  })
  it('outro usuário não lê, altera ou exclui por UUID', async () => {
    const row = await create()
    await asUser(ids.b)
    expect((await db.query('select * from public.environments where id=$1', [row.id])).rows).toEqual([])
    expect((await db.query('update public.environments set name=$1 where id=$2 returning id', ['Intrusão', row.id])).rows).toEqual([])
    expect((await db.query('delete from public.environments where id=$1 returning id', [row.id])).rows).toEqual([])
    await asUser(ids.a)
    expect((await db.query('select * from public.environments')).rows).toHaveLength(1)
  })
  it('cliente não informa nem transfere proprietário', async () => {
    await expect(db.query("insert into public.environments(user_id,name,anchor_words) values($1,'Inválido',array['um','dois','três'])", [ids.b])).rejects.toThrow(/permission denied/)
    const row = await create()
    await expect(db.query('update public.environments set user_id=$1 where id=$2', [ids.b, row.id])).rejects.toThrow(/permission denied/)
    await expect(db.query('update public.environments set created_at=now() where id=$1', [row.id])).rejects.toThrow(/permission denied/)
  })
  it('não convidado não lê nem grava', async () => {
    await create()
    await asUser(ids.outsider)
    expect((await db.query('select public.has_app_access() as allowed')).rows).toEqual([{ allowed: false }])
    expect((await db.query('select * from public.environments')).rows).toEqual([])
    await expect(create()).rejects.toThrow(/row-level security/)
  })
  it.each([ids.unverified, ids.password])('e-mail não confirmado ou identidade sem Google não autoriza', async id => {
    await asUser(id)
    expect((await db.query('select public.has_app_access() as allowed')).rows).toEqual([{ allowed: false }])
    await expect(create()).rejects.toThrow(/row-level security/)
  })
  it('anônimo e convidado não acessam lista/hook; anônimo não acessa ambientes', async () => {
    await expect(db.query('select * from private.invited_users')).rejects.toThrow(/permission denied/)
    await expect(db.query("insert into private.invited_users values(5,'intruso@example.test',now())")).rejects.toThrow(/permission denied/)
    await expect(db.query("select private.before_user_created('{}')")).rejects.toThrow(/permission denied/)
    await asUser('', 'anon')
    await expect(db.query('select * from public.environments')).rejects.toThrow(/permission denied/)
    await expect(db.query('select public.has_app_access()')).rejects.toThrow(/permission denied/)
  })
  it('revogação bloqueia sessão já emitida sem apagar registros', async () => {
    const row = await create()
    await db.exec("reset role; delete from private.invited_users where email='a@example.test';")
    await asUser(ids.a)
    expect((await db.query('select public.has_app_access() as allowed')).rows).toEqual([{ allowed: false }])
    expect((await db.query('select * from public.environments')).rows).toEqual([])
    expect((await db.query('update public.environments set name=$1 where id=$2 returning id', ['Alterado', row.id])).rows).toEqual([])
    expect((await db.query('delete from public.environments where id=$1 returning id', [row.id])).rows).toEqual([])
    await expect(create()).rejects.toThrow(/row-level security/)
    await db.exec('reset role;')
    expect((await db.query('select * from public.environments')).rows).toHaveLength(1)
  })
  it('limita cinco usuários e impede e-mail duplicado', async () => {
    await db.exec('reset role;')
    await db.exec("insert into private.invited_users(slot,email) values (5,'quinto@example.test')")
    await expect(db.exec("insert into private.invited_users(slot,email) values (6,'sexto@example.test')")).rejects.toThrow(/check constraint/)
    await db.exec('delete from private.invited_users where slot=5')
    await expect(db.exec("insert into private.invited_users(slot,email) values (5,'a@example.test')")).rejects.toThrow(/unique constraint/)
  })
  it('hook permite convidado e bloqueia desconhecido/null sem expor lista', async () => {
    await asUser('', 'supabase_auth_admin')
    const check = (email: string | null) => db.query<{ result: { error?: { http_code: number } } }>('select private.before_user_created($1::jsonb) as result', [JSON.stringify({ user: { email } })])
    expect((await check('A@example.test')).rows[0].result).toEqual({})
    expect((await check('outsider@example.test')).rows[0].result.error?.http_code).toBe(403)
    expect((await check(null)).rows[0].result.error?.http_code).toBe(403)
    await expect(db.query('select * from private.invited_users')).rejects.toThrow(/permission denied/)
  })
  it.each([
    ['', ['um', 'dois', 'três']], ['  ', ['um', 'dois', 'três']],
    ['Contexto', ['um', 'dois']], ['Contexto', ['um', 'um', 'três']],
    ['Contexto', ['um', 'DOIS', 'três']], ['Contexto', ['um', '', 'três']],
    ['Contexto', ['um', null, 'três']], ['Contexto', ['um', 'duas palavras', 'três']],
    ['Contexto', ['um', 'dois', '123']],
    ['Contexto', ['café', 'cafe\u0301', 'três']],
  ])('constraints rejeitam nome/âncoras inválidos em criação e edição', async (name, words) => {
    await expect(db.query('insert into public.environments(name,anchor_words) values($1,$2)', [name, words])).rejects.toThrow(/check constraint/)
    const row = await create()
    await expect(db.query('update public.environments set name=$1,anchor_words=$2 where id=$3', [name, words, row.id])).rejects.toThrow(/check constraint/)
  })
  it('exclusão remove somente o registro escolhido', async () => {
    const one = await create('Um')
    await create('Dois')
    expect((await db.query('delete from public.environments where id=$1 returning id', [one.id])).rows).toHaveLength(1)
    expect((await db.query('select name from public.environments')).rows).toEqual([{ name: 'Dois' }])
  })
})
