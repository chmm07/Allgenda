// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../src/App'
import { EnvironmentManager } from '../src/components/EnvironmentManager'
import type { Environment } from '../src/lib/database.types'
import type { EnvironmentRepository } from '../src/lib/environments'

const item: Environment = { id: 'fictitious-id', user_id: 'fictitious-user', name: 'Contexto fictício', anchor_words: ['leitura', 'estudo', 'revisão'], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
let repository: EnvironmentRepository
beforeEach(() => {
  repository = { list: vi.fn().mockResolvedValue([]), save: vi.fn().mockResolvedValue(item), remove: vi.fn().mockResolvedValue(undefined) }
  // JSDOM não implementa modal nativo; fluxo real será verificado em navegador.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
})
afterEach(cleanup)

describe('interface da primeira entrega', () => {
  it('sem credenciais informa bloqueio sem oferecer login fictício', () => {
    render(<App client={null} />)
    expect(screen.getByRole('heading', { name: 'Conexão indisponível' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar com Google' })).not.toBeInTheDocument()
  })
  it('formulário rejeita nome/âncoras inválidos sem chamar persistência', async () => {
    const user = userEvent.setup()
    render(<EnvironmentManager repository={repository} />)
    await screen.findByText('Nenhum ambiente criado. Comece pelo formulário.')
    await user.click(screen.getByRole('button', { name: 'Salvar ambiente' }))
    expect(screen.getByText('Informe um nome para o ambiente.')).toBeInTheDocument()
    expect(repository.save).not.toHaveBeenCalled()
  })
  it('salva entrada válida e mantém entrada em falha', async () => {
    const user = userEvent.setup()
    vi.mocked(repository.save).mockRejectedValueOnce(new Error('offline'))
    render(<EnvironmentManager repository={repository} />)
    await screen.findByText('Nenhum ambiente criado. Comece pelo formulário.')
    await user.type(screen.getByLabelText('Nome (obrigatório)'), 'Contexto fictício')
    await user.type(screen.getByLabelText('Palavras âncora (obrigatórias)'), 'leitura, estudo, revisão')
    await user.click(screen.getByRole('button', { name: 'Salvar ambiente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar')
    expect(screen.getByLabelText('Nome (obrigatório)')).toHaveValue('Contexto fictício')
    await user.click(screen.getByRole('button', { name: 'Salvar ambiente' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ambiente salvo.')
    expect(screen.getByRole('heading', { name: 'Contexto fictício' })).toBeInTheDocument()
  })
  it('edição exige nome e três âncoras', async () => {
    const user = userEvent.setup()
    vi.mocked(repository.list).mockResolvedValue([item])
    render(<EnvironmentManager repository={repository} />)
    await user.click(await screen.findByRole('button', { name: 'Editar Contexto fictício' }))
    await user.clear(screen.getByLabelText('Palavras âncora (obrigatórias)'))
    await user.type(screen.getByLabelText('Palavras âncora (obrigatórias)'), 'uma, duas')
    await user.click(screen.getByRole('button', { name: 'Salvar ambiente' }))
    expect(repository.save).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText('Palavras âncora (obrigatórias)'))
    await user.type(screen.getByLabelText('Palavras âncora (obrigatórias)'), 'uma, duas, três')
    await user.click(screen.getByRole('button', { name: 'Salvar ambiente' }))
    await waitFor(() => expect(repository.save).toHaveBeenCalledWith({ name: item.name, anchor_words: ['uma', 'duas', 'três'] }, item.id))
  })
  it('exclusão mostra impacto, cancelar preserva e confirmar remove', async () => {
    const user = userEvent.setup()
    vi.mocked(repository.list).mockResolvedValue([item])
    render(<EnvironmentManager repository={repository} />)
    await user.click(await screen.findByRole('button', { name: 'Excluir Contexto fictício' }))
    expect(screen.getByRole('dialog', { name: 'Excluir ambiente?' })).toHaveTextContent('Itens afetados: nenhum.')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(repository.remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Excluir Contexto fictício' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))
    await waitFor(() => expect(repository.remove).toHaveBeenCalledWith(item.id))
    expect(await screen.findByText('Nenhum ambiente criado. Comece pelo formulário.')).toBeInTheDocument()
  })
  it('falha de exclusão mantém registro e não anuncia sucesso', async () => {
    const user = userEvent.setup()
    vi.mocked(repository.list).mockResolvedValue([item])
    vi.mocked(repository.remove).mockRejectedValue(new Error('revogado'))
    render(<EnvironmentManager repository={repository} />)
    await user.click(await screen.findByRole('button', { name: 'Excluir Contexto fictício' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível excluir')
    expect(screen.getByRole('heading', { name: item.name })).toBeInTheDocument()
    expect(screen.queryByText('Ambiente excluído.')).not.toBeInTheDocument()
  })
  it('carregamento falho permite nova tentativa', async () => {
    const user = userEvent.setup()
    vi.mocked(repository.list).mockRejectedValueOnce(new Error('offline'))
    render(<EnvironmentManager repository={repository} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Nenhum ambiente criado. Comece pelo formulário.')).toBeInTheDocument()
  })
})
