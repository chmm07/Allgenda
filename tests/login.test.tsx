// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../src/App'
import type { AppClient } from '../src/lib/supabase'

function mockClient(authenticated = false) {
  const anonymous = { data: { user: null }, error: { name: 'AuthSessionMissingError' } }
  const getUser = vi.fn().mockResolvedValue(authenticated
    ? { data: { user: { id: 'fictitious-user' } }, error: null }
    : anonymous)
  const rpc = vi.fn().mockResolvedValue({ data: false, error: null })
  const signOut = vi.fn().mockImplementation(async () => {
    getUser.mockResolvedValue(anonymous)
    return { error: null }
  })
  const signInWithOAuth = vi.fn().mockResolvedValue({ data: { provider: 'google', url: null }, error: null })
  const client = {
    auth: { getUser, signOut, signInWithOAuth, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    rpc,
  } as unknown as AppClient
  return { client, getUser, rpc, signOut, signInWithOAuth }
}

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('recuperação do login Google', () => {
  it('limpa apenas a sessão local e pede seleção de conta em cada login', async () => {
    const mock = mockClient()
    const user = userEvent.setup()
    render(<App client={mock.client} />)
    await user.click(await screen.findByRole('button', { name: 'Entrar com Google' }))
    expect(mock.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(mock.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: 'select_account' } },
    })
    expect(mock.signOut.mock.invocationCallOrder[0]).toBeLessThan(mock.signInWithOAuth.mock.invocationCallOrder[0])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeEnabled())
  })

  it('falha ao iniciar OAuth permite nova tentativa sem manter botão ocupado', async () => {
    const mock = mockClient()
    mock.signInWithOAuth.mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    render(<App client={mock.client} />)
    await user.click(await screen.findByRole('button', { name: 'Entrar com Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível iniciar o login.')
    const login = screen.getByRole('button', { name: 'Entrar com Google' })
    expect(login).toBeEnabled()
    await user.click(login)
    expect(mock.signInWithOAuth).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Não foi possível iniciar o login. Tente novamente.')).not.toBeInTheDocument()
  })

  it('conta negada volta à entrada e consegue iniciar login com outra conta', async () => {
    const mock = mockClient(true)
    const user = userEvent.setup()
    render(<App client={mock.client} />)
    await user.click(await screen.findByRole('button', { name: 'Sair e usar outra conta' }))
    const login = await screen.findByRole('button', { name: 'Entrar com Google' })
    expect(login).toBeEnabled()
    expect(screen.queryByRole('navigation', { name: 'Seções' })).not.toBeInTheDocument()
    await user.click(login)
    expect(mock.signInWithOAuth).toHaveBeenCalledOnce()
  })

  it('falha ao verificar acesso oferece retorno ao login e descarta sessão anterior', async () => {
    const mock = mockClient(true)
    mock.rpc.mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    render(<App client={mock.client} />)
    expect(await screen.findByRole('button', { name: 'Usar outra conta Google' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Voltar para o login' }))
    expect(await screen.findByRole('button', { name: 'Entrar com Google' })).toBeEnabled()
    expect(mock.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(screen.queryByRole('navigation', { name: 'Seções' })).not.toBeInTheDocument()
  })

  it('falha ao sair não anuncia troca concluída e permite repetir', async () => {
    const mock = mockClient(true)
    mock.signOut.mockResolvedValueOnce({ error: new Error('offline') })
    const user = userEvent.setup()
    render(<App client={mock.client} />)
    await user.click(await screen.findByRole('button', { name: 'Sair e usar outra conta' }))
    expect(await screen.findByText('Não foi possível sair. Confira a conexão e tente novamente.')).toBeInTheDocument()
    const back = screen.getByRole('button', { name: 'Sair e usar outra conta' })
    expect(back).toBeEnabled()
    expect(mock.signInWithOAuth).not.toHaveBeenCalled()
    await user.click(back)
    expect(await screen.findByRole('button', { name: 'Entrar com Google' })).toBeEnabled()
  })

  it.each(['/?error=access_denied&error_description=fictitious-details', '/#error=access_denied&error_description=fictitious-details'])(
    'retorno OAuth com erro permite voltar à entrada e escolher outra conta (%s)', async (callback) => {
      window.history.replaceState(null, '', callback)
      const mock = mockClient()
      const user = userEvent.setup()
      render(<App client={mock.client} />)
      expect(await screen.findByRole('alert')).toHaveTextContent('O login não foi concluído.')
      expect(window.location.search).toBe('')
      expect(window.location.hash).toBe('')
      expect(screen.queryByText(/fictitious-details/)).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Voltar para o login' }))
      const login = await screen.findByRole('button', { name: 'Entrar com Google' })
      expect(login).toBeEnabled()
      await user.click(login)
      expect(mock.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({
        options: expect.objectContaining({ queryParams: { prompt: 'select_account' } }),
      }))
    },
  )

  it('limpa callback também quando a verificação Auth falha', async () => {
    window.history.replaceState(null, '', '/?code=fictitious-code#error=access_denied')
    const mock = mockClient()
    mock.getUser.mockRejectedValueOnce(new Error('callback failed'))
    render(<App client={mock.client} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível verificar seu acesso.')
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    expect(mock.rpc).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Voltar para o login' })).toBeEnabled()
  })
})
