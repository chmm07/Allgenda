import { lazy, Suspense, useMemo, useState } from 'react'
import { Appearance } from './components/Appearance'
import { EnvironmentManager } from './components/EnvironmentManager'
import { useAccess } from './hooks/useAccess'
import { environmentRepository } from './lib/environments'
import type { AppClient } from './lib/supabase'
import type { AppEnvironment } from './lib/config'
import {chatRepository} from './lib/chat'
import { agendaRepository } from './lib/agenda'
const Agenda=lazy(()=>import('./components/Agenda').then(module=>({default:module.Agenda})))
const Chat=lazy(()=>import('./components/Chat').then(module=>({default:module.Chat})))
const Connections=lazy(()=>import('./components/Connections').then(module=>({default:module.Connections})))

function ConnectedApp({ client }: { client: AppClient }) {
  const { access, retry } = useAccess(client)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const repository = useMemo(() => environmentRepository(client), [client])
  const agenda = useMemo(() => agendaRepository(client), [client])
  const chat=useMemo(()=>chatRepository(client),[client])
  const [calendarReturn] = useState(()=>new URLSearchParams(window.location.search).get('calendar'))
  const [section,setSection] = useState<'agenda'|'environments'|'chat'|'connections'>(()=>new URLSearchParams(window.location.search).has('calendar')?'connections':'agenda')
  async function login() {
    setBusy(true); setError('')
    try {
      const { error: signOutError } = await client.auth.signOut({ scope: 'local' })
      if (signOutError) throw signOutError
      const { error: authError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: 'select_account' } },
      })
      if (authError) throw authError
    } catch { setError('Não foi possível iniciar o login. Tente novamente.') }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true); setError('')
    try {
      const { error: authError } = await client.auth.signOut({ scope: 'local' })
      if (authError) throw authError
      retry()
    } catch { setError('Não foi possível sair. Confira a conexão e tente novamente.') }
    finally { setBusy(false) }
  }
  return <>
    {access.status === 'allowed' ? <>
      <div className="session"><p>Você está conectado.</p><button disabled={busy} onClick={() => { void logout() }}>Sair</button></div>
      <nav className="actions" aria-label="Seções"><button aria-pressed={section==='agenda'} onClick={()=>setSection('agenda')}>Agenda</button><button aria-pressed={section==='environments'} onClick={()=>setSection('environments')}>Ambientes</button><button aria-pressed={section==='chat'} onClick={()=>setSection('chat')}>Chat</button><button aria-pressed={section==='connections'} onClick={()=>setSection('connections')}>Conexões</button></nav>
      {section==='connections'&&calendarReturn==='error'&&<p role="alert">A autorização do Google Calendar não foi concluída. Confira a configuração ou tente novamente.</p>}
      <Suspense fallback={<p role="status">Abrindo seção…</p>}>{section==='agenda'?<Agenda key={access.user.id} repository={agenda}/>:section==='environments'?<EnvironmentManager key={access.user.id} repository={repository} />:section==='chat'?<Chat key={access.user.id} repository={chat}/>:<Connections key={access.user.id} client={client}/>}</Suspense>
    </> : <section className="card entrance" aria-labelledby="access-heading">
      <h1 id="access-heading">Tudo converge aqui</h1>
      {access.status === 'loading' ? <p role="status">Verificando seu acesso…</p> : access.status === 'denied' ? <>
        <p role="alert">Esta conta não está na lista de convidados autorizados.</p><button disabled={busy} onClick={() => { void logout() }}>Sair e usar outra conta</button>
      </> : <>
        <p>Uma agenda para os seus contextos. Acesso exclusivo para convidados.</p>
        {access.status === 'error' && <><p role="alert" className="error">{access.message}</p><button disabled={busy} onClick={retry}>Verificar novamente</button><button disabled={busy} onClick={() => { void logout() }}>Voltar para o login</button></>}
        <button className="primary" disabled={busy} onClick={() => { void login() }}>{busy ? 'Abrindo login…' : access.status === 'error' ? 'Usar outra conta Google' : 'Entrar com Google'}</button>
      </>}
    </section>}
    {error && <p role="alert" className="error">{error}</p>}
  </>
}

export function App({ client, configError, environment }: { client: AppClient | null; configError?: string; environment?: AppEnvironment }) {
  return <>
    <a className="skip-link" href="#main">Ir para o conteúdo</a>
    <header className="site-header"><div><p className="brand">allgenda</p><p className="secondary">Tudo converge aqui</p></div><Appearance /></header>
    <main id="main">
      {environment && environment !== 'production' && <p className="environment-badge">{environment === 'test' ? 'Ambiente de testes' : 'Ambiente de desenvolvimento'}</p>}
      {client ? <ConnectedApp client={client} /> : <section className="card entrance"><h1>Conexão indisponível</h1><p>{configError ?? 'A conexão ainda não foi configurada.'}</p><p>O responsável precisa concluir a configuração para liberar o login.</p></section>}
    </main>
    <footer><p className="secondary">allgenda · Tudo converge aqui</p></footer>
  </>
}
