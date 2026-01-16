// @ts-nocheck
// src/components/customers/deals/DealDetailPage.tsx

import React, { useEffect, useState } from "react";
import {
  Calendar,
  DollarSign,
  MapPin,
  Truck,
  FileText,
  ClipboardList,
  Database,
  Info,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import DealCommissionPanel from "../../deals/DealCommissionPanel";
import { DealItemsTable } from "./DealItemsTable";
import DealReservedTagsPanel from "./DealReservedTagsPanel";
import DealStockReservationsPanel from "./DealStockReservationsPanel";
import DealDocumentsPanel from "./DealDocumentsPanel";
import { DealFinanceSummary } from "../../deals/DealFinanceSummary";
import { useDealPaymentSummary } from "../../../hooks/useDealPaymentSummary";

// ---------- MOCK กันตาย ----------
const mockDeal = {
  id: "D-2025-007",
  title: "จัดสวนหน้าบ้าน – Silver Oak 20 ต้น",
  customer_name: "Test Customer",
  stage: "Inquiry",
  status: "draft",
  total_amount: 1500000,
  transport_cost: 50000,
  net_amount: 1550000,
  updated_at: "2025-11-22",
  site_address: "เขาใหญ่ อ.ปากช่อง จ.นครราชสีมา",
  note: "ดีลตัวอย่างสำหรับออกแบบหน้า Deal Detail",
};

const toThaiBaht = (val?: number) =>
  `฿${(val ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

interface DealDetailPageProps {
  dealId?: string | null;
}

// ---------- COMPONENT หลัก ----------
const DealDetailPage: React.FC<DealDetailPageProps> = ({ dealId }) => {
  const [dealFromDb, setDealFromDb] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCommissionPanel, setShowCommissionPanel] = useState(false);

  // Payment summary from view_deal_payment_summary_v1
  const { data: paymentSummary } = useDealPaymentSummary(dealId ?? undefined);

  // โหลดดีลจาก Supabase ตาม dealId
  useEffect(() => {
    if (!dealId) {
      setDealFromDb(null);
      return;
    }

    let isMounted = true;

    const loadDeal = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // ลองหาได้ทั้งจาก id และ code (เลือกอย่างใดอย่างหนึ่งที่ตรง)
        const { data, error } = await supabase
          .from("deals")
          .select("*")
          .eq("id", dealId)   // ✅ ใช้แค่ id อย่างเดียว
          .limit(1);

        if (error) throw error;

        const d = data?.[0] ?? null;
        if (!isMounted) return;
        setDealFromDb(d);
      } catch (err) {
        console.error("โหลดดีลจาก Supabase ไม่สำเร็จ:", err);
        if (isMounted) {
          setErrorMsg(
            "โหลดดีลจาก Supabase ไม่สำเร็จ – ใช้ข้อมูลตัวอย่างแทนชั่วคราว"
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDeal();

    return () => {
      isMounted = false;
    };
  }, [dealId]);

  // map ข้อมูลจาก DB → รูปแบบเดียวกับ mock + fallback ทีละ field
  const deal = dealFromDb
    ? {
      ...mockDeal,
      id: dealFromDb.code || dealFromDb.id || mockDeal.id,
      title: dealFromDb.title ?? mockDeal.title,
      customer_name:
        dealFromDb.customer_name ??
        dealFromDb.customerName ??
        mockDeal.customer_name,
      stage: dealFromDb.stage ?? mockDeal.stage,
      status: dealFromDb.status ?? mockDeal.status,
      total_amount:
        dealFromDb.total_amount ?? dealFromDb.amount ?? mockDeal.total_amount,
      transport_cost:
        dealFromDb.transport_cost ??
        dealFromDb.transport ??
        mockDeal.transport_cost,
      net_amount:
        dealFromDb.net_amount ??
        dealFromDb.total_amount ??
        mockDeal.net_amount,
      updated_at:
        (dealFromDb.updated_at || dealFromDb.updatedAt || "")
          .toString()
          .slice(0, 10) || mockDeal.updated_at,
      site_address:
        dealFromDb.site_address ??
        dealFromDb.address ??
        mockDeal.site_address,
      note: dealFromDb.note ?? mockDeal.note,
    }
    : mockDeal;

  const isDbDeal = !!dealFromDb;

  const amount = deal.total_amount;
  const transport = deal.transport_cost;
  const net = deal.net_amount;

  // ถ้ายังไม่ได้เลือกดีล
  if (!dealId) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-2xl p-4 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5" />
        <div>
          ยังไม่ได้เลือกดีลจากหน้า “ลูกค้า”
          <br />
          กรุณาเลือกดีลจากรายการดีลของลูกค้า ระบบจะเปิดรายละเอียดดีลในหน้านี้
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* สเตตัสโหลด / ข้อความ error */}
      {(loading || errorMsg) && (
        <div className="text-xs flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          {loading && <span className="text-slate-500">กำลังโหลดดีล...</span>}
          {errorMsg && <span className="text-amber-600">{errorMsg}</span>}
          {isDbDeal ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              ข้อมูลดีลจาก Supabase
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
              ข้อมูลดีลตัวอย่าง (mock)
            </span>
          )}
        </div>
      )}

      {/* ส่วนหัวดีล */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900">
              {deal.title}
            </h1>
            <p className="text-xs text-slate-500 flex flex-wrap gap-3">
              <span>ดีล #{deal.id}</span>
              <span>ลูกค้า: {deal.customer_name}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setShowCommissionPanel(true)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
            >
              ดูค่าคอมฯ ดีลนี้
            </button>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Stage: {deal.stage}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
              Status: {deal.status}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${isDbDeal
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-slate-50 text-slate-500 border border-slate-200"
                }`}
            >
              {isDbDeal ? "ดีลจาก Supabase" : "ดีลตัวอย่าง (mock)"}
            </span>
          </div>
        </div>
      </section>

      {/* รายการสินค้า และ ต้นไม้ที่จอง */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Deal Items */}
        <div className="space-y-4">
          <DealItemsTable dealId={dealId!} />
        </div>

        {/* Right: Reserved Trees (Assigned Tags) */}
        <div className="space-y-4">
          <DealReservedTagsPanel dealId={dealId!} />
        </div>
      </div>

      {/* Stock Reservations */}
      <DealStockReservationsPanel dealId={dealId!} />

      {/* สรุปยอดการเงิน (จาก view_deal_payment_summary_v1) */}
      <DealFinanceSummary
        netTotal={paymentSummary?.net_total ?? deal.net_amount ?? 0}
        paidTotal={paymentSummary?.paid_total ?? 0}
        outstanding={paymentSummary?.outstanding ?? deal.net_amount ?? 0}
        credit={paymentSummary?.credit ?? 0}
        depositRequired={paymentSummary?.deposit_required_amount ?? 0}
        depositPaid={paymentSummary?.deposit_paid ?? 0}
        depositStatus={paymentSummary?.deposit_status ?? "not_required"}
      />

      {/* เอกสารดีล (DEP/RCPT/INV/GR) */}
      <DealDocumentsPanel
        dealId={dealId!}
        dealInfo={{
          title: deal.title,
          customer_name: deal.customer_name,
          site_address: deal.site_address,
        }}
      />

      {/* ข้อมูลสถานที่ / หมายเหตุ */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-800">
              สถานที่ติดตั้ง / ปลูก
            </span>
          </div>
          <p className="text-xs text-slate-600">{deal.site_address}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-800">
              หมายเหตุจากทีมขาย
            </span>
          </div>
          <p className="text-xs text-slate-600">{deal.note}</p>
        </div>
      </section>

      {showCommissionPanel && dealId && (
        <DealCommissionPanel
          dealId={dealId}
          dealAmount={deal.total_amount}
          onClose={() => setShowCommissionPanel(false)}
        />
      )}
    </div>
  );
};

export default DealDetailPage;
