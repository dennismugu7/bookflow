
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
            "booking_events": {
                  Row: {
                    "actor_id": string | null,"booking_id": string,"created_at": string,"data": NonNullable<Json>,"id": string,"type": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"booking_id": string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"booking_id"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_events_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_services": {
                  Row: {
                    "booking_id": string,"created_at": string,"duration_min": number,"id": string,"name": string,"position": number,"price_kes": number,"service_id": string
                  }
                  Insert: {
                    "booking_id": string,"created_at"?: string,"duration_min": number,"id"?: string,"name": string,"position"?: number,"price_kes": number,"service_id": string
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"duration_min"?: number,"id"?: string,"name"?: string,"position"?: number,"price_kes"?: number,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_services_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_services_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "cancel_reason": string | null,"client_id": string | null,"created_at": string,"hold_expires_at": string | null,"hold_token_hash": string | null,"id": string,"period": unknown,"salon_id": string,"source": string,"staff_id": string,"status": Database["public"]['Enums']["booking_status"],"total_kes": number,"updated_at": string
                  }
                  Insert: {
                    "cancel_reason"?: string | null,"client_id"?: string | null,"created_at"?: string,"hold_expires_at"?: string | null,"hold_token_hash"?: string | null,"id"?: string,"period": unknown,"salon_id": string,"source"?: string,"staff_id": string,"status": Database["public"]['Enums']["booking_status"],"total_kes"?: number,"updated_at"?: string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"client_id"?: string | null,"created_at"?: string,"hold_expires_at"?: string | null,"hold_token_hash"?: string | null,"id"?: string,"period"?: unknown,"salon_id"?: string,"source"?: string,"staff_id"?: string,"status"?: Database["public"]['Enums']["booking_status"],"total_kes"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_salon_id_client_id_fkey"
      columns: ["salon_id","client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["salon_id","id"]
    },{
      foreignKeyName: "bookings_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_salon_id_staff_id_fkey"
      columns: ["salon_id","staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["salon_id","id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string,"id": string,"notes": string | null,"phone": string,"phone_verified": boolean,"salon_id": string,"updated_at": string,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name": string,"id"?: string,"notes"?: string | null,"phone": string,"phone_verified"?: boolean,"salon_id": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"notes"?: string | null,"phone"?: string,"phone_verified"?: boolean,"salon_id"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"opening_hours": {
                  Row: {
                    "closes": string,"created_at": string,"id": string,"opens": string,"salon_id": string,"updated_at": string,"weekday": number
                  }
                  Insert: {
                    "closes": string,"created_at"?: string,"id"?: string,"opens": string,"salon_id": string,"updated_at"?: string,"weekday": number
                  }
                  Update: {
                    "closes"?: string,"created_at"?: string,"id"?: string,"opens"?: string,"salon_id"?: string,"updated_at"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "opening_hours_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"salon_members": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["member_role"],"salon_id": string,"staff_id": string | null,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"role": Database["public"]['Enums']["member_role"],"salon_id": string,"staff_id"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"salon_id"?: string,"staff_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "salon_members_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "salon_members_salon_id_staff_id_fkey"
      columns: ["salon_id","staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["salon_id","id"]
    }
                  ]
                },"salons": {
                  Row: {
                    "about": string | null,"address": string | null,"banner_path": string | null,"created_at": string,"id": string,"is_published": boolean,"latitude": number | null,"logo_path": string | null,"longitude": number | null,"maps_url": string | null,"name": string,"phone": string | null,"slug": string,"tagline": string | null,"timezone": string,"updated_at": string
                  }
                  Insert: {
                    "about"?: string | null,"address"?: string | null,"banner_path"?: string | null,"created_at"?: string,"id"?: string,"is_published"?: boolean,"latitude"?: number | null,"logo_path"?: string | null,"longitude"?: number | null,"maps_url"?: string | null,"name": string,"phone"?: string | null,"slug": string,"tagline"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "about"?: string | null,"address"?: string | null,"banner_path"?: string | null,"created_at"?: string,"id"?: string,"is_published"?: boolean,"latitude"?: number | null,"logo_path"?: string | null,"longitude"?: number | null,"maps_url"?: string | null,"name"?: string,"phone"?: string | null,"slug"?: string,"tagline"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"services": {
                  Row: {
                    "created_at": string,"duration_min": number,"id": string,"is_bookable": boolean,"name": string,"price_kes": number,"salon_id": string,"sort_order": number | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"duration_min": number,"id"?: string,"is_bookable"?: boolean,"name": string,"price_kes": number,"salon_id": string,"sort_order"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"duration_min"?: number,"id"?: string,"is_bookable"?: boolean,"name"?: string,"price_kes"?: number,"salon_id"?: string,"sort_order"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "services_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"staff": {
                  Row: {
                    "bio": string | null,"created_at": string,"display_name": string,"id": string,"is_active": boolean,"photo_path": string | null,"salon_id": string,"sort_order": number,"title": string | null,"updated_at": string
                  }
                  Insert: {
                    "bio"?: string | null,"created_at"?: string,"display_name": string,"id"?: string,"is_active"?: boolean,"photo_path"?: string | null,"salon_id": string,"sort_order"?: number,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bio"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"is_active"?: boolean,"photo_path"?: string | null,"salon_id"?: string,"sort_order"?: number,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_hours": {
                  Row: {
                    "created_at": string,"ends": string,"id": string,"salon_id": string,"staff_id": string,"starts": string,"updated_at": string,"weekday": number
                  }
                  Insert: {
                    "created_at"?: string,"ends": string,"id"?: string,"salon_id": string,"staff_id": string,"starts": string,"updated_at"?: string,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"ends"?: string,"id"?: string,"salon_id"?: string,"staff_id"?: string,"starts"?: string,"updated_at"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_hours_salon_id_staff_id_fkey"
      columns: ["salon_id","staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["salon_id","id"]
    }
                  ]
                },"staff_services": {
                  Row: {
                    "created_at": string,"salon_id": string,"service_id": string,"staff_id": string
                  }
                  Insert: {
                    "created_at"?: string,"salon_id": string,"service_id": string,"staff_id": string
                  }
                  Update: {
                    "created_at"?: string,"salon_id"?: string,"service_id"?: string,"staff_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_services_salon_id_service_id_fkey"
      columns: ["salon_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["salon_id","id"]
    },{
      foreignKeyName: "staff_services_salon_id_staff_id_fkey"
      columns: ["salon_id","staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["salon_id","id"]
    }
                  ]
                },"time_off": {
                  Row: {
                    "created_at": string,"id": string,"period": unknown,"reason": string | null,"salon_id": string,"staff_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"period": unknown,"reason"?: string | null,"salon_id": string,"staff_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"period"?: unknown,"reason"?: string | null,"salon_id"?: string,"staff_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_off_salon_id_staff_id_fkey"
      columns: ["salon_id","staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["salon_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cancel_my_booking":
{ Args: { "p_booking_id": string,"p_reason"?: string }; Returns: undefined
                           },
"confirm_booking":
{ Args: { "p_full_name": string,"p_hold_token": string }; Returns: string
                           },
"confirm_booking_contact":
{ Args: { "p_full_name": string,"p_hold_token": string,"p_phone": string }; Returns: string
                           },
"create_hold":
{ Args: { "p_client_ip": string,"p_hold_token": string,"p_salon_slug": string,"p_service_ids": (string)[],"p_staff_id": string,"p_starts_at": string }; Returns: {
              "expires_at": string,"hold_id": string,"staff_id": string
            }[]
                           },
"create_salon":
{ Args: { "p_name": string,"p_slug": string }; Returns: string
                           },
"get_availability":
{ Args: { "p_date": string,"p_salon_slug": string,"p_service_ids": (string)[],"p_staff_id"?: string }; Returns: {
              "ends_at": string,"staff_id": string,"starts_at": string
            }[]
                           },
"get_my_booking":
{ Args: { "p_booking_id": string }; Returns: Json
                           },
"get_my_bookings":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_my_client_profile":
{ Args: { "p_salon_slug": string }; Returns: Json
                           },
"release_hold":
{ Args: { "p_hold_token": string }; Returns: undefined
                           },
"salon_setup_status":
{ Args: { "p_salon_id": string }; Returns: Json
                           },
"set_opening_hours":
{ Args: { "p_hours": Json,"p_salon_id": string }; Returns: undefined
                           },
"set_salon_published":
{ Args: { "p_published": boolean,"p_salon_id": string }; Returns: undefined
                           },
"update_booking_status":
{ Args: { "p_booking_id": string,"p_reason"?: string,"p_status": Database["public"]['Enums']["booking_status"] }; Returns: undefined
                           }
          }
          Enums: {
            "booking_status": "held"|"confirmed"|"completed"|"cancelled"|"no_show"|"expired","member_role": "owner"|"staff"
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
            "booking_status": ["held", "confirmed", "completed", "cancelled", "no_show", "expired"],"member_role": ["owner", "staff"]
          }
        }
} as const
