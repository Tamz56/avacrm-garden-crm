import React from "react";
import { Calendar, User } from "lucide-react";
import { supabase } from "../../supabaseClient";





type ZoneInspectionHistoryProps = {
    zoneId: string;
};

export const ZoneInspectionHistory: React.FC<ZoneInspectionHistoryProps> = ({
    zoneId,
}) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!zoneId) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            // Fetch all inspections for this zone
            // Note: zone_tree_inspections is a detail table. We aggregate by date here.
            const { data, error } = await supabase
                .from("zone_tree_inspections")
                .select("*")
                .eq("zone_id", zoneId)
                .order("inspection_date", { ascending: false });

            if (!cancelled) {
                if (error) {
                    console.error("ZoneInspectionHistory error", error);
                    setError(error.message);
                } else {
                    // Aggregate by date
                    const grouped = (data || []).reduce((acc: any, curr: any) => {
                        const date = curr.inspection_date;
                        if (!acc[date]) {
                            acc[date] = {
                                date: date,
                                inspector_name: "-", // Column not available in detail table
                                total_qty: 0,
                                diff_total: 0, // Cannot calculate historical diff without snapshot
                                notes: [],
                                mismatch_level: "unknown"
                            };
                        }
                        acc[date].total_qty += (curr.estimated_qty || 0);
                        if (curr.notes) acc[date].notes.push(curr.notes);
                        return acc;
                    }, {});

                    const aggregatedRows = Object.values(grouped).sort((a: any, b: any) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    );

                    setRows(aggregatedRows);
                }
                setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [zoneId]);

    const formatDate = (value?: string | null) => {
        if (!value) return "-";
        return new Date(value).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const toThai = (val?: number | null) =>
        (val ?? 0).toLocaleString("th-TH", {
            maximumFractionDigits: 0,
        });

    return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                        ประวัติการตรวจแปลง
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        ใช้ดูประวัติการลงพื้นที่ตรวจแปลงย้อนหลัง
                    </p>
                </div>
            </div>

            {loading && (
                <div className="py-6 text-center text-sm text-slate-500">
                    กำลังโหลดข้อมูล...
                </div>
            )}

            {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    ไม่สามารถโหลดข้อมูลได้: {error}
                </div>
            )}

            {!loading && !error && rows.length === 0 && (
                <div className="py-6 text-center text-sm text-slate-500">
                    ยังไม่เคยบันทึกการตรวจแปลงสำหรับแปลงนี้
                </div>
            )}

            {!loading && !error && rows.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-600">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                                <th className="px-3 py-2">วันที่ตรวจ</th>
                                <th className="px-3 py-2">ผู้ตรวจ</th>
                                <th className="px-3 py-2 text-right">จำนวนที่ตรวจได้ (ต้น)</th>
                                {/* <th className="px-3 py-2 text-right">ส่วนต่างจากระบบ (ต้น)</th>
                                <th className="px-3 py-2">ระดับความคลาดเคลื่อน</th> */}
                                <th className="px-3 py-2">หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const date = row.date;
                                const inspector = row.inspector_name;
                                const totalQty = row.total_qty;
                                // const diffTotal = row.diff_total;
                                // const mismatchLevel = row.mismatch_level;
                                // const badgeLabel = mismatchLabelMap[mismatchLevel];
                                // const badgeClass = mismatchColorMap[mismatchLevel];
                                const note = row.notes.join(", ");

                                return (
                                    <tr
                                        key={idx}
                                        className="border-b border-slate-50 text-[13px] last:border-0"
                                    >
                                        <td className="px-3 py-2 text-slate-800">
                                            <div className="inline-flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                {formatDate(date)}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="inline-flex items-center gap-1">
                                                <User className="h-3.5 w-3.5 text-slate-400" />
                                                {inspector}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {toThai(totalQty)}
                                        </td>
                                        {/* <td className="px-3 py-2 text-right">
                                            <span className="text-slate-400">-</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-slate-400">-</span>
                                        </td> */}
                                        <td className="px-3 py-2">
                                            <span className="line-clamp-2 text-[12px] text-slate-600">
                                                {note || "-"}
                                            </span>
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
