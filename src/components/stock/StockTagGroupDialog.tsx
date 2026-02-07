import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { StockZoneLifecycleRow } from "../../hooks/useStockZoneLifecycle";

type TagItem = {
    id: string;
    tag_code: string;
    status: string;
    planting_row: string | null;
    planting_position: string | null;
    notes: string | null;
    deal_id: string | null;
    dig_order_id: string | null;
};

type Props = {
    open: boolean;
    onClose: () => void;
    group: StockZoneLifecycleRow | null;
    isDarkMode?: boolean;
};

export const StockTagGroupDialog: React.FC<Props> = ({
    open,
    onClose,
    group,
    isDarkMode = false,
}) => {
    const [tags, setTags] = useState<TagItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        async function load() {
            // 1) ถ้ายังไม่ได้เปิด dialog หรือไม่มีพารามิเตอร์ครบ → ไม่ต้องยิง query
            if (!group || !group.zone_id || !group.species_id || !group.size_label) {
                setTags([]);
                return;
            }

            setLoading(true);

            const { data, error } = await supabase
                .from("view_tag_search")
                .select(
                    "id, tag_code, status, planting_row, planting_position, notes, deal_id, dig_order_id"
                )
                .eq("zone_id", group.zone_id)
                .eq("species_id", group.species_id)
                .eq("size_label", group.size_label);

            if (cancelled) return;

            if (error) {
                console.error("load tags error", error.message);
                setTags([]);
            } else {
                setTags((data || []) as TagItem[]);
            }

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [open, group]);

    if (!open || !group) return null;

    const title = `${group.species_name_th} – ขนาด ${group.size_label}`;
    const zoneText = `${group.farm_name} / ${group.zone_name}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={`rounded-2xl shadow-xl max-w-5xl w-full max-h-[80vh] flex flex-col ${isDarkMode ? "bg-slate-900 border border-white/10" : "bg-white"}`}>
                {/* Header */}
                <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
                    <div>
                        <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>โซน: {zoneText}</div>
                        <div className={`font-semibold text-sm ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>{title}</div>
                        <div className={`text-[11px] mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                            Tag ทั้งหมดในกลุ่มนี้: {tags.length} ต้น
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`text-sm ${isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                    >
                        ✕ ปิด
                    </button>
                </div>

                {/* Toolbar / future actions */}
                <div className={`px-5 py-2 border-b flex items-center justify-between text-xs ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
                    <div className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                        สถานะในกลุ่มนี้จะแสดงตามข้อมูลล่าสุดของ tree_tags
                    </div>
                    <div className="flex gap-2">
                        <button
                            className={`px-3 py-1 rounded-full border text-xs cursor-not-allowed ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-500" : "border-slate-200 bg-slate-50 text-slate-500"}`}
                            title="ฟีเจอร์นี้จะเชื่อมกับใบสั่งขุดในเฟสถัดไป"
                        >
                            สร้างใบสั่งขุดจากกลุ่มนี้ (เร็ว ๆ นี้)
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {loading && (
                        <div className={`p-4 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>กำลังโหลด Tag...</div>
                    )}

                    {!loading && tags.length === 0 && (
                        <div className={`p-4 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            ยังไม่มี Tag ในกลุ่มนี้
                        </div>
                    )}

                    {!loading && tags.length > 0 && (
                        <table className="min-w-full text-[11px]">
                            <thead className={isDarkMode ? "bg-white/5" : "bg-slate-50"}>
                                <tr className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
                                    <th className="px-3 py-2 text-left">Tag</th>
                                    <th className="px-3 py-2 text-left">สถานะ</th>
                                    <th className="px-3 py-2 text-left">ตำแหน่งปลูก</th>
                                    <th className="px-3 py-2 text-left">Note</th>
                                    <th className="px-3 py-2 text-left">ดีล</th>
                                    <th className="px-3 py-2 text-left">ใบสั่งขุด</th>
                                </tr>
                            </thead>
                            <tbody className={isDarkMode ? "divide-y divide-white/10 text-slate-300" : "divide-y divide-slate-100 text-slate-700"}>
                                {tags.map((t) => (
                                    <tr key={t.id} className={isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50"}>
                                        <td className="px-3 py-2 font-mono text-[10px]">
                                            {t.tag_code}
                                        </td>
                                        <td className="px-3 py-2">
                                            <StatusBadge status={t.status} isDarkMode={isDarkMode} />
                                        </td>
                                        <td className="px-3 py-2">
                                            แถว {t.planting_row || "-"} / ตำแหน่ง{" "}
                                            {t.planting_position || "-"}
                                        </td>
                                        <td className="px-3 py-2 max-w-[200px] truncate">
                                            {t.notes}
                                        </td>
                                        <td className="px-3 py-2">
                                            {t.deal_id ? (
                                                <span className="underline text-blue-500 cursor-pointer">
                                                    ดีล {t.deal_id.slice(0, 8)}…
                                                </span>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {t.dig_order_id ? (
                                                <span className="underline text-blue-500 cursor-pointer">
                                                    ใบสั่งขุด {t.dig_order_id.slice(0, 8)}…
                                                </span>
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string; isDarkMode?: boolean }> = ({ status, isDarkMode = false }) => {
    const base = "px-2 py-1 rounded-full text-[10px]";
    switch (status) {
        case "available":
            return (
                <span className={`${base} ${isDarkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-800"}`}>
                    พร้อมขาย
                </span>
            );
        case "reserved":
            return (
                <span className={`${base} ${isDarkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-800"}`}>
                    จองแล้ว
                </span>
            );
        case "dig_ordered":
            return (
                <span className={`${base} ${isDarkMode ? "bg-sky-500/20 text-sky-300" : "bg-sky-100 text-sky-800"}`}>
                    ในใบสั่งขุด
                </span>
            );
        case "dug":
            return (
                <span className={`${base} ${isDarkMode ? "bg-indigo-500/20 text-indigo-300" : "bg-indigo-100 text-indigo-800"}`}>
                    ขุดแล้ว
                </span>
            );
        case "shipped":
            return (
                <span className={`${base} ${isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-800"}`}>
                    ส่งออกแล้ว
                </span>
            );
        case "planted":
            return (
                <span className={`${base} ${isDarkMode ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-800"}`}>
                    ปลูกแล้ว
                </span>
            );
        default:
            return (
                <span className={`${base} ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"}`}>
                    {status}
                </span>
            );
    }
};
