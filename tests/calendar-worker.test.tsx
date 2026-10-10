// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {act,cleanup,render} from '@testing-library/react'
import {CalendarSync} from '../src/components/CalendarSync'
import type {ConnectionsRepository} from '../src/lib/connections'
let repository:ConnectionsRepository
beforeEach(()=>{vi.useFakeTimers();vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');vi.spyOn(navigator,'onLine','get').mockReturnValue(true);repository={activeBindings:vi.fn().mockResolvedValue([{id:'binding',account_id:'account'}]),load:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),calendars:vi.fn(),configure:vi.fn(),sync:vi.fn().mockResolvedValue({imported:1,exported:0,deleted:0,skipped:0,warning:''})}})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
describe('sincronização em primeiro plano com servidor fictício',()=>{
  it('notifica a agenda e libera o timer ao sair da sessão',async()=>{const listener=vi.fn();window.addEventListener('allgenda-calendar-updated',listener);try{const view=render(<CalendarSync repository={repository}/>);await act(async()=>{});expect(repository.sync).toHaveBeenCalledWith('account','binding');expect(listener).toHaveBeenCalledTimes(1);view.unmount();await act(async()=>{await vi.advanceTimersByTimeAsync(60000)});expect(repository.sync).toHaveBeenCalledTimes(1)}finally{window.removeEventListener('allgenda-calendar-updated',listener)}})
  it('aba oculta não consulta nem sincroniza; voltar ao primeiro plano retoma',async()=>{const visibility=vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');render(<CalendarSync repository={repository}/>);await act(async()=>{});expect(repository.activeBindings).not.toHaveBeenCalled();visibility.mockReturnValue('visible');await act(async()=>{document.dispatchEvent(new Event('visibilitychange'))});expect(repository.sync).toHaveBeenCalledTimes(1)})
  it('não dispara lotes concorrentes nem publica resposta após desmontar',async()=>{let resolve:(value:Awaited<ReturnType<ConnectionsRepository['sync']>>)=>void=()=>{};vi.mocked(repository.sync).mockReturnValue(new Promise(done=>{resolve=done}));const listener=vi.fn();window.addEventListener('allgenda-calendar-updated',listener);try{const view=render(<CalendarSync repository={repository}/>);await act(async()=>{});await act(async()=>{await vi.advanceTimersByTimeAsync(120000)});expect(repository.sync).toHaveBeenCalledTimes(1);view.unmount();await act(async()=>{resolve({imported:1,exported:0,deleted:0,skipped:0,warning:''})});expect(listener).not.toHaveBeenCalled()}finally{window.removeEventListener('allgenda-calendar-updated',listener)}})
})
