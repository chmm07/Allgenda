// Uma associação por execução: fila persistida dá prioridade à mais antiga.
// Não aceita dono/conta fornecidos pelo cliente. Cada transição revalida convite.
export type CalendarJob={user_id:string;account_id:string;id:string;calendar_id:string}
type JobRpc=(operation:string,payload:Record<string,unknown>)=>Promise<unknown>
export async function runCalendarJob(next:()=>Promise<CalendarJob|null>,sync:(job:CalendarJob)=>Promise<unknown>){
  const job=await next()
  if(!job)return {processed:0,failed:0}
  try{await sync(job);return {processed:1,failed:0}}
  catch{return {processed:0,failed:1}}
}
export async function authenticateCalendarJob(authorization:string,adminKey:string){
  if(!authorization.startsWith('Bearer '))return false
  const digest=async(value:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))
  const [actual,expected]=await Promise.all([digest(authorization.slice(7)),digest(adminKey)])
  let difference=0;for(let index=0;index<expected.length;index++)difference|=actual[index]^expected[index]
  return difference===0
}
export async function executeCalendarJob(rpc:JobRpc,run:(state:unknown,transition:JobRpc)=>Promise<unknown>){
  const state=await rpc('begin',{}) as {lease:string}
  try{return await run(state,(operation,payload)=>rpc(operation,{lease:state.lease,...payload}))}
  catch(error){await rpc('fail',{lease:state.lease});throw error}
}
