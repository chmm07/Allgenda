import { describe, expect, it } from 'vitest'
import { parseEnvironment } from '../src/lib/environments'
import { readConfig } from '../src/lib/config'

describe('validação de ambientes', () => {
  it('normaliza acentos, caixa e espaços externos', () => {
    expect(parseEnvironment('  Contexto fictício  ', ' Revisão, educação, bem-estar ')).toEqual({
      value: { name: 'Contexto fictício', anchor_words: ['revisão', 'educação', 'bem-estar'] }, errors: {},
    })
  })
  it.each(['um, dois', 'um, dois, UM', 'um, dois, ', 'um, duas palavras, três', 'um, dois, 123'])('rejeita âncoras inválidas: %s', anchors => {
    expect(parseEnvironment('Contexto fictício', anchors).errors.anchors).toBeTruthy()
  })
  it('rejeita nome em branco e aceita mais de três âncoras', () => {
    expect(parseEnvironment(' \t ', 'um, dois, três').errors.name).toBeTruthy()
    expect(parseEnvironment('Contexto fictício', 'um, dois, três, quatro').errors).toEqual({})
  })
})

describe('configuração pública', () => {
  const valid = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fictitious', VITE_APP_ENV: 'test' }
  it('sem valores não habilita o cliente', () => expect(readConfig({}).config).toBeUndefined())
  it('aceita chave publishable e projeto https', () => expect(readConfig(valid).config?.environment).toBe('test'))
  it.each(['sb_secret_fictitious', 'segredo', `header.${btoa(JSON.stringify({ role: 'service_role' }))}.signature`])('recusa chave administrativa/inválida', key => {
    expect(readConfig({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: key }).config).toBeUndefined()
  })
  it('aceita anon legada e recusa ambiente indefinido', () => {
    expect(readConfig({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: `header.${btoa(JSON.stringify({ role: 'anon' }))}.signature` }).config).toBeDefined()
    expect(readConfig({ ...valid, VITE_APP_ENV: 'staging' }).config).toBeUndefined()
  })
  it('HTTP somente localhost de desenvolvimento, sem credenciais na URL', () => {
    expect(readConfig({ ...valid, VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_APP_ENV: 'development' }).config).toBeDefined()
    for (const url of ['http://example.supabase.co', 'http://127.0.0.1:54321', 'https://user:password@example.supabase.co']) {
      expect(readConfig({ ...valid, VITE_SUPABASE_URL: url }).config).toBeUndefined()
    }
  })
})
