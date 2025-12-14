// src/types/crm.ts

// --- Master enums / union types ---

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'proposal_sent'
  | 'follow_up'
  | 'customer'
  | 'inactive';

export type DealStatus =
  | 'draft'
  | 'quoted'
  | 'reserved'
  | 'won'
  | 'lost'
  | 'cancelled';

export type DealStage =
  | 'inquiry'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'closed';

export type ItemType = 'tree' | 'transport' | 'service' | 'other';

export type DocType =
  | 'quotation'
  | 'invoice'
  | 'tax_invoice'
  | 'delivery_note'
  | 'receipt'
  | 'tax_receipt';

export type DocStatus = 'draft' | 'issued' | 'cancelled';

export type PaymentMethod = 'transfer' | 'cash' | 'cheque' | 'other';

export type CustomerActivityType =
  | 'call'
  | 'line_chat'
  | 'site_visit'
  | 'email'
  | 'sent_quotation'
  | 'follow_up'
  | 'complaint'
  | 'other';

// --- Core entities ---

export interface Customer {
  id: string;
  customer_code: string | null;
  type: string; // individual / company / reseller / project
  name: string;
  contact_person: string | null;
  phone: string | null;
  line_id: string | null;
  email: string | null;
  address: string | null;
  province: string | null;
  tax_id: string | null;
  segment: string | null;
  source: string | null;
  priority: string | null;
  lead_status: LeadStatus;
  interested_species: string[] | null;
  interested_size_note: string | null;
  budget_min: number | null;
  budget_max: number | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  owner_id: string | null;
  note: string | null;
}

export interface Deal {
  id: string;
  deal_code: string | null;
  title: string;
  status: DealStatus;
  stage: DealStage;
  customer_id: string | null;
  customer_name: string | null;
  total_amount: number;    // ยอดดีล (ไม่รวมค่าส่ง)
  shipping_fee: number;    // ค่าขนส่ง
  grand_total: number;     // ยอดรวมสุทธิ
  updated_at: string;      // ISO string
}

export interface CustomerActivity {
  id: string;
  customer_id: string;
  deal_id: string | null;
  activity_type: CustomerActivityType;
  activity_time: string;        // ISO string
  summary: string;
  result: string | null;
  next_action_at: string | null;
  next_action_note: string | null;
  created_by: string | null;
}

export interface Document {
  id: string;
  deal_id: string | null;
  doc_no: string | null;
  doc_type: DocType | null;
  status: DocStatus;
  issue_date: string;      // ISO string
  grand_total: number;
}

export interface Payment {
  id: string;
  deal_id: string | null;
  document_id: string | null;
  method: PaymentMethod;
  amount: number;
  paid_date: string;       // ISO string
}

// ใช้ ItemType เดิมสำหรับ line items
export interface DealItem {
  id: string;
  deal_id: string;
  line_no: number;
  item_type: ItemType;
  description: string | null;

  quantity: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
  discount: number;
  vat_included: boolean;
  is_free: boolean;

  // ฟิลด์เสริมสำหรับต้นไม้
  species_name?: string | null;   // เช่น "Silver Oak AVAONE"
  tree_size_inch?: number | null; // เส้นรอบวงนิ้ว
  tree_height_m?: number | null;  // ความสูง (เมตร)
  container_type?: string | null; // ถุง/กระถาง/ไม้ล้อม
  zone_name?: string | null;      // ชื่อแปลง
}
