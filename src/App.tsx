import { useMemo, useState } from 'react'
import { Appearance } from './components/Appearance'
import { EnvironmentManager } from './components/EnvironmentManager'
import { useAccess } from './hooks/useAccess'
import { environmentRepository } from './lib/environments'
import type { AppClient } from './lib/supabase'
import type { AppEnvironment } from './lib/config'

function ConnectedApp({ client }: { client: AppClient }) {
  const { access, retry } = useAccess(client)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const repository = useMemo(() => environmentRepository(client), [client])
  async function login() {
    setBusy(true); setError('')
    try {
      const { error: authError } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
      if (authError) throw authError
    } catch { setError('Não foi possível iniciar o login. Tente novamente.'); setBusy(false) }
  }
  async function logout() {
    setBusy(true); setError('')
    try {
      const { error: authError } = await client.auth.signOut()
      if (authError) throw authError
    } catch { setError('Não foi possível sair. Confira a conexão e tente novamente.') }
    finally { setBusy(false) }
  }
  return <>
    {access.status === 'allowed' ? <>
      <div className="session"><p>Você está conectado.</p><button disabled={busy} onClick={() => { void logout() }}>Sair</button></div>
      <EnvironmentManager key={access.user.id} repository={repository} />
    </> : <section className="card entrance" aria-labelledby="access-heading">
      <h1 id="access-heading">Tudo converge aqui</h1>
      {access.status === 'loading' ? <p role="status">Verificando seu acesso…</p> : access.status === 'denied' ? <>
        <p role="alert">Esta conta não está na lista de convidados autorizados.</p><button disabled={busy} onClick={() => { void logout() }}>Sair e usar outra conta</button>
      </> : <>
        <p>Uma agenda para os seus contextos. Acesso exclusivo para convidados.</p>
        {access.status === 'error' && <><p role="alert" className="error">{access.message}</p><button onClick={retry}>Verificar novamente</button></>}
        <button className="primary" disabled={busy} onClick={() => { void login() }}>{busy ? 'Abrindo login…' : 'Entrar com Google'}</button>
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
