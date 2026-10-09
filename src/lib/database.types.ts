// Schema da migração inicial. Regenerar com Supabase CLI ao alterar o banco.
export type Environment = {
  id: string
  user_id: string
  name: string
  anchor_words: string[]
  created_at: string
  updated_at: string
}
export type EnvironmentInput = Pick<Environment, 'name' | 'anchor_words'>
export type Database = {
  public: {
    Tables: {
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
    }
    Enums: { [key in never]: never }
    CompositeTypes: { [key in never]: never }
  }
}
