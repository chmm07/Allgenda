import type { AppClient } from './supabase'
import type { Appointment, AppointmentException, AppointmentInput, ExceptionInput, TaskInput } from './database.types'

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
      // Merge-upsert also updates the conflict keys, which the column grants protect.
      const inserted=await client.from('appointment_exceptions').upsert(value,{onConflict:'appointment_id,original_start',ignoreDuplicates:true}).select('*').maybeSingle()
      if(inserted.error)throw new Error('Não foi possível alterar esta ocorrência.')
      if(inserted.data)return inserted.data
      const {appointment_id,original_start,...changes}=value
      const {data,error}=await client.from('appointment_exceptions').update(changes).eq('appointment_id',appointment_id).eq('original_start',original_start).select('*').single()
      if(error)throw new Error('Não foi possível alterar esta ocorrência.')
      return data
    },
    async replaceSeries(value:AppointmentInput,series:Appointment,exceptions:AppointmentException[]) {
      const {data,error}=await client.rpc('replace_appointment_series',{target_id:series.id,edited_value:{...value},expected_updated_at:series.updated_at,expected_exceptions:exceptions})
      if(error)throw new Error('Não foi possível alterar a série. Recarregue os dados e confirme novamente.')
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
