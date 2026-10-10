import {describe,expect,it,vi} from 'vitest'
import {parseProposal} from '../supabase/functions/_shared/proposal'
import {CalendarApiError,googleCalendarClient} from '../supabase/functions/_shared/google-calendar'
describe('interpretação validada',()=>{
  const value={kind:'task',title:'Tarefa fictícia',environment_id:'contexto'}
  it('ausências opcionais são null, sem data inventada',()=>{const proposal=parseProposal(value,['contexto'],'America/Fortaleza');expect(proposal.due_at).toBeNull();expect(proposal.starts_at).toBeNull()})
  it.each([{...value,kind:'delete'},{...value,environment_id:'outro'},{...value,due_at:'2026-02-30T10:00Z'},{...value,due_at:'2026-10-09T09:00'},{...value,timezone:'Inventado'},{...value,repeat_interval:0}])('rejeita ação/contexto/data/fuso/recorrência inválidos',invalid=>{expect(()=>parseProposal(invalid,['contexto'],'UTC')).toThrow()})
})
describe('adaptador Calendar com HTTP fictício, sem integração real',()=>{
  it('pagina eventos e guarda cursor somente após a última página',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({items:[{id:'um'}],nextPageToken:'dois'})).mockResolvedValueOnce(Response.json({items:[{id:'dois'}],nextSyncToken:'cursor-final'}))
    const result=await googleCalendarClient('token-ficticio',fetcher as typeof fetch).events('calendar@example.test','cursor-anterior')
    expect(result.events).toHaveLength(2);expect(result.syncToken).toBe('cursor-final');expect(fetcher.mock.calls[1][0]).toContain('pageToken=dois');expect(fetcher.mock.calls[0][0]).toContain('syncToken=cursor-anterior')
  })
  it.each([401,410,412,429,500])('falha %i não é sincronização concluída',async status=>{const fetcher=vi.fn().mockResolvedValue(new Response(null,{status}));await expect(googleCalendarClient('ficticio',fetcher as typeof fetch).events('primary')).rejects.toBeInstanceOf(CalendarApiError)})
  it('atualização usa etag e exclusão exige confirmação',async()=>{
    const fetcher=vi.fn().mockResolvedValue(Response.json({id:'um',etag:'novo'}));const client=googleCalendarClient('ficticio',fetcher as typeof fetch)
    await client.update('primary','um',{summary:'Fictício'},'antigo');expect(fetcher.mock.calls[0][1].headers['If-Match']).toBe('antigo')
    expect(()=>client.remove('primary','um','antigo',false)).toThrow(/confirmação/);expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each(['','   ','*',' * '])('edição e exclusão sem versão específica (%j) não enviam requisições',async etag=>{
    const fetcher=vi.fn(),client=googleCalendarClient('ficticio',fetcher as typeof fetch)
    await expect(client.update('primary','um',{summary:'Fictício'},etag)).rejects.toThrow(/Versão do evento ausente/)
    await expect(client.remove('primary','um',etag,true)).rejects.toThrow(/Versão do evento ausente/)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('conflito em edição ou exclusão não repete a chamada sem proteção',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(null,{status:412})),client=googleCalendarClient('ficticio',fetcher as typeof fetch)
    await expect(client.update('primary','um',{summary:'Fictício'},'"versao-anterior"')).rejects.toMatchObject({status:412})
    await expect(client.remove('primary','um','"versao-anterior"',true)).rejects.toMatchObject({status:412})
    expect(fetcher).toHaveBeenCalledTimes(2)
    for(const [,options] of fetcher.mock.calls)expect(options.headers['If-Match']).toBe('"versao-anterior"')
  })
})
