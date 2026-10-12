import {describe,expect,it,vi} from 'vitest'
import {interpretWorkersAi,WORKERS_AI_MODEL,WorkersAiUnavailableError,workersAiConfigured} from '../supabase/functions/_shared/workers-ai'
const accountId='a'.repeat(32),token='token-ficticio',environment={id:'env-test',name:'Contexto fictício',anchor_words:['um','dois','três']}
const proposal={kind:'task',title:'Comprar papel',environment_id:environment.id,due_at:null,starts_at:null,ends_at:null,timezone:'America/Fortaleza',frequency:'none',repeat_interval:1,repeat_until:null}
const options={accountId,token,message:'Comprar papel, sem prazo',timezone:'America/Fortaleza',environments:[environment],now:'2026-10-11T12:00:00Z'}
function setup(value:unknown=proposal){const fetcher=vi.fn().mockResolvedValue(Response.json({success:true,result:{response:value}}));return {fetcher,run:()=>interpretWorkersAi({...options,fetcher})}}
describe('Workers AI com HTTP fictício — não é aceite de inferência real',()=>{
  it('usa somente origem oficial, conta validada, modelo fixo, timeout e JSON Schema',async()=>{
    const {run,fetcher}=setup();expect(await run()).toEqual(proposal)
    const [url,init]=fetcher.mock.calls[0],body=JSON.parse(init.body)
    expect(url).toBe(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${WORKERS_AI_MODEL}`)
    expect(init).toMatchObject({method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`}})
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(body).toMatchObject({temperature:0,stream:false,max_tokens:1024,response_format:{type:'json_schema',json_schema:{additionalProperties:false,properties:{environment_id:{enum:[null,environment.id]}}}}})
    expect(JSON.parse(body.messages[1].content)).toEqual({message:options.message,timezone:options.timezone,now:options.now,environments:options.environments})
    expect(init.body).not.toContain(token)
  })
  it('aceita resposta JSON em texto e conserva campos ausentes sem inventar prazo',async()=>{const {run}=setup(JSON.stringify({...proposal,environment_id:null}));expect(await run()).toMatchObject({environment_id:null,due_at:null})})
  it('compromisso retornado pelo serviço conserva início, fuso e término ausente',async()=>{const value={...proposal,kind:'appointment',title:'Reunião fictícia',starts_at:'2026-10-13T10:00:00-03:00',ends_at:null};const {run}=setup(value);expect(await run()).toEqual(value)})
  it.each(['', 'account/../../outside', 'https://outro.test', 'g'.repeat(32)])('conta inválida %s impede HTTP',async id=>{const {fetcher}=setup();await expect(interpretWorkersAi({...options,accountId:id,fetcher})).rejects.toBeInstanceOf(WorkersAiUnavailableError);expect(fetcher).not.toHaveBeenCalled()})
  it('sem segredo impede HTTP e configuração não aceita espaços',async()=>{const {fetcher}=setup();expect(workersAiConfigured(accountId,'   ')).toBe(false);await expect(interpretWorkersAi({...options,token:'',fetcher})).rejects.toBeInstanceOf(WorkersAiUnavailableError);expect(fetcher).not.toHaveBeenCalled()})
  it.each([401,403,429,500])('erro %i não faz retry nem divulga resposta/segredo',async status=>{const {run,fetcher}=setup();fetcher.mockResolvedValue(new Response(`erro interno ${token}`,{status}));await expect(run()).rejects.toThrow('O serviço de interpretação está indisponível. Tente novamente.');expect(fetcher).toHaveBeenCalledTimes(1)})
  it.each([{success:false,result:{response:proposal}},{success:true,result:null},{success:true,result:{response:proposal,tool_calls:[{name:'delete_all'}]}},{success:true,result:{response:'JSON incompleto'}},{success:true,result:{response:[]}}])('recusa envelope ou saída inválida sem proposta',async envelope=>{const {run,fetcher}=setup();fetcher.mockResolvedValue(Response.json(envelope));await expect(run()).rejects.toThrow()})
  it.each([{...proposal,environment_id:'foreign'},{...proposal,kind:'delete_all'},{...proposal,due_at:'2026-02-30T12:00:00Z'},{...proposal,timezone:'Fuso/Inexistente'}])('validação própria rejeita dados alheios, ação/data/fuso inválidos',async value=>{const {run}=setup(value);await expect(run()).rejects.toThrow()})
  it('falha de rede/timeout devolve erro seguro',async()=>{const {run,fetcher}=setup();fetcher.mockRejectedValue(new Error(`Bearer ${token}`));await expect(run()).rejects.toThrow('O serviço de interpretação está indisponível. Tente novamente.')})
  it('resposta excessiva é recusada',async()=>{const {run,fetcher}=setup();fetcher.mockResolvedValue(new Response(' '.repeat(32001)));await expect(run()).rejects.toBeInstanceOf(WorkersAiUnavailableError)})
})
