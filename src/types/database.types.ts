// AUTO-GENERATED from PostgREST OpenAPI. Do not edit by hand.
// Regenerate: node scripts/maintenance/gen-supabase-types.mjs
// Adoption guide: docs/C_FRONTEND_PLAN.md

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      "ai_generation_logs": {
        Row: {
          "id": string;
          "user_id": string | null;
          "feature": string;
          "model_used": string;
          "prompt_tokens": number;
          "completion_tokens": number;
          "cost_usd": number;
          "latency_ms": number;
          "status": string;
          "error_message": string | null;
          "branch_id": string;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "user_id"?: string | null;
          "feature": string;
          "model_used": string;
          "prompt_tokens": number;
          "completion_tokens": number;
          "cost_usd": number;
          "latency_ms": number;
          "status": string;
          "error_message"?: string | null;
          "branch_id": string;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "user_id"?: string | null;
          "feature"?: string;
          "model_used"?: string;
          "prompt_tokens"?: number;
          "completion_tokens"?: number;
          "cost_usd"?: number;
          "latency_ms"?: number;
          "status"?: string;
          "error_message"?: string | null;
          "branch_id"?: string;
          "created_at"?: string
        };
        Relationships: [];
      };
      "ai_keys": {
        Row: {
          "id": string;
          "provider": string;
          "api_key_masked": string;
          "api_endpoint": string | null;
          "updated_at": string;
          "api_key_value": string | null
        };
        Insert: {
          "id"?: string;
          "provider": string;
          "api_key_masked": string;
          "api_endpoint"?: string | null;
          "updated_at": string;
          "api_key_value"?: string | null
        };
        Update: {
          "id"?: string;
          "provider"?: string;
          "api_key_masked"?: string;
          "api_endpoint"?: string | null;
          "updated_at"?: string;
          "api_key_value"?: string | null
        };
        Relationships: [];
      };
      "ai_models": {
        Row: {
          "id": string;
          "provider": string;
          "model_name": string;
          "display_name": string;
          "is_active": boolean;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "provider": string;
          "model_name": string;
          "display_name": string;
          "is_active": boolean;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "provider"?: string;
          "model_name"?: string;
          "display_name"?: string;
          "is_active"?: boolean;
          "created_at"?: string
        };
        Relationships: [];
      };
      "ai_prompt_library": {
        Row: {
          "id": string;
          "category": string;
          "name": string;
          "system_prompt": string;
          "user_prompt_template": string;
          "temperature": number;
          "is_default": boolean;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "category": string;
          "name": string;
          "system_prompt": string;
          "user_prompt_template": string;
          "temperature": number;
          "is_default": boolean;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "category"?: string;
          "name"?: string;
          "system_prompt"?: string;
          "user_prompt_template"?: string;
          "temperature"?: number;
          "is_default"?: boolean;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "analytics": {
        Row: {
          "id": string;
          "record_date": string;
          "platform": string;
          "views": number;
          "comments": number;
          "shares": number;
          "saves": number;
          "inboxes": number;
          "visitors": number;
          "revenue": number;
          "branch_id": string;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "record_date": string;
          "platform": string;
          "views": number;
          "comments": number;
          "shares": number;
          "saves": number;
          "inboxes": number;
          "visitors": number;
          "revenue": number;
          "branch_id": string;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "record_date"?: string;
          "platform"?: string;
          "views"?: number;
          "comments"?: number;
          "shares"?: number;
          "saves"?: number;
          "inboxes"?: number;
          "visitors"?: number;
          "revenue"?: number;
          "branch_id"?: string;
          "created_at"?: string
        };
        Relationships: [];
      };
      "audit_logs": {
        Row: {
          "id": string;
          "user_id": string | null;
          "action": string;
          "table_name": string | null;
          "record_id": string | null;
          "old_data": Json | null;
          "new_data": Json | null;
          "ip_address": string | null;
          "user_agent": string | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "user_id"?: string | null;
          "action": string;
          "table_name"?: string | null;
          "record_id"?: string | null;
          "old_data"?: Json | null;
          "new_data"?: Json | null;
          "ip_address"?: string | null;
          "user_agent"?: string | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "user_id"?: string | null;
          "action"?: string;
          "table_name"?: string | null;
          "record_id"?: string | null;
          "old_data"?: Json | null;
          "new_data"?: Json | null;
          "ip_address"?: string | null;
          "user_agent"?: string | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "audit_logs_with_user": {
        Row: {
          "id": string | null;
          "user_id": string | null;
          "action": string | null;
          "table_name": string | null;
          "record_id": string | null;
          "old_data": Json | null;
          "new_data": Json | null;
          "ip_address": string | null;
          "user_agent": string | null;
          "created_at": string | null;
          "user_email": string | null;
          "user_name": string | null;
          "user_role": string | null
        };
        Insert: {
          "id"?: string | null;
          "user_id"?: string | null;
          "action"?: string | null;
          "table_name"?: string | null;
          "record_id"?: string | null;
          "old_data"?: Json | null;
          "new_data"?: Json | null;
          "ip_address"?: string | null;
          "user_agent"?: string | null;
          "created_at"?: string | null;
          "user_email"?: string | null;
          "user_name"?: string | null;
          "user_role"?: string | null
        };
        Update: {
          "id"?: string | null;
          "user_id"?: string | null;
          "action"?: string | null;
          "table_name"?: string | null;
          "record_id"?: string | null;
          "old_data"?: Json | null;
          "new_data"?: Json | null;
          "ip_address"?: string | null;
          "user_agent"?: string | null;
          "created_at"?: string | null;
          "user_email"?: string | null;
          "user_name"?: string | null;
          "user_role"?: string | null
        };
        Relationships: [];
      };
      "calendar": {
        Row: {
          "id": string;
          "video_id": string | null;
          "scheduled_date": string;
          "platforms": Json;
          "status": string;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "video_id"?: string | null;
          "scheduled_date": string;
          "platforms": Json;
          "status": string;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "video_id"?: string | null;
          "scheduled_date"?: string;
          "platforms"?: Json;
          "status"?: string;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "campaigns": {
        Row: {
          "id": string;
          "name": string;
          "target_month": string;
          "target_videos": number;
          "target_views": number;
          "target_inboxes": number;
          "description": string | null;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "name": string;
          "target_month": string;
          "target_videos": number;
          "target_views": number;
          "target_inboxes": number;
          "description"?: string | null;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "target_month"?: string;
          "target_videos"?: number;
          "target_views"?: number;
          "target_inboxes"?: number;
          "description"?: string | null;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "capital": {
        Row: {
          "id": string;
          "type": string;
          "source_name": string;
          "amount": number;
          "date": string;
          "notes": string | null;
          "interest_rate": number | null;
          "interest_type": string | null;
          "payment_frequency": string | null;
          "maturity_date": string | null;
          "branch_id": string;
          "created_at": string;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "type": string;
          "source_name": string;
          "amount": number;
          "date": string;
          "notes"?: string | null;
          "interest_rate"?: number | null;
          "interest_type"?: string | null;
          "payment_frequency"?: string | null;
          "maturity_date"?: string | null;
          "branch_id": string;
          "created_at"?: string;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "type"?: string;
          "source_name"?: string;
          "amount"?: number;
          "date"?: string;
          "notes"?: string | null;
          "interest_rate"?: number | null;
          "interest_type"?: string | null;
          "payment_frequency"?: string | null;
          "maturity_date"?: string | null;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "capital_summary": {
        Row: {
          "branch_id": string | null;
          "type": string | null;
          "count": number | null;
          "total_amount": number | null;
          "avg_interest_rate": number | null
        };
        Insert: {
          "branch_id"?: string | null;
          "type"?: string | null;
          "count"?: number | null;
          "total_amount"?: number | null;
          "avg_interest_rate"?: number | null
        };
        Update: {
          "branch_id"?: string | null;
          "type"?: string | null;
          "count"?: number | null;
          "total_amount"?: number | null;
          "avg_interest_rate"?: number | null
        };
        Relationships: [];
      };
      "captions": {
        Row: {
          "id": string;
          "title": string;
          "content": string;
          "category": string | null;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "title": string;
          "content": string;
          "category"?: string | null;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "title"?: string;
          "content"?: string;
          "category"?: string | null;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "cash_transactions": {
        Row: {
          "id": string;
          "type": string;
          "category": string;
          "amount": number;
          "date": string;
          "description": string | null;
          "branchid": string;
          "paymentsource": string;
          "reference": string | null;
          "created_at": string | null;
          "notes": string | null;
          "recipient": string | null;
          "saleid": string | null;
          "workorderid": string | null;
          "payrollrecordid": string | null;
          "loanpaymentid": string | null;
          "supplierid": string | null;
          "customerid": string | null;
          "target_name": string | null;
          "created_by": string | null
        };
        Insert: {
          "id"?: string;
          "type": string;
          "category": string;
          "amount": number;
          "date": string;
          "description"?: string | null;
          "branchid": string;
          "paymentsource": string;
          "reference"?: string | null;
          "created_at"?: string | null;
          "notes"?: string | null;
          "recipient"?: string | null;
          "saleid"?: string | null;
          "workorderid"?: string | null;
          "payrollrecordid"?: string | null;
          "loanpaymentid"?: string | null;
          "supplierid"?: string | null;
          "customerid"?: string | null;
          "target_name"?: string | null;
          "created_by"?: string | null
        };
        Update: {
          "id"?: string;
          "type"?: string;
          "category"?: string;
          "amount"?: number;
          "date"?: string;
          "description"?: string | null;
          "branchid"?: string;
          "paymentsource"?: string;
          "reference"?: string | null;
          "created_at"?: string | null;
          "notes"?: string | null;
          "recipient"?: string | null;
          "saleid"?: string | null;
          "workorderid"?: string | null;
          "payrollrecordid"?: string | null;
          "loanpaymentid"?: string | null;
          "supplierid"?: string | null;
          "customerid"?: string | null;
          "target_name"?: string | null;
          "created_by"?: string | null
        };
        Relationships: [];
      };
      "cash_transactions_ledger": {
        Row: {
          "id": string | null;
          "category": string | null;
          "type": string | null;
          "amount": number | null;
          "date": string | null;
          "description": string | null;
          "notes": string | null;
          "recipient": string | null;
          "reference": string | null;
          "branchid": string | null;
          "paymentsource": string | null;
          "saleid": string | null;
          "workorderid": string | null;
          "payrollrecordid": string | null;
          "loanpaymentid": string | null;
          "supplierid": string | null;
          "customerid": string | null;
          "target_name": string | null;
          "created_by": string | null;
          "created_at": string | null;
          "is_refund": boolean | null;
          "category_raw": string | null;
          "type_raw": string | null;
          "amount_raw": number | null
        };
        Insert: {
          "id"?: string | null;
          "category"?: string | null;
          "type"?: string | null;
          "amount"?: number | null;
          "date"?: string | null;
          "description"?: string | null;
          "notes"?: string | null;
          "recipient"?: string | null;
          "reference"?: string | null;
          "branchid"?: string | null;
          "paymentsource"?: string | null;
          "saleid"?: string | null;
          "workorderid"?: string | null;
          "payrollrecordid"?: string | null;
          "loanpaymentid"?: string | null;
          "supplierid"?: string | null;
          "customerid"?: string | null;
          "target_name"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "is_refund"?: boolean | null;
          "category_raw"?: string | null;
          "type_raw"?: string | null;
          "amount_raw"?: number | null
        };
        Update: {
          "id"?: string | null;
          "category"?: string | null;
          "type"?: string | null;
          "amount"?: number | null;
          "date"?: string | null;
          "description"?: string | null;
          "notes"?: string | null;
          "recipient"?: string | null;
          "reference"?: string | null;
          "branchid"?: string | null;
          "paymentsource"?: string | null;
          "saleid"?: string | null;
          "workorderid"?: string | null;
          "payrollrecordid"?: string | null;
          "loanpaymentid"?: string | null;
          "supplierid"?: string | null;
          "customerid"?: string | null;
          "target_name"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "is_refund"?: boolean | null;
          "category_raw"?: string | null;
          "type_raw"?: string | null;
          "amount_raw"?: number | null
        };
        Relationships: [];
      };
      "cashtransactions": {
        Row: {
          "id": string;
          "type": string;
          "date": string;
          "amount": number | null;
          "contact": Json | null;
          "contactName": string | null;
          "contactPhone": string | null;
          "notes": string | null;
          "paymentSourceId": string | null;
          "branchId": string | null;
          "category": string | null;
          "workOrderId": string | null;
          "saleId": string | null;
          "status": string | null;
          "created_by": string | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "type": string;
          "date": string;
          "amount"?: number | null;
          "contact"?: Json | null;
          "contactName"?: string | null;
          "contactPhone"?: string | null;
          "notes"?: string | null;
          "paymentSourceId"?: string | null;
          "branchId"?: string | null;
          "category"?: string | null;
          "workOrderId"?: string | null;
          "saleId"?: string | null;
          "status"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "type"?: string;
          "date"?: string;
          "amount"?: number | null;
          "contact"?: Json | null;
          "contactName"?: string | null;
          "contactPhone"?: string | null;
          "notes"?: string | null;
          "paymentSourceId"?: string | null;
          "branchId"?: string | null;
          "category"?: string | null;
          "workOrderId"?: string | null;
          "saleId"?: string | null;
          "status"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "categories": {
        Row: {
          "id": string;
          "name": string;
          "icon": string | null;
          "color": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "parent_id": string | null;
          "sku_prefix": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "icon"?: string | null;
          "color"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "parent_id"?: string | null;
          "sku_prefix"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "icon"?: string | null;
          "color"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "parent_id"?: string | null;
          "sku_prefix"?: string | null
        };
        Relationships: [];
      };
      "content_project_extensions": {
        Row: {
          "project_id": string;
          "workflow_status": string;
          "lessons_learned": string | null;
          "branch_id": string;
          "updated_at": string
        };
        Insert: {
          "project_id": string;
          "workflow_status": string;
          "lessons_learned"?: string | null;
          "branch_id": string;
          "updated_at": string
        };
        Update: {
          "project_id"?: string;
          "workflow_status"?: string;
          "lessons_learned"?: string | null;
          "branch_id"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "customer_debts": {
        Row: {
          "id": string;
          "customer_id": string;
          "customer_name": string;
          "phone": string | null;
          "license_plate": string | null;
          "description": string;
          "total_amount": number;
          "paid_amount": number;
          "remaining_amount": number;
          "created_date": string;
          "branch_id": string;
          "created_at": string | null;
          "updated_at": string | null;
          "work_order_id": string | null;
          "sale_id": string | null
        };
        Insert: {
          "id"?: string;
          "customer_id": string;
          "customer_name": string;
          "phone"?: string | null;
          "license_plate"?: string | null;
          "description": string;
          "total_amount": number;
          "paid_amount": number;
          "remaining_amount": number;
          "created_date": string;
          "branch_id": string;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "work_order_id"?: string | null;
          "sale_id"?: string | null
        };
        Update: {
          "id"?: string;
          "customer_id"?: string;
          "customer_name"?: string;
          "phone"?: string | null;
          "license_plate"?: string | null;
          "description"?: string;
          "total_amount"?: number;
          "paid_amount"?: number;
          "remaining_amount"?: number;
          "created_date"?: string;
          "branch_id"?: string;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "work_order_id"?: string | null;
          "sale_id"?: string | null
        };
        Relationships: [];
      };
      "customers": {
        Row: {
          "id": string;
          "name": string;
          "phone": string | null;
          "created_at": string | null;
          "vehiclemodel": string | null;
          "licenseplate": string | null;
          "vehicles": Json | null;
          "status": string | null;
          "segment": string | null;
          "loyaltypoints": number | null;
          "totalspent": number | null;
          "visitcount": number | null;
          "lastvisit": string | null;
          "email": string | null;
          "tax_code": string | null;
          "is_company": boolean | null;
          "company_address": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "phone"?: string | null;
          "created_at"?: string | null;
          "vehiclemodel"?: string | null;
          "licenseplate"?: string | null;
          "vehicles"?: Json | null;
          "status"?: string | null;
          "segment"?: string | null;
          "loyaltypoints"?: number | null;
          "totalspent"?: number | null;
          "visitcount"?: number | null;
          "lastvisit"?: string | null;
          "email"?: string | null;
          "tax_code"?: string | null;
          "is_company"?: boolean | null;
          "company_address"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "phone"?: string | null;
          "created_at"?: string | null;
          "vehiclemodel"?: string | null;
          "licenseplate"?: string | null;
          "vehicles"?: Json | null;
          "status"?: string | null;
          "segment"?: string | null;
          "loyaltypoints"?: number | null;
          "totalspent"?: number | null;
          "visitcount"?: number | null;
          "lastvisit"?: string | null;
          "email"?: string | null;
          "tax_code"?: string | null;
          "is_company"?: boolean | null;
          "company_address"?: string | null
        };
        Relationships: [];
      };
      "customers_backup_20251204": {
        Row: {
          "id": string | null;
          "name": string | null;
          "phone": string | null;
          "created_at": string | null;
          "vehiclemodel": string | null;
          "licenseplate": string | null;
          "vehicles": Json | null;
          "status": string | null;
          "segment": string | null;
          "loyaltypoints": number | null;
          "totalspent": number | null;
          "visitcount": number | null;
          "lastvisit": string | null
        };
        Insert: {
          "id"?: string | null;
          "name"?: string | null;
          "phone"?: string | null;
          "created_at"?: string | null;
          "vehiclemodel"?: string | null;
          "licenseplate"?: string | null;
          "vehicles"?: Json | null;
          "status"?: string | null;
          "segment"?: string | null;
          "loyaltypoints"?: number | null;
          "totalspent"?: number | null;
          "visitcount"?: number | null;
          "lastvisit"?: string | null
        };
        Update: {
          "id"?: string | null;
          "name"?: string | null;
          "phone"?: string | null;
          "created_at"?: string | null;
          "vehiclemodel"?: string | null;
          "licenseplate"?: string | null;
          "vehicles"?: Json | null;
          "status"?: string | null;
          "segment"?: string | null;
          "loyaltypoints"?: number | null;
          "totalspent"?: number | null;
          "visitcount"?: number | null;
          "lastvisit"?: string | null
        };
        Relationships: [];
      };
      "employee_advance_payments": {
        Row: {
          "id": string;
          "advance_id": string;
          "employee_id": string;
          "amount": number;
          "payment_date": string;
          "payment_month": string;
          "payroll_record_id": string | null;
          "notes": string | null;
          "branch_id": string;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "advance_id": string;
          "employee_id": string;
          "amount": number;
          "payment_date": string;
          "payment_month": string;
          "payroll_record_id"?: string | null;
          "notes"?: string | null;
          "branch_id": string;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "advance_id"?: string;
          "employee_id"?: string;
          "amount"?: number;
          "payment_date"?: string;
          "payment_month"?: string;
          "payroll_record_id"?: string | null;
          "notes"?: string | null;
          "branch_id"?: string;
          "created_at"?: string
        };
        Relationships: [];
      };
      "employee_advances": {
        Row: {
          "id": string;
          "employee_id": string;
          "employee_name": string;
          "advance_amount": number;
          "advance_date": string;
          "reason": string | null;
          "payment_method": string;
          "status": string;
          "approved_by": string | null;
          "approved_date": string | null;
          "is_installment": boolean;
          "installment_months": number | null;
          "monthly_deduction": number | null;
          "remaining_amount": number;
          "paid_amount": number;
          "branch_id": string;
          "created_at": string;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "employee_id": string;
          "employee_name": string;
          "advance_amount": number;
          "advance_date": string;
          "reason"?: string | null;
          "payment_method": string;
          "status": string;
          "approved_by"?: string | null;
          "approved_date"?: string | null;
          "is_installment": boolean;
          "installment_months"?: number | null;
          "monthly_deduction"?: number | null;
          "remaining_amount": number;
          "paid_amount": number;
          "branch_id": string;
          "created_at"?: string;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "employee_id"?: string;
          "employee_name"?: string;
          "advance_amount"?: number;
          "advance_date"?: string;
          "reason"?: string | null;
          "payment_method"?: string;
          "status"?: string;
          "approved_by"?: string | null;
          "approved_date"?: string | null;
          "is_installment"?: boolean;
          "installment_months"?: number | null;
          "monthly_deduction"?: number | null;
          "remaining_amount"?: number;
          "paid_amount"?: number;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "employee_advances_summary": {
        Row: {
          "id": string | null;
          "employee_id": string | null;
          "employee_name": string | null;
          "advance_amount": number | null;
          "advance_date": string | null;
          "reason": string | null;
          "payment_method": string | null;
          "status": string | null;
          "approved_by": string | null;
          "approved_date": string | null;
          "is_installment": boolean | null;
          "installment_months": number | null;
          "monthly_deduction": number | null;
          "remaining_amount": number | null;
          "paid_amount": number | null;
          "branch_id": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "employee_position": string | null;
          "employee_department": string | null;
          "payment_count": number | null;
          "total_paid_via_payments": number | null
        };
        Insert: {
          "id"?: string | null;
          "employee_id"?: string | null;
          "employee_name"?: string | null;
          "advance_amount"?: number | null;
          "advance_date"?: string | null;
          "reason"?: string | null;
          "payment_method"?: string | null;
          "status"?: string | null;
          "approved_by"?: string | null;
          "approved_date"?: string | null;
          "is_installment"?: boolean | null;
          "installment_months"?: number | null;
          "monthly_deduction"?: number | null;
          "remaining_amount"?: number | null;
          "paid_amount"?: number | null;
          "branch_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "employee_position"?: string | null;
          "employee_department"?: string | null;
          "payment_count"?: number | null;
          "total_paid_via_payments"?: number | null
        };
        Update: {
          "id"?: string | null;
          "employee_id"?: string | null;
          "employee_name"?: string | null;
          "advance_amount"?: number | null;
          "advance_date"?: string | null;
          "reason"?: string | null;
          "payment_method"?: string | null;
          "status"?: string | null;
          "approved_by"?: string | null;
          "approved_date"?: string | null;
          "is_installment"?: boolean | null;
          "installment_months"?: number | null;
          "monthly_deduction"?: number | null;
          "remaining_amount"?: number | null;
          "paid_amount"?: number | null;
          "branch_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "employee_position"?: string | null;
          "employee_department"?: string | null;
          "payment_count"?: number | null;
          "total_paid_via_payments"?: number | null
        };
        Relationships: [];
      };
      "employees": {
        Row: {
          "id": string;
          "name": string;
          "phone": string | null;
          "email": string | null;
          "position": string;
          "department": string | null;
          "base_salary": number;
          "allowances": number | null;
          "start_date": string;
          "status": string;
          "bank_account": string | null;
          "bank_name": string | null;
          "tax_code": string | null;
          "branch_id": string;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "phone"?: string | null;
          "email"?: string | null;
          "position": string;
          "department"?: string | null;
          "base_salary": number;
          "allowances"?: number | null;
          "start_date": string;
          "status": string;
          "bank_account"?: string | null;
          "bank_name"?: string | null;
          "tax_code"?: string | null;
          "branch_id": string;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "phone"?: string | null;
          "email"?: string | null;
          "position"?: string;
          "department"?: string | null;
          "base_salary"?: number;
          "allowances"?: number | null;
          "start_date"?: string;
          "status"?: string;
          "bank_account"?: string | null;
          "bank_name"?: string | null;
          "tax_code"?: string | null;
          "branch_id"?: string;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "external_parts": {
        Row: {
          "id": string;
          "name": string;
          "sku": string | null;
          "price": number | null;
          "category": string | null;
          "image_url": string | null;
          "source_url": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "sku"?: string | null;
          "price"?: number | null;
          "category"?: string | null;
          "image_url"?: string | null;
          "source_url"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "sku"?: string | null;
          "price"?: number | null;
          "category"?: string | null;
          "image_url"?: string | null;
          "source_url"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "fixed_asset_depreciation": {
        Row: {
          "id": string;
          "asset_id": string;
          "year": number;
          "month": number;
          "depreciation_amount": number;
          "accumulated_depreciation": number;
          "book_value": number;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "asset_id": string;
          "year": number;
          "month": number;
          "depreciation_amount": number;
          "accumulated_depreciation": number;
          "book_value": number;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "asset_id"?: string;
          "year"?: number;
          "month"?: number;
          "depreciation_amount"?: number;
          "accumulated_depreciation"?: number;
          "book_value"?: number;
          "created_at"?: string
        };
        Relationships: [];
      };
      "fixed_assets": {
        Row: {
          "id": string;
          "name": string;
          "asset_type": string;
          "purchase_date": string;
          "purchase_price": number;
          "current_value": number;
          "depreciation_rate": number;
          "depreciation_method": string;
          "useful_life": number;
          "status": string;
          "location": string | null;
          "serial_number": string | null;
          "supplier": string | null;
          "warranty": string | null;
          "notes": string | null;
          "branch_id": string;
          "created_at": string;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "asset_type": string;
          "purchase_date": string;
          "purchase_price": number;
          "current_value": number;
          "depreciation_rate": number;
          "depreciation_method": string;
          "useful_life": number;
          "status": string;
          "location"?: string | null;
          "serial_number"?: string | null;
          "supplier"?: string | null;
          "warranty"?: string | null;
          "notes"?: string | null;
          "branch_id": string;
          "created_at"?: string;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "asset_type"?: string;
          "purchase_date"?: string;
          "purchase_price"?: number;
          "current_value"?: number;
          "depreciation_rate"?: number;
          "depreciation_method"?: string;
          "useful_life"?: number;
          "status"?: string;
          "location"?: string | null;
          "serial_number"?: string | null;
          "supplier"?: string | null;
          "warranty"?: string | null;
          "notes"?: string | null;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "fixed_assets_summary": {
        Row: {
          "branch_id": string | null;
          "asset_type": string | null;
          "status": string | null;
          "count": number | null;
          "total_purchase_price": number | null;
          "total_current_value": number | null;
          "total_depreciation": number | null
        };
        Insert: {
          "branch_id"?: string | null;
          "asset_type"?: string | null;
          "status"?: string | null;
          "count"?: number | null;
          "total_purchase_price"?: number | null;
          "total_current_value"?: number | null;
          "total_depreciation"?: number | null
        };
        Update: {
          "branch_id"?: string | null;
          "asset_type"?: string | null;
          "status"?: string | null;
          "count"?: number | null;
          "total_purchase_price"?: number | null;
          "total_current_value"?: number | null;
          "total_depreciation"?: number | null
        };
        Relationships: [];
      };
      "fixed_assets_with_depreciation": {
        Row: {
          "id": string | null;
          "name": string | null;
          "asset_type": string | null;
          "purchase_date": string | null;
          "purchase_price": number | null;
          "current_value": number | null;
          "depreciation_rate": number | null;
          "depreciation_method": string | null;
          "useful_life": number | null;
          "status": string | null;
          "location": string | null;
          "serial_number": string | null;
          "supplier": string | null;
          "warranty": string | null;
          "notes": string | null;
          "branch_id": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "accumulated_depreciation": number | null;
          "depreciation_percentage": number | null;
          "age_years": number | null
        };
        Insert: {
          "id"?: string | null;
          "name"?: string | null;
          "asset_type"?: string | null;
          "purchase_date"?: string | null;
          "purchase_price"?: number | null;
          "current_value"?: number | null;
          "depreciation_rate"?: number | null;
          "depreciation_method"?: string | null;
          "useful_life"?: number | null;
          "status"?: string | null;
          "location"?: string | null;
          "serial_number"?: string | null;
          "supplier"?: string | null;
          "warranty"?: string | null;
          "notes"?: string | null;
          "branch_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "accumulated_depreciation"?: number | null;
          "depreciation_percentage"?: number | null;
          "age_years"?: number | null
        };
        Update: {
          "id"?: string | null;
          "name"?: string | null;
          "asset_type"?: string | null;
          "purchase_date"?: string | null;
          "purchase_price"?: number | null;
          "current_value"?: number | null;
          "depreciation_rate"?: number | null;
          "depreciation_method"?: string | null;
          "useful_life"?: number | null;
          "status"?: string | null;
          "location"?: string | null;
          "serial_number"?: string | null;
          "supplier"?: string | null;
          "warranty"?: string | null;
          "notes"?: string | null;
          "branch_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "accumulated_depreciation"?: number | null;
          "depreciation_percentage"?: number | null;
          "age_years"?: number | null
        };
        Relationships: [];
      };
      "gallery_items": {
        Row: {
          "id": string;
          "title": string;
          "description": string | null;
          "image_url": string | null;
          "video_id": string | null;
          "vehicle_model": string | null;
          "service_type": string | null;
          "date": string | null;
          "before_image": string | null;
          "after_image": string | null;
          "rating": number | null;
          "featured": boolean | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "title": string;
          "description"?: string | null;
          "image_url"?: string | null;
          "video_id"?: string | null;
          "vehicle_model"?: string | null;
          "service_type"?: string | null;
          "date"?: string | null;
          "before_image"?: string | null;
          "after_image"?: string | null;
          "rating"?: number | null;
          "featured"?: boolean | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "title"?: string;
          "description"?: string | null;
          "image_url"?: string | null;
          "video_id"?: string | null;
          "vehicle_model"?: string | null;
          "service_type"?: string | null;
          "date"?: string | null;
          "before_image"?: string | null;
          "after_image"?: string | null;
          "rating"?: number | null;
          "featured"?: boolean | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "goodsreceipts": {
        Row: {
          "id": string;
          "receiptNumber": string | null;
          "supplierId": string | null;
          "supplierName": string | null;
          "receivedDate": string;
          "items": Json | null;
          "totalAmount": number | null;
          "paidAmount": number | null;
          "remainingAmount": number | null;
          "paymentStatus": string | null;
          "notes": string | null;
          "branchId": string | null;
          "status": string | null;
          "created_by": string | null;
          "updated_by": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "receiptNumber"?: string | null;
          "supplierId"?: string | null;
          "supplierName"?: string | null;
          "receivedDate": string;
          "items"?: Json | null;
          "totalAmount"?: number | null;
          "paidAmount"?: number | null;
          "remainingAmount"?: number | null;
          "paymentStatus"?: string | null;
          "notes"?: string | null;
          "branchId"?: string | null;
          "status"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "receiptNumber"?: string | null;
          "supplierId"?: string | null;
          "supplierName"?: string | null;
          "receivedDate"?: string;
          "items"?: Json | null;
          "totalAmount"?: number | null;
          "paidAmount"?: number | null;
          "remainingAmount"?: number | null;
          "paymentStatus"?: string | null;
          "notes"?: string | null;
          "branchId"?: string | null;
          "status"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "hashtags": {
        Row: {
          "id": string;
          "tag": string;
          "category": string;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "tag": string;
          "category": string;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "tag"?: string;
          "category"?: string;
          "created_at"?: string
        };
        Relationships: [];
      };
      "ideas": {
        Row: {
          "id": string;
          "project_id": string | null;
          "title": string;
          "vehicle_model": string | null;
          "brand": string | null;
          "topic": string | null;
          "priority": string;
          "source": string | null;
          "creator_id": string | null;
          "status": string;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "project_id"?: string | null;
          "title": string;
          "vehicle_model"?: string | null;
          "brand"?: string | null;
          "topic"?: string | null;
          "priority": string;
          "source"?: string | null;
          "creator_id"?: string | null;
          "status": string;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "project_id"?: string | null;
          "title"?: string;
          "vehicle_model"?: string | null;
          "brand"?: string | null;
          "topic"?: string | null;
          "priority"?: string;
          "source"?: string | null;
          "creator_id"?: string | null;
          "status"?: string;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "installment_payments": {
        Row: {
          "id": string;
          "installment_id": string;
          "installment_number": number;
          "payment_date": string | null;
          "amount": number;
          "payment_method": string;
          "notes": string | null;
          "cash_transaction_id": string | null;
          "created_by": string | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "installment_id": string;
          "installment_number": number;
          "payment_date"?: string | null;
          "amount": number;
          "payment_method": string;
          "notes"?: string | null;
          "cash_transaction_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "installment_id"?: string;
          "installment_number"?: number;
          "payment_date"?: string | null;
          "amount"?: number;
          "payment_method"?: string;
          "notes"?: string | null;
          "cash_transaction_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "inventory_transactions": {
        Row: {
          "id": string;
          "type": string;
          "partId": string;
          "partName": string;
          "quantity": number;
          "date": string;
          "unitPrice": number | null;
          "totalPrice": number;
          "branchId": string;
          "notes": string | null;
          "saleId": string | null;
          "workOrderId": string | null;
          "created_at": string | null;
          "supplierid": string | null
        };
        Insert: {
          "id"?: string;
          "type": string;
          "partId": string;
          "partName": string;
          "quantity": number;
          "date": string;
          "unitPrice"?: number | null;
          "totalPrice": number;
          "branchId": string;
          "notes"?: string | null;
          "saleId"?: string | null;
          "workOrderId"?: string | null;
          "created_at"?: string | null;
          "supplierid"?: string | null
        };
        Update: {
          "id"?: string;
          "type"?: string;
          "partId"?: string;
          "partName"?: string;
          "quantity"?: number;
          "date"?: string;
          "unitPrice"?: number | null;
          "totalPrice"?: number;
          "branchId"?: string;
          "notes"?: string | null;
          "saleId"?: string | null;
          "workOrderId"?: string | null;
          "created_at"?: string | null;
          "supplierid"?: string | null
        };
        Relationships: [];
      };
      "knowledge_article_tags": {
        Row: {
          "article_id": string;
          "tag_id": string
        };
        Insert: {
          "article_id": string;
          "tag_id": string
        };
        Update: {
          "article_id"?: string;
          "tag_id"?: string
        };
        Relationships: [];
      };
      "knowledge_articles": {
        Row: {
          "id": string;
          "type": string;
          "title": string;
          "content": string;
          "category_id": string | null;
          "author_id": string | null;
          "approved_by": string | null;
          "effective_date": string | null;
          "status": string;
          "version": number;
          "metadata": Json;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "type": string;
          "title": string;
          "content": string;
          "category_id"?: string | null;
          "author_id"?: string | null;
          "approved_by"?: string | null;
          "effective_date"?: string | null;
          "status": string;
          "version": number;
          "metadata": Json;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "type"?: string;
          "title"?: string;
          "content"?: string;
          "category_id"?: string | null;
          "author_id"?: string | null;
          "approved_by"?: string | null;
          "effective_date"?: string | null;
          "status"?: string;
          "version"?: number;
          "metadata"?: Json;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "knowledge_categories": {
        Row: {
          "id": string;
          "name": string;
          "parent_id": string | null;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "name": string;
          "parent_id"?: string | null;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "parent_id"?: string | null;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "knowledge_files": {
        Row: {
          "id": string;
          "article_id": string;
          "name": string;
          "file_url": string;
          "file_type": string;
          "file_size": number;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "article_id": string;
          "name": string;
          "file_url": string;
          "file_type": string;
          "file_size": number;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "article_id"?: string;
          "name"?: string;
          "file_url"?: string;
          "file_type"?: string;
          "file_size"?: number;
          "created_at"?: string
        };
        Relationships: [];
      };
      "knowledge_tags": {
        Row: {
          "id": string;
          "name": string;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "name": string;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "created_at"?: string
        };
        Relationships: [];
      };
      "knowledge_versions": {
        Row: {
          "id": string;
          "article_id": string;
          "version_number": number;
          "title": string;
          "content": string;
          "metadata": Json;
          "modified_by": string | null;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "article_id": string;
          "version_number": number;
          "title": string;
          "content": string;
          "metadata": Json;
          "modified_by"?: string | null;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "article_id"?: string;
          "version_number"?: number;
          "title"?: string;
          "content"?: string;
          "metadata"?: Json;
          "modified_by"?: string | null;
          "created_at"?: string
        };
        Relationships: [];
      };
      "loan_payments": {
        Row: {
          "id": string;
          "loan_id": string;
          "payment_date": string;
          "principal_amount": number;
          "interest_amount": number;
          "total_amount": number;
          "remaining_amount": number;
          "payment_method": string;
          "notes": string | null;
          "branch_id": string;
          "cash_transaction_id": string | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "loan_id": string;
          "payment_date": string;
          "principal_amount": number;
          "interest_amount": number;
          "total_amount": number;
          "remaining_amount": number;
          "payment_method": string;
          "notes"?: string | null;
          "branch_id": string;
          "cash_transaction_id"?: string | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "loan_id"?: string;
          "payment_date"?: string;
          "principal_amount"?: number;
          "interest_amount"?: number;
          "total_amount"?: number;
          "remaining_amount"?: number;
          "payment_method"?: string;
          "notes"?: string | null;
          "branch_id"?: string;
          "cash_transaction_id"?: string | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "loans": {
        Row: {
          "id": string;
          "lender_name": string;
          "loan_type": string;
          "principal": number;
          "interest_rate": number;
          "term": number;
          "start_date": string;
          "end_date": string;
          "remaining_amount": number;
          "monthly_payment": number;
          "status": string;
          "purpose": string | null;
          "collateral": string | null;
          "notes": string | null;
          "branch_id": string;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "lender_name": string;
          "loan_type": string;
          "principal": number;
          "interest_rate": number;
          "term": number;
          "start_date": string;
          "end_date": string;
          "remaining_amount": number;
          "monthly_payment": number;
          "status": string;
          "purpose"?: string | null;
          "collateral"?: string | null;
          "notes"?: string | null;
          "branch_id": string;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "lender_name"?: string;
          "loan_type"?: string;
          "principal"?: number;
          "interest_rate"?: number;
          "term"?: number;
          "start_date"?: string;
          "end_date"?: string;
          "remaining_amount"?: number;
          "monthly_payment"?: number;
          "status"?: string;
          "purpose"?: string | null;
          "collateral"?: string | null;
          "notes"?: string | null;
          "branch_id"?: string;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "marketing_projects": {
        Row: {
          "id": string;
          "name": string;
          "description": string | null;
          "status": string;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "name": string;
          "description"?: string | null;
          "status": string;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "description"?: string | null;
          "status"?: string;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "media_versions": {
        Row: {
          "id": string;
          "video_id": string;
          "version_number": number;
          "file_path": string;
          "notes": string | null;
          "branch_id": string;
          "created_at": string
        };
        Insert: {
          "id"?: string;
          "video_id": string;
          "version_number": number;
          "file_path": string;
          "notes"?: string | null;
          "branch_id": string;
          "created_at"?: string
        };
        Update: {
          "id"?: string;
          "video_id"?: string;
          "version_number"?: number;
          "file_path"?: string;
          "notes"?: string | null;
          "branch_id"?: string;
          "created_at"?: string
        };
        Relationships: [];
      };
      "motocare_customers": {
        Row: {
          "id": string;
          "name": string;
          "phone": string | null;
          "address": string | null;
          "email": string | null;
          "licenseplate": string | null;
          "vehicleModel": string | null;
          "vehicleBrand": string | null;
          "notes": string | null;
          "branchId": string | null;
          "loyaltypoints": number | null;
          "customertype": string | null;
          "discount": number | null;
          "totalSpent": number | null;
          "visitCount": number | null;
          "created_by": string | null;
          "updated_by": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "phone"?: string | null;
          "address"?: string | null;
          "email"?: string | null;
          "licenseplate"?: string | null;
          "vehicleModel"?: string | null;
          "vehicleBrand"?: string | null;
          "notes"?: string | null;
          "branchId"?: string | null;
          "loyaltypoints"?: number | null;
          "customertype"?: string | null;
          "discount"?: number | null;
          "totalSpent"?: number | null;
          "visitCount"?: number | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "phone"?: string | null;
          "address"?: string | null;
          "email"?: string | null;
          "licenseplate"?: string | null;
          "vehicleModel"?: string | null;
          "vehicleBrand"?: string | null;
          "notes"?: string | null;
          "branchId"?: string | null;
          "loyaltypoints"?: number | null;
          "customertype"?: string | null;
          "discount"?: number | null;
          "totalSpent"?: number | null;
          "visitCount"?: number | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "motocare_inventorytransactions": {
        Row: {
          "id": string;
          "partId": string | null;
          "partName": string | null;
          "partSku": string | null;
          "type": string;
          "quantity": number;
          "unitPrice": number | null;
          "totalPrice": number | null;
          "transactionDate": string;
          "branchId": string | null;
          "referenceId": string | null;
          "workOrderId": string | null;
          "saleId": string | null;
          "notes": string | null;
          "previousStock": number | null;
          "newStock": number | null;
          "created_by": string | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "partId"?: string | null;
          "partName"?: string | null;
          "partSku"?: string | null;
          "type": string;
          "quantity": number;
          "unitPrice"?: number | null;
          "totalPrice"?: number | null;
          "transactionDate": string;
          "branchId"?: string | null;
          "referenceId"?: string | null;
          "workOrderId"?: string | null;
          "saleId"?: string | null;
          "notes"?: string | null;
          "previousStock"?: number | null;
          "newStock"?: number | null;
          "created_by"?: string | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "partId"?: string | null;
          "partName"?: string | null;
          "partSku"?: string | null;
          "type"?: string;
          "quantity"?: number;
          "unitPrice"?: number | null;
          "totalPrice"?: number | null;
          "transactionDate"?: string;
          "branchId"?: string | null;
          "referenceId"?: string | null;
          "workOrderId"?: string | null;
          "saleId"?: string | null;
          "notes"?: string | null;
          "previousStock"?: number | null;
          "newStock"?: number | null;
          "created_by"?: string | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "motocare_parts": {
        Row: {
          "id": string;
          "name": string;
          "sku": string | null;
          "category": string | null;
          "price": number | null;
          "retailprice": number | null;
          "wholesaleprice": number | null;
          "purchaseprice": number | null;
          "cost": number | null;
          "stock": Record<string, number> | null;
          "minStock": number | null;
          "unit": string | null;
          "supplier": string | null;
          "supplierPhone": string | null;
          "branchId": string | null;
          "description": string | null;
          "barcode": string | null;
          "image": string | null;
          "isActive": boolean | null;
          "created_by": string | null;
          "updated_by": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "sku"?: string | null;
          "category"?: string | null;
          "price"?: number | null;
          "retailprice"?: number | null;
          "wholesaleprice"?: number | null;
          "purchaseprice"?: number | null;
          "cost"?: number | null;
          "stock"?: Record<string, number> | null;
          "minStock"?: number | null;
          "unit"?: string | null;
          "supplier"?: string | null;
          "supplierPhone"?: string | null;
          "branchId"?: string | null;
          "description"?: string | null;
          "barcode"?: string | null;
          "image"?: string | null;
          "isActive"?: boolean | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "sku"?: string | null;
          "category"?: string | null;
          "price"?: number | null;
          "retailprice"?: number | null;
          "wholesaleprice"?: number | null;
          "purchaseprice"?: number | null;
          "cost"?: number | null;
          "stock"?: Record<string, number> | null;
          "minStock"?: number | null;
          "unit"?: string | null;
          "supplier"?: string | null;
          "supplierPhone"?: string | null;
          "branchId"?: string | null;
          "description"?: string | null;
          "barcode"?: string | null;
          "image"?: string | null;
          "isActive"?: boolean | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "motocare_sales": {
        Row: {
          "id": string;
          "saleNumber": string | null;
          "date": string;
          "customer": Json | null;
          "customerId": string | null;
          "customerName": string | null;
          "customerPhone": string | null;
          "items": Json | null;
          "subtotal": number | null;
          "total": number | null;
          "paymentMethod": string | null;
          "paymentStatus": string | null;
          "branchId": string;
          "discountType": string | null;
          "discountValue": number | null;
          "discountAmount": number | null;
          "notes": string | null;
          "soldBy": string | null;
          "created_by": string | null;
          "updated_by": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "saleNumber"?: string | null;
          "date": string;
          "customer"?: Json | null;
          "customerId"?: string | null;
          "customerName"?: string | null;
          "customerPhone"?: string | null;
          "items"?: Json | null;
          "subtotal"?: number | null;
          "total"?: number | null;
          "paymentMethod"?: string | null;
          "paymentStatus"?: string | null;
          "branchId": string;
          "discountType"?: string | null;
          "discountValue"?: number | null;
          "discountAmount"?: number | null;
          "notes"?: string | null;
          "soldBy"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "saleNumber"?: string | null;
          "date"?: string;
          "customer"?: Json | null;
          "customerId"?: string | null;
          "customerName"?: string | null;
          "customerPhone"?: string | null;
          "items"?: Json | null;
          "subtotal"?: number | null;
          "total"?: number | null;
          "paymentMethod"?: string | null;
          "paymentStatus"?: string | null;
          "branchId"?: string;
          "discountType"?: string | null;
          "discountValue"?: number | null;
          "discountAmount"?: number | null;
          "notes"?: string | null;
          "soldBy"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "motocare_workorders": {
        Row: {
          "id": string;
          "workOrderNumber": string | null;
          "customerId": string | null;
          "customerName": string;
          "customerPhone": string | null;
          "customerAddress": string | null;
          "licensePlate": string | null;
          "vehicleModel": string | null;
          "vehicleBrand": string | null;
          "mileage": string | null;
          "issueDescription": string | null;
          "technicianName": string | null;
          "advisorName": string | null;
          "status": string | null;
          "priority": string | null;
          "creationDate": string | null;
          "completionDate": string | null;
          "estimatedCompletionDate": string | null;
          "laborCost": number | null;
          "subtotal": number | null;
          "total": number | null;
          "depositAmount": number | null;
          "paidAmount": number | null;
          "remainingAmount": number | null;
          "paymentStatus": string | null;
          "paymentMethod": string | null;
          "partsUsed": Json | null;
          "quotationItems": Json | null;
          "discountType": string | null;
          "discountValue": number | null;
          "discountAmount": number | null;
          "branchId": string;
          "notes": string | null;
          "internalNotes": string | null;
          "images": Json | null;
          "created_by": string | null;
          "updated_by": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "workOrderNumber"?: string | null;
          "customerId"?: string | null;
          "customerName": string;
          "customerPhone"?: string | null;
          "customerAddress"?: string | null;
          "licensePlate"?: string | null;
          "vehicleModel"?: string | null;
          "vehicleBrand"?: string | null;
          "mileage"?: string | null;
          "issueDescription"?: string | null;
          "technicianName"?: string | null;
          "advisorName"?: string | null;
          "status"?: string | null;
          "priority"?: string | null;
          "creationDate"?: string | null;
          "completionDate"?: string | null;
          "estimatedCompletionDate"?: string | null;
          "laborCost"?: number | null;
          "subtotal"?: number | null;
          "total"?: number | null;
          "depositAmount"?: number | null;
          "paidAmount"?: number | null;
          "remainingAmount"?: number | null;
          "paymentStatus"?: string | null;
          "paymentMethod"?: string | null;
          "partsUsed"?: Json | null;
          "quotationItems"?: Json | null;
          "discountType"?: string | null;
          "discountValue"?: number | null;
          "discountAmount"?: number | null;
          "branchId": string;
          "notes"?: string | null;
          "internalNotes"?: string | null;
          "images"?: Json | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "workOrderNumber"?: string | null;
          "customerId"?: string | null;
          "customerName"?: string;
          "customerPhone"?: string | null;
          "customerAddress"?: string | null;
          "licensePlate"?: string | null;
          "vehicleModel"?: string | null;
          "vehicleBrand"?: string | null;
          "mileage"?: string | null;
          "issueDescription"?: string | null;
          "technicianName"?: string | null;
          "advisorName"?: string | null;
          "status"?: string | null;
          "priority"?: string | null;
          "creationDate"?: string | null;
          "completionDate"?: string | null;
          "estimatedCompletionDate"?: string | null;
          "laborCost"?: number | null;
          "subtotal"?: number | null;
          "total"?: number | null;
          "depositAmount"?: number | null;
          "paidAmount"?: number | null;
          "remainingAmount"?: number | null;
          "paymentStatus"?: string | null;
          "paymentMethod"?: string | null;
          "partsUsed"?: Json | null;
          "quotationItems"?: Json | null;
          "discountType"?: string | null;
          "discountValue"?: number | null;
          "discountAmount"?: number | null;
          "branchId"?: string;
          "notes"?: string | null;
          "internalNotes"?: string | null;
          "images"?: Json | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "notifications": {
        Row: {
          "id": string;
          "type": string;
          "title": string;
          "message": string;
          "data": Json | null;
          "created_by": string | null;
          "recipient_id": string | null;
          "recipient_role": string | null;
          "branch_id": string | null;
          "is_read": boolean | null;
          "read_at": string | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "type": string;
          "title": string;
          "message": string;
          "data"?: Json | null;
          "created_by"?: string | null;
          "recipient_id"?: string | null;
          "recipient_role"?: string | null;
          "branch_id"?: string | null;
          "is_read"?: boolean | null;
          "read_at"?: string | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "type"?: string;
          "title"?: string;
          "message"?: string;
          "data"?: Json | null;
          "created_by"?: string | null;
          "recipient_id"?: string | null;
          "recipient_role"?: string | null;
          "branch_id"?: string | null;
          "is_read"?: boolean | null;
          "read_at"?: string | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "parts": {
        Row: {
          "id": string;
          "name": string;
          "sku": string;
          "stock": Record<string, number> | null;
          "retailPrice": Record<string, number> | null;
          "wholesalePrice": Record<string, number> | null;
          "category": string | null;
          "description": string | null;
          "warrantyPeriod": string | null;
          "created_at": string | null;
          "costPrice": Record<string, number> | null;
          "barcode": string | null;
          "reservedstock": Record<string, number> | null;
          "minstock": Record<string, number> | null;
          "imageUrl": string | null;
          "preferred_supplier_id": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "sku": string;
          "stock"?: Record<string, number> | null;
          "retailPrice"?: Record<string, number> | null;
          "wholesalePrice"?: Record<string, number> | null;
          "category"?: string | null;
          "description"?: string | null;
          "warrantyPeriod"?: string | null;
          "created_at"?: string | null;
          "costPrice"?: Record<string, number> | null;
          "barcode"?: string | null;
          "reservedstock"?: Record<string, number> | null;
          "minstock"?: Record<string, number> | null;
          "imageUrl"?: string | null;
          "preferred_supplier_id"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "sku"?: string;
          "stock"?: Record<string, number> | null;
          "retailPrice"?: Record<string, number> | null;
          "wholesalePrice"?: Record<string, number> | null;
          "category"?: string | null;
          "description"?: string | null;
          "warrantyPeriod"?: string | null;
          "created_at"?: string | null;
          "costPrice"?: Record<string, number> | null;
          "barcode"?: string | null;
          "reservedstock"?: Record<string, number> | null;
          "minstock"?: Record<string, number> | null;
          "imageUrl"?: string | null;
          "preferred_supplier_id"?: string | null
        };
        Relationships: [];
      };
      "parts_available_stock": {
        Row: {
          "id": string | null;
          "name": string | null;
          "sku": string | null;
          "category": string | null;
          "stock": Record<string, number> | null;
          "reservedstock": Record<string, number> | null;
          "availablestock": Json | null
        };
        Insert: {
          "id"?: string | null;
          "name"?: string | null;
          "sku"?: string | null;
          "category"?: string | null;
          "stock"?: Record<string, number> | null;
          "reservedstock"?: Record<string, number> | null;
          "availablestock"?: Json | null
        };
        Update: {
          "id"?: string | null;
          "name"?: string | null;
          "sku"?: string | null;
          "category"?: string | null;
          "stock"?: Record<string, number> | null;
          "reservedstock"?: Record<string, number> | null;
          "availablestock"?: Json | null
        };
        Relationships: [];
      };
      "parts_stock_backup": {
        Row: {
          "id": number;
          "part_id": string;
          "part_name": string | null;
          "sku": string | null;
          "old_stock": Json | null;
          "new_stock": Json | null;
          "backup_date": string | null
        };
        Insert: {
          "id"?: number;
          "part_id": string;
          "part_name"?: string | null;
          "sku"?: string | null;
          "old_stock"?: Json | null;
          "new_stock"?: Json | null;
          "backup_date"?: string | null
        };
        Update: {
          "id"?: number;
          "part_id"?: string;
          "part_name"?: string | null;
          "sku"?: string | null;
          "old_stock"?: Json | null;
          "new_stock"?: Json | null;
          "backup_date"?: string | null
        };
        Relationships: [];
      };
      "payment_sources": {
        Row: {
          "id": string;
          "name": string;
          "balance": Record<string, number> | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "balance"?: Record<string, number> | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "balance"?: Record<string, number> | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "paymentsources": {
        Row: {
          "id": string;
          "name": string;
          "type": string;
          "balance": Record<string, number> | null;
          "initialBalance": number | null;
          "branchId": string | null;
          "accountNumber": string | null;
          "bankName": string | null;
          "description": string | null;
          "isActive": boolean | null;
          "isDefault": boolean | null;
          "created_by": string | null;
          "updated_by": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "type": string;
          "balance"?: Record<string, number> | null;
          "initialBalance"?: number | null;
          "branchId"?: string | null;
          "accountNumber"?: string | null;
          "bankName"?: string | null;
          "description"?: string | null;
          "isActive"?: boolean | null;
          "isDefault"?: boolean | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "type"?: string;
          "balance"?: Record<string, number> | null;
          "initialBalance"?: number | null;
          "branchId"?: string | null;
          "accountNumber"?: string | null;
          "bankName"?: string | null;
          "description"?: string | null;
          "isActive"?: boolean | null;
          "isDefault"?: boolean | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "payroll_records": {
        Row: {
          "id": string;
          "employee_id": string | null;
          "employee_name": string | null;
          "month": string | null;
          "base_salary": number | null;
          "allowances": number | null;
          "bonus": number | null;
          "deduction": number | null;
          "work_days": number | null;
          "standard_work_days": number | null;
          "social_insurance": number | null;
          "health_insurance": number | null;
          "unemployment_insurance": number | null;
          "personal_income_tax": number | null;
          "net_salary": number | null;
          "payment_status": string | null;
          "payment_date": string | null;
          "payment_method": string | null;
          "notes": string | null;
          "branch_id": string | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "employee_id"?: string | null;
          "employee_name"?: string | null;
          "month"?: string | null;
          "base_salary"?: number | null;
          "allowances"?: number | null;
          "bonus"?: number | null;
          "deduction"?: number | null;
          "work_days"?: number | null;
          "standard_work_days"?: number | null;
          "social_insurance"?: number | null;
          "health_insurance"?: number | null;
          "unemployment_insurance"?: number | null;
          "personal_income_tax"?: number | null;
          "net_salary"?: number | null;
          "payment_status"?: string | null;
          "payment_date"?: string | null;
          "payment_method"?: string | null;
          "notes"?: string | null;
          "branch_id"?: string | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "employee_id"?: string | null;
          "employee_name"?: string | null;
          "month"?: string | null;
          "base_salary"?: number | null;
          "allowances"?: number | null;
          "bonus"?: number | null;
          "deduction"?: number | null;
          "work_days"?: number | null;
          "standard_work_days"?: number | null;
          "social_insurance"?: number | null;
          "health_insurance"?: number | null;
          "unemployment_insurance"?: number | null;
          "personal_income_tax"?: number | null;
          "net_salary"?: number | null;
          "payment_status"?: string | null;
          "payment_date"?: string | null;
          "payment_method"?: string | null;
          "notes"?: string | null;
          "branch_id"?: string | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "pin_repair_orders": {
        Row: {
          "id": string;
          "creation_date": string;
          "customer_name": string;
          "customer_phone": string;
          "device_name": string | null;
          "issue_description": string;
          "technician_name": string | null;
          "status": string;
          "materials_used": Json | null;
          "outsourcing_items": Json | null;
          "labor_cost": number | null;
          "total": number;
          "notes": string | null;
          "payment_status": string;
          "partial_payment_amount": number | null;
          "deposit_amount": number | null;
          "payment_method": string | null;
          "payment_date": string | null;
          "due_date": string | null;
          "cash_transaction_id": string | null;
          "created_at": string;
          "quoted_at": string | null;
          "quote_approved_at": string | null;
          "quote_approved": boolean | null;
          "quoted_materials_cost": number | null;
          "quoted_labor_cost": number | null;
          "quoted_total": number | null;
          "has_material_shortage": boolean | null;
          "linked_purchase_order_id": string | null;
          "materials_deducted": boolean | null;
          "materials_deducted_at": string | null
        };
        Insert: {
          "id"?: string;
          "creation_date": string;
          "customer_name": string;
          "customer_phone": string;
          "device_name"?: string | null;
          "issue_description": string;
          "technician_name"?: string | null;
          "status": string;
          "materials_used"?: Json | null;
          "outsourcing_items"?: Json | null;
          "labor_cost"?: number | null;
          "total": number;
          "notes"?: string | null;
          "payment_status": string;
          "partial_payment_amount"?: number | null;
          "deposit_amount"?: number | null;
          "payment_method"?: string | null;
          "payment_date"?: string | null;
          "due_date"?: string | null;
          "cash_transaction_id"?: string | null;
          "created_at"?: string;
          "quoted_at"?: string | null;
          "quote_approved_at"?: string | null;
          "quote_approved"?: boolean | null;
          "quoted_materials_cost"?: number | null;
          "quoted_labor_cost"?: number | null;
          "quoted_total"?: number | null;
          "has_material_shortage"?: boolean | null;
          "linked_purchase_order_id"?: string | null;
          "materials_deducted"?: boolean | null;
          "materials_deducted_at"?: string | null
        };
        Update: {
          "id"?: string;
          "creation_date"?: string;
          "customer_name"?: string;
          "customer_phone"?: string;
          "device_name"?: string | null;
          "issue_description"?: string;
          "technician_name"?: string | null;
          "status"?: string;
          "materials_used"?: Json | null;
          "outsourcing_items"?: Json | null;
          "labor_cost"?: number | null;
          "total"?: number;
          "notes"?: string | null;
          "payment_status"?: string;
          "partial_payment_amount"?: number | null;
          "deposit_amount"?: number | null;
          "payment_method"?: string | null;
          "payment_date"?: string | null;
          "due_date"?: string | null;
          "cash_transaction_id"?: string | null;
          "created_at"?: string;
          "quoted_at"?: string | null;
          "quote_approved_at"?: string | null;
          "quote_approved"?: boolean | null;
          "quoted_materials_cost"?: number | null;
          "quoted_labor_cost"?: number | null;
          "quoted_total"?: number | null;
          "has_material_shortage"?: boolean | null;
          "linked_purchase_order_id"?: string | null;
          "materials_deducted"?: boolean | null;
          "materials_deducted_at"?: string | null
        };
        Relationships: [];
      };
      "profiles": {
        Row: {
          "id": string;
          "email": string | null;
          "name": string | null;
          "allowedApps": Json | null;
          "role": string | null;
          "status": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "branch_id": string | null;
          "full_name": string | null
        };
        Insert: {
          "id"?: string;
          "email"?: string | null;
          "name"?: string | null;
          "allowedApps"?: Json | null;
          "role"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "branch_id"?: string | null;
          "full_name"?: string | null
        };
        Update: {
          "id"?: string;
          "email"?: string | null;
          "name"?: string | null;
          "allowedApps"?: Json | null;
          "role"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "branch_id"?: string | null;
          "full_name"?: string | null
        };
        Relationships: [];
      };
      "project_researches": {
        Row: {
          "id": string;
          "project_id": string;
          "title": string;
          "content": string;
          "links": Json | null;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "project_id": string;
          "title": string;
          "content": string;
          "links"?: Json | null;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "project_id"?: string;
          "title"?: string;
          "content"?: string;
          "links"?: Json | null;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "promotions": {
        Row: {
          "id": string;
          "title": string;
          "description": string | null;
          "discount_percent": number | null;
          "discount_amount": number | null;
          "start_date": string;
          "end_date": string;
          "image_url": string | null;
          "products": Json | null;
          "min_purchase": number | null;
          "is_active": boolean | null;
          "featured": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
          "created_by": string | null;
          "branch_id": string | null;
          "detail_image_url": string | null
        };
        Insert: {
          "id"?: string;
          "title": string;
          "description"?: string | null;
          "discount_percent"?: number | null;
          "discount_amount"?: number | null;
          "start_date": string;
          "end_date": string;
          "image_url"?: string | null;
          "products"?: Json | null;
          "min_purchase"?: number | null;
          "is_active"?: boolean | null;
          "featured"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "branch_id"?: string | null;
          "detail_image_url"?: string | null
        };
        Update: {
          "id"?: string;
          "title"?: string;
          "description"?: string | null;
          "discount_percent"?: number | null;
          "discount_amount"?: number | null;
          "start_date"?: string;
          "end_date"?: string;
          "image_url"?: string | null;
          "products"?: Json | null;
          "min_purchase"?: number | null;
          "is_active"?: boolean | null;
          "featured"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "branch_id"?: string | null;
          "detail_image_url"?: string | null
        };
        Relationships: [];
      };
      "public_parts": {
        Row: {
          "id": string | null;
          "name": string | null;
          "sku": string | null;
          "barcode": string | null;
          "category": string | null;
          "description": string | null;
          "stock": Record<string, number> | null;
          "retailPrice": Record<string, number> | null;
          "wholesalePrice": Record<string, number> | null;
          "imageUrl": string | null;
          "warrantyPeriod": string | null
        };
        Insert: {
          "id"?: string | null;
          "name"?: string | null;
          "sku"?: string | null;
          "barcode"?: string | null;
          "category"?: string | null;
          "description"?: string | null;
          "stock"?: Record<string, number> | null;
          "retailPrice"?: Record<string, number> | null;
          "wholesalePrice"?: Record<string, number> | null;
          "imageUrl"?: string | null;
          "warrantyPeriod"?: string | null
        };
        Update: {
          "id"?: string | null;
          "name"?: string | null;
          "sku"?: string | null;
          "barcode"?: string | null;
          "category"?: string | null;
          "description"?: string | null;
          "stock"?: Record<string, number> | null;
          "retailPrice"?: Record<string, number> | null;
          "wholesalePrice"?: Record<string, number> | null;
          "imageUrl"?: string | null;
          "warrantyPeriod"?: string | null
        };
        Relationships: [];
      };
      "purchase_order_items": {
        Row: {
          "id": string;
          "po_id": string;
          "part_id": string;
          "quantity_ordered": number;
          "quantity_received": number | null;
          "unit_price": number;
          "total_price": number | null;
          "notes": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "po_id": string;
          "part_id": string;
          "quantity_ordered": number;
          "quantity_received"?: number | null;
          "unit_price": number;
          "total_price"?: number | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "po_id"?: string;
          "part_id"?: string;
          "quantity_ordered"?: number;
          "quantity_received"?: number | null;
          "unit_price"?: number;
          "total_price"?: number | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "purchase_orders": {
        Row: {
          "id": string;
          "po_number": string;
          "supplier_id": string | null;
          "branch_id": string;
          "status": string;
          "order_date": string | null;
          "expected_date": string | null;
          "received_date": string | null;
          "total_amount": number | null;
          "discount_amount": number | null;
          "final_amount": number | null;
          "notes": string | null;
          "cancellation_reason": string | null;
          "receipt_id": string | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "shipping_fee": number | null
        };
        Insert: {
          "id"?: string;
          "po_number": string;
          "supplier_id"?: string | null;
          "branch_id": string;
          "status": string;
          "order_date"?: string | null;
          "expected_date"?: string | null;
          "received_date"?: string | null;
          "total_amount"?: number | null;
          "discount_amount"?: number | null;
          "final_amount"?: number | null;
          "notes"?: string | null;
          "cancellation_reason"?: string | null;
          "receipt_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "shipping_fee"?: number | null
        };
        Update: {
          "id"?: string;
          "po_number"?: string;
          "supplier_id"?: string | null;
          "branch_id"?: string;
          "status"?: string;
          "order_date"?: string | null;
          "expected_date"?: string | null;
          "received_date"?: string | null;
          "total_amount"?: number | null;
          "discount_amount"?: number | null;
          "final_amount"?: number | null;
          "notes"?: string | null;
          "cancellation_reason"?: string | null;
          "receipt_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "shipping_fee"?: number | null
        };
        Relationships: [];
      };
      "quick_services": {
        Row: {
          "id": string;
          "name": string;
          "price": number;
          "category": string | null;
          "description": string | null;
          "icon": string | null;
          "color": string | null;
          "sort_order": number | null;
          "is_active": boolean | null;
          "branch_id": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "price": number;
          "category"?: string | null;
          "description"?: string | null;
          "icon"?: string | null;
          "color"?: string | null;
          "sort_order"?: number | null;
          "is_active"?: boolean | null;
          "branch_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "price"?: number;
          "category"?: string | null;
          "description"?: string | null;
          "icon"?: string | null;
          "color"?: string | null;
          "sort_order"?: number | null;
          "is_active"?: boolean | null;
          "branch_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "repair_templates": {
        Row: {
          "id": string;
          "branch_id": string | null;
          "name": string;
          "description": string | null;
          "duration": number | null;
          "labor_cost": number | null;
          "parts": Json | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
          "created_by": string | null
        };
        Insert: {
          "id"?: string;
          "branch_id"?: string | null;
          "name": string;
          "description"?: string | null;
          "duration"?: number | null;
          "labor_cost"?: number | null;
          "parts"?: Json | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null
        };
        Update: {
          "id"?: string;
          "branch_id"?: string | null;
          "name"?: string;
          "description"?: string | null;
          "duration"?: number | null;
          "labor_cost"?: number | null;
          "parts"?: Json | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null
        };
        Relationships: [];
      };
      "sales": {
        Row: {
          "id": string;
          "date": string;
          "items": Json;
          "subtotal": number;
          "discount": number | null;
          "total": number;
          "customer": Json;
          "paymentmethod": string;
          "userid": string | null;
          "username": string;
          "branchid": string;
          "cashtransactionid": string | null;
          "created_at": string | null;
          "sale_code": string | null;
          "vat_rate": number | null;
          "vat_amount": number | null;
          "amount_before_vat": number | null;
          "delivery_method": string | null;
          "delivery_status": string | null;
          "delivery_address": string | null;
          "delivery_phone": string | null;
          "delivery_note": string | null;
          "shipper_id": string | null;
          "cod_amount": number | null;
          "shipping_fee": number | null;
          "estimated_delivery_date": string | null;
          "actual_delivery_date": string | null;
          "note": string | null
        };
        Insert: {
          "id"?: string;
          "date": string;
          "items": Json;
          "subtotal": number;
          "discount"?: number | null;
          "total": number;
          "customer": Json;
          "paymentmethod": string;
          "userid"?: string | null;
          "username": string;
          "branchid": string;
          "cashtransactionid"?: string | null;
          "created_at"?: string | null;
          "sale_code"?: string | null;
          "vat_rate"?: number | null;
          "vat_amount"?: number | null;
          "amount_before_vat"?: number | null;
          "delivery_method"?: string | null;
          "delivery_status"?: string | null;
          "delivery_address"?: string | null;
          "delivery_phone"?: string | null;
          "delivery_note"?: string | null;
          "shipper_id"?: string | null;
          "cod_amount"?: number | null;
          "shipping_fee"?: number | null;
          "estimated_delivery_date"?: string | null;
          "actual_delivery_date"?: string | null;
          "note"?: string | null
        };
        Update: {
          "id"?: string;
          "date"?: string;
          "items"?: Json;
          "subtotal"?: number;
          "discount"?: number | null;
          "total"?: number;
          "customer"?: Json;
          "paymentmethod"?: string;
          "userid"?: string | null;
          "username"?: string;
          "branchid"?: string;
          "cashtransactionid"?: string | null;
          "created_at"?: string | null;
          "sale_code"?: string | null;
          "vat_rate"?: number | null;
          "vat_amount"?: number | null;
          "amount_before_vat"?: number | null;
          "delivery_method"?: string | null;
          "delivery_status"?: string | null;
          "delivery_address"?: string | null;
          "delivery_phone"?: string | null;
          "delivery_note"?: string | null;
          "shipper_id"?: string | null;
          "cod_amount"?: number | null;
          "shipping_fee"?: number | null;
          "estimated_delivery_date"?: string | null;
          "actual_delivery_date"?: string | null;
          "note"?: string | null
        };
        Relationships: [];
      };
      "sales_installments": {
        Row: {
          "id": string;
          "sale_id": string;
          "customer_id": string | null;
          "customer_name": string;
          "customer_phone": string | null;
          "total_amount": number;
          "prepaid_amount": number;
          "remaining_amount": number;
          "interest_rate": number;
          "total_with_interest": number;
          "num_installments": number;
          "installment_amount": number;
          "current_installment": number;
          "next_payment_date": string | null;
          "finance_company": string | null;
          "status": string;
          "start_date": string;
          "end_date": string | null;
          "notes": string | null;
          "branch_id": string;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "sale_id": string;
          "customer_id"?: string | null;
          "customer_name": string;
          "customer_phone"?: string | null;
          "total_amount": number;
          "prepaid_amount": number;
          "remaining_amount": number;
          "interest_rate": number;
          "total_with_interest": number;
          "num_installments": number;
          "installment_amount": number;
          "current_installment": number;
          "next_payment_date"?: string | null;
          "finance_company"?: string | null;
          "status": string;
          "start_date": string;
          "end_date"?: string | null;
          "notes"?: string | null;
          "branch_id": string;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "sale_id"?: string;
          "customer_id"?: string | null;
          "customer_name"?: string;
          "customer_phone"?: string | null;
          "total_amount"?: number;
          "prepaid_amount"?: number;
          "remaining_amount"?: number;
          "interest_rate"?: number;
          "total_with_interest"?: number;
          "num_installments"?: number;
          "installment_amount"?: number;
          "current_installment"?: number;
          "next_payment_date"?: string | null;
          "finance_company"?: string | null;
          "status"?: string;
          "start_date"?: string;
          "end_date"?: string | null;
          "notes"?: string | null;
          "branch_id"?: string;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "scripts": {
        Row: {
          "id": string;
          "idea_id": string | null;
          "hook": string | null;
          "introduction": string | null;
          "content": string | null;
          "cta": string | null;
          "duration": number;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "idea_id"?: string | null;
          "hook"?: string | null;
          "introduction"?: string | null;
          "content"?: string | null;
          "cta"?: string | null;
          "duration": number;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "idea_id"?: string | null;
          "hook"?: string | null;
          "introduction"?: string | null;
          "content"?: string | null;
          "cta"?: string | null;
          "duration"?: number;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "shooting_checklists": {
        Row: {
          "id": string;
          "project_id": string;
          "item_name": string;
          "is_checked": boolean;
          "category": string | null;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "project_id": string;
          "item_name": string;
          "is_checked": boolean;
          "category"?: string | null;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "project_id"?: string;
          "item_name"?: string;
          "is_checked"?: boolean;
          "category"?: string | null;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "shot_lists": {
        Row: {
          "id": string;
          "project_id": string;
          "description": string;
          "duration": number;
          "sequence_order": number;
          "status": string;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "project_id": string;
          "description": string;
          "duration": number;
          "sequence_order": number;
          "status": string;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "project_id"?: string;
          "description"?: string;
          "duration"?: number;
          "sequence_order"?: number;
          "status"?: string;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "staff_permissions": {
        Row: {
          "user_id": string;
          "permissions": Json;
          "updated_by": string | null;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "user_id": string;
          "permissions": Json;
          "updated_by"?: string | null;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "user_id"?: string;
          "permissions"?: Json;
          "updated_by"?: string | null;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "store_settings": {
        Row: {
          "id": string;
          "created_by": string | null;
          "name": string | null;
          "address": string | null;
          "phone": string | null;
          "email": string | null;
          "logo": string | null;
          "bankName": string | null;
          "bankAccountNumber": string | null;
          "bankAccountHolder": string | null;
          "branches": Json | null;
          "created_at": string | null;
          "updated_at": string | null;
          "bank_qr_url": string | null;
          "business_hours": string | null;
          "established_year": number | null;
          "primary_color": string | null;
          "bank_name": string | null;
          "bank_account_number": string | null;
          "bank_account_holder": string | null;
          "bank_branch": string | null;
          "invoice_prefix": string | null;
          "receipt_prefix": string | null;
          "work_order_prefix": string | null;
          "invoice_footer_note": string | null;
          "currency": string | null;
          "date_format": string | null;
          "timezone": string | null;
          "store_name": string;
          "store_name_en": string | null;
          "slogan": string | null;
          "website": string | null;
          "tax_code": string | null;
          "logo_url": string | null;
          "sale_prefix": string | null;
          "tax_authority": string | null;
          "tax_department": string | null;
          "business_license_number": string | null;
          "business_license_date": string | null;
          "legal_representative": string | null;
          "accountant_name": string | null;
          "accountant_phone": string | null;
          "theme_preset": string | null;
          "momo_phone_number": string | null;
          "momo_account_holder": string | null;
          "retail_markup_percent": number | null;
          "wholesale_markup_percent": number | null;
          "print_paper_size": string | null;
          "print_show_logo": boolean | null;
          "print_greeting": string | null
        };
        Insert: {
          "id"?: string;
          "created_by"?: string | null;
          "name"?: string | null;
          "address"?: string | null;
          "phone"?: string | null;
          "email"?: string | null;
          "logo"?: string | null;
          "bankName"?: string | null;
          "bankAccountNumber"?: string | null;
          "bankAccountHolder"?: string | null;
          "branches"?: Json | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "bank_qr_url"?: string | null;
          "business_hours"?: string | null;
          "established_year"?: number | null;
          "primary_color"?: string | null;
          "bank_name"?: string | null;
          "bank_account_number"?: string | null;
          "bank_account_holder"?: string | null;
          "bank_branch"?: string | null;
          "invoice_prefix"?: string | null;
          "receipt_prefix"?: string | null;
          "work_order_prefix"?: string | null;
          "invoice_footer_note"?: string | null;
          "currency"?: string | null;
          "date_format"?: string | null;
          "timezone"?: string | null;
          "store_name": string;
          "store_name_en"?: string | null;
          "slogan"?: string | null;
          "website"?: string | null;
          "tax_code"?: string | null;
          "logo_url"?: string | null;
          "sale_prefix"?: string | null;
          "tax_authority"?: string | null;
          "tax_department"?: string | null;
          "business_license_number"?: string | null;
          "business_license_date"?: string | null;
          "legal_representative"?: string | null;
          "accountant_name"?: string | null;
          "accountant_phone"?: string | null;
          "theme_preset"?: string | null;
          "momo_phone_number"?: string | null;
          "momo_account_holder"?: string | null;
          "retail_markup_percent"?: number | null;
          "wholesale_markup_percent"?: number | null;
          "print_paper_size"?: string | null;
          "print_show_logo"?: boolean | null;
          "print_greeting"?: string | null
        };
        Update: {
          "id"?: string;
          "created_by"?: string | null;
          "name"?: string | null;
          "address"?: string | null;
          "phone"?: string | null;
          "email"?: string | null;
          "logo"?: string | null;
          "bankName"?: string | null;
          "bankAccountNumber"?: string | null;
          "bankAccountHolder"?: string | null;
          "branches"?: Json | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "bank_qr_url"?: string | null;
          "business_hours"?: string | null;
          "established_year"?: number | null;
          "primary_color"?: string | null;
          "bank_name"?: string | null;
          "bank_account_number"?: string | null;
          "bank_account_holder"?: string | null;
          "bank_branch"?: string | null;
          "invoice_prefix"?: string | null;
          "receipt_prefix"?: string | null;
          "work_order_prefix"?: string | null;
          "invoice_footer_note"?: string | null;
          "currency"?: string | null;
          "date_format"?: string | null;
          "timezone"?: string | null;
          "store_name"?: string;
          "store_name_en"?: string | null;
          "slogan"?: string | null;
          "website"?: string | null;
          "tax_code"?: string | null;
          "logo_url"?: string | null;
          "sale_prefix"?: string | null;
          "tax_authority"?: string | null;
          "tax_department"?: string | null;
          "business_license_number"?: string | null;
          "business_license_date"?: string | null;
          "legal_representative"?: string | null;
          "accountant_name"?: string | null;
          "accountant_phone"?: string | null;
          "theme_preset"?: string | null;
          "momo_phone_number"?: string | null;
          "momo_account_holder"?: string | null;
          "retail_markup_percent"?: number | null;
          "wholesale_markup_percent"?: number | null;
          "print_paper_size"?: string | null;
          "print_show_logo"?: boolean | null;
          "print_greeting"?: string | null
        };
        Relationships: [];
      };
      "supplier_debts": {
        Row: {
          "id": string;
          "supplier_id": string;
          "supplier_name": string;
          "description": string;
          "total_amount": number;
          "paid_amount": number;
          "remaining_amount": number;
          "created_date": string;
          "branch_id": string;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "supplier_id": string;
          "supplier_name": string;
          "description": string;
          "total_amount": number;
          "paid_amount": number;
          "remaining_amount": number;
          "created_date": string;
          "branch_id": string;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "supplier_id"?: string;
          "supplier_name"?: string;
          "description"?: string;
          "total_amount"?: number;
          "paid_amount"?: number;
          "remaining_amount"?: number;
          "created_date"?: string;
          "branch_id"?: string;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "suppliers": {
        Row: {
          "id": string;
          "name": string;
          "phone": string | null;
          "address": string | null;
          "email": string | null;
          "taxCode": string | null;
          "contactPerson": string | null;
          "notes": string | null;
          "isActive": boolean | null;
          "created_by": string | null;
          "updated_by": string | null;
          "created_at": string | null;
          "updated_at": string | null
        };
        Insert: {
          "id"?: string;
          "name": string;
          "phone"?: string | null;
          "address"?: string | null;
          "email"?: string | null;
          "taxCode"?: string | null;
          "contactPerson"?: string | null;
          "notes"?: string | null;
          "isActive"?: boolean | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "phone"?: string | null;
          "address"?: string | null;
          "email"?: string | null;
          "taxCode"?: string | null;
          "contactPerson"?: string | null;
          "notes"?: string | null;
          "isActive"?: boolean | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null
        };
        Relationships: [];
      };
      "tax_report_exports": {
        Row: {
          "id": string;
          "report_type": string;
          "period_type": string;
          "period_value": string;
          "start_date": string;
          "end_date": string;
          "total_revenue": number | null;
          "total_vat": number | null;
          "total_transactions": number | null;
          "exported_by": string | null;
          "exported_at": string | null;
          "file_name": string | null;
          "file_format": string | null;
          "notes": string | null;
          "branch_id": string;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "report_type": string;
          "period_type": string;
          "period_value": string;
          "start_date": string;
          "end_date": string;
          "total_revenue"?: number | null;
          "total_vat"?: number | null;
          "total_transactions"?: number | null;
          "exported_by"?: string | null;
          "exported_at"?: string | null;
          "file_name"?: string | null;
          "file_format"?: string | null;
          "notes"?: string | null;
          "branch_id": string;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "report_type"?: string;
          "period_type"?: string;
          "period_value"?: string;
          "start_date"?: string;
          "end_date"?: string;
          "total_revenue"?: number | null;
          "total_vat"?: number | null;
          "total_transactions"?: number | null;
          "exported_by"?: string | null;
          "exported_at"?: string | null;
          "file_name"?: string | null;
          "file_format"?: string | null;
          "notes"?: string | null;
          "branch_id"?: string;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "thumbnails": {
        Row: {
          "id": string;
          "video_id": string | null;
          "title": string;
          "preview_data": string | null;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "video_id"?: string | null;
          "title": string;
          "preview_data"?: string | null;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "video_id"?: string | null;
          "title"?: string;
          "preview_data"?: string | null;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "user_profiles": {
        Row: {
          "id": string;
          "email": string | null;
          "role": string | null;
          "full_name": string | null;
          "branch_id": string | null;
          "created_at": string | null
        };
        Insert: {
          "id"?: string;
          "email"?: string | null;
          "role"?: string | null;
          "full_name"?: string | null;
          "branch_id"?: string | null;
          "created_at"?: string | null
        };
        Update: {
          "id"?: string;
          "email"?: string | null;
          "role"?: string | null;
          "full_name"?: string | null;
          "branch_id"?: string | null;
          "created_at"?: string | null
        };
        Relationships: [];
      };
      "videos": {
        Row: {
          "id": string;
          "script_id": string | null;
          "title": string;
          "local_path": string;
          "thumbnail": string | null;
          "filming_date": string | null;
          "editing_date": string | null;
          "posting_date": string | null;
          "tiktok_link": string | null;
          "facebook_link": string | null;
          "youtube_link": string | null;
          "views": number;
          "comments": number;
          "shares": number;
          "saves": number;
          "inboxes": number;
          "visitors": number;
          "revenue": number;
          "branch_id": string;
          "created_at": string;
          "updated_at": string
        };
        Insert: {
          "id"?: string;
          "script_id"?: string | null;
          "title": string;
          "local_path": string;
          "thumbnail"?: string | null;
          "filming_date"?: string | null;
          "editing_date"?: string | null;
          "posting_date"?: string | null;
          "tiktok_link"?: string | null;
          "facebook_link"?: string | null;
          "youtube_link"?: string | null;
          "views": number;
          "comments": number;
          "shares": number;
          "saves": number;
          "inboxes": number;
          "visitors": number;
          "revenue": number;
          "branch_id": string;
          "created_at"?: string;
          "updated_at": string
        };
        Update: {
          "id"?: string;
          "script_id"?: string | null;
          "title"?: string;
          "local_path"?: string;
          "thumbnail"?: string | null;
          "filming_date"?: string | null;
          "editing_date"?: string | null;
          "posting_date"?: string | null;
          "tiktok_link"?: string | null;
          "facebook_link"?: string | null;
          "youtube_link"?: string | null;
          "views"?: number;
          "comments"?: number;
          "shares"?: number;
          "saves"?: number;
          "inboxes"?: number;
          "visitors"?: number;
          "revenue"?: number;
          "branch_id"?: string;
          "created_at"?: string;
          "updated_at"?: string
        };
        Relationships: [];
      };
      "work_orders": {
        Row: {
          "id": string;
          "creationdate": string;
          "customername": string;
          "customerphone": string | null;
          "vehiclemodel": string | null;
          "licenseplate": string | null;
          "issuedescription": string | null;
          "technicianname": string | null;
          "status": string;
          "laborcost": number | null;
          "discount": number | null;
          "partsused": Json | null;
          "notes": string | null;
          "total": number | null;
          "branchid": string;
          "depositamount": number | null;
          "depositdate": string | null;
          "deposittransactionid": string | null;
          "paymentstatus": string | null;
          "paymentmethod": string | null;
          "additionalpayment": number | null;
          "totalpaid": number | null;
          "remainingamount": number | null;
          "paymentdate": string | null;
          "cashtransactionid": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "additionalservices": Json | null;
          "refunded": boolean | null;
          "refundedat": string | null;
          "refundtransactionid": string | null;
          "refundreason": string | null;
          "refunded_at": string | null;
          "refund_transaction_id": string | null;
          "refund_reason": string | null;
          "additionalServices": Json | null;
          "vehicleid": string | null;
          "userid": string | null;
          "currentkm": number | null;
          "inventory_deducted": boolean | null;
          "vat_rate": number | null;
          "vat_amount": number | null;
          "amount_before_vat": number | null
        };
        Insert: {
          "id"?: string;
          "creationdate": string;
          "customername": string;
          "customerphone"?: string | null;
          "vehiclemodel"?: string | null;
          "licenseplate"?: string | null;
          "issuedescription"?: string | null;
          "technicianname"?: string | null;
          "status": string;
          "laborcost"?: number | null;
          "discount"?: number | null;
          "partsused"?: Json | null;
          "notes"?: string | null;
          "total"?: number | null;
          "branchid": string;
          "depositamount"?: number | null;
          "depositdate"?: string | null;
          "deposittransactionid"?: string | null;
          "paymentstatus"?: string | null;
          "paymentmethod"?: string | null;
          "additionalpayment"?: number | null;
          "totalpaid"?: number | null;
          "remainingamount"?: number | null;
          "paymentdate"?: string | null;
          "cashtransactionid"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "additionalservices"?: Json | null;
          "refunded"?: boolean | null;
          "refundedat"?: string | null;
          "refundtransactionid"?: string | null;
          "refundreason"?: string | null;
          "refunded_at"?: string | null;
          "refund_transaction_id"?: string | null;
          "refund_reason"?: string | null;
          "additionalServices"?: Json | null;
          "vehicleid"?: string | null;
          "userid"?: string | null;
          "currentkm"?: number | null;
          "inventory_deducted"?: boolean | null;
          "vat_rate"?: number | null;
          "vat_amount"?: number | null;
          "amount_before_vat"?: number | null
        };
        Update: {
          "id"?: string;
          "creationdate"?: string;
          "customername"?: string;
          "customerphone"?: string | null;
          "vehiclemodel"?: string | null;
          "licenseplate"?: string | null;
          "issuedescription"?: string | null;
          "technicianname"?: string | null;
          "status"?: string;
          "laborcost"?: number | null;
          "discount"?: number | null;
          "partsused"?: Json | null;
          "notes"?: string | null;
          "total"?: number | null;
          "branchid"?: string;
          "depositamount"?: number | null;
          "depositdate"?: string | null;
          "deposittransactionid"?: string | null;
          "paymentstatus"?: string | null;
          "paymentmethod"?: string | null;
          "additionalpayment"?: number | null;
          "totalpaid"?: number | null;
          "remainingamount"?: number | null;
          "paymentdate"?: string | null;
          "cashtransactionid"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "additionalservices"?: Json | null;
          "refunded"?: boolean | null;
          "refundedat"?: string | null;
          "refundtransactionid"?: string | null;
          "refundreason"?: string | null;
          "refunded_at"?: string | null;
          "refund_transaction_id"?: string | null;
          "refund_reason"?: string | null;
          "additionalServices"?: Json | null;
          "vehicleid"?: string | null;
          "userid"?: string | null;
          "currentkm"?: number | null;
          "inventory_deducted"?: boolean | null;
          "vat_rate"?: number | null;
          "vat_amount"?: number | null;
          "amount_before_vat"?: number | null
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
