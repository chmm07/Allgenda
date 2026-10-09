import {describe,expect,it} from 'vitest'
import {decryptSecret,encryptSecret,hashSecret,randomSecret} from '../supabase/functions/_shared/calendar-crypto'
describe('criptografia de tokens e PKCE',()=>{
  it('chaves/estados aleatórios diferem e o hash não revela o segredo',async()=>{const one=randomSecret(),two=randomSecret();expect(one).not.toBe(two);expect(await hashSecret(one)).not.toBe(one)})
  it('ciphertext pode ser aberto somente com a chave e detecta alteração',async()=>{
    const key=randomSecret(),value={refresh_token:'token-ficticio',expires_at:123}
    const cipher=await encryptSecret(value,key)
    expect(cipher).not.toContain('token-ficticio');expect(await decryptSecret(cipher,key)).toEqual(value)
    await expect(decryptSecret(cipher,randomSecret())).rejects.toThrow()
    await expect(decryptSecret(cipher.slice(0,-3)+'abc',key)).rejects.toThrow()
  })
})
