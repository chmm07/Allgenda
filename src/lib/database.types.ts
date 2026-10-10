// Schema das migrações versionadas. Regenerar com Supabase CLI após aplicação real.
export type Environment = {
  id: string
  user_id: string
  name: string
  anchor_words: string[]
  created_at: string
  updated_at: string
}
export type EnvironmentInput = Pick<Environment, 'name' | 'anchor_words'>
export type Task = { id: string; user_id: string; environment_id: string; title: string; due_at: string | null; completed: boolean; created_at: string; updated_at: string }
export type TaskInput = Pick<Task, 'environment_id' | 'title' | 'due_at' | 'completed'>
export type Frequency = 'none' | 'daily' | 'weekly' | 'monthly'
export type Appointment = { id: string; user_id: string; environment_id: string; title: string; starts_at: string; ends_at: string; timezone: string; frequency: Frequency; repeat_interval: number; repeat_until: string | null; created_at: string; updated_at: string }
export type AppointmentInput = Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type AppointmentException = { appointment_id: string; user_id: string; original_start: string; title: string; starts_at: string; ends_at: string; timezone: string; cancelled: boolean; created_at: string; updated_at: string }
export type ExceptionInput = Omit<AppointmentException, 'user_id' | 'created_at' | 'updated_at'>
export type EnvironmentImpact = { tasks: { id: string; title: string }[]; appointments: { id: string; title: string }[]; exceptions: { appointment_id: string; original_start: string; title: string }[] }
export type ChatHistory = {id:string;user_id:string;message:string;proposal:Record<string,unknown>;status:'draft'|'confirmed'|'rejected';created_item_id:string|null;created_at:string}
export type GoogleAccount={id:string;user_id:string;google_subject:string;email:string;created_at:string}
type Table<Row, Input> = { Row: Row; Insert: Input; Update: Partial<Input>; Relationships: [] }
export type Database = {
  public: {
    Tables: {
      tasks: Table<Task, TaskInput>
      appointments: Table<Appointment, AppointmentInput>
      appointment_exceptions: Table<AppointmentException, ExceptionInput>
      chat_history: Table<ChatHistory, Pick<ChatHistory,'message'|'proposal'>>
      google_accounts: Table<GoogleAccount,never>
      environments: {
        Row: Environment
        Insert: EnvironmentInput
        Update: Partial<EnvironmentInput>
        Relationships: []
      }
    }
    Views: { [key in never]: never }
    Functions: {
      has_app_access: { Args: Record<string, never>; Returns: boolean }
      environment_impact: { Args: { target_id: string }; Returns: EnvironmentImpact }
      delete_environment_confirmed: { Args: { target_id: string; expected_impact: EnvironmentImpact }; Returns: undefined }
      replace_appointment_series: {Args:{target_id:string;edited_value:Record<string,unknown>;expected_updated_at:string;expected_exceptions:AppointmentException[]};Returns:Appointment}
      resolve_chat: {Args:{history_id:string;edited_proposal:Record<string,unknown>;reject:boolean};Returns:{id?:string;kind?:string;status:string}}
    }
    Enums: { [key in never]: never }
    CompositeTypes: { [key in never]: never }
  }
}
