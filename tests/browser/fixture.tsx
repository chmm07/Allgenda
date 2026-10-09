// Somente no servidor de testes. Não incluído na entrada/build da aplicação.
import { createRoot } from 'react-dom/client'
import { EnvironmentManager } from '../../src/components/EnvironmentManager'
import { Appearance } from '../../src/components/Appearance'
import type { Environment } from '../../src/lib/database.types'
import type { EnvironmentRepository } from '../../src/lib/environments'
import '../../src/styles/tokens.css'
import '../../src/styles/app.css'

let items: Environment[] = []
const repository: EnvironmentRepository = {
  async list() { return [...items] },
  async save(value, id) {
    const item: Environment = { ...value, id: id ?? crypto.randomUUID(), user_id: 'fixture-only', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    items = id ? items.map(previous => previous.id === id ? item : previous) : [...items, item]
    return item
  },
  async remove(id) { items = items.filter(item => item.id !== id) },
}
createRoot(document.getElementById('root')!).render(<main><p>Fixture de interface com dados fictícios. Sem Supabase ou OAuth.</p><Appearance /><EnvironmentManager repository={repository} /></main>)
