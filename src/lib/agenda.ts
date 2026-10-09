import type { AppClient } from './supabase'
import type { AppointmentInput, ExceptionInput, TaskInput } from './database.types'

async function allRows<T>(fetchPage:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>):Promise<T[]> {
  const rows:T[]=[]
  for(let from=0;;from+=200){
    const result=await fetchPage(from,from+199)
    if(result.error||!result.data)throw new Error('Não foi possível carregar a agenda. Tente novamente.')
    rows.push(...result.data)
    if(result.data.length<200)return rows
  }
}

export function agendaRepository(client: AppClient) {
  return {
    async load() {
      const results = await Promise.all([
        allRows((from,to)=>client.from('environments').select('*').order('created_at').order('id').range(from,to)),
        allRows((from,to)=>client.from('tasks').select('*').order('created_at').order('id').range(from,to)),
        allRows((from,to)=>client.from('appointments').select('*').order('starts_at').order('id').range(from,to)),
        allRows((from,to)=>client.from('appointment_exceptions').select('*').order('appointment_id').order('original_start').range(from,to)),
      ])
      return { environments: results[0], tasks: results[1], appointments: results[2], exceptions: results[3] }
    },
    async saveTask(value: TaskInput, id?: string) {
      const request = id ? client.from('tasks').update(value).eq('id',id) : client.from('tasks').insert(value)
      const { data,error } = await request.select('*').single()
      if(error) throw new Error('Não foi possível salvar a tarefa. Confira conexão e acesso.')
      return data
    },
    async removeTask(id:string) {
      const {error} = await client.from('tasks').delete().eq('id',id).select('id').single()
      if(error) throw new Error('Não foi possível excluir a tarefa.')
    },
    async saveAppointment(value:AppointmentInput,id?:string) {
      const request = id ? client.from('appointments').update(value).eq('id',id) : client.from('appointments').insert(value)
      const {data,error}=await request.select('*').single()
      if(error)throw new Error('Não foi possível salvar o compromisso. Confira conexão e acesso.')
      return data
    },
    async saveException(value:ExceptionInput) {
      const {data,error}=await client.from('appointment_exceptions').upsert(value,{onConflict:'appointment_id,original_start'}).select('*').single()
      if(error)throw new Error('Não foi possível alterar esta ocorrência.')
      return data
    },
    async removeAppointment(id:string) {
      const {error}=await client.from('appointments').delete().eq('id',id).select('id').single()
      if(error)throw new Error('Não foi possível excluir o compromisso.')
    },
  }
}
export type AgendaRepository = ReturnType<typeof agendaRepository>
export type AgendaData = Awaited<ReturnType<AgendaRepository['load']>>
