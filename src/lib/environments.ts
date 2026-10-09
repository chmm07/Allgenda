import type { AppClient } from './supabase'
import type { EnvironmentInput } from './database.types'

export type EnvironmentErrors = { name?: string; anchors?: string }

export function parseEnvironment(name: string, anchors: string): { value: EnvironmentInput; errors: EnvironmentErrors } {
  const words = anchors.split(',').map(word => word.trim().normalize('NFC').toLowerCase())
  const errors: EnvironmentErrors = {}
  if (!name.trim()) errors.name = 'Informe um nome para o ambiente.'
  if (words.length < 3 || new Set(words).size < 3) {
    errors.anchors = 'Informe pelo menos três palavras âncora distintas, separadas por vírgulas.'
  } else if (words.some(word => !/^\p{L}+(?:-\p{L}+)*$/u.test(word))) {
    errors.anchors = 'Use palavras com letras, sem espaços; hífen interno é permitido.'
  }
  return { value: { name: name.trim(), anchor_words: words }, errors }
}

export function environmentRepository(client: AppClient) {
  return {
    async list() {
      const { data, error } = await client.from('environments').select('*').order('created_at', { ascending: true }).order('id')
      if (error) throw new Error('Não foi possível carregar os ambientes. Tente novamente.')
      return data
    },
    async save(value: EnvironmentInput, id?: string) {
      const request = id
        ? client.from('environments').update(value).eq('id', id)
        : client.from('environments').insert(value)
      const { data, error } = await request.select('*').single()
      if (error) throw new Error('Não foi possível salvar. Confira sua conexão e se o acesso continua autorizado.')
      return data
    },
    async remove(id: string) {
      const { error } = await client.from('environments').delete().eq('id', id).select('id').single()
      if (error) throw new Error('Não foi possível excluir. Confira sua conexão e se o acesso continua autorizado.')
    },
  }
}
export type EnvironmentRepository = ReturnType<typeof environmentRepository>
