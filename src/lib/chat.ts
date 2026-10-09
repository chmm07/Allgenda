import type {AppClient} from './supabase'
import {parseProposal,type Proposal} from '../../supabase/functions/_shared/proposal.ts'
export type {Proposal}
export function chatRepository(client:AppClient){return {
  async load(){
    const [environments,history]=await Promise.all([client.from('environments').select('*').order('created_at'),client.from('chat_history').select('*').order('created_at',{ascending:false}).limit(100)])
    if(environments.error||history.error)throw new Error('Não foi possível carregar contextos e histórico.')
    return {environments:environments.data!,history:history.data!}
  },
  async interpret(message:string,timezone:string,ids:string[]){
    const {data,error}=await client.functions.invoke('chat-interpret',{body:{message,timezone}})
    if(error)throw new Error('Interpretação indisponível. Confira a configuração do serviço e tente novamente. Nenhum item foi criado.')
    if(typeof data?.history_id!=='string')throw new Error('Resposta inválida.')
    return {proposal:parseProposal(data.proposal,ids,timezone),history_id:data.history_id as string}
  },
  async resolve(id:string,proposal:Proposal,reject:boolean){
    const {data,error}=await client.rpc('resolve_chat',{history_id:id,edited_proposal:{...proposal},reject})
    if(error)throw new Error('Não foi possível confirmar/rejeitar. Confira campos, conexão e acesso; repetir a confirmação não duplica itens.')
    return data
  },
}}
export type ChatRepository=ReturnType<typeof chatRepository>
