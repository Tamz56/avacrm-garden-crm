// src/app/customers/[id]/page.tsx

// @ts-nocheck  // บอก TypeScript ว่าอย่าเช็คไฟล์นี้

import React from "react";
import CustomerDetailPage from "../../../components/customers/CustomerDetailPage";

export default function CustomerDetailRoutePage() {
  // ใช้ CustomerDetailPage แบบไม่ต้องส่ง props (ให้มันจัดการ mock / Supabase เอง)
  return <CustomerDetailPage />;
}
