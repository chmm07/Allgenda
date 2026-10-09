import { Temporal } from '@js-temporal/polyfill'
import type { Appointment, AppointmentException, AppointmentInput, Task } from './database.types'

export type Occurrence = AppointmentInput & { appointment_id: string; original_start: string; recurring: boolean }
export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export function localToInstant(local: string, timezone: string): string {
  return Temporal.PlainDateTime.from(local).toZonedDateTime(timezone, { disambiguation: 'reject' }).toInstant().toString()
}
export function instantToLocal(instant: string, timezone: string) {
  return Temporal.Instant.from(instant).toZonedDateTimeISO(timezone).toPlainDateTime().toString({ smallestUnit: 'minute' })
}
export function formatInstant(instant: string, timezone: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(instant))
}
export function validateAppointment(input: AppointmentInput) {
  if (!input.title.trim() || !input.environment_id) throw new Error('Informe título e ambiente.')
  const start = Temporal.Instant.from(input.starts_at)
  const end = Temporal.Instant.from(input.ends_at)
  if (Temporal.Instant.compare(end, start) <= 0) throw new Error('O fim precisa ser depois do início.')
  const local = start.toZonedDateTimeISO(input.timezone).toPlainDate()
  if (!['none', 'daily', 'weekly', 'monthly'].includes(input.frequency) || !Number.isSafeInteger(input.repeat_interval) || input.repeat_interval < 1) throw new Error('Confira a recorrência e o intervalo.')
  if (input.repeat_until && (input.frequency === 'none' || Temporal.PlainDate.compare(Temporal.PlainDate.from(input.repeat_until), local) < 0)) throw new Error('O fim da recorrência deve ser na data inicial ou depois dela.')
  return { ...input, title: input.title.trim() }
}

// Faixa visível finita. Frequência usa hora local da série, preservando DST.
export function occurrencesInRange(appointments: Appointment[], exceptions: AppointmentException[], from: string, to: string): Occurrence[] {
  const low = Temporal.Instant.from(from); const high = Temporal.Instant.from(to)
  const result: Occurrence[] = []
  const inside = (start: string, end: string) => Temporal.Instant.compare(Temporal.Instant.from(start), high) < 0 && Temporal.Instant.compare(Temporal.Instant.from(end), low) > 0
  for (const appointment of appointments) {
    const base = Temporal.Instant.from(appointment.starts_at).toZonedDateTimeISO(appointment.timezone)
    const duration = Temporal.Instant.from(appointment.ends_at).epochMilliseconds - base.epochMilliseconds
    const overrides = exceptions.filter(item => item.appointment_id === appointment.id)
    const overridesByStart = new Map(overrides.map(item => [Temporal.Instant.from(item.original_start).toString(), item]))
    const target = low.subtract({ milliseconds: duration }).toZonedDateTimeISO(appointment.timezone).toPlainDate()
    const differences = appointment.frequency === 'monthly'
      ? (target.year-base.year)*12+target.month-base.month
      : base.toPlainDate().until(target, { largestUnit: 'day' }).days
    const unit = appointment.frequency === 'weekly' ? 7 : 1
    const first = appointment.frequency === 'none' ? 0 : Math.max(0, Math.floor(differences / (appointment.repeat_interval*unit))-1)
    const endDate = high.toZonedDateTimeISO(appointment.timezone).toPlainDate().add({ days: 1 })
    for (let index = first; ; index++) {
      if (appointment.frequency === 'none' && index > 0) break
      const date = appointment.frequency === 'monthly'
        ? base.toPlainDate().with({ day: 1 }).add({ months: index*appointment.repeat_interval })
        : base.toPlainDate().add({ days: appointment.frequency === 'none' ? 0 : index*appointment.repeat_interval*unit })
      if (Temporal.PlainDate.compare(date, endDate) > 0) break
      let occurrenceDate = date
      if (appointment.frequency === 'monthly') {
        if (base.day > date.daysInMonth) continue
        occurrenceDate = date.with({ day: base.day })
      }
      if (appointment.repeat_until && Temporal.PlainDate.compare(occurrenceDate, Temporal.PlainDate.from(appointment.repeat_until)) > 0) break
      let start: string
      try { start = occurrenceDate.toPlainDateTime(base.toPlainTime()).toZonedDateTime(appointment.timezone, { disambiguation: 'reject' }).toInstant().toString() } catch { continue }
      const end = Temporal.Instant.from(start).add({ milliseconds: duration }).toString()
      if (overridesByStart.has(start)) continue
      if (inside(start,end)) result.push({ ...appointment, starts_at: start, ends_at: end, appointment_id: appointment.id, original_start: start, recurring: appointment.frequency !== 'none' })
    }
    // Exceções movidas para dentro da janela entram mesmo quando a origem está fora.
    for (const override of overrides) if (!override.cancelled && inside(override.starts_at,override.ends_at)) {
      result.push({ ...appointment, ...override, appointment_id: appointment.id, recurring: appointment.frequency !== 'none' })
    }
  }
  return result.sort((a,b) => Temporal.Instant.compare(Temporal.Instant.from(a.starts_at),Temporal.Instant.from(b.starts_at)))
}

export function conflicts(items: Occurrence[]) {
  const pairs: [Occurrence,Occurrence][] = []
  for (let i=0;i<items.length;i++) for (let j=i+1;j<items.length;j++) {
    if (Date.parse(items[j].starts_at) >= Date.parse(items[i].ends_at)) break
    if (Date.parse(items[j].ends_at)>Date.parse(items[i].starts_at)) pairs.push([items[i],items[j]])
  }
  return pairs
}
export function taskGroups(tasks: Task[], now = Date.now()) {
  const pending = tasks.filter(task=>!task.completed)
  const byDue = (a: Task,b:Task) => Date.parse(a.due_at ?? '')-Date.parse(b.due_at ?? '') || a.id.localeCompare(b.id)
  return {
    upcoming: pending.filter(task=>task.due_at && Date.parse(task.due_at)>=now).sort(byDue),
    undated: pending.filter(task=>!task.due_at),
    overdue: pending.filter(task=>task.due_at && Date.parse(task.due_at)<now).sort(byDue),
    completed: tasks.filter(task=>task.completed),
  }
}
