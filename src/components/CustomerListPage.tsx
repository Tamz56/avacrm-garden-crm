// @ts-nocheck
// src/components/customers/CustomerListPage.tsx

import React, { useEffect, useState, useMemo } from "react";
import { Search, Database, User, ChevronRight } from "lucide-react";
import { supabase } from "../supabaseClient.ts";;

interface CustomerListPageProps {
  onSelectCustomer?: (customerId: string) => void;
}

const CustomerListPage: React.FC<CustomerListPageProps> = ({
  onSelectCustomer,
}) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCustomers = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (!isMounted) return;
        setCustomers(data || []);
      } catch (err) {
        console.error("โหลด customers ไม่สำเร็จ:", err);
        if (isMounted) {
          setErrorMsg("โหลดรายการลูกค้าไม่สำเร็จ – กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCustomers();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter((c) => {
      return (
        (c.name || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        (c.phone || "").toLowerCase().includes(term)
      );
    });
  }, [customers, searchTerm]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">ลูกค้าทั้งหมด</h2>
          <p className="text-xs text-slate-500">
            ดึงข้อมูลจากตาราง <code>customers</code> ใน Supabase
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
            placeholder="ค้นหาด้วยชื่อ / อีเมล / เบอร์โทร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {(loading || errorMsg) && (
        <div className="flex items-center gap-2 mb-3 text-xs">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          {loading && <span className="text-slate-500">กำลังโหลดรายการลูกค้า...</span>}
          {errorMsg && <span className="text-amber-600">{errorMsg}</span>}
        </div>
      )}

      {filteredCustomers.length === 0 && !loading ? (
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>ยังไม่มีลูกค้าในระบบ หรือไม่พบข้อมูลที่ตรงกับคำค้นหา</span>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredCustomers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCustomer && onSelectCustomer(c.id)}
              className="w-full text-left py-3 flex items-center justify-between hover:bg-emerald-50/60 transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">
                  {c.name || "ไม่ระบุชื่อ"}
                </span>
                <span className="text-[11px] text-slate-500 flex flex-wrap gap-2">
                  {c.email && <span>Email: {c.email}</span>}
                  {c.phone && <span>โทร: {c.phone}</span>}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                {c.lead_status && <span>Lead: {c.lead_status}</span>}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default CustomerListPage;
