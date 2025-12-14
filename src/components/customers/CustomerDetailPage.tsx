// src/components/customers/CustomerDetailPage.tsx
import React, { useEffect, useState } from "react";
import {
  User,
  MapPin,
  Phone,
  MessageCircle,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

// ---- Types ----
type Deal = {
  id: string;
  title: string;
  stage: string;
  total_amount: number;
  transport_cost: number;
  net_amount: number;
  updated_at: string;
};

interface CustomerDetailPageProps {
  customerId: string | null;
  onOpenDeal: (dealId: string) => void;
}

// ---- Component ----
const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({
  customerId,
  onOpenDeal,
}) => {
  const [customer, setCustomer] = useState<any | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // โหลดข้อมูลจาก Supabase ตาม customerId
  useEffect(() => {
    if (!customerId) return;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // ลูกค้า
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("*")
          .eq("id", customerId)
          .single();

        if (customerError) throw customerError;
        setCustomer(customerData);

        // ดีลของลูกค้าคนนี้
        const { data: dealsData, error: dealsError } = await supabase
          .from("deals")
          .select("*")
          .eq("customer_id", customerId)
          .order("updated_at", { ascending: false });

        if (dealsError) throw dealsError;
        setDeals(dealsData || []);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message ?? "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [customerId]);

  // ถ้ายังไม่ได้เลือก customer
  if (!customerId) {
    return (
      <div className="p-8 text-center text-slate-500">
        ยังไม่ได้เลือก <span className="font-semibold">ลูกค้า</span> จากเมนูด้านซ้าย
      </div>
    );
  }

  // loading / error state
  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        กำลังโหลดข้อมูลลูกค้า...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-8 text-center text-red-500">
        เกิดข้อผิดพลาด: {errorMsg}
      </div>
    );
  }

  // ถ้าไม่มีข้อมูลลูกค้าเลย
  if (!customer) {
    return (
      <div className="p-8 text-center text-slate-500">
        ไม่พบข้อมูลลูกค้าในระบบ
      </div>
    );
  }

  const mainDeal = deals[0];

  return (
    <div className="space-y-6">
      {/* Header ลูกค้า */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {customer.name}
              </h1>
              <p className="text-xs text-slate-500">
                รหัสลูกค้า #{customer.code ?? customer.id}
              </p>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{customer.phone ?? "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-slate-400" />
                  <span>{customer.line_id ?? "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="truncate">
                    {customer.address ?? "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500">
            <p>งบประมาณ & ความสนใจ</p>
            <p className="text-sm font-semibold text-emerald-700">
              {customer.budget_range ?? "-"}
            </p>
            <p className="mt-1">
              สายพันธุ์: {customer.interests ?? "-"}
            </p>
          </div>
        </div>
      </section>

      {/* ดีลหลัก (ดีลล่าสุดของลูกค้า) */}
      {mainDeal && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">ดีลล่าสุด</p>
              <h2 className="text-base font-semibold text-slate-900">
                {mainDeal.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Stage: {mainDeal.stage} ·
                อัปเดตล่าสุด:{" "}
                {mainDeal.updated_at
                  ? new Date(mainDeal.updated_at).toLocaleDateString("th-TH")
                  : "-"}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-slate-500">มูลค่าดีล (ประมาณ)</p>
                <p className="text-lg font-semibold text-emerald-700">
                  ฿{mainDeal.total_amount.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => onOpenDeal(mainDeal.id)}
                className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                ดูรายละเอียดดีล
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Placeholder Activity / Documents / Payments */}
      <section className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 text-xs text-slate-500 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-slate-400" />
        <span>
          ส่วน Activity / Documents / Payments เป็น placeholder (เมื่อเชื่อมข้อมูล
          supabase ครบ สามารถนำมาแสดงต่อยอดในส่วนนี้ได้)
        </span>
      </section>
    </div>
  );
};

export default CustomerDetailPage;
