// src/components/customers/deals/DealListPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Search, Loader2, FileText } from "lucide-react";
import { supabase } from "../../../supabaseClient";

interface DealListPageProps {
  selectedDealId: string | null;
  onSelectDeal: (dealId: string) => void;
}

const DealListPage: React.FC<DealListPageProps> = ({
  selectedDealId,
  onSelectDeal,
}) => {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // โหลดดีลจาก Supabase ตอนเปิดหน้า
  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .order("updated_at", { ascending: false }); // ถ้าไม่มีคอลัมน์นี้ Supabase จะบอก error ชัดเจน

      if (error) {
        console.error("Error fetching deals:", error);
        setErrorMsg(error.message);
      } else {
        setDeals(data ?? []);
      }

      setLoading(false);
    };

    fetchDeals();
  }, []);

  const filteredDeals = useMemo(() => {
    if (!searchTerm.trim()) return deals;
    const term = searchTerm.toLowerCase();

    return deals.filter((d) =>
      [
        d.title,
        d.name, // เผื่อบางทีตั้งชื่อคอลัมน์เป็น name
        d.customer_name,
        d.stage,
        d.status,
      ]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(term))
    );
  }, [deals, searchTerm]);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            ออเดอร์ / ดีล
          </h2>
          <p className="text-xs text-slate-500">
            ดึงข้อมูลจากตาราง{" "}
            <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded">
              deals
            </span>{" "}
            ใน Supabase
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 bg-slate-50"
          placeholder="ค้นหาชื่อดีล / ลูกค้า / stage / status"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          กำลังโหลดดีลจาก Supabase...
        </div>
      )}

      {errorMsg && (
        <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-2">
          พบข้อผิดพลาดจาก Supabase: {errorMsg}
        </div>
      )}

      {/* Deal List */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {filteredDeals.map((deal) => {
          const isActive = deal.id === selectedDealId;

          const stageLabel = deal.stage ?? deal.deal_stage;
          const statusLabel = deal.status ?? deal.deal_status;
          const amount = deal.total_amount ?? deal.total ?? 0;

          return (
            <button
              key={deal.id}
              type="button"
              onClick={() => onSelectDeal(deal.id)}
              className={`w-full text-left rounded-2xl border px-3 py-2.5 text-xs transition ${
                isActive
                  ? "border-emerald-400 bg-emerald-50/80"
                  : "border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium text-slate-900 line-clamp-1">
                      {deal.title || deal.name || "ไม่ระบุชื่อดีล"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {stageLabel && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Stage: {stageLabel}
                      </span>
                    )}
                    {statusLabel && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Status: {statusLabel}
                      </span>
                    )}
                    {deal.customer_name && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">
                        ลูกค้า: {deal.customer_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-400">มูลค่าดีล</div>
                  <div className="text-xs font-semibold text-emerald-600">
                    ฿{Number(amount || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {!loading && filteredDeals.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-8">
            ยังไม่มีดีลในระบบ หรือไม่พบดีลที่ค้นหา
          </div>
        )}
      </div>
    </section>
  );
};

export default DealListPage;
