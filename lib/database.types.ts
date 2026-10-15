
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "canteens": {
                  Row: {
                    "close_time": string,"created_at": string,"id": number,"name": string,"open_time": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "close_time"?: string,"created_at"?: string,"id"?: never,"name": string,"open_time"?: string,"slug": string
                  }
                  Update: {
                    "close_time"?: string,"created_at"?: string,"id"?: never,"name"?: string,"open_time"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"checkouts": {
                  Row: {
                    "canteen_id": number,"created_at": string,"created_by": string | null,"customer_name": string,"customer_phone": string | null,"dining_table_id": number | null,"expires_at": string | null,"id": number,"paid_at": string | null,"payment_method": Database["public"]['Enums']["payment_method"],"payment_status": Database["public"]['Enums']["payment_status"],"provider_ref": string | null,"public_token": string,"qr_string": string | null,"service_type": Database["public"]['Enums']["service_type"],"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "canteen_id": number,"created_at"?: string,"created_by"?: string | null,"customer_name": string,"customer_phone"?: string | null,"dining_table_id"?: number | null,"expires_at"?: string | null,"id"?: never,"paid_at"?: string | null,"payment_method": Database["public"]['Enums']["payment_method"],"payment_status"?: Database["public"]['Enums']["payment_status"],"provider_ref"?: string | null,"public_token"?: string,"qr_string"?: string | null,"service_type": Database["public"]['Enums']["service_type"],"total": number
                  }
                  Update: {
                    "canteen_id"?: number,"created_at"?: string,"created_by"?: string | null,"customer_name"?: string,"customer_phone"?: string | null,"dining_table_id"?: number | null,"expires_at"?: string | null,"id"?: never,"paid_at"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"],"payment_status"?: Database["public"]['Enums']["payment_status"],"provider_ref"?: string | null,"public_token"?: string,"qr_string"?: string | null,"service_type"?: Database["public"]['Enums']["service_type"],"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkouts_canteen_id_fkey"
      columns: ["canteen_id"]
isOneToOne: false
      referencedRelation: "canteens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkouts_dining_table_id_fkey"
      columns: ["dining_table_id"]
isOneToOne: false
      referencedRelation: "dining_tables"
      referencedColumns: ["id"]
    }
                  ]
                },"dining_tables": {
                  Row: {
                    "canteen_id": number,"id": number,"label": string,"qr_token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "canteen_id": number,"id"?: never,"label": string,"qr_token"?: string
                  }
                  Update: {
                    "canteen_id"?: number,"id"?: never,"label"?: string,"qr_token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dining_tables_canteen_id_fkey"
      columns: ["canteen_id"]
isOneToOne: false
      referencedRelation: "canteens"
      referencedColumns: ["id"]
    }
                  ]
                },"menu_categories": {
                  Row: {
                    "id": number,"name": string,"sort_order": number,"tenant_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"name": string,"sort_order"?: number,"tenant_id": number
                  }
                  Update: {
                    "id"?: never,"name"?: string,"sort_order"?: number,"tenant_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "menu_categories_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"menu_items": {
                  Row: {
                    "category_id": number | null,"created_at": string,"description": string | null,"id": number,"image_url": string | null,"is_active": boolean,"is_available": boolean,"name": string,"price": number,"sort_order": number,"tenant_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: number | null,"created_at"?: string,"description"?: string | null,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"is_available"?: boolean,"name": string,"price": number,"sort_order"?: number,"tenant_id": number
                  }
                  Update: {
                    "category_id"?: number | null,"created_at"?: string,"description"?: string | null,"id"?: never,"image_url"?: string | null,"is_active"?: boolean,"is_available"?: boolean,"name"?: string,"price"?: number,"sort_order"?: number,"tenant_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "menu_items_category_id_tenant_id_fkey"
      columns: ["category_id","tenant_id"]
isOneToOne: false
      referencedRelation: "menu_categories"
      referencedColumns: ["id","tenant_id"]
    },{
      foreignKeyName: "menu_items_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "id": number,"menu_item_id": number,"name": string,"note": string | null,"order_id": number,"quantity": number,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"menu_item_id": number,"name": string,"note"?: string | null,"order_id": number,"quantity": number,"unit_price": number
                  }
                  Update: {
                    "id"?: never,"menu_item_id"?: number,"name"?: string,"note"?: string | null,"order_id"?: number,"quantity"?: number,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_menu_item_id_fkey"
      columns: ["menu_item_id"]
isOneToOne: false
      referencedRelation: "menu_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "accepted_at": string | null,"cancel_reason": string | null,"checkout_id": number,"completed_at": string | null,"created_at": string,"id": number,"paid_at": string | null,"ready_at": string | null,"refund_status": Database["public"]['Enums']["refund_status"],"status": Database["public"]['Enums']["order_status"],"subtotal": number,"tenant_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"cancel_reason"?: string | null,"checkout_id": number,"completed_at"?: string | null,"created_at"?: string,"id"?: never,"paid_at"?: string | null,"ready_at"?: string | null,"refund_status"?: Database["public"]['Enums']["refund_status"],"status"?: Database["public"]['Enums']["order_status"],"subtotal": number,"tenant_id": number
                  }
                  Update: {
                    "accepted_at"?: string | null,"cancel_reason"?: string | null,"checkout_id"?: number,"completed_at"?: string | null,"created_at"?: string,"id"?: never,"paid_at"?: string | null,"ready_at"?: string | null,"refund_status"?: Database["public"]['Enums']["refund_status"],"status"?: Database["public"]['Enums']["order_status"],"subtotal"?: number,"tenant_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_checkout_id_fkey"
      columns: ["checkout_id"]
isOneToOne: false
      referencedRelation: "checkouts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "canteen_id": number,"full_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"tenant_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "canteen_id": number,"full_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"tenant_id"?: number | null
                  }
                  Update: {
                    "canteen_id"?: number,"full_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"tenant_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_canteen_id_fkey"
      columns: ["canteen_id"]
isOneToOne: false
      referencedRelation: "canteens"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "canteen_id": number,"code": string,"created_at": string,"id": number,"is_active": boolean,"is_open": boolean,"name": string,"revenue_share_percent": number
                  }
                  ComputedFields: never
                  Insert: {
                    "canteen_id": number,"code": string,"created_at"?: string,"id"?: never,"is_active"?: boolean,"is_open"?: boolean,"name": string,"revenue_share_percent"?: number
                  }
                  Update: {
                    "canteen_id"?: number,"code"?: string,"created_at"?: string,"id"?: never,"is_active"?: boolean,"is_open"?: boolean,"name"?: string,"revenue_share_percent"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenants_canteen_id_fkey"
      columns: ["canteen_id"]
isOneToOne: false
      referencedRelation: "canteens"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "tenant_daily_revenue": {
                  Row: {
                    "canteen_share": number | null,"day": string | null,"gross": number | null,"order_count": number | null,"tenant_id": number | null,"tenant_share": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "orders_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "create_checkout":
{ Args: { "p_canteen_id": number,"p_created_by"?: string,"p_customer_name": string,"p_customer_phone": string,"p_items": Json,"p_payment_method": Database["public"]['Enums']["payment_method"],"p_service_type": Database["public"]['Enums']["service_type"],"p_table_token": string }; Returns: {
              "canteen_id": number,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string | null,
"dining_table_id": number | null,
"expires_at": string | null,
"id": number,
"paid_at": string | null,
"payment_method": Database["public"]['Enums']["payment_method"],
"payment_status": Database["public"]['Enums']["payment_status"],
"provider_ref": string | null,
"public_token": string,
"qr_string": string | null,
"service_type": Database["public"]['Enums']["service_type"],
"total": number
            }
                          SetofOptions: {
        from: "*"
        to: "checkouts"
        isOneToOne: true
        isSetofReturn: false
      } },
"expire_checkouts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"mark_checkout_paid":
{ Args: { "p_amount": number,"p_checkout_id": number }; Returns: {
              "canteen_id": number,
"created_at": string,
"created_by": string | null,
"customer_name": string,
"customer_phone": string | null,
"dining_table_id": number | null,
"expires_at": string | null,
"id": number,
"paid_at": string | null,
"payment_method": Database["public"]['Enums']["payment_method"],
"payment_status": Database["public"]['Enums']["payment_status"],
"provider_ref": string | null,
"public_token": string,
"qr_string": string | null,
"service_type": Database["public"]['Enums']["service_type"],
"total": number
            }
                          SetofOptions: {
        from: "*"
        to: "checkouts"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_order_status":
{ Args: { "p_order_id": number,"p_reason"?: string,"p_status": Database["public"]['Enums']["order_status"] }; Returns: {
              "accepted_at": string | null,
"cancel_reason": string | null,
"checkout_id": number,
"completed_at": string | null,
"created_at": string,
"id": number,
"paid_at": string | null,
"ready_at": string | null,
"refund_status": Database["public"]['Enums']["refund_status"],
"status": Database["public"]['Enums']["order_status"],
"subtotal": number,
"tenant_id": number
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "order_status": "pending_payment"|"paid"|"accepted"|"ready"|"completed"|"cancelled"|"expired","payment_method": "qris"|"cash","payment_status": "pending"|"paid"|"expired"|"failed","refund_status": "none"|"needed"|"done","service_type": "dine_in"|"takeaway","user_role": "admin"|"cashier"|"tenant"
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
  "public": {
          Enums: {
            "order_status": ["pending_payment", "paid", "accepted", "ready", "completed", "cancelled", "expired"],"payment_method": ["qris", "cash"],"payment_status": ["pending", "paid", "expired", "failed"],"refund_status": ["none", "needed", "done"],"service_type": ["dine_in", "takeaway"],"user_role": ["admin", "cashier", "tenant"]
          }
        }
} as const
