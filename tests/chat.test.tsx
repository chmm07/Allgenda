// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {Chat} from '../src/components/Chat'
import type {ChatRepository} from '../src/lib/chat'
import {parseProposal} from '../supabase/functions/_shared/proposal'
afterEach(cleanup)
function mock(){return {load:vi.fn().mockResolvedValue({environments:[{id:'contexto',name:'Fictício'}],history:[]}),interpret:vi.fn().mockResolvedValue({history_id:'mensagem',proposal:parseProposal({kind:'task',title:'Tarefa fictícia',environment_id:null},['contexto'],'UTC')}),resolve:vi.fn().mockResolvedValue({status:'confirmed'})} as unknown as ChatRepository}
describe('chat com serviço fictício de teste, sem Groq real',()=>{
  it('falha ao atualizar histórico preserva prévia já preparada',async()=>{
    const repository=mock(),user=userEvent.setup()
    vi.mocked(repository.load).mockResolvedValueOnce({environments:[{id:'contexto',user_id:'usuario-ficticio',name:'Fictício',anchor_words:['um','dois','três'],created_at:'2026-10-09',updated_at:'2026-10-09'}],history:[]}).mockRejectedValue(new Error('rede'))
    render(<Chat repository={repository}/>);await user.type(screen.getByLabelText('Mensagem'),'Mensagem fictícia');await user.click(screen.getByRole('button',{name:'Interpretar mensagem'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('A prévia foi preparada')
    expect(screen.getByRole('heading',{name:'Prévia editável'})).toBeVisible();expect(repository.resolve).not.toHaveBeenCalled()
  })
  it('prévia não grava item; campo faltante bloqueia até edição e confirmação',async()=>{
    const repository=mock(),user=userEvent.setup();render(<Chat repository={repository}/>)
    await user.type(screen.getByLabelText('Mensagem'),'Criar uma tarefa fictícia')
    await user.click(screen.getByRole('button',{name:'Interpretar mensagem'}))
    await screen.findByRole('heading',{name:'Prévia editável'})
    expect(repository.resolve).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button',{name:'Confirmar e salvar'}))
    expect(repository.resolve).not.toHaveBeenCalled()
    await user.selectOptions(screen.getByLabelText('Ambiente (obrigatório)'),'contexto')
    await user.click(screen.getByRole('button',{name:'Confirmar e salvar'}))
    await waitFor(()=>expect(repository.resolve).toHaveBeenCalledWith('mensagem',expect.objectContaining({kind:'task',environment_id:'contexto'}),false))
  })
  it('serviço indisponível não apresenta prévia fictícia e mantém mensagem',async()=>{
    const repository=mock(),user=userEvent.setup();vi.mocked(repository.interpret).mockRejectedValue(new Error('configuração ausente'))
    render(<Chat repository={repository}/>);await user.type(screen.getByLabelText('Mensagem'),'Minha mensagem fictícia');await user.click(screen.getByRole('button',{name:'Interpretar mensagem'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('Interpretação indisponível')
    expect(screen.getByLabelText('Mensagem')).toHaveValue('Minha mensagem fictícia');expect(screen.queryByRole('heading',{name:'Prévia editável'})).not.toBeInTheDocument()
  })
  it('rejeitar não exige preencher ausências e não confirma criação',async()=>{
    const repository=mock(),user=userEvent.setup();render(<Chat repository={repository}/>);await user.type(screen.getByLabelText('Mensagem'),'Teste fictício');await user.click(screen.getByRole('button',{name:'Interpretar mensagem'}));await screen.findByRole('heading',{name:'Prévia editável'});await user.click(screen.getByRole('button',{name:'Rejeitar prévia'}));await waitFor(()=>expect(repository.resolve).toHaveBeenCalledWith('mensagem',expect.anything(),true))
  })
})
