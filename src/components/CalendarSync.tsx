import {useEffect,useState} from 'react'
import type {ConnectionsRepository} from '../lib/connections'
// Sincronização em primeiro plano: somente calendários explicitamente selecionados.
export function CalendarSync({repository}:{repository:ConnectionsRepository}){
  const [notice,setNotice]=useState('')
  useEffect(()=>{
    let active=true,running=false
    async function cycle(){
      if(!active||running||document.visibilityState==='hidden'||navigator.onLine===false)return
      running=true
      try{
        const bindings=await repository.activeBindings()
        for(const binding of bindings){
          if(!active)break
          try{const result=await repository.sync(binding.account_id,binding.id);if(active&&(result.imported||result.exported||result.deleted)){setNotice('Google Calendar atualizado. Formulários abertos foram preservados; use Atualizar ao terminar a edição.');window.dispatchEvent(new Event('allgenda-calendar-updated'))}}
          catch{if(active)setNotice('Google Calendar tem mudanças pendentes. Confira as Conexões para repetir ou reconectar.')}
        }
      }catch{/* Sem configuração, as seções continuam disponíveis e Conexões informa o erro. */}
      finally{running=false}
    }
    const trigger=()=>{void cycle()},timer=window.setInterval(trigger,60000)
    trigger();window.addEventListener('online',trigger);document.addEventListener('visibilitychange',trigger)
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener('online',trigger);document.removeEventListener('visibilitychange',trigger)}
  },[repository])
  return notice?<p role="status" className="secondary">{notice}</p>:null
}
