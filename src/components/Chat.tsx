import {useEffect,useRef,useState} from 'react'
import {Temporal} from '@js-temporal/polyfill'
import type {ChatRepository,Proposal} from '../lib/chat'
import type {ChatHistory,Environment} from '../lib/database.types'
import {deviceTimezone,instantToLocal,localToInstant,validateAppointment} from '../lib/scheduling'
import {parseProposal} from '../../supabase/functions/_shared/proposal.ts'

export function Chat({repository}:{repository:ChatRepository}){
  const [environments,setEnvironments]=useState<Environment[]>([])
  const [history,setHistory]=useState<ChatHistory[]>([])
  const [message,setMessage]=useState('')
  const [timezone,setTimezone]=useState(deviceTimezone)
  const [draft,setDraft]=useState<Proposal|null>(null)
  const [draftId,setDraftId]=useState('')
  const [start,setStart]=useState(''),[end,setEnd]=useState(''),[due,setDue]=useState('')
  const [error,setError]=useState(''),[status,setStatus]=useState('')
  const [busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[attempt,setAttempt]=useState(0)
  const mounted=useRef(true)
  useEffect(()=>{mounted.current=true;let active=true;repository.load().then(data=>{if(active){setEnvironments(data.environments);setHistory(data.history);setLoaded(true);setError('')}}).catch(()=>{if(active)setError('Não foi possível carregar o chat. Tente novamente.')});return()=>{active=false;mounted.current=false}},[repository,attempt])
  function preview(id:string,value:Proposal){setDraft(value);setDraftId(id);setStart(value.starts_at?instantToLocal(value.starts_at,value.timezone):'');setEnd(value.ends_at?instantToLocal(value.ends_at,value.timezone):'');setDue(value.due_at?instantToLocal(value.due_at,value.timezone):'');setError('');setStatus('Confira e edite a prévia antes de confirmar. Nenhum item foi criado.')}
  async function interpret(){
    if(busy||!message.trim())return
    setBusy(true);setError('');setStatus('')
    try{const result=await repository.interpret(message.trim(),timezone,environments.map(item=>item.id));if(mounted.current){preview(result.history_id,result.proposal);try{const data=await repository.load();if(mounted.current)setHistory(data.history)}catch{if(mounted.current)setError('A prévia foi preparada, mas o histórico não pôde ser atualizado. Você pode conferir a prévia ou recarregar o chat.')}}}
    catch{if(mounted.current)setError('Interpretação indisponível. Confira a configuração do serviço e tente novamente. Nenhum item foi criado.')}
    finally{if(mounted.current)setBusy(false)}
  }
  async function resolve(reject=false){
    if(!draft||busy)return
    let value=draft
    if(!reject){
      try{
        value=parseProposal({...draft,due_at:due?localToInstant(due,draft.timezone):null,starts_at:start?localToInstant(start,draft.timezone):null,ends_at:end?localToInstant(end,draft.timezone):null},environments.map(item=>item.id),draft.timezone)
        if(!value.environment_id)throw new Error()
        if(value.kind==='appointment'){
          if(!value.starts_at)throw new Error()
          value.ends_at=value.ends_at??Temporal.Instant.from(value.starts_at).add({minutes:30}).toString()
          validateAppointment({...value,environment_id:value.environment_id,starts_at:value.starts_at,ends_at:value.ends_at})
        }
      }catch{setError('Confira título, ambiente, datas e recorrência. Preencha os campos obrigatórios antes de confirmar.');return}
    }
    setBusy(true);setError('')
    try{await repository.resolve(draftId,value,reject);if(mounted.current){setDraft(null);setMessage('');setStatus(reject?'Prévia rejeitada. Nenhum item foi criado.':'Item confirmado e salvo na sua agenda.');try{const data=await repository.load();if(mounted.current)setHistory(data.history)}catch{if(mounted.current)setError('A ação foi concluída, mas o histórico não pôde ser atualizado. Recarregue o chat.')}}}
    catch{if(mounted.current)setError('Não foi possível concluir. Confira campos, conexão e acesso; repetir a confirmação não duplica o item.')}
    finally{if(mounted.current)setBusy(false)}
  }
  return <section><h1>Chat inteligente</h1><p>Descreva uma tarefa ou um compromisso. Você confere e confirma antes de salvar.</p>{error&&<p role="alert" className="error">{error}</p>}<p role="status">{status}</p>{!loaded&&<button onClick={()=>setAttempt(value=>value+1)}>Tentar carregar chat</button>}
  <section className="card"><label htmlFor="chat-message">Mensagem</label><textarea id="chat-message" rows={4} maxLength={4000} value={message} disabled={busy} onChange={event=>setMessage(event.target.value)}/><p className="secondary">Até 4.000 caracteres. Somente criação de uma tarefa ou compromisso por mensagem.</p><label htmlFor="chat-zone">Fuso da mensagem</label><select id="chat-zone" value={timezone} disabled={busy} onChange={event=>setTimezone(event.target.value)}>{Array.from(new Set([timezone,...Intl.supportedValuesOf('timeZone')])).map(item=><option key={item}>{item}</option>)}</select><button className="primary" disabled={busy||!loaded||!message.trim()||!!draft} onClick={()=>{void interpret()}}>{busy?'Aguarde…':'Interpretar mensagem'}</button></section>
  {draft&&<section className="card" aria-labelledby="preview-heading"><h2 id="preview-heading">Prévia editável</h2><label htmlFor="proposal-kind">Tipo</label><select id="proposal-kind" disabled={busy} value={draft.kind} onChange={event=>setDraft({...draft,kind:event.target.value as Proposal['kind']})}><option value="task">Tarefa</option><option value="appointment">Compromisso</option></select><label htmlFor="proposal-title">Título (obrigatório)</label><input id="proposal-title" disabled={busy} value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})}/><label htmlFor="proposal-environment">Ambiente (obrigatório)</label><select id="proposal-environment" disabled={busy} value={draft.environment_id??''} onChange={event=>setDraft({...draft,environment_id:event.target.value||null})}><option value="">Não informado — escolha um ambiente</option>{environments.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><p className="secondary">Fuso: {draft.timezone}</p>
  {draft.kind==='task'?<><label htmlFor="proposal-due">Prazo (opcional)</label><input id="proposal-due" type="datetime-local" value={due} disabled={busy} onChange={event=>setDue(event.target.value)}/><p>Sem prazo informado: tarefa sem prazo.</p></>:<><label htmlFor="proposal-start">Início (obrigatório)</label><input id="proposal-start" type="datetime-local" value={start} disabled={busy} onChange={event=>setStart(event.target.value)}/><label htmlFor="proposal-end">Fim (opcional)</label><input id="proposal-end" type="datetime-local" value={end} disabled={busy} onChange={event=>setEnd(event.target.value)}/><p>Sem fim: duração de 30 minutos.</p><label htmlFor="proposal-frequency">Recorrência</label><select id="proposal-frequency" disabled={busy} value={draft.frequency} onChange={event=>setDraft({...draft,frequency:event.target.value as Proposal['frequency'],repeat_until:null})}><option value="none">Não repetir</option><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select>{draft.frequency!=='none'&&<><label htmlFor="proposal-interval">Intervalo</label><input id="proposal-interval" type="number" min={1} value={draft.repeat_interval} disabled={busy} onChange={event=>setDraft({...draft,repeat_interval:Number(event.target.value)})}/><label htmlFor="proposal-until">Até (opcional)</label><input id="proposal-until" type="date" value={draft.repeat_until??''} disabled={busy} onChange={event=>setDraft({...draft,repeat_until:event.target.value||null})}/></>}</>}
  <div className="actions"><button className="primary" disabled={busy} onClick={()=>{void resolve()}}>Confirmar e salvar</button><button disabled={busy} onClick={()=>{void resolve(true)}}>Rejeitar prévia</button></div></section>}
  <section className="card"><h2>Histórico — últimas 100 mensagens</h2>{history.length?<ul className="environment-list">{history.map(item=><li className="agenda-item" key={item.id}><p>{item.message}</p><p className="secondary">{new Date(item.created_at).toLocaleString('pt-BR')} · {item.status==='confirmed'?'Confirmada':item.status==='rejected'?'Rejeitada':'Aguardando confirmação'}</p>{item.status==='draft'&&<button disabled={busy||!!draft} onClick={()=>{try{preview(item.id,parseProposal(item.proposal,environments.map(environment=>environment.id),timezone))}catch{setError('Prévia inválida ou contexto removido; não pode ser confirmada.')}}}>Abrir prévia</button>}</li>)}</ul>:<p>Nenhuma mensagem interpretada.</p>}</section>
  </section>
}
