import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Environment, EnvironmentImpact } from '../lib/database.types'
import { parseEnvironment, type EnvironmentErrors, type EnvironmentRepository } from '../lib/environments'

export function EnvironmentManager({ repository }: { repository: EnvironmentRepository }) {
  const [items, setItems] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState<Environment | null>(null)
  const [name, setName] = useState('')
  const [anchors, setAnchors] = useState('')
  const [errors, setErrors] = useState<EnvironmentErrors>({})
  const [message, setMessage] = useState('')
  const [operationError, setOperationError] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<Environment | null>(null)
  const [impact, setImpact] = useState<EnvironmentImpact | null>(null)
  const [checkingImpact,setCheckingImpact] = useState(false)
  const impactRequest = useRef(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  const focusAfterOperation = useRef(false)

  useEffect(() => {
    if (!busy && focusAfterOperation.current) {
      focusAfterOperation.current = false
      nameInput.current?.focus()
    }
  }, [busy])

  useEffect(() => {
    mounted.current = true
    let active = true
    repository.list().then(data => {
      if (active) { setItems(data); setLoadError(''); setLoading(false) }
    }).catch(() => {
      if (active) { setLoadError('Não foi possível carregar os ambientes. Tente novamente.'); setLoading(false) }
    })
    return () => { active = false; mounted.current = false }
  }, [repository, attempt])

  function reset() {
    setEditing(null); setName(''); setAnchors(''); setErrors({}); setOperationError('')
  }
  function edit(item: Environment) {
    setEditing(item); setName(item.name); setAnchors(item.anchor_words.join(', ')); setErrors({}); setOperationError(''); setMessage('')
    nameInput.current?.focus()
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const parsed = parseEnvironment(name, anchors)
    setErrors(parsed.errors); setOperationError(''); setMessage('')
    if (Object.keys(parsed.errors).length) { nameInput.current?.focus(); return }
    setBusy(true)
    try {
      const result = await repository.save(parsed.value, editing?.id)
      if (!mounted.current) return
      setItems(previous => editing ? previous.map(item => item.id === result.id ? result : item) : [...previous, result])
      reset(); setMessage('Ambiente salvo.'); focusAfterOperation.current = true
    } catch {
      if (mounted.current) setOperationError('Não foi possível salvar. Confira sua conexão e se o acesso continua autorizado.')
    } finally { if (mounted.current) setBusy(false) }
  }
  async function askDelete(item: Environment) {
    const request=++impactRequest.current
    setDeleting(item); setImpact(null); setOperationError(''); setMessage(''); setCheckingImpact(true); dialog.current?.showModal()
    try { const affected = await repository.impact(item.id); if(mounted.current&&request===impactRequest.current) setImpact(affected) }
    catch { if(mounted.current&&request===impactRequest.current) setOperationError('Não foi possível conferir os itens afetados. Feche e tente novamente.') }
    finally { if(mounted.current&&request===impactRequest.current) setCheckingImpact(false) }
  }
  async function confirmDelete() {
    if (!deleting || !impact || busy) return
    setBusy(true)
    try {
      await repository.remove(deleting.id,impact)
      if (!mounted.current) return
      setItems(previous => previous.filter(item => item.id !== deleting.id))
      if (editing?.id === deleting.id) reset()
      dialog.current?.close(); setDeleting(null); setMessage('Ambiente excluído.'); focusAfterOperation.current = true
    } catch {
      if (mounted.current) setOperationError('Não foi possível excluir. Confira sua conexão e se o acesso continua autorizado.')
    } finally { if (mounted.current) setBusy(false) }
  }

  return <section aria-labelledby="environments-heading">
    <h1 id="environments-heading">Seus ambientes</h1>
    <p className="secondary">Organize seus contextos com um nome e palavras âncora.</p>
    <div className="environment-layout">
      <section className="card" aria-label="Lista de ambientes">
        <h2>Ambientes</h2>
        {loading ? <p role="status">Carregando ambientes…</p> : loadError ? <div><p role="alert">{loadError}</p><button onClick={() => { setLoading(true); setAttempt(value => value + 1) }}>Tentar novamente</button></div> : items.length === 0 ? <p>Nenhum ambiente criado. Comece pelo formulário.</p> : <ul className="environment-list">
          {items.map(item => <li key={item.id} className="environment-item">
            <h3>{item.name}</h3><p className="secondary">{item.anchor_words.join(' · ')}</p>
            <div className="actions"><button disabled={busy} onClick={() => edit(item)} aria-label={`Editar ${item.name}`}>Editar</button><button className="danger" disabled={busy} onClick={() => { void askDelete(item) }} aria-label={`Excluir ${item.name}`}>Excluir</button></div>
          </li>)}
        </ul>}
      </section>
      <section className="card" aria-labelledby="form-heading">
        <h2 id="form-heading">{editing ? 'Editar ambiente' : 'Criar ambiente'}</h2>
        <form onSubmit={event => { void save(event) }} noValidate>
          <label htmlFor="environment-name">Nome (obrigatório)</label>
          <input ref={nameInput} id="environment-name" value={name} onChange={event => setName(event.target.value)} required disabled={busy} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} />
          {errors.name && <p id="name-error" className="error">{errors.name}</p>}
          <label htmlFor="environment-anchors">Palavras âncora (obrigatórias)</label>
          <input id="environment-anchors" value={anchors} onChange={event => setAnchors(event.target.value)} required disabled={busy} aria-invalid={!!errors.anchors} aria-describedby={`anchors-help${errors.anchors ? ' anchors-error' : ''}`} />
          <p id="anchors-help" className="secondary">Pelo menos três palavras distintas, separadas por vírgulas.</p>
          {errors.anchors && <p id="anchors-error" className="error">{errors.anchors}</p>}
          <div className="actions"><button className="primary" disabled={busy || loading || !!loadError} type="submit">{busy ? 'Aguarde…' : 'Salvar ambiente'}</button>{editing && <button type="button" disabled={busy} onClick={reset}>Cancelar edição</button>}</div>
        </form>
        {operationError && !deleting && <p role="alert" className="error">{operationError}</p>}
        <p role="status" className="success">{message}</p>
      </section>
    </div>
    <dialog ref={dialog} aria-labelledby="delete-heading" aria-describedby="delete-impact" onCancel={event => { if (busy) event.preventDefault() }} onClose={() => { impactRequest.current++; setDeleting(null); setCheckingImpact(false); setOperationError('') }}>
      <h2 id="delete-heading">Excluir ambiente?</h2>
      <p><strong>{deleting?.name}</strong></p>
      <div id="delete-impact">{!impact ? <p>{checkingImpact?'Conferindo os itens afetados…':'Impacto indisponível.'}</p> : <>
        <p>{impact.tasks.length+impact.appointments.length+impact.exceptions.length === 0 ? 'Itens afetados: nenhum.' : `Itens afetados: ${impact.tasks.length} tarefas, ${impact.appointments.length} séries/compromissos e ${impact.exceptions.length} exceções.`} O ambiente e os itens serão excluídos definitivamente.</p>
        <ul>{impact.tasks.map(item=><li key={item.id}>Tarefa: {item.title}</li>)}{impact.appointments.map(item=><li key={item.id}>Compromisso/série: {item.title}</li>)}{impact.exceptions.map(item=><li key={`${item.appointment_id}-${item.original_start}`}>Ocorrência: {item.title}</li>)}</ul>
      </>}</div>
      <p>Se este ambiente tiver um calendário selecionado, as exclusões dos compromissos serão propagadas ao Google na próxima sincronização. Você pode cancelar para manter o ambiente.</p>
      {operationError && <p role="alert" className="error">{operationError}</p>}
      <div className="actions"><button autoFocus disabled={busy} onClick={() => dialog.current?.close()}>Cancelar</button><button className="danger" disabled={busy || !impact} onClick={() => { void confirmDelete() }}>{busy ? 'Aguarde…' : 'Confirmar exclusão'}</button></div>
    </dialog>
  </section>
}
