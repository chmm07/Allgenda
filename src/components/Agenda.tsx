import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Temporal } from '@js-temporal/polyfill'
import type { AgendaData, AgendaRepository } from '../lib/agenda'
import type { AppointmentInput, Frequency, Task } from '../lib/database.types'
import { conflicts, deviceTimezone, formatInstant, instantToLocal, localToInstant, occurrencesInRange, taskGroups, validateAppointment, type Occurrence } from '../lib/scheduling'

const empty: AgendaData = { environments:[],tasks:[],appointments:[],exceptions:[] }
type EventDraft = { title:string; environment_id:string; start:string; end:string; timezone:string; frequency:Frequency; interval:string; until:string }
const blankEvent = (zone:string):EventDraft => ({title:'',environment_id:'',start:'',end:'',timezone:zone,frequency:'none',interval:'1',until:''})
function draftFrom(item:AppointmentInput):EventDraft { return {title:item.title,environment_id:item.environment_id,start:instantToLocal(item.starts_at,item.timezone),end:instantToLocal(item.ends_at,item.timezone),timezone:item.timezone,frequency:item.frequency,interval:String(item.repeat_interval),until:item.repeat_until??''} }

export function Agenda({repository}:{repository:AgendaRepository}) {
  const [data,setData]=useState(empty)
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [attempt,setAttempt]=useState(0)
  const [zone,setZone]=useState(deviceTimezone)
  const [date,setDate]=useState(()=>Temporal.Now.plainDateISO().toString())
  const [view,setView]=useState<'week'|'month'>('week')
  const [environment,setEnvironment]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [task,setTask]=useState<Task|null>(null)
  const [taskTitle,setTaskTitle]=useState('')
  const [taskEnvironment,setTaskEnvironment]=useState('')
  const [taskDue,setTaskDue]=useState('')
  const [selected,setSelected]=useState<Occurrence|null>(null)
  const [scope,setScope]=useState<'occurrence'|'series'>('occurrence')
  const [eventDraft,setEventDraft]=useState(()=>blankEvent(deviceTimezone()))
  const [openDialog,setOpenDialog]=useState<'task'|'event'|'delete'|null>(null)
  const [confirm,setConfirm]=useState<{kind:'task';task:Task}|{kind:'event';event:Occurrence;scope:'occurrence'|'series'}|null>(null)
  const taskDialog=useRef<HTMLDialogElement>(null)
  const eventDialog=useRef<HTMLDialogElement>(null)
  const deleteDialog=useRef<HTMLDialogElement>(null)
  const mounted=useRef(true)

  useEffect(()=>{
    mounted.current=true
    let active=true
    repository.load().then(value=>{if(active){setData(value);setLoading(false);setLoadError('')}}).catch(()=>{if(active){setLoading(false);setLoadError('Não foi possível carregar a agenda. Tente novamente.')}})
    return()=>{active=false;mounted.current=false}
  },[repository,attempt])

  async function mutate(action:()=>Promise<unknown>,success:string,close?:HTMLDialogElement|null) {
    if(busy)return
    setBusy(true);setError('');setMessage('')
    try {
      await action()
      if(!mounted.current)return
      close?.close();setMessage(success)
      try {const fresh=await repository.load();if(mounted.current)setData(fresh)}
      catch {if(mounted.current)setLoadError('A alteração foi salva, mas não foi possível atualizar a agenda. Recarregue os dados.')}
    } catch {if(mounted.current)setError('Não foi possível concluir a alteração. Confira a conexão, os campos e seu acesso; tente novamente.')}
    finally {if(mounted.current)setBusy(false)}
  }

  const range=useMemo(()=>{
    const target=Temporal.PlainDate.from(date)
    const start=view==='week'?target.subtract({days:target.dayOfWeek-1}):target.with({day:1})
    const end=view==='week'?start.add({days:7}):start.add({months:1})
    return {start,end,from:start.toZonedDateTime(zone).toInstant().toString(),to:end.toZonedDateTime(zone).toInstant().toString()}
  },[date,view,zone])
  const visible=useMemo(()=>occurrencesInRange(data.appointments,data.exceptions,range.from,range.to).filter(item=>!environment||item.environment_id===environment),[data,range,environment])
  const overlap=useMemo(()=>conflicts(visible),[visible])
  const filteredTasks=data.tasks.filter(item=>!environment||item.environment_id===environment)
  const groups=taskGroups(filteredTasks)
  const envName=(id:string)=>data.environments.find(item=>item.id===id)?.name??'Ambiente indisponível'
  const days=[]
  for(let day=range.start;Temporal.PlainDate.compare(day,range.end)<0;day=day.add({days:1}))days.push(day)

  function showTask(item?:Task,movedDate?:string) {
    const previous=item?.due_at?instantToLocal(item.due_at,zone):''
    setTask(item??null);setTaskTitle(item?.title??'');setTaskEnvironment(item?.environment_id??environment??'');setTaskDue(movedDate?`${movedDate}T${previous.split('T')[1]??'09:00'}`:previous);setError('');setOpenDialog('task');taskDialog.current?.showModal()
  }
  async function saveTask(event:FormEvent) {
    event.preventDefault()
    if(!taskTitle.trim()||!taskEnvironment){setError('Informe título e ambiente.');return}
    let due:string|null=null
    try {due=taskDue?localToInstant(taskDue,zone):null}catch{setError('Confira a data e o fuso. Horários inexistentes ou ambíguos não são aceitos.');return}
    await mutate(()=>repository.saveTask({title:taskTitle.trim(),environment_id:taskEnvironment,due_at:due,completed:task?.completed??false},task?.id),'Tarefa salva.',taskDialog.current)
  }
  function showEvent(item?:Occurrence, movedDate?:string) {
    setSelected(item??null);setScope('occurrence');setError('')
    const draft=item?draftFrom(item):{...blankEvent(zone),environment_id:environment,start:movedDate?`${movedDate}T09:00`:''}
    if(item&&movedDate){const duration=Date.parse(item.ends_at)-Date.parse(item.starts_at);draft.start=`${movedDate}T${draft.start.split('T')[1]}`;try{draft.end=instantToLocal(Temporal.Instant.from(localToInstant(draft.start,draft.timezone)).add({milliseconds:duration}).toString(),draft.timezone)}catch{draft.end=''}}
    setEventDraft(draft);setOpenDialog('event');eventDialog.current?.showModal()
  }
  function changeScope(next:'occurrence'|'series') {
    setScope(next)
    if(selected){const source=next==='series'?data.appointments.find(item=>item.id===selected.appointment_id):selected;if(source)setEventDraft(draftFrom(source))}
  }
  async function saveEvent(event:FormEvent) {
    event.preventDefault()
    if(selected?.recurring&&scope==='series'&&data.exceptions.some(item=>item.appointment_id===selected.appointment_id)){
      setError('Esta série possui ocorrências editadas individualmente. A edição da série ainda não está disponível; edite uma ocorrência.');return
    }
    let value:AppointmentInput
    try {
      const start=localToInstant(eventDraft.start,eventDraft.timezone)
      const end=eventDraft.end?localToInstant(eventDraft.end,eventDraft.timezone):Temporal.Instant.from(start).add({minutes:30}).toString()
      value=validateAppointment({title:eventDraft.title,environment_id:eventDraft.environment_id,starts_at:start,ends_at:end,timezone:eventDraft.timezone,frequency:eventDraft.frequency,repeat_interval:Number(eventDraft.interval),repeat_until:eventDraft.until||null})
    }catch{setError('Confira título, ambiente, datas, fuso e recorrência. O fim deve ser após o início; horários locais inexistentes/ambíguos precisam ser corrigidos.');return}
    if(selected?.recurring&&scope==='occurrence')await mutate(()=>repository.saveException({appointment_id:selected.appointment_id,original_start:selected.original_start,title:value.title,starts_at:value.starts_at,ends_at:value.ends_at,timezone:value.timezone,cancelled:false}),'Ocorrência salva.',eventDialog.current)
    else await mutate(()=>repository.saveAppointment(value,selected?.appointment_id),'Compromisso salvo.',eventDialog.current)
  }
  function askDelete(value:NonNullable<typeof confirm>){setConfirm(value);setError('');setOpenDialog('delete');deleteDialog.current?.showModal()}
  async function remove() {
    if(!confirm)return
    if(confirm.kind==='task')await mutate(()=>repository.removeTask(confirm.task.id),'Tarefa excluída.',deleteDialog.current)
    else if(confirm.event.recurring&&confirm.scope==='occurrence')await mutate(()=>repository.saveException({appointment_id:confirm.event.appointment_id,original_start:confirm.event.original_start,title:confirm.event.title,starts_at:confirm.event.starts_at,ends_at:confirm.event.ends_at,timezone:confirm.event.timezone,cancelled:true}),'Ocorrência excluída.',deleteDialog.current)
    else await mutate(()=>repository.removeAppointment(confirm.event.appointment_id),'Série/compromisso excluído.',deleteDialog.current)
  }
  function taskRow(item:Task){return <li key={item.id} className="agenda-item" draggable={!busy&&!item.completed} onDragStart={event=>event.dataTransfer.setData('text/plain',`task|${item.id}`)}><label className="task-check"><input type="checkbox" checked={item.completed} disabled={busy} onChange={()=>{void mutate(()=>repository.saveTask({title:item.title,environment_id:item.environment_id,due_at:item.due_at,completed:!item.completed},item.id),'Tarefa atualizada.')}}/>{item.title}</label><p className="secondary">{envName(item.environment_id)} · {item.due_at?formatInstant(item.due_at,zone):'Sem prazo'}</p><div className="actions"><button disabled={busy} onClick={()=>showTask(item)}>Editar tarefa</button><button className="danger" disabled={busy} onClick={()=>askDelete({kind:'task',task:item})}>Excluir tarefa</button></div></li>}

  if(loading)return <p role="status">Carregando agenda…</p>
  return <section aria-labelledby="agenda-heading">
    <h1 id="agenda-heading">Sua agenda</h1>
    {loadError&&<div role="alert"><p>{loadError}</p><button onClick={()=>{setLoading(true);setAttempt(value=>value+1)}}>Recarregar agenda</button></div>}
    {!data.environments.length&&<p>Crie um ambiente na seção Ambientes para adicionar tarefas e compromissos.</p>}
    {error&&openDialog===null&&<p role="alert" className="error">{error}</p>}
    <p role="status" className="success">{message}</p>
    <div className="agenda-layout"><aside className="card"><h2>Ambientes</h2><label htmlFor="agenda-environment">Mostrar ambiente</label><select id="agenda-environment" value={environment} onChange={event=>setEnvironment(event.target.value)}><option value="">Todos</option>{data.environments.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><label htmlFor="agenda-timezone">Fuso da visualização</label><select id="agenda-timezone" value={zone} onChange={event=>setZone(event.target.value)}>{Array.from(new Set([zone,...Intl.supportedValuesOf('timeZone')])).map(item=><option key={item} value={item}>{item}</option>)}</select><p className="secondary">Datas e horários exibidos neste fuso.</p><div className="actions"><button className="primary" disabled={busy||!!loadError||!data.environments.length} onClick={()=>showTask()}>Nova tarefa</button><button className="primary" disabled={busy||!!loadError||!data.environments.length} onClick={()=>showEvent()}>Novo compromisso</button></div></aside>
    <div><section className="card" aria-label="Calendário"><div className="calendar-toolbar"><h2>{view==='week'?'Semana':'Mês'} · {range.start.toString()}</h2><div className="actions"><button onClick={()=>setDate(Temporal.PlainDate.from(date).subtract(view==='week'?{weeks:1}:{months:1}).toString())}>Anterior</button><button onClick={()=>setDate(Temporal.Now.plainDateISO(zone).toString())}>Hoje</button><button onClick={()=>setDate(Temporal.PlainDate.from(date).add(view==='week'?{weeks:1}:{months:1}).toString())}>Próximo</button><button aria-pressed={view==='week'} onClick={()=>setView('week')}>Semana</button><button aria-pressed={view==='month'} onClick={()=>setView('month')}>Mês</button></div></div>
    <div className={`calendar-grid ${view}`}>{days.map(day=>{
      const from=day.toZonedDateTime(zone).epochMilliseconds;const to=day.add({days:1}).toZonedDateTime(zone).epochMilliseconds
      const entries=visible.filter(item=>Date.parse(item.starts_at)<to&&Date.parse(item.ends_at)>from)
      const deadlines=filteredTasks.filter(item=>!item.completed&&item.due_at&&Date.parse(item.due_at)>=from&&Date.parse(item.due_at)<to)
      return <section className="calendar-day" key={day.toString()} aria-label={`Dia ${day.toString()}`} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(busy)return;const key=event.dataTransfer.getData('text/plain');const item=visible.find(value=>`${value.appointment_id}|${value.original_start}`===key);const droppedTask=filteredTasks.find(value=>`task|${value.id}`===key);if(item)showEvent(item,day.toString());else if(droppedTask)showTask(droppedTask,day.toString())}}><h3>{new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(`${day.toString()}T12:00Z`))}</h3>{entries.length?entries.map(item=><button className="calendar-event" key={`${item.appointment_id}-${item.original_start}`} draggable={!busy} onDragStart={event=>event.dataTransfer.setData('text/plain',`${item.appointment_id}|${item.original_start}`)} onClick={()=>showEvent(item)}><strong>{item.title}</strong><span>{formatInstant(item.starts_at,zone)}</span><span>{envName(item.environment_id)}{item.recurring?' · Recorrente':''}</span></button>):<p className="secondary">Sem compromissos</p>}{deadlines.map(item=><button className="calendar-event" key={item.id} draggable={!busy} onDragStart={event=>event.dataTransfer.setData('text/plain',`task|${item.id}`)} onClick={()=>showTask(item)}><strong>Tarefa: {item.title}</strong><span>{formatInstant(item.due_at!,zone)}</span><span>{envName(item.environment_id)}</span></button>)}</section>
    })}</div></section>
    {overlap.length>0&&<section className="card"><h2>Conflitos de horário</h2><ul>{overlap.map(([a,b])=><li key={`${a.appointment_id}-${a.original_start}-${b.appointment_id}-${b.original_start}`}>{a.title} e {b.title} se sobrepõem. <button onClick={()=>showEvent(a)}>Ajustar horário</button></li>)}</ul></section>}
    <section className="card"><h2>Briefing do período</h2><p>{visible.length} ocorrências no período, {groups.upcoming.length} tarefas com prazo futuro e {groups.overdue.length} atrasadas.</p><p>{overlap.length?`${overlap.length} conflitos de horário precisam de atenção.`:'Nenhum conflito de horário neste período.'}</p></section>
    <div className="panels"><details className="card" open><summary>Pendências</summary>{(['upcoming','undated','overdue'] as const).map((key,index)=><section key={key}><h3>{['Com prazo','Sem prazo','Atrasadas'][index]}</h3>{groups[key].length?<ul className="environment-list">{groups[key].map(taskRow)}</ul>:<p className="secondary">Nenhuma pendência.</p>}</section>)}<details><summary>Concluídas ({groups.completed.length})</summary><ul className="environment-list">{groups.completed.map(taskRow)}</ul></details></details>
    <details className="card" open><summary>Compromissos</summary>{visible.length?<ul className="environment-list">{visible.map(item=><li className="agenda-item" key={`${item.appointment_id}-${item.original_start}`}><h3>{item.title}</h3><p>{formatInstant(item.starts_at,zone)} — {formatInstant(item.ends_at,zone)}</p><p className="secondary">{envName(item.environment_id)}{item.recurring?' · Recorrente':''}</p><div className="actions"><button disabled={busy} onClick={()=>showEvent(item)}>Detalhes / alterar horário</button><button className="danger" disabled={busy} onClick={()=>askDelete({kind:'event',event:item,scope:'occurrence'})}>Excluir compromisso</button></div></li>)}</ul>:<p>Sem compromissos neste período.</p>}</details></div></div></div>

    <dialog onClose={()=>setOpenDialog(current=>current==='task'?null:current)} ref={taskDialog} aria-labelledby="task-form-heading" onCancel={event=>{if(busy)event.preventDefault()}}><h2 id="task-form-heading">{task?'Editar tarefa':'Nova tarefa'}</h2><form onSubmit={event=>{void saveTask(event)}}><label htmlFor="task-title">Título da tarefa</label><input id="task-title" required value={taskTitle} disabled={busy} onChange={event=>setTaskTitle(event.target.value)}/><label htmlFor="task-environment">Ambiente da tarefa</label><select id="task-environment" required value={taskEnvironment} disabled={busy} onChange={event=>setTaskEnvironment(event.target.value)}><option value="">Escolha um ambiente</option>{data.environments.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><label htmlFor="task-due">Prazo (opcional)</label><input id="task-due" type="datetime-local" value={taskDue} disabled={busy} onChange={event=>setTaskDue(event.target.value)}/><p className="secondary">Fuso: {zone}. Deixe vazio para “Sem prazo”.</p>{error&&<p role="alert" className="error">{error}</p>}<div className="actions"><button className="primary" disabled={busy}>Salvar tarefa</button><button type="button" disabled={busy} onClick={()=>taskDialog.current?.close()}>Cancelar</button></div></form></dialog>
    <dialog onClose={()=>setOpenDialog(current=>current==='event'?null:current)} ref={eventDialog} aria-labelledby="event-form-heading" onCancel={event=>{if(busy)event.preventDefault()}}><h2 id="event-form-heading">{selected?'Detalhes do compromisso':'Novo compromisso'}</h2>
    {selected?.recurring&&<fieldset disabled={busy}><legend>Aplicar alteração</legend><label><input type="radio" checked={scope==='occurrence'} onChange={()=>changeScope('occurrence')}/> Somente esta ocorrência</label><label><input type="radio" checked={scope==='series'} onChange={()=>changeScope('series')}/> Toda a série</label></fieldset>}
    <form onSubmit={event=>{void saveEvent(event)}}><label htmlFor="event-title">Título do compromisso</label><input id="event-title" required disabled={busy} value={eventDraft.title} onChange={event=>setEventDraft({...eventDraft,title:event.target.value})}/><label htmlFor="event-environment">Ambiente do compromisso</label><select id="event-environment" required disabled={busy||!!(selected?.recurring&&scope==='occurrence')} value={eventDraft.environment_id} onChange={event=>setEventDraft({...eventDraft,environment_id:event.target.value})}><option value="">Escolha um ambiente</option>{data.environments.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>{selected?.recurring&&scope==='occurrence'&&<p className="secondary">O ambiente pertence à série. Escolha “Toda a série” para alterá-lo.</p>}<label htmlFor="event-zone">Fuso do compromisso</label><select id="event-zone" disabled={busy} value={eventDraft.timezone} onChange={event=>setEventDraft({...eventDraft,timezone:event.target.value})}>{Array.from(new Set([eventDraft.timezone,...Intl.supportedValuesOf('timeZone')])).map(item=><option key={item} value={item}>{item}</option>)}</select><label htmlFor="event-start">Início</label><input id="event-start" type="datetime-local" required disabled={busy} value={eventDraft.start} onChange={event=>setEventDraft({...eventDraft,start:event.target.value})}/><label htmlFor="event-end">Fim (opcional)</label><input id="event-end" type="datetime-local" disabled={busy} value={eventDraft.end} onChange={event=>setEventDraft({...eventDraft,end:event.target.value})}/><p className="secondary">Sem fim informado: duração de 30 minutos.</p>
    {(!selected?.recurring||scope==='series')&&<><label htmlFor="event-frequency">Recorrência</label><select id="event-frequency" disabled={busy} value={eventDraft.frequency} onChange={event=>setEventDraft({...eventDraft,frequency:event.target.value as Frequency,until:event.target.value==='none'?'':eventDraft.until})}><option value="none">Não repetir</option><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select>{eventDraft.frequency!=='none'&&<><label htmlFor="event-interval">Repetir a cada</label><input id="event-interval" type="number" min="1" step="1" required disabled={busy} value={eventDraft.interval} onChange={event=>setEventDraft({...eventDraft,interval:event.target.value})}/><label htmlFor="event-until">Repetir até (opcional)</label><input id="event-until" type="date" disabled={busy} value={eventDraft.until} onChange={event=>setEventDraft({...eventDraft,until:event.target.value})}/></>}</>}
    {error&&<p role="alert" className="error">{error}</p>}<div className="actions"><button className="primary" disabled={busy}>Salvar compromisso</button><button type="button" disabled={busy} onClick={()=>eventDialog.current?.close()}>Cancelar</button>{selected&&<button type="button" className="danger" disabled={busy} onClick={()=>{eventDialog.current?.close();askDelete({kind:'event',event:selected,scope})}}>Excluir</button>}</div></form></dialog>
    <dialog onClose={()=>setOpenDialog(current=>current==='delete'?null:current)} ref={deleteDialog} aria-labelledby="agenda-delete-heading" onCancel={event=>{if(busy)event.preventDefault()}}><h2 id="agenda-delete-heading">Confirmar exclusão</h2><p>{confirm?.kind==='task'?confirm.task.title:confirm?.event.title}</p>{confirm?.kind==='event'&&confirm.event.recurring&&<fieldset disabled={busy}><legend>Excluir</legend><label><input type="radio" checked={confirm.scope==='occurrence'} onChange={()=>setConfirm({...confirm,scope:'occurrence'})}/> Somente esta ocorrência</label><label><input type="radio" checked={confirm.scope==='series'} onChange={()=>setConfirm({...confirm,scope:'series'})}/> Toda a série, incluindo exceções</label></fieldset>}<p>A exclusão será definitiva. Confira o item e o alcance da operação.</p>{error&&<p role="alert" className="error">{error}</p>}<div className="actions"><button autoFocus disabled={busy} onClick={()=>deleteDialog.current?.close()}>Cancelar</button><button className="danger" disabled={busy} onClick={()=>{void remove()}}>Confirmar exclusão</button></div></dialog>
  </section>
}
