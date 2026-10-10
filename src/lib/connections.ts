import type {AppClient} from './supabase'
export type WritableCalendar={id:string;summary:string;accessRole:string}
export function connectionsRepository(client:AppClient){
  async function invoke<T>(body:Record<string,unknown>):Promise<T>{
    const {data,error}=await client.functions.invoke('calendar-manage',{body})
    if(error){
      let message='Calendar indisponível. Confira a configuração do serviço e tente novamente.'
      if(error.context instanceof Response){try{const details=await error.context.json();if(typeof details.error==='string')message=details.error}catch{/* Resposta não estruturada. */}}
      throw new Error(message)
    }
    return data as T
  }
  return {
    async activeBindings(){const result=[];for(let from=0;;from+=200){const {data,error}=await client.from('calendar_bindings').select('id,account_id').or('enabled.eq.true,environment_id.is.null').order('id').range(from,from+199);if(error||!data)throw new Error('Conexões indisponíveis.');result.push(...data);if(data.length<200)return result}},
    async load(){
      const [accounts,bindings]=await Promise.all([client.from('google_accounts').select('*').order('created_at'),client.from('calendar_bindings').select('id,user_id,account_id,calendar_id,calendar_name,environment_id,enabled,last_synced_at,last_error').order('calendar_name')])
      if(accounts.error||bindings.error)throw new Error('Não foi possível carregar as conexões. Confira a configuração do serviço.')
      const environments=[]
      for(let from=0;;from+=200){const page=await client.from('environments').select('*').order('created_at').order('id').range(from,from+199);if(page.error||!page.data)throw new Error('Não foi possível carregar os ambientes.');environments.push(...page.data);if(page.data.length<200)break}
      return {accounts:accounts.data??[],bindings:bindings.data??[],environments}
    },
    async connect(){const {data,error}=await client.functions.invoke('calendar-connect',{body:{}});if(error||typeof data?.url!=='string')throw new Error('Conexão indisponível. O responsável precisa configurar Google Calendar. Nenhuma conta foi conectada.');const target=new URL(data.url);if(target.protocol!=='https:'||target.hostname!=='accounts.google.com')throw new Error('Endereço de autorização inválido.');return target.href},
    async disconnect(id:string){const {error}=await client.from('google_accounts').delete().eq('id',id).select('id').single();if(error)throw new Error('Não foi possível desconectar. Tente novamente.')},
    async calendars(account_id:string){return (await invoke<{calendars:WritableCalendar[]}>({action:'list',account_id})).calendars},
    configure(account_id:string,calendar:WritableCalendar,environment_id:string,enabled:boolean,confirmed:boolean){return invoke<{id:string}>({action:'configure',account_id,calendar_id:calendar.id,environment_id,enabled,confirmed})},
    sync(account_id:string,binding_id:string){return invoke<{imported:number;exported:number;deleted:number;skipped:number;warning:string}>({action:'sync',account_id,binding_id})},
  }
}
export type ConnectionsRepository=ReturnType<typeof connectionsRepository>
export type ConnectionsData=Awaited<ReturnType<ConnectionsRepository['load']>>
