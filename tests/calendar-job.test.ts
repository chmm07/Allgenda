import {describe,expect,it,vi} from 'vitest'
import {authenticateCalendarJob,executeCalendarJob,runCalendarJob} from '../supabase/functions/_shared/calendar-job'
const job={id:'binding-ficticio',user_id:'owner-ficticio',account_id:'account-ficticio',calendar_id:'calendar-ficticio'}
describe('worker Calendar — serviço fictício, não é cron remoto',()=>{
  it('chave de usuário/anon não autoriza fila administrativa',async()=>{
    expect(await authenticateCalendarJob('Bearer user-ficticio','admin-ficticio')).toBe(false)
    expect(await authenticateCalendarJob('Bearer admin-ficticio-suffix','admin-ficticio')).toBe(false)
    expect(await authenticateCalendarJob('admin-ficticio','admin-ficticio')).toBe(false)
    expect(await authenticateCalendarJob('Bearer admin-ficticio','admin-ficticio')).toBe(true)
  })
  it('fila vazia não solicita credenciais nem executa sincronização',async()=>{
    const sync=vi.fn();expect(await runCalendarJob(async()=>null,sync)).toEqual({processed:0,failed:0});expect(sync).not.toHaveBeenCalled()
  })
  it('processa somente a associação retornada no servidor',async()=>{
    const sync=vi.fn();expect(await runCalendarJob(async()=>job,sync)).toEqual({processed:1,failed:0});expect(sync).toHaveBeenCalledExactlyOnceWith(job)
  })
  it('falha não vaza dados e libera lease para uma nova tentativa',async()=>{
    const rpc=vi.fn().mockResolvedValue({lease:'lease-ficticio'})
    const result=await runCalendarJob(async()=>job,()=>executeCalendarJob(rpc,async()=>{throw new Error('segredo-ficticio')}))
    expect(result).toEqual({processed:0,failed:1});expect(rpc.mock.calls).toEqual([['begin',{}],['fail',{lease:'lease-ficticio'}]])
  })
  it('lease recusado não executa serviço nem libera lease de outro worker',async()=>{
    const rpc=vi.fn().mockRejectedValue(new Error('Ocupado')),run=vi.fn()
    await expect(executeCalendarJob(rpc,run)).rejects.toThrow('Ocupado');expect(run).not.toHaveBeenCalled();expect(rpc).toHaveBeenCalledTimes(1)
  })
  it('transporta lease em cada transição sem finish sintético',async()=>{
    const rpc=vi.fn().mockResolvedValue({lease:'lease-ficticio'})
    await executeCalendarJob(rpc,async(_state,transition)=>transition('finish',{sync_token:'cursor-ficticio'}))
    expect(rpc.mock.calls).toEqual([['begin',{}],['finish',{lease:'lease-ficticio',sync_token:'cursor-ficticio'}]])
  })
})
