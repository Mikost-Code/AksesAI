
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "assistance_programs": {
                  Row: {
                    "access_type": Database["public"]['Enums']["access_type"],"category_id": string,"city": string | null,"claimed_at": string | null,"claimed_by": string | null,"context_window": number | null,"contributor_id": string,"contributor_note": string | null,"created_at": string,"description": string,"end_date": string | null,"free_tier": string | null,"free_tier_available": boolean,"id": string,"organizer": string,"price_input_per_mtok": number | null,"price_output_per_mtok": number | null,"promo_end": string | null,"promo_start": string | null,"provider": string | null,"province": string | null,"published_at": string | null,"rate_limit_rpm": number | null,"region": string | null,"region_scope": Database["public"]['Enums']["region_scope"],"requirements": string | null,"requires_card": boolean,"review_note": string | null,"reviewer_id": string | null,"search_tsv": unknown,"slug": string,"start_date": string | null,"status": Database["public"]['Enums']["program_status"],"title": string,"updated_at": string,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "access_type"?: Database["public"]['Enums']["access_type"],"category_id": string,"city"?: string | null,"claimed_at"?: string | null,"claimed_by"?: string | null,"context_window"?: number | null,"contributor_id": string,"contributor_note"?: string | null,"created_at"?: string,"description": string,"end_date"?: string | null,"free_tier"?: string | null,"free_tier_available"?: boolean,"id"?: string,"organizer": string,"price_input_per_mtok"?: number | null,"price_output_per_mtok"?: number | null,"promo_end"?: string | null,"promo_start"?: string | null,"provider"?: string | null,"province"?: string | null,"published_at"?: string | null,"rate_limit_rpm"?: number | null,"region"?: never,"region_scope"?: Database["public"]['Enums']["region_scope"],"requirements"?: string | null,"requires_card"?: boolean,"review_note"?: string | null,"reviewer_id"?: string | null,"search_tsv"?: never,"slug": string,"start_date"?: string | null,"status"?: Database["public"]['Enums']["program_status"],"title": string,"updated_at"?: string,"verified_at"?: string | null
                  }
                  Update: {
                    "access_type"?: Database["public"]['Enums']["access_type"],"category_id"?: string,"city"?: string | null,"claimed_at"?: string | null,"claimed_by"?: string | null,"context_window"?: number | null,"contributor_id"?: string,"contributor_note"?: string | null,"created_at"?: string,"description"?: string,"end_date"?: string | null,"free_tier"?: string | null,"free_tier_available"?: boolean,"id"?: string,"organizer"?: string,"price_input_per_mtok"?: number | null,"price_output_per_mtok"?: number | null,"promo_end"?: string | null,"promo_start"?: string | null,"provider"?: string | null,"province"?: string | null,"published_at"?: string | null,"rate_limit_rpm"?: number | null,"region"?: never,"region_scope"?: Database["public"]['Enums']["region_scope"],"requirements"?: string | null,"requires_card"?: boolean,"review_note"?: string | null,"reviewer_id"?: string | null,"search_tsv"?: never,"slug"?: string,"start_date"?: string | null,"status"?: Database["public"]['Enums']["program_status"],"title"?: string,"updated_at"?: string,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "assistance_programs_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assistance_programs_claimed_by_fkey"
      columns: ["claimed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assistance_programs_contributor_id_fkey"
      columns: ["contributor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assistance_programs_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"contribution_history": {
                  Row: {
                    "action": string,"contributor_id": string | null,"created_at": string,"id": string,"new_data": Json | null,"previous_data": Json | null,"program_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"contributor_id"?: string | null,"created_at"?: string,"id"?: string,"new_data"?: Json | null,"previous_data"?: Json | null,"program_id": string
                  }
                  Update: {
                    "action"?: string,"contributor_id"?: string | null,"created_at"?: string,"id"?: string,"new_data"?: Json | null,"previous_data"?: Json | null,"program_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_history_contributor_id_fkey"
      columns: ["contributor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_history_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "assistance_programs"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": string,"metadata": NonNullable<Json>,"reason": string | null,"target_id": string | null,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"reason"?: string | null,"target_id"?: string | null,"target_type": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"reason"?: string | null,"target_id"?: string | null,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "bio": string | null,"created_at": string,"github_avatar": string | null,"github_url": string | null,"github_username": string,"id": string,"is_banned": boolean,"is_deleted": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"created_at"?: string,"github_avatar"?: string | null,"github_url"?: string | null,"github_username": string,"id": string,"is_banned"?: boolean,"is_deleted"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "bio"?: string | null,"created_at"?: string,"github_avatar"?: string | null,"github_url"?: string | null,"github_username"?: string,"id"?: string,"is_banned"?: boolean,"is_deleted"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limit_buckets": {
                  Row: {
                    "bucket_key": string,"count": number,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_key": string,"count"?: number,"window_start": string
                  }
                  Update: {
                    "bucket_key"?: string,"count"?: number,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"description": string,"handled_by": string | null,"id": string,"program_id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string | null,"reporter_ip_hash": string | null,"resolution_note": string | null,"resolved_at": string | null,"status": Database["public"]['Enums']["report_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"handled_by"?: string | null,"id"?: string,"program_id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"reporter_ip_hash"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"handled_by"?: string | null,"id"?: string,"program_id"?: string,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"reporter_ip_hash"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "assistance_programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sources": {
                  Row: {
                    "created_at": string,"id": string,"is_primary": boolean,"last_checked_at": string | null,"link_status": string | null,"program_id": string,"source_title": string | null,"source_type": Database["public"]['Enums']["source_type_v2"],"source_url": string,"source_url_normalized": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_primary"?: boolean,"last_checked_at"?: string | null,"link_status"?: string | null,"program_id": string,"source_title"?: string | null,"source_type"?: Database["public"]['Enums']["source_type_v2"],"source_url": string,"source_url_normalized": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_primary"?: boolean,"last_checked_at"?: string | null,"link_status"?: string | null,"program_id"?: string,"source_title"?: string | null,"source_type"?: Database["public"]['Enums']["source_type_v2"],"source_url"?: string,"source_url_normalized"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sources_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "assistance_programs"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "assigned_by": string | null,"created_at": string,"id": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_by"?: string | null,"created_at"?: string,"id"?: string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "assigned_by"?: string | null,"created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "archive_program":
{ Args: { "p_program_id": string,"p_reason": string }; Returns: Database["public"]['Enums']["program_status"]
                           },
"check_rate_limit":
{ Args: { "p_bucket": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"claim_program":
{ Args: { "p_program_id": string }; Returns: string
                           },
"cleanup_expired_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"current_roles":
{ Args: Record<PropertyKey, never>; Returns: (Database["public"]['Enums']["app_role"])[]
                           },
"expire_due_programs":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"generate_program_slug":
{ Args: { "input": string }; Returns: string
                           },
"grant_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           },
"has_any_role":
{ Args: { "rs": (Database["public"]['Enums']["app_role"])[],"uid": string }; Returns: boolean
                           },
"has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"],"uid": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_user_banned":
{ Args: { "uid": string }; Returns: boolean
                           },
"is_user_deleted":
{ Args: { "uid": string }; Returns: boolean
                           },
"log_audit":
{ Args: { "p_action": string,"p_actor_id": string,"p_metadata"?: Json,"p_reason"?: string,"p_target_id": string,"p_target_type": string }; Returns: undefined
                           },
"log_history":
{ Args: { "p_action": string,"p_actor_id": string,"p_new"?: Json,"p_previous"?: Json,"p_program_id": string }; Returns: undefined
                           },
"mark_expired":
{ Args: { "p_program_id": string,"p_reason"?: string }; Returns: Database["public"]['Enums']["program_status"]
                           },
"mark_report_in_review":
{ Args: { "p_report_id": string }; Returns: Database["public"]['Enums']["report_status"]
                           },
"reject_program":
{ Args: { "p_program_id": string,"p_reason": string }; Returns: Database["public"]['Enums']["program_status"]
                           },
"request_changes":
{ Args: { "p_program_id": string,"p_reason": string }; Returns: Database["public"]['Enums']["program_status"]
                           },
"require_staff":
{ Args: { "roles": (Database["public"]['Enums']["app_role"])[] }; Returns: string
                           },
"resolve_report":
{ Args: { "p_action": string,"p_note": string,"p_report_id": string }; Returns: Database["public"]['Enums']["report_status"]
                           },
"reviewer_update_program":
{ Args: { "p_description": string,"p_organizer": string,"p_program_id": string,"p_requirements": string,"p_title": string }; Returns: undefined
                           },
"reviewer_set_promo_end":
{ Args: { "p_program_id": string,"p_promo_end": string | null }; Returns: undefined
                           },
"revoke_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           },
"set_user_banned":
{ Args: { "p_banned": boolean,"p_reason": string,"p_user_id": string }; Returns: boolean
                           },
"show_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"show_trgm":
{ Args: { "": string }; Returns: (string)[]
                           },
"slugify":
{ Args: { "input": string }; Returns: string
                           },
"submit_program":
{ Args: { "p_program_id": string }; Returns: Database["public"]['Enums']["program_status"]
                           },
"update_site_setting":
{ Args: { "p_key": string,"p_value": Json }; Returns: undefined
                           },
"upsert_category":
{ Args: { "p_description": string,"p_id": string,"p_is_active": boolean,"p_name": string,"p_slug": string,"p_sort_order": number }; Returns: string
                           },
"verify_program":
{ Args: { "p_program_id": string }; Returns: Database["public"]['Enums']["program_status"]
                           },
"withdraw_program":
{ Args: { "p_program_id": string }; Returns: Database["public"]['Enums']["program_status"]
                           }
          }
          Enums: {
            "access_type": "api"|"chat"|"tool"|"hosting"|"model","app_role": "member"|"reviewer"|"moderator"|"admin","program_status": "draft"|"pending"|"needs_changes"|"verified"|"rejected"|"expired"|"archived","region_scope": "nasional"|"provinsi"|"kabupaten_kota","report_reason": "tidak_akurat"|"kedaluwarsa"|"link_mati"|"duplikat"|"dugaan_penipuan"|"spam"|"kuota_berubah"|"tidak_lagi_gratis"|"harga_salah","report_status": "open"|"in_review"|"resolved"|"dismissed","source_type": "situs_resmi"|"media_massa"|"media_sosial_resmi"|"dokumen"|"lainnya","source_type_v2": "dokumentasi_resmi"|"halaman_harga"|"blog_provider"|"repo_resmi"|"media_tepercaya"|"lainnya"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "access_type": ["api", "chat", "tool", "hosting", "model"],"app_role": ["member", "reviewer", "moderator", "admin"],"program_status": ["draft", "pending", "needs_changes", "verified", "rejected", "expired", "archived"],"region_scope": ["nasional", "provinsi", "kabupaten_kota"],"report_reason": ["tidak_akurat", "kedaluwarsa", "link_mati", "duplikat", "dugaan_penipuan", "spam", "kuota_berubah", "tidak_lagi_gratis", "harga_salah"],"report_status": ["open", "in_review", "resolved", "dismissed"],"source_type": ["situs_resmi", "media_massa", "media_sosial_resmi", "dokumen", "lainnya"],"source_type_v2": ["dokumentasi_resmi", "halaman_harga", "blog_provider", "repo_resmi", "media_tepercaya", "lainnya"]
          }
        }
} as const
