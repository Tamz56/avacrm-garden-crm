import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Loader2, AlertCircle } from "lucide-react";

type DealStockRow = {
    deal_id: string;
    deal_code: string | null;
    deal_title: string | null;
    deal_item_id: string;
    deal_quantity: number | null;
    stock_item_id: string;
    size_label: string | null;
    zone_label: string | null;
    quantity_available: number | null;
    total_moved_for_deal: number | null;
};

interface DealStockSummaryCardProps {
    dealId: string;
    dealCode?: string | null;
}

const DealStockSummaryCard: React.FC<DealStockSummaryCardProps> = ({
    dealId,
    dealCode,
}) => {
    const [rows, setRows] = useState<DealStockRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!dealId) return;

        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from("deal_stock_summary")
                    .select("*")
                    .eq("deal_id", dealId)
                    .order("size_label", { ascending: true });

                if (error) throw error;
                if (!cancelled) {
                    setRows((data || []) as DealStockRow[]);
                }
            } catch (err: any) {
                console.error("load deal_stock_summary error", err);
                if (!cancelled) {
                    setError(err.message || "ไม่สามารถโหลดข้อมูลสต็อกได้");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => {
            cancelled = true;
        };
    }, [dealId]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                        สรุปสต็อกของดีลนี้
                    </h3>
                    <p className="text-xs text-slate-500">
                        ดีล: {dealCode || dealId}
                    </p>
                </div>
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังโหลดข้อมูลสต็อก...
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}

            {!loading && !error && rows.length === 0 && (
                <p className="text-xs text-slate-400">
                    ยังไม่มีการเชื่อมดีลนี้กับรายการสต็อก
                </p>
            )}

            {!loading && !error && rows.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                <th className="py-2 px-2 font-medium text-slate-600">
                                    ขนาด / โซน
                                </th>
                                <th className="py-2 px-2 font-medium text-slate-600 text-right">
                                    จำนวนในดีล
                                </th>
                                <th className="py-2 px-2 font-medium text-slate-600 text-right">
                                    จำนวนที่ตัดจริง
                                </th>
                                <th className="py-2 px-2 font-medium text-slate-600 text-right">
                                    คงเหลือในสต็อก
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const dealQty = row.deal_quantity ?? 0;
                                const moved = row.total_moved_for_deal ?? 0;
                                const remain = row.quantity_available ?? 0;

                                return (
                                    <tr key={row.deal_item_id} className="border-b border-slate-50">
                                        <td className="py-1.5 px-2">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800">
                                                    {row.size_label || "-"}
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    {row.zone_label || ""}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-slate-800">
                                            {dealQty.toLocaleString("th-TH")}
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-slate-800">
                                            {moved.toLocaleString("th-TH")}
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-slate-800">
                                            {remain.toLocaleString("th-TH")}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DealStockSummaryCard;
