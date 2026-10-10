import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { AppClient } from '../lib/supabase'

type Access =
  | { status: 'loading' | 'anonymous' | 'denied' }
  | { status: 'error'; message: string }
  | { status: 'allowed'; user: User }

export function useAccess(client: AppClient) {
  const [access, setAccess] = useState<Access>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let disposed = false
    let generation = 0
    let visibleUserId: string | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const callbackFailed = new URLSearchParams(window.location.search).has('error') || new URLSearchParams(window.location.hash.slice(1)).has('error')

    async function check(current: number) {
      try {
        const { data: { user }, error } = await client.auth.getUser()
        if (disposed || current !== generation) return
        if (error && error.name !== 'AuthSessionMissingError') throw error
        if (!user) {
          visibleUserId = null
          setAccess(callbackFailed ? { status: 'error', message: 'O login não foi concluído. Tente entrar novamente.' } : { status: 'anonymous' })
          return
        }
        const { data, error: accessError } = await client.rpc('has_app_access')
        if (disposed || current !== generation) return
        if (accessError) throw accessError
        visibleUserId = data === true ? user.id : null
        setAccess(data === true ? { status: 'allowed', user } : { status: 'denied' })
      } catch {
        if (!disposed && current === generation) setAccess({ status: 'error', message: 'Não foi possível verificar seu acesso. Confira a conexão e tente novamente.' })
      } finally {
        // Após o SDK processar o retorno, limpar também callbacks que falharam.
        if (!disposed && current === generation && (window.location.search || window.location.hash)) {
          window.history.replaceState(null, '', window.location.pathname)
        }
      }
    }

    function schedule(clearContent = false) {
      generation += 1
      const current = generation
      if (clearContent) setAccess({ status: 'loading' })
      clearTimeout(timer)
      // Não chamar Auth/RPC dentro do callback síncrono do SDK.
      timer = setTimeout(() => { void check(current) }, 0)
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      schedule(event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && session?.user.id !== visibleUserId))
    })
    const onFocus = () => schedule()
    schedule(true)
    window.addEventListener('focus', onFocus)
    return () => {
      disposed = true
      generation += 1
      clearTimeout(timer)
      subscription.unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
  }, [client, attempt])

  return { access, retry: () => setAttempt(value => value + 1) }
}
