// Fixture de interface sem Supabase/OAuth. Fora da entrada de produção.
import {createRoot} from 'react-dom/client'
import {Agenda} from '../../src/components/Agenda'
import type {AgendaData,AgendaRepository} from '../../src/lib/agenda'
import '../../src/styles/tokens.css'
import '../../src/styles/app.css'
const data:AgendaData={environments:[{id:'environment-test',user_id:'user-test',name:'Contexto fictício',anchor_words:['um','dois','três'],created_at:'2026-01-01Z',updated_at:'2026-01-01Z'}],tasks:[],appointments:[],exceptions:[]}
const repository:AgendaRepository={
  async load(){return structuredClone(data)},
  async saveTask(value,id){const item={...value,id:id??crypto.randomUUID(),user_id:'user-test',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};data.tasks=id?data.tasks.map(old=>old.id===id?item:old):[...data.tasks,item];return item},
  async removeTask(id){data.tasks=data.tasks.filter(item=>item.id!==id)},
  async saveAppointment(value,id){const item={...value,id:id??crypto.randomUUID(),user_id:'user-test',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};data.appointments=id?data.appointments.map(old=>old.id===id?item:old):[...data.appointments,item];return item},
  async saveException(value){const item={...value,user_id:'user-test',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};data.exceptions=[...data.exceptions.filter(old=>old.appointment_id!==value.appointment_id||old.original_start!==value.original_start),item];return item},
  async replaceSeries(value,series,exceptions){if(JSON.stringify(data.exceptions.filter(item=>item.appointment_id===series.id))!==JSON.stringify(exceptions))throw new Error('Confirmação desatualizada');const saved=await repository.saveAppointment(value,series.id);data.exceptions=data.exceptions.filter(item=>item.appointment_id!==series.id);return saved},
  async removeAppointment(id){data.appointments=data.appointments.filter(item=>item.id!==id);data.exceptions=data.exceptions.filter(item=>item.appointment_id!==id)},
}
createRoot(document.getElementById('root')!).render(<main><p>Fixture fictícia. Sem integração.</p><Agenda repository={repository}/></main>)
