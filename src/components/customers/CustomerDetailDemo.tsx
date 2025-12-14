// src/components/customers/CustomerDetailDemo.tsx
// @ts-nocheck

'use client';
import React from 'react';
import CustomerDetailPage from './CustomerDetailPage';
import type {
  Customer,
  Deal,
  CustomerActivity,
  Document,
  Payment,
} from '../../types/crm';

type Props = {
  onOpenDeal?: (dealId: string) => void;
};

// ===== mock data ใช้สำหรับ Demo ตอนนี้ =====
const now = new Date().toISOString();

const mockCustomer: Customer = {
  id: 'cust-2025-0001',
  customer_code: 'CUST-2025-0001',
  type: 'individual',
  name: 'Test Customer',
  contact_person: 'Test Customer',
  phone: '081-111-1111',
  line_id: '@testline',
  email: 'test@example.com',
  address: 'เขาใหญ่ อ.ปากช่อง จ.นครราชสีมา',
  province: 'นครราชสีมา',
  tax_id: null,
  segment: 'other',
  source: 'test',
  priority: 'B',
  lead_status: 'new',
  interested_species: ['Silver Oak AVAONE', 'Golden Oak AVAONE'],
  interested_size_note: 'ต้องการต้นขนาด 3–6 นิ้ว สูงประมาณ 3–5 ม.',
  budget_min: 800000,
  budget_max: 1500000,
  last_contacted_at: now,
  next_follow_up_at: null,
  owner_id: null,
  note: 'ข้อมูลลูกค้าทดสอบระบบ AvaCRM',
};

const mockDeals: Deal[] = [
  {
    id: 'deal-1',
    deal_code: 'D-2025-007',
    title: 'จัดสวนหน้าบ้าน – Silver Oak 20 ต้น',
    status: 'draft',
    stage: 'inquiry',
    customer_id: mockCustomer.id,
    customer_name: mockCustomer.name,
    total_amount: 1500000,
    shipping_fee: 0,
    grand_total: 1500000,
    updated_at: now,
  },
];

const mockActivities: CustomerActivity[] = [];
const mockDocuments: Document[] = [];
const mockPayments: Payment[] = [];

// ===== Component หลัก =====
const CustomerDetailDemo: React.FC<Props> = ({ onOpenDeal }) => {
  return (
    <CustomerDetailPage
      customer={mockCustomer}
      deals={mockDeals}
      activities={mockActivities}
      documents={mockDocuments}
      payments={mockPayments}
      onOpenDeal={onOpenDeal} // ✅ ส่ง handler ลงไป
    />
  );
};

export default CustomerDetailDemo;
