
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "acquisition_pathways": {
                  Row: {
                    "code": string,"description_ar": string,"description_fr": string,"disabled_message_ar": string | null,"disabled_message_fr": string | null,"is_enabled": boolean,"last_reviewed_at": string | null,"legal_reference": string | null,"name_ar": string,"name_fr": string,"position": number,"requires_legal_review": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"description_ar"?: string,"description_fr"?: string,"disabled_message_ar"?: string | null,"disabled_message_fr"?: string | null,"is_enabled"?: boolean,"last_reviewed_at"?: string | null,"legal_reference"?: string | null,"name_ar": string,"name_fr": string,"position"?: number,"requires_legal_review"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "code"?: string,"description_ar"?: string,"description_fr"?: string,"disabled_message_ar"?: string | null,"disabled_message_fr"?: string | null,"is_enabled"?: boolean,"last_reviewed_at"?: string | null,"legal_reference"?: string | null,"name_ar"?: string,"name_fr"?: string,"position"?: number,"requires_legal_review"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "acquisition_pathways_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"admin_notes": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"entity_id": string,"entity_type": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"entity_id": string,"entity_type": string,"id"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity_id": string | null,"entity_type": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type": string,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type"?: string,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string,"handled_by": string | null,"id": string,"locale": Database["public"]['Enums']["locale_code"],"message": string,"name": string,"phone": string | null,"status": string,"subject": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"handled_by"?: string | null,"id"?: string,"locale"?: Database["public"]['Enums']["locale_code"],"message": string,"name": string,"phone"?: string | null,"status"?: string,"subject": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"handled_by"?: string | null,"id"?: string,"locale"?: Database["public"]['Enums']["locale_code"],"message"?: string,"name"?: string,"phone"?: string | null,"status"?: string,"subject"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_messages_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cost_estimate_rules": {
                  Row: {
                    "amount": number | null,"code": string,"currency": string | null,"id": string,"is_verified": boolean,"kind": Database["public"]['Enums']["fee_kind"],"label_ar": string,"label_fr": string,"method": string,"notes_ar": string | null,"notes_fr": string | null,"pathway_code": string | null,"percent": number | null,"position": number,"rule_set_id": string,"source": string,"source_date": string | null,"source_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"code": string,"currency"?: string | null,"id"?: string,"is_verified"?: boolean,"kind": Database["public"]['Enums']["fee_kind"],"label_ar": string,"label_fr": string,"method": string,"notes_ar"?: string | null,"notes_fr"?: string | null,"pathway_code"?: string | null,"percent"?: number | null,"position"?: number,"rule_set_id": string,"source": string,"source_date"?: string | null,"source_url"?: string | null
                  }
                  Update: {
                    "amount"?: number | null,"code"?: string,"currency"?: string | null,"id"?: string,"is_verified"?: boolean,"kind"?: Database["public"]['Enums']["fee_kind"],"label_ar"?: string,"label_fr"?: string,"method"?: string,"notes_ar"?: string | null,"notes_fr"?: string | null,"pathway_code"?: string | null,"percent"?: number | null,"position"?: number,"rule_set_id"?: string,"source"?: string,"source_date"?: string | null,"source_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cost_estimate_rules_currency_fkey"
      columns: ["currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "cost_estimate_rules_pathway_code_fkey"
      columns: ["pathway_code"]
isOneToOne: false
      referencedRelation: "acquisition_pathways"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "cost_estimate_rules_rule_set_id_fkey"
      columns: ["rule_set_id"]
isOneToOne: false
      referencedRelation: "cost_rule_sets"
      referencedColumns: ["id"]
    }
                  ]
                },"cost_estimates": {
                  Row: {
                    "completeness": number,"created_at": string,"id": string,"inputs": NonNullable<Json>,"result": NonNullable<Json>,"rule_set_id": string | null,"total_amount": number,"total_currency": string,"user_id": string,"vehicle_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "completeness": number,"created_at"?: string,"id"?: string,"inputs": NonNullable<Json>,"result": NonNullable<Json>,"rule_set_id"?: string | null,"total_amount": number,"total_currency": string,"user_id"?: string,"vehicle_id"?: string | null
                  }
                  Update: {
                    "completeness"?: number,"created_at"?: string,"id"?: string,"inputs"?: NonNullable<Json>,"result"?: NonNullable<Json>,"rule_set_id"?: string | null,"total_amount"?: number,"total_currency"?: string,"user_id"?: string,"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cost_estimates_rule_set_id_fkey"
      columns: ["rule_set_id"]
isOneToOne: false
      referencedRelation: "cost_rule_sets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cost_estimates_total_currency_fkey"
      columns: ["total_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "cost_estimates_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cost_estimates_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "marketplace_vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cost_estimates_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"cost_rule_sets": {
                  Row: {
                    "activated_at": string | null,"activated_by": string | null,"created_at": string,"created_by": string | null,"id": string,"is_demo": boolean,"notes": string | null,"status": string,"title": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"activated_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_demo"?: boolean,"notes"?: string | null,"status"?: string,"title": string,"version": number
                  }
                  Update: {
                    "activated_at"?: string | null,"activated_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_demo"?: boolean,"notes"?: string | null,"status"?: string,"title"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "cost_rule_sets_activated_by_fkey"
      columns: ["activated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cost_rule_sets_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"currencies": {
                  Row: {
                    "code": string,"is_active": boolean,"minor_units": number,"name_ar": string,"name_fr": string,"symbol": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"is_active"?: boolean,"minor_units"?: number,"name_ar": string,"name_fr": string,"symbol": string
                  }
                  Update: {
                    "code"?: string,"is_active"?: boolean,"minor_units"?: number,"name_ar"?: string,"name_fr"?: string,"symbol"?: string
                  }
                  Relationships: [
                    
                  ]
                },"data_requests": {
                  Row: {
                    "created_at": string,"details": string | null,"handled_at": string | null,"handled_by": string | null,"id": string,"kind": string,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"kind": string,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"kind"?: string,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "data_requests_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "data_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exchange_rates": {
                  Row: {
                    "base_currency": string,"created_at": string,"effective_date": string,"id": string,"is_demo": boolean,"notes": string | null,"quote_currency": string,"rate": number,"recorded_by": string | null,"source": string,"source_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "base_currency": string,"created_at"?: string,"effective_date": string,"id"?: string,"is_demo"?: boolean,"notes"?: string | null,"quote_currency": string,"rate": number,"recorded_by"?: string | null,"source": string,"source_url"?: string | null
                  }
                  Update: {
                    "base_currency"?: string,"created_at"?: string,"effective_date"?: string,"id"?: string,"is_demo"?: boolean,"notes"?: string | null,"quote_currency"?: string,"rate"?: number,"recorded_by"?: string | null,"source"?: string,"source_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exchange_rates_base_currency_fkey"
      columns: ["base_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "exchange_rates_quote_currency_fkey"
      columns: ["quote_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "exchange_rates_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"faqs": {
                  Row: {
                    "answer_ar": string,"answer_fr": string,"id": string,"is_published": boolean,"position": number,"question_ar": string,"question_fr": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer_ar": string,"answer_fr": string,"id"?: string,"is_published"?: boolean,"position"?: number,"question_ar": string,"question_fr": string,"updated_at"?: string
                  }
                  Update: {
                    "answer_ar"?: string,"answer_fr"?: string,"id"?: string,"is_published"?: boolean,"position"?: number,"question_ar"?: string,"question_fr"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"favorites": {
                  Row: {
                    "created_at": string,"user_id": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id"?: string,"vehicle_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "marketplace_vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"legal_documents": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"is_published": boolean,"locale": Database["public"]['Enums']["locale_code"],"published_at": string | null,"slug": string,"title": string,"updated_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"locale": Database["public"]['Enums']["locale_code"],"published_at"?: string | null,"slug": string,"title": string,"updated_by"?: string | null,"version": number
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"locale"?: Database["public"]['Enums']["locale_code"],"published_at"?: string | null,"slug"?: string,"title"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "legal_documents_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"reason": string,"reporter_id": string | null,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason": string,"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"vehicle_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: string,"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_reports_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "marketplace_vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_reports_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"emailed_at": string | null,"id": string,"link": string | null,"params": NonNullable<Json>,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"emailed_at"?: string | null,"id"?: string,"link"?: string | null,"params"?: NonNullable<Json>,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"emailed_at"?: string | null,"id"?: string,"link"?: string | null,"params"?: NonNullable<Json>,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"partner_profiles": {
                  Row: {
                    "business_name": string,"city": string,"contact_email": string,"contact_name": string,"contact_phone": string,"country_code": string,"created_at": string,"description": string | null,"id": string,"is_demo": boolean,"legal_form": string | null,"operating_countries": (string)[],"owner_id": string,"registration_number": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["business_status"],"status_reason": string | null,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_name": string,"city": string,"contact_email": string,"contact_name": string,"contact_phone": string,"country_code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_demo"?: boolean,"legal_form"?: string | null,"operating_countries"?: (string)[],"owner_id"?: string,"registration_number"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["business_status"],"status_reason"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "business_name"?: string,"city"?: string,"contact_email"?: string,"contact_name"?: string,"contact_phone"?: string,"country_code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_demo"?: boolean,"legal_form"?: string | null,"operating_countries"?: (string)[],"owner_id"?: string,"registration_number"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["business_status"],"status_reason"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "partner_profiles_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "partner_profiles_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"partner_service_categories": {
                  Row: {
                    "category_code": string,"partner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_code": string,"partner_id": string
                  }
                  Update: {
                    "category_code"?: string,"partner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "partner_service_categories_category_code_fkey"
      columns: ["category_code"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "partner_service_categories_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partner_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "partner_service_categories_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "public_partners"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"notify_email": boolean,"phone": string | null,"preferred_locale": Database["public"]['Enums']["locale_code"],"updated_at": string,"wilaya": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"notify_email"?: boolean,"phone"?: string | null,"preferred_locale"?: Database["public"]['Enums']["locale_code"],"updated_at"?: string,"wilaya"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"notify_email"?: boolean,"phone"?: string | null,"preferred_locale"?: Database["public"]['Enums']["locale_code"],"updated_at"?: string,"wilaya"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"purchase_requests": {
                  Row: {
                    "assigned_to": string | null,"budget_amount": number | null,"budget_currency": string,"closed_at": string | null,"contact_email": string | null,"contact_name": string,"contact_phone": string,"cost_estimate_id": string | null,"created_at": string,"customer_id": string | null,"desired_fuel": Database["public"]['Enums']["fuel_type"] | null,"desired_make_id": number | null,"desired_model": string | null,"desired_transmission": Database["public"]['Enums']["transmission_type"] | null,"id": string,"legal_review_status": Database["public"]['Enums']["legal_review_status"],"legal_reviewed_at": string | null,"legal_reviewed_by": string | null,"max_mileage_km": number | null,"message": string | null,"pathway_code": string,"preferences": string | null,"preferred_contact": Database["public"]['Enums']["contact_method"],"reference": string,"request_type": string,"status": Database["public"]['Enums']["request_status"],"submitted_at": string | null,"supplier_id": string | null,"updated_at": string,"vehicle_id": string | null,"vehicle_snapshot": Json | null,"wilaya": string,"year_max": number | null,"year_min": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"budget_amount"?: number | null,"budget_currency"?: string,"closed_at"?: string | null,"contact_email"?: string | null,"contact_name": string,"contact_phone": string,"cost_estimate_id"?: string | null,"created_at"?: string,"customer_id"?: string | null,"desired_fuel"?: Database["public"]['Enums']["fuel_type"] | null,"desired_make_id"?: number | null,"desired_model"?: string | null,"desired_transmission"?: Database["public"]['Enums']["transmission_type"] | null,"id"?: string,"legal_review_status"?: Database["public"]['Enums']["legal_review_status"],"legal_reviewed_at"?: string | null,"legal_reviewed_by"?: string | null,"max_mileage_km"?: number | null,"message"?: string | null,"pathway_code": string,"preferences"?: string | null,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"reference"?: string,"request_type": string,"status"?: Database["public"]['Enums']["request_status"],"submitted_at"?: string | null,"supplier_id"?: string | null,"updated_at"?: string,"vehicle_id"?: string | null,"vehicle_snapshot"?: Json | null,"wilaya": string,"year_max"?: number | null,"year_min"?: number | null
                  }
                  Update: {
                    "assigned_to"?: string | null,"budget_amount"?: number | null,"budget_currency"?: string,"closed_at"?: string | null,"contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string,"cost_estimate_id"?: string | null,"created_at"?: string,"customer_id"?: string | null,"desired_fuel"?: Database["public"]['Enums']["fuel_type"] | null,"desired_make_id"?: number | null,"desired_model"?: string | null,"desired_transmission"?: Database["public"]['Enums']["transmission_type"] | null,"id"?: string,"legal_review_status"?: Database["public"]['Enums']["legal_review_status"],"legal_reviewed_at"?: string | null,"legal_reviewed_by"?: string | null,"max_mileage_km"?: number | null,"message"?: string | null,"pathway_code"?: string,"preferences"?: string | null,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"reference"?: string,"request_type"?: string,"status"?: Database["public"]['Enums']["request_status"],"submitted_at"?: string | null,"supplier_id"?: string | null,"updated_at"?: string,"vehicle_id"?: string | null,"vehicle_snapshot"?: Json | null,"wilaya"?: string,"year_max"?: number | null,"year_min"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "purchase_requests_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_budget_currency_fkey"
      columns: ["budget_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "purchase_requests_cost_estimate_id_fkey"
      columns: ["cost_estimate_id"]
isOneToOne: false
      referencedRelation: "cost_estimates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_desired_make_id_fkey"
      columns: ["desired_make_id"]
isOneToOne: false
      referencedRelation: "vehicle_makes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_legal_reviewed_by_fkey"
      columns: ["legal_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_pathway_code_fkey"
      columns: ["pathway_code"]
isOneToOne: false
      referencedRelation: "acquisition_pathways"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "purchase_requests_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "public_suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "supplier_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "marketplace_vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"quotation_items": {
                  Row: {
                    "amount": number,"description": string,"id": string,"is_estimate": boolean,"kind": Database["public"]['Enums']["fee_kind"],"payee": Database["public"]['Enums']["fee_party"],"position": number,"quotation_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"description": string,"id"?: string,"is_estimate"?: boolean,"kind": Database["public"]['Enums']["fee_kind"],"payee": Database["public"]['Enums']["fee_party"],"position"?: number,"quotation_id": string
                  }
                  Update: {
                    "amount"?: number,"description"?: string,"id"?: string,"is_estimate"?: boolean,"kind"?: Database["public"]['Enums']["fee_kind"],"payee"?: Database["public"]['Enums']["fee_party"],"position"?: number,"quotation_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_items_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id"]
    }
                  ]
                },"quotations": {
                  Row: {
                    "created_at": string,"created_by": string | null,"currency": string,"decided_at": string | null,"decline_reason": string | null,"id": string,"message_to_customer": string | null,"reference": string,"rejection_reason": string | null,"request_id": string,"sent_at": string | null,"sent_by": string | null,"status": Database["public"]['Enums']["quotation_status"],"submitted_at": string,"supplier_id": string | null,"terms": string | null,"total_amount": number,"updated_at": string,"valid_until": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"currency": string,"decided_at"?: string | null,"decline_reason"?: string | null,"id"?: string,"message_to_customer"?: string | null,"reference"?: string,"rejection_reason"?: string | null,"request_id": string,"sent_at"?: string | null,"sent_by"?: string | null,"status"?: Database["public"]['Enums']["quotation_status"],"submitted_at"?: string,"supplier_id"?: string | null,"terms"?: string | null,"total_amount"?: number,"updated_at"?: string,"valid_until": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"currency"?: string,"decided_at"?: string | null,"decline_reason"?: string | null,"id"?: string,"message_to_customer"?: string | null,"reference"?: string,"rejection_reason"?: string | null,"request_id"?: string,"sent_at"?: string | null,"sent_by"?: string | null,"status"?: Database["public"]['Enums']["quotation_status"],"submitted_at"?: string,"supplier_id"?: string | null,"terms"?: string | null,"total_amount"?: number,"updated_at"?: string,"valid_until"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_currency_fkey"
      columns: ["currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "quotations_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "purchase_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "supplier_purchase_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "public_suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "supplier_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"request_milestones": {
                  Row: {
                    "created_at": string,"evidence_reference": string | null,"id": string,"kind": Database["public"]['Enums']["milestone_kind"],"note": string | null,"occurred_on": string,"recorded_by": string | null,"request_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evidence_reference"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["milestone_kind"],"note"?: string | null,"occurred_on": string,"recorded_by"?: string | null,"request_id": string
                  }
                  Update: {
                    "created_at"?: string,"evidence_reference"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["milestone_kind"],"note"?: string | null,"occurred_on"?: string,"recorded_by"?: string | null,"request_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_milestones_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_milestones_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "purchase_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_milestones_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "supplier_purchase_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"request_status_history": {
                  Row: {
                    "actor_id": string | null,"actor_role": string,"created_at": string,"from_status": Database["public"]['Enums']["request_status"] | null,"id": number,"note": string | null,"request_id": string,"to_status": Database["public"]['Enums']["request_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_role": string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["request_status"] | null,"id"?: never,"note"?: string | null,"request_id": string,"to_status": Database["public"]['Enums']["request_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_role"?: string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["request_status"] | null,"id"?: never,"note"?: string | null,"request_id"?: string,"to_status"?: Database["public"]['Enums']["request_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_status_history_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_status_history_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "purchase_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_status_history_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "supplier_purchase_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"service_categories": {
                  Row: {
                    "code": string,"is_active": boolean,"name_ar": string,"name_fr": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"is_active"?: boolean,"name_ar": string,"name_fr": string,"position"?: number
                  }
                  Update: {
                    "code"?: string,"is_active"?: boolean,"name_ar"?: string,"name_fr"?: string,"position"?: number
                  }
                  Relationships: [
                    
                  ]
                },"service_quotes": {
                  Row: {
                    "amount": number,"created_at": string,"currency": string,"decided_at": string | null,"decided_by": string | null,"id": string,"notes": string | null,"partner_id": string,"service_request_id": string,"status": string,"valid_until": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"currency": string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"notes"?: string | null,"partner_id": string,"service_request_id": string,"status"?: string,"valid_until": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"currency"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"id"?: string,"notes"?: string | null,"partner_id"?: string,"service_request_id"?: string,"status"?: string,"valid_until"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_quotes_currency_fkey"
      columns: ["currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "service_quotes_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_quotes_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partner_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_quotes_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "public_partners"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_quotes_service_request_id_fkey"
      columns: ["service_request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"service_requests": {
                  Row: {
                    "category_code": string,"created_at": string,"created_by": string | null,"description": string,"id": string,"partner_id": string,"purchase_request_id": string | null,"reference": string,"status": Database["public"]['Enums']["service_request_status"],"status_note": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_code": string,"created_at"?: string,"created_by"?: string | null,"description": string,"id"?: string,"partner_id": string,"purchase_request_id"?: string | null,"reference"?: string,"status"?: Database["public"]['Enums']["service_request_status"],"status_note"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "category_code"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"partner_id"?: string,"purchase_request_id"?: string | null,"reference"?: string,"status"?: Database["public"]['Enums']["service_request_status"],"status_note"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_requests_category_code_fkey"
      columns: ["category_code"]
isOneToOne: false
      referencedRelation: "service_categories"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "service_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partner_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "public_partners"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_purchase_request_id_fkey"
      columns: ["purchase_request_id"]
isOneToOne: false
      referencedRelation: "purchase_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_purchase_request_id_fkey"
      columns: ["purchase_request_id"]
isOneToOne: false
      referencedRelation: "supplier_purchase_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
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
                },"supplier_profiles": {
                  Row: {
                    "address": string | null,"business_name": string,"city": string,"contact_email": string,"contact_name": string,"contact_phone": string,"country_code": string,"created_at": string,"description": string | null,"id": string,"is_demo": boolean,"legal_form": string | null,"owner_id": string,"registration_number": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"services_offered": string | null,"status": Database["public"]['Enums']["business_status"],"status_reason": string | null,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"business_name": string,"city": string,"contact_email": string,"contact_name": string,"contact_phone": string,"country_code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_demo"?: boolean,"legal_form"?: string | null,"owner_id"?: string,"registration_number"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"services_offered"?: string | null,"status"?: Database["public"]['Enums']["business_status"],"status_reason"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"business_name"?: string,"city"?: string,"contact_email"?: string,"contact_name"?: string,"contact_phone"?: string,"country_code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_demo"?: boolean,"legal_form"?: string | null,"owner_id"?: string,"registration_number"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"services_offered"?: string | null,"status"?: Database["public"]['Enums']["business_status"],"status_reason"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "supplier_profiles_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_profiles_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"supplier_verification_records": {
                  Row: {
                    "check_type": Database["public"]['Enums']["verification_check"],"created_at": string,"evidence_document_id": string | null,"expires_at": string | null,"id": string,"method": string,"notes": string | null,"partner_id": string | null,"result": Database["public"]['Enums']["verification_result"],"supplier_id": string | null,"verified_at": string,"verified_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "check_type": Database["public"]['Enums']["verification_check"],"created_at"?: string,"evidence_document_id"?: string | null,"expires_at"?: string | null,"id"?: string,"method": string,"notes"?: string | null,"partner_id"?: string | null,"result": Database["public"]['Enums']["verification_result"],"supplier_id"?: string | null,"verified_at"?: string,"verified_by"?: string
                  }
                  Update: {
                    "check_type"?: Database["public"]['Enums']["verification_check"],"created_at"?: string,"evidence_document_id"?: string | null,"expires_at"?: string | null,"id"?: string,"method"?: string,"notes"?: string | null,"partner_id"?: string | null,"result"?: Database["public"]['Enums']["verification_result"],"supplier_id"?: string | null,"verified_at"?: string,"verified_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "supplier_verification_records_evidence_document_id_fkey"
      columns: ["evidence_document_id"]
isOneToOne: false
      referencedRelation: "verification_documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_verification_records_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partner_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_verification_records_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "public_partners"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_verification_records_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "public_suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_verification_records_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "supplier_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_verification_records_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted_by"?: string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_granted_by_fkey"
      columns: ["granted_by"]
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
                },"vehicle_images": {
                  Row: {
                    "alt_text": string | null,"created_at": string,"credit": string | null,"external_url": string | null,"id": string,"position": number,"storage_path": string | null,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string | null,"created_at"?: string,"credit"?: string | null,"external_url"?: string | null,"id"?: string,"position"?: number,"storage_path"?: string | null,"vehicle_id": string
                  }
                  Update: {
                    "alt_text"?: string | null,"created_at"?: string,"credit"?: string | null,"external_url"?: string | null,"id"?: string,"position"?: number,"storage_path"?: string | null,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicle_images_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "marketplace_vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_images_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicle_makes": {
                  Row: {
                    "id": number,"is_active": boolean,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"is_active"?: boolean,"name": string,"slug": string
                  }
                  Update: {
                    "id"?: never,"is_active"?: boolean,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"vehicles": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability_status"],"body_type": Database["public"]['Enums']["body_type"],"city": string,"condition": Database["public"]['Enums']["vehicle_condition"],"country_code": string,"created_at": string,"description": string | null,"doors": number | null,"engine_cc": number | null,"expires_at": string | null,"exterior_color": string | null,"first_registration_date": string | null,"fuel_type": Database["public"]['Enums']["fuel_type"],"id": string,"is_demo": boolean,"last_confirmed_at": string,"make_id": number,"manufacture_year": number,"mileage_km": number,"model": string,"power_kw": number | null,"price_amount": number,"price_currency": string,"promoted_until": string | null,"published_at": string | null,"review_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"search_text": string,"seats": number | null,"slug": string,"status": Database["public"]['Enums']["listing_status"],"supplier_id": string,"transmission": Database["public"]['Enums']["transmission_type"],"trim_level": string | null,"updated_at": string,"vin": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability_status"],"body_type"?: Database["public"]['Enums']["body_type"],"city": string,"condition": Database["public"]['Enums']["vehicle_condition"],"country_code": string,"created_at"?: string,"description"?: string | null,"doors"?: number | null,"engine_cc"?: number | null,"expires_at"?: string | null,"exterior_color"?: string | null,"first_registration_date"?: string | null,"fuel_type": Database["public"]['Enums']["fuel_type"],"id"?: string,"is_demo"?: boolean,"last_confirmed_at"?: string,"make_id": number,"manufacture_year": number,"mileage_km": number,"model": string,"power_kw"?: number | null,"price_amount": number,"price_currency": string,"promoted_until"?: string | null,"published_at"?: string | null,"review_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"search_text"?: string,"seats"?: number | null,"slug"?: string,"status"?: Database["public"]['Enums']["listing_status"],"supplier_id": string,"transmission": Database["public"]['Enums']["transmission_type"],"trim_level"?: string | null,"updated_at"?: string,"vin"?: string | null
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability_status"],"body_type"?: Database["public"]['Enums']["body_type"],"city"?: string,"condition"?: Database["public"]['Enums']["vehicle_condition"],"country_code"?: string,"created_at"?: string,"description"?: string | null,"doors"?: number | null,"engine_cc"?: number | null,"expires_at"?: string | null,"exterior_color"?: string | null,"first_registration_date"?: string | null,"fuel_type"?: Database["public"]['Enums']["fuel_type"],"id"?: string,"is_demo"?: boolean,"last_confirmed_at"?: string,"make_id"?: number,"manufacture_year"?: number,"mileage_km"?: number,"model"?: string,"power_kw"?: number | null,"price_amount"?: number,"price_currency"?: string,"promoted_until"?: string | null,"published_at"?: string | null,"review_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"search_text"?: string,"seats"?: number | null,"slug"?: string,"status"?: Database["public"]['Enums']["listing_status"],"supplier_id"?: string,"transmission"?: Database["public"]['Enums']["transmission_type"],"trim_level"?: string | null,"updated_at"?: string,"vin"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_make_id_fkey"
      columns: ["make_id"]
isOneToOne: false
      referencedRelation: "vehicle_makes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_price_currency_fkey"
      columns: ["price_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "vehicles_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "public_suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "supplier_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"verification_documents": {
                  Row: {
                    "created_at": string,"doc_type": string,"expires_on": string | null,"file_name": string,"id": string,"mime_type": string,"partner_id": string | null,"size_bytes": number,"storage_path": string,"supplier_id": string | null,"uploaded_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"doc_type": string,"expires_on"?: string | null,"file_name": string,"id"?: string,"mime_type": string,"partner_id"?: string | null,"size_bytes": number,"storage_path": string,"supplier_id"?: string | null,"uploaded_by"?: string
                  }
                  Update: {
                    "created_at"?: string,"doc_type"?: string,"expires_on"?: string | null,"file_name"?: string,"id"?: string,"mime_type"?: string,"partner_id"?: string | null,"size_bytes"?: number,"storage_path"?: string,"supplier_id"?: string | null,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verification_documents_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partner_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_documents_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "public_partners"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_documents_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "public_suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_documents_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "supplier_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "latest_exchange_rates": {
                  Row: {
                    "base_currency": string | null,"created_at": string | null,"effective_date": string | null,"id": string | null,"is_demo": boolean | null,"quote_currency": string | null,"rate": number | null,"source": string | null,"source_url": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "exchange_rates_base_currency_fkey"
      columns: ["base_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "exchange_rates_quote_currency_fkey"
      columns: ["quote_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    }
                  ]
                },"marketplace_vehicles": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability_status"] | null,"body_type": Database["public"]['Enums']["body_type"] | null,"city": string | null,"condition": Database["public"]['Enums']["vehicle_condition"] | null,"country_code": string | null,"cover_image": string | null,"cover_is_storage": boolean | null,"description": string | null,"doors": number | null,"engine_cc": number | null,"expires_at": string | null,"exterior_color": string | null,"first_registration_date": string | null,"fuel_type": Database["public"]['Enums']["fuel_type"] | null,"id": string | null,"is_demo": boolean | null,"is_sponsored": boolean | null,"is_stale": boolean | null,"last_confirmed_at": string | null,"make_id": number | null,"make_name": string | null,"make_slug": string | null,"manufacture_year": number | null,"mileage_km": number | null,"model": string | null,"power_kw": number | null,"price_amount": number | null,"price_currency": string | null,"price_dzd": number | null,"published_at": string | null,"search_text": string | null,"seats": number | null,"slug": string | null,"supplier_has_verified_checks": boolean | null,"supplier_id": string | null,"supplier_is_demo": boolean | null,"supplier_name": string | null,"transmission": Database["public"]['Enums']["transmission_type"] | null,"trim_level": string | null,"updated_at": string | null,"vin_masked": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "vehicles_make_id_fkey"
      columns: ["make_id"]
isOneToOne: false
      referencedRelation: "vehicle_makes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_price_currency_fkey"
      columns: ["price_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "vehicles_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "public_suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicles_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "supplier_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"public_business_verifications": {
                  Row: {
                    "check_type": Database["public"]['Enums']["verification_check"] | null,"expires_at": string | null,"id": string | null,"method": string | null,"partner_id": string | null,"supplier_id": string | null,"verified_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "supplier_verification_records_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partner_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_verification_records_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "public_partners"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_verification_records_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "public_suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_verification_records_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "supplier_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"public_partners": {
                  Row: {
                    "business_name": string | null,"categories": (string)[] | null,"city": string | null,"country_code": string | null,"description": string | null,"id": string | null,"is_demo": boolean | null,"operating_countries": (string)[] | null,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "business_name"?: string | null,"categories"?: never,"city"?: string | null,"country_code"?: string | null,"description"?: string | null,"id"?: string | null,"is_demo"?: boolean | null,"operating_countries"?: (string)[] | null,"website"?: string | null
                         }
                        Update: {
                           "business_name"?: string | null,"categories"?: never,"city"?: string | null,"country_code"?: string | null,"description"?: string | null,"id"?: string | null,"is_demo"?: boolean | null,"operating_countries"?: (string)[] | null,"website"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"public_suppliers": {
                  Row: {
                    "business_name": string | null,"city": string | null,"country_code": string | null,"description": string | null,"has_verified_checks": boolean | null,"id": string | null,"is_demo": boolean | null,"member_since": string | null,"services_offered": string | null,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "business_name"?: string | null,"city"?: string | null,"country_code"?: string | null,"description"?: string | null,"has_verified_checks"?: never,"id"?: string | null,"is_demo"?: boolean | null,"member_since"?: string | null,"services_offered"?: string | null,"website"?: string | null
                         }
                        Update: {
                           "business_name"?: string | null,"city"?: string | null,"country_code"?: string | null,"description"?: string | null,"has_verified_checks"?: never,"id"?: string | null,"is_demo"?: boolean | null,"member_since"?: string | null,"services_offered"?: string | null,"website"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"supplier_purchase_requests": {
                  Row: {
                    "budget_amount": number | null,"budget_currency": string | null,"created_at": string | null,"desired_fuel": Database["public"]['Enums']["fuel_type"] | null,"desired_make_id": number | null,"desired_model": string | null,"desired_transmission": Database["public"]['Enums']["transmission_type"] | null,"id": string | null,"max_mileage_km": number | null,"message": string | null,"pathway_code": string | null,"preferences": string | null,"reference": string | null,"request_type": string | null,"status": Database["public"]['Enums']["request_status"] | null,"supplier_id": string | null,"updated_at": string | null,"vehicle_id": string | null,"vehicle_snapshot": Json | null,"wilaya": string | null,"year_max": number | null,"year_min": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "budget_amount"?: number | null,"budget_currency"?: string | null,"created_at"?: string | null,"desired_fuel"?: Database["public"]['Enums']["fuel_type"] | null,"desired_make_id"?: number | null,"desired_model"?: string | null,"desired_transmission"?: Database["public"]['Enums']["transmission_type"] | null,"id"?: string | null,"max_mileage_km"?: number | null,"message"?: string | null,"pathway_code"?: string | null,"preferences"?: string | null,"reference"?: string | null,"request_type"?: string | null,"status"?: Database["public"]['Enums']["request_status"] | null,"supplier_id"?: string | null,"updated_at"?: string | null,"vehicle_id"?: string | null,"vehicle_snapshot"?: Json | null,"wilaya"?: string | null,"year_max"?: number | null,"year_min"?: number | null
                         }
                        Update: {
                           "budget_amount"?: number | null,"budget_currency"?: string | null,"created_at"?: string | null,"desired_fuel"?: Database["public"]['Enums']["fuel_type"] | null,"desired_make_id"?: number | null,"desired_model"?: string | null,"desired_transmission"?: Database["public"]['Enums']["transmission_type"] | null,"id"?: string | null,"max_mileage_km"?: number | null,"message"?: string | null,"pathway_code"?: string | null,"preferences"?: string | null,"reference"?: string | null,"request_type"?: string | null,"status"?: Database["public"]['Enums']["request_status"] | null,"supplier_id"?: string | null,"updated_at"?: string | null,"vehicle_id"?: string | null,"vehicle_snapshot"?: Json | null,"wilaya"?: string | null,"year_max"?: number | null,"year_min"?: number | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "purchase_requests_budget_currency_fkey"
      columns: ["budget_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "purchase_requests_desired_make_id_fkey"
      columns: ["desired_make_id"]
isOneToOne: false
      referencedRelation: "vehicle_makes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_pathway_code_fkey"
      columns: ["pathway_code"]
isOneToOne: false
      referencedRelation: "acquisition_pathways"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "purchase_requests_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "public_suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "supplier_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "marketplace_vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "activate_cost_rule_set":
{ Args: { "p_rule_set_id": string }; Returns: undefined
                           },
"admin_archive_expired_listings":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_review_vehicle":
{ Args: { "p_decision": string,"p_reason"?: string,"p_vehicle_id": string }; Returns: undefined
                           },
"admin_set_business_status":
{ Args: { "p_id": string,"p_kind": string,"p_reason"?: string,"p_status": Database["public"]['Enums']["business_status"] }; Returns: undefined
                           },
"admin_set_promotion":
{ Args: { "p_until": string,"p_vehicle_id": string }; Returns: undefined
                           },
"admin_set_role":
{ Args: { "p_grant": boolean,"p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           },
"assign_purchase_request":
{ Args: { "p_request_id": string,"p_staff_id": string }; Returns: undefined
                           },
"clone_cost_rule_set":
{ Args: { "p_source_id": string,"p_title": string }; Returns: string
                           },
"decide_service_quote":
{ Args: { "p_accept": boolean,"p_quote_id": string }; Returns: undefined
                           },
"record_legal_review":
{ Args: { "p_decision": Database["public"]['Enums']["legal_review_status"],"p_note": string,"p_request_id": string }; Returns: undefined
                           },
"reject_quotation":
{ Args: { "p_quotation_id": string,"p_reason": string }; Returns: undefined
                           },
"respond_to_quotation":
{ Args: { "p_accept": boolean,"p_quotation_id": string,"p_reason"?: string }; Returns: undefined
                           },
"resubmit_business_application":
{ Args: { "p_kind": string }; Returns: undefined
                           },
"send_quotation":
{ Args: { "p_message"?: string,"p_quotation_id": string }; Returns: undefined
                           },
"set_request_supplier":
{ Args: { "p_request_id": string,"p_supplier_id": string }; Returns: undefined
                           },
"submit_quotation":
{ Args: { "p_currency": string,"p_items": Json,"p_request_id": string,"p_terms": string,"p_valid_until": string }; Returns: string
                           },
"submit_service_quote":
{ Args: { "p_amount": number,"p_currency": string,"p_notes": string,"p_service_request_id": string,"p_valid_until": string }; Returns: string
                           },
"transition_purchase_request":
{ Args: { "p_note"?: string,"p_request_id": string,"p_to": Database["public"]['Enums']["request_status"] }; Returns: undefined
                           },
"update_service_request_status":
{ Args: { "p_note"?: string,"p_service_request_id": string,"p_status": Database["public"]['Enums']["service_request_status"] }; Returns: undefined
                           },
"withdraw_quotation":
{ Args: { "p_quotation_id": string,"p_reason"?: string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "admin"|"staff","availability_status": "available"|"reserved"|"sold"|"unavailable","body_type": "sedan"|"hatchback"|"suv"|"crossover"|"pickup"|"van"|"coupe"|"wagon"|"convertible"|"minivan"|"other","business_status": "pending"|"approved"|"rejected"|"suspended","contact_method": "phone"|"email"|"whatsapp","fee_kind": "vehicle_price"|"domestic_transport"|"international_shipping"|"insurance"|"inspection"|"taxes_and_customs"|"documentation_admin"|"platform_service_fee"|"partner_service_fee"|"other","fee_party": "supplier"|"platform"|"partner"|"public_authority"|"other","fuel_type": "petrol"|"diesel"|"hybrid"|"plug_in_hybrid"|"electric"|"lpg"|"other","legal_review_status": "not_required"|"pending"|"approved"|"blocked","listing_status": "draft"|"pending_review"|"published"|"rejected"|"archived","locale_code": "ar"|"fr","milestone_kind": "supplier_confirmed_availability"|"vehicle_inspected"|"vehicle_purchased"|"export_documents_ready"|"shipped"|"arrived_at_port"|"customs_cleared"|"delivered_to_customer"|"other","quotation_status": "submitted"|"sent"|"accepted"|"declined"|"withdrawn"|"rejected","request_status": "draft"|"submitted"|"under_review"|"supplier_contacted"|"quotation_received"|"awaiting_customer_decision"|"accepted"|"in_progress"|"completed"|"cancelled"|"rejected","service_request_status": "requested"|"quoted"|"accepted"|"in_progress"|"completed"|"cancelled","transmission_type": "manual"|"automatic","vehicle_condition": "new"|"used","verification_check": "business_registration"|"tax_registration"|"representative_identity"|"business_address"|"phone_contact"|"email_contact"|"site_visit"|"trade_references"|"other","verification_result": "passed"|"failed"|"inconclusive"
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
            "app_role": ["admin", "staff"],"availability_status": ["available", "reserved", "sold", "unavailable"],"body_type": ["sedan", "hatchback", "suv", "crossover", "pickup", "van", "coupe", "wagon", "convertible", "minivan", "other"],"business_status": ["pending", "approved", "rejected", "suspended"],"contact_method": ["phone", "email", "whatsapp"],"fee_kind": ["vehicle_price", "domestic_transport", "international_shipping", "insurance", "inspection", "taxes_and_customs", "documentation_admin", "platform_service_fee", "partner_service_fee", "other"],"fee_party": ["supplier", "platform", "partner", "public_authority", "other"],"fuel_type": ["petrol", "diesel", "hybrid", "plug_in_hybrid", "electric", "lpg", "other"],"legal_review_status": ["not_required", "pending", "approved", "blocked"],"listing_status": ["draft", "pending_review", "published", "rejected", "archived"],"locale_code": ["ar", "fr"],"milestone_kind": ["supplier_confirmed_availability", "vehicle_inspected", "vehicle_purchased", "export_documents_ready", "shipped", "arrived_at_port", "customs_cleared", "delivered_to_customer", "other"],"quotation_status": ["submitted", "sent", "accepted", "declined", "withdrawn", "rejected"],"request_status": ["draft", "submitted", "under_review", "supplier_contacted", "quotation_received", "awaiting_customer_decision", "accepted", "in_progress", "completed", "cancelled", "rejected"],"service_request_status": ["requested", "quoted", "accepted", "in_progress", "completed", "cancelled"],"transmission_type": ["manual", "automatic"],"vehicle_condition": ["new", "used"],"verification_check": ["business_registration", "tax_registration", "representative_identity", "business_address", "phone_contact", "email_contact", "site_visit", "trade_references", "other"],"verification_result": ["passed", "failed", "inconclusive"]
          }
        }
} as const
