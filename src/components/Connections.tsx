import {useEffect,useRef,useState} from 'react'
import type {AppClient} from '../lib/supabase'
import type {GoogleAccount} from '../lib/database.types'
export function Connections({client}:{client:AppClient}){
  const [accounts,setAccounts]=useState<GoogleAccount[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[attempt,setAttempt]=useState(0)
  const [selected,setSelected]=useState<GoogleAccount|null>(null)
  const dialog=useRef<HTMLDialogElement>(null),mounted=useRef(true)
  useEffect(()=>{mounted.current=true;let active=true;client.from('google_accounts').select('*').order('created_at').then(({data,error})=>{if(active){if(error)setError('Não foi possível carregar as conexões; confira a configuração do serviço.');else{setAccounts(data??[]);setLoaded(true);setError('')}}});return()=>{active=false;mounted.current=false}},[client,attempt])
  async function connect(){
    if(busy)return
    setBusy(true);setError('')
    try{const {data,error}=await client.functions.invoke('calendar-connect',{body:{}});if(error||typeof data?.url!=='string')throw new Error();const target=new URL(data.url);if(target.protocol!=='https:'||target.hostname!=='accounts.google.com')throw new Error();window.location.assign(target.href)}
    catch{if(mounted.current){setError('Conexão indisponível. O responsável precisa configurar Google Calendar, callback e segredos de servidor. Nenhuma conta foi conectada.');setBusy(false)}}
  }
  async function disconnect(){
    if(!selected||busy)return
    setBusy(true);setError('')
    try{const {error}=await client.from('google_accounts').delete().eq('id',selected.id).select('id').single();if(error)throw error;if(mounted.current){setAccounts(items=>items.filter(item=>item.id!==selected.id));dialog.current?.close();setSelected(null)}}
    catch{if(mounted.current)setError('Não foi possível desconectar. Tente novamente.')}
    finally{if(mounted.current)setBusy(false)}
  }
  return <section><h1>Google Calendar</h1><p>Conecte contas Google separadamente do login da Allgenda.</p><p>Sincronização de eventos ainda não está disponível. Conectar uma conta não significa que eventos foram sincronizados.</p>{error&&<p role="alert" className="error">{error}</p>}<div className="actions"><button className="primary" disabled={busy||!loaded} onClick={()=>{void connect()}}>Conectar outra conta Google</button><button disabled={busy} onClick={()=>setAttempt(value=>value+1)}>Recarregar conexões</button></div><ul className="environment-list">{accounts.map(account=><li className="agenda-item" key={account.id}><p>{account.email}</p><button className="danger" disabled={busy} onClick={()=>{setSelected(account);dialog.current?.showModal()}}>Desconectar da Allgenda</button></li>)}</ul>{loaded&&!accounts.length&&<p>Nenhuma conta Calendar conectada.</p>}
  <dialog ref={dialog} aria-labelledby="disconnect-heading" onCancel={event=>{if(busy)event.preventDefault()}}><h2 id="disconnect-heading">Desconectar conta?</h2><p>{selected?.email}</p><p>A conexão e os tokens guardados na Allgenda serão removidos. Os eventos e as permissões no Google serão preservados. Para revogar a autorização no Google, use a página de segurança da sua conta.</p><div className="actions"><button autoFocus disabled={busy} onClick={()=>dialog.current?.close()}>Cancelar</button><button className="danger" disabled={busy} onClick={()=>{void disconnect()}}>Confirmar desconexão</button></div></dialog></section>
}
