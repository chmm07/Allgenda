// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useAccess } from '../src/hooks/useAccess'
import type { AppClient } from '../src/lib/supabase'

function Harness({ client }: { client: AppClient }) {
  const { access } = useAccess(client)
  return <p>{access.status === 'allowed' ? access.user.id : access.status}</p>
}
function mockClient() {
  let listener: (event: 'SIGNED_OUT' | 'TOKEN_REFRESHED', session: null) => void = () => {}
  const unsubscribe = vi.fn()
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'usuario-a' } }, error: null })
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null })
  const client = {
    auth: { getUser, onAuthStateChange: (callback: typeof listener) => { listener = callback; return { data: { subscription: { unsubscribe } } } } },
    rpc,
  } as unknown as AppClient
  return { client, getUser, rpc, unsubscribe, changed: (event: 'SIGNED_OUT' | 'TOKEN_REFRESHED' = 'SIGNED_OUT') => listener(event, null) }
}
afterEach(cleanup)

describe('verificação de sessão e acesso', () => {
  it('verifica usuário no Auth e autorização no banco antes de mostrar conteúdo', async () => {
    const mock = mockClient()
    render(<Harness client={mock.client} />)
    expect(await screen.findByText('usuario-a')).toBeInTheDocument()
    expect(mock.getUser).toHaveBeenCalled()
    expect(mock.rpc).toHaveBeenCalledWith('has_app_access')
  })
  it('nega conta fora da lista e fecha acesso em falha da RPC', async () => {
    const mock = mockClient()
    mock.rpc.mockResolvedValueOnce({ data: false, error: null })
    render(<Harness client={mock.client} />)
    expect(await screen.findByText('denied')).toBeInTheDocument()
    mock.rpc.mockRejectedValueOnce(new Error('offline'))
    act(() => mock.changed())
    expect(await screen.findByText('error')).toBeInTheDocument()
  })
  it('erro de verificação Auth não consulta autorização nem libera acesso', async () => {
    const mock = mockClient()
    mock.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid session') })
    render(<Harness client={mock.client} />)
    expect(await screen.findByText('error')).toBeInTheDocument()
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it('descarta resposta atrasada da sessão anterior após sair', async () => {
    const mock = mockClient()
    let finish: (value: { data: boolean; error: null }) => void = () => {}
    mock.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    render(<Harness client={mock.client} />)
    await waitFor(() => expect(mock.rpc).toHaveBeenCalled())
    mock.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthSessionMissingError' } })
    act(() => mock.changed())
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    await act(async () => { finish({ data: true, error: null }) })
    expect(screen.queryByText('usuario-a')).not.toBeInTheDocument()
  })
  it('limpa listener ao desmontar', async () => {
    const mock = mockClient()
    const view = render(<Harness client={mock.client} />)
    await screen.findByText('usuario-a')
    view.unmount()
    expect(mock.unsubscribe).toHaveBeenCalled()
  })
  it('renovação da mesma sessão não desmonta conteúdo nem formulário', async () => {
    const mock = mockClient()
    render(<Harness client={mock.client} />)
    await screen.findByText('usuario-a')
    act(() => mock.changed('TOKEN_REFRESHED'))
    expect(screen.getByText('usuario-a')).toBeInTheDocument()
    expect(screen.queryByText('loading')).not.toBeInTheDocument()
    await waitFor(() => expect(mock.getUser).toHaveBeenCalledTimes(2))
  })
})
