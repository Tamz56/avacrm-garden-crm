import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { QrCode, ScanLine, Loader2, AlertCircle } from "lucide-react";

type DealReservedTagsPanelProps = {
    dealId: string;
};

type ReservedTagRow = {
    id: string;
    tag_code: string;
    status: string | null;
    size_label: string | null;
    qty: number | null;
    planting_row: number | null;
    planting_position: number | null;
    notes: string | null;
    zone_name: string | null;
    species_name_th: string | null;
    species_name_en: string | null;
};

const DealReservedTagsPanel: React.FC<DealReservedTagsPanelProps> = ({
    dealId,
}) => {
    const [rows, setRows] = useState<ReservedTagRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // โหลดรายการ Tag ที่จองแล้วของดีลนี้
    const loadReservedTags = async () => {
        if (!dealId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.rpc("get_deal_reserved_tags", {
            p_deal_id: dealId,
        });

        if (error) {
            console.error("get_deal_reserved_tags error", error);
            setError(error.message || "ไม่สามารถโหลดข้อมูล Tag ที่จองได้");
            setRows([]);
        } else {
            setRows(data || []);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadReservedTags();
    }, [dealId]);

    // กด Scan / ระบุต้นไม้ด้วย Tag
    const handleScanTag = async () => {
        const code = window.prompt(
            "กรุณากรอกรหัส TAG (เช่น TAG-00000025) หรือสแกนแล้วให้แอปกรอกให้"
        );
        if (!code) return;

        const trimmed = code.trim();
        if (!trimmed) return;

        setAssigning(true);
        setError(null);

        const { data, error } = await supabase.rpc("assign_tag_to_deal", {
            p_deal_id: dealId,
            p_tag_code: trimmed,
        });

        if (error) {
            console.error("assign_tag_to_deal error", error);
            alert(
                `ไม่สามารถผูก Tag ได้\n\nTAG: ${trimmed}\n\nรายละเอียด: ${error.message || "ไม่ทราบสาเหตุ"
                }`
            );
        } else {
            // สำเร็จ -> reload list
            await loadReservedTags();
            alert(`ผูก Tag ${trimmed} เข้ากับดีลเรียบร้อยแล้ว ✅`);
        }

        setAssigning(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <QrCode className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-900">
                            ต้นไม้ที่จองด้วย Tag
                        </div>
                        <div className="text-xs text-slate-500">
                            ผูก Tag ของต้นไม้จริงเข้ากับดีลนี้
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleScanTag}
                    disabled={assigning || !dealId}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {assigning ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            กำลังผูก Tag...
                        </>
                    ) : (
                        <>
                            <ScanLine className="h-3.5 w-3.5" />
                            ระบุต้นไม้ (Scan Tag)
                        </>
                    )}
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {error && (
                    <div className="mb-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                        <span>{error}</span>
                    </div>
                )}

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-6 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        กำลังโหลดข้อมูล Tag ที่จอง...
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-4 text-xs text-slate-400">
                        ยังไม่มีต้นไม้ที่จองด้วย Tag สำหรับดีลนี้
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full text-xs">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-2 py-1 text-left font-medium text-slate-500">
                                        TAG
                                    </th>
                                    <th className="px-2 py-1 text-left font-medium text-slate-500">
                                        พันธุ์ / ชื่อ
                                    </th>
                                    <th className="px-2 py-1 text-left font-medium text-slate-500">
                                        ขนาด
                                    </th>
                                    <th className="px-2 py-1 text-center font-medium text-slate-500">
                                        จำนวน
                                    </th>
                                    <th className="px-2 py-1 text-left font-medium text-slate-500">
                                        โซน
                                    </th>
                                    <th className="px-2 py-1 text-left font-medium text-slate-500">
                                        ตำแหน่ง
                                    </th>
                                    <th className="px-2 py-1 text-left font-medium text-slate-500">
                                        สถานะ
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const pos =
                                        row.planting_row != null || row.planting_position != null
                                            ? `แถว ${row.planting_row ?? "-"} / ต้นที่ ${row.planting_position ?? "-"
                                            }`
                                            : "-";

                                    const statusLabel =
                                        row.status === "reserved"
                                            ? "จองในดีลนี้"
                                            : row.status || "-";

                                    return (
                                        <tr
                                            key={row.id}
                                            className="border-b border-slate-100 last:border-0"
                                        >
                                            <td className="px-2 py-1 whitespace-nowrap font-mono text-[11px] text-slate-800">
                                                {row.tag_code}
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="text-[11px] text-slate-800">
                                                    {row.species_name_th || "-"}
                                                </div>
                                                {row.species_name_en && (
                                                    <div className="text-[10px] text-slate-400">
                                                        {row.species_name_en}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-2 py-1 whitespace-nowrap">
                                                {row.size_label || "-"}
                                            </td>
                                            <td className="px-2 py-1 text-center">
                                                {row.qty ?? 1}
                                            </td>
                                            <td className="px-2 py-1">
                                                {row.zone_name || <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-2 py-1">{pos}</td>
                                            <td className="px-2 py-1">
                                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                                    {statusLabel}
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
        </div>
    );
};

export default DealReservedTagsPanel;
