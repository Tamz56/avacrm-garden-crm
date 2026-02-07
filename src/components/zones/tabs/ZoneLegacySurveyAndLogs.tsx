
import React, { useState, useMemo } from "react";
import { History } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { ZoneTreeInspectionRow } from "../../../hooks/useZoneTreeInspections";
import { ZoneTreeInspectionForm } from "../ZoneTreeInspectionForm";
import { ZoneInspectionHistory } from "../ZoneInspectionHistory";

interface ZoneLegacySurveyAndLogsProps {
    zoneId: string;
    speciesOptions: any[];
    // Growth Log
    sizeMoveRows: any[];
    sizeMoveLoading: boolean;
    sizeMoveError: string | null;
    reloadSizeMoves: () => void;
    // Inspection Results
    inspectionRows: ZoneTreeInspectionRow[];
    inspectionsLoading: boolean;
    inspectionsError: string | null;
    reloadInspections: () => Promise<any>;
    // Summary
    summaryRows: any[];
    summaryLoading: boolean;
    reloadSummary: () => Promise<any>;
    // Other reloads
    reloadStockDiff: () => Promise<any>;
    // For Form
    inventoryItems: any[];
    isDarkMode?: boolean;
}

export const ZoneLegacySurveyAndLogs: React.FC<ZoneLegacySurveyAndLogsProps> = ({
    zoneId,
    speciesOptions,
    sizeMoveRows,
    sizeMoveLoading,
    sizeMoveError,
    reloadSizeMoves,
    inspectionRows,
    inspectionsLoading,
    inspectionsError,
    reloadInspections,
    summaryRows,
    summaryLoading,
    reloadSummary,
    reloadStockDiff,
    inventoryItems,
    isDarkMode = false,
}) => {
    // --- State for Growth Log Filters ---
    const [moveFilterReason, setMoveFilterReason] = useState<string>("all");
    const [moveFilterSpecies, setMoveFilterSpecies] = useState<string>("all");

    // --- State for Editing Inspecton ---
    const [editingInspection, setEditingInspection] = useState<ZoneTreeInspectionRow | null>(null);

    // --- Constants ---
    const reasonLabelMap: Record<string, string> = {
        growth: "โตขึ้น",
        sale: "ขายออก",
        loss: "สูญหาย/ตาย",
        correction: "แก้ไขข้อมูล",
        transfer: "ย้ายแปลง",
    };

    const reasonBadgeClass: Record<string, string> = {
        growth: "bg-sky-50 text-sky-700 border-sky-100",
        sale: "bg-emerald-50 text-emerald-700 border-emerald-100",
        loss: "bg-rose-50 text-rose-700 border-rose-100",
        correction: "bg-amber-50 text-amber-700 border-amber-100",
        transfer: "bg-indigo-50 text-indigo-700 border-indigo-100",
    };

    // --- Filtered Data ---
    const filteredSizeMoves = useMemo(() => {
        return (sizeMoveRows || []).filter((r) => {
            if (moveFilterReason !== "all" && r.reason !== moveFilterReason) return false;
            if (moveFilterSpecies !== "all" && r.species_id !== moveFilterSpecies) return false;
            return true;
        });
    }, [sizeMoveRows, moveFilterReason, moveFilterSpecies]);

    // --- Handlers ---
    const handleDeleteInspection = async (row: ZoneTreeInspectionRow) => {
        if (!window.confirm("ต้องการลบรายการสำรวจนี้ใช่หรือไม่?")) return;
        const { error } = await supabase.from("zone_tree_inspections").delete().eq("id", row.id);
        if (error) {
            console.error("delete zone_tree_inspections error", error);
            alert("ลบไม่สำเร็จ: " + error.message);
            return;
        }
        if (editingInspection?.id === row.id) setEditingInspection(null);
        await Promise.all([reloadInspections(), reloadSummary(), reloadStockDiff()]);
    };

    return (
        <div className="space-y-6">
            {/* Growth Log */}
            <section className={`rounded-2xl border p-5 space-y-3 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <History className={`h-4 w-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                        <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>ประวัติการย้ายขนาด (Growth Log)</h3>
                        <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{filteredSizeMoves.length.toLocaleString("th-TH")} รายการ</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={moveFilterSpecies}
                            onChange={(e) => setMoveFilterSpecies(e.target.value)}
                            className={`rounded-lg border px-2 py-1.5 text-xs ${isDarkMode ? "bg-black border-white/10 text-white" : "bg-white border-slate-300 text-slate-700"}`}
                        >
                            <option value="all">ทุกชนิด</option>
                            {speciesOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name_th || s.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={moveFilterReason}
                            onChange={(e) => setMoveFilterReason(e.target.value)}
                            className={`rounded-lg border px-2 py-1.5 text-xs ${isDarkMode ? "bg-black border-white/10 text-white" : "bg-white border-slate-300 text-slate-700"}`}
                        >
                            <option value="all">ทุกเหตุผล</option>
                            <option value="growth">โตขึ้น</option>
                            <option value="sale">ขายออก</option>
                            <option value="loss">สูญหาย/ตาย</option>
                            <option value="correction">แก้ไขข้อมูล</option>
                            <option value="transfer">ย้ายแปลง</option>
                        </select>

                        <button
                            type="button"
                            onClick={() => reloadSizeMoves?.()}
                            className={`rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50 ${isDarkMode ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" : "bg-white border-slate-200 text-slate-700"}`}
                        >
                            รีเฟรช
                        </button>
                    </div>
                </div>

                {sizeMoveLoading && <div className="text-xs text-slate-500">กำลังโหลดประวัติ...</div>}
                {!sizeMoveLoading && sizeMoveError && <div className="text-xs text-rose-600">โหลดไม่สำเร็จ: {sizeMoveError}</div>}

                <div className={`overflow-x-auto border rounded-xl ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
                    <table className="min-w-full text-sm">
                        <thead className={`text-xs border-b ${isDarkMode ? "bg-white/5 text-slate-400 border-white/10" : "bg-slate-50 text-slate-500 border-slate-100"}`}>
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">วันที่มีผล</th>
                                <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                <th className="px-3 py-2 text-left font-medium">ย้าย</th>
                                <th className="px-3 py-2 text-right font-medium">จำนวน</th>
                                <th className="px-3 py-2 text-left font-medium">เหตุผล</th>
                                <th className="px-3 py-2 text-left font-medium">หมายเหตุ</th>
                                <th className="px-3 py-2 text-left font-medium">บันทึกเมื่อ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!sizeMoveLoading && filteredSizeMoves.length === 0 && (
                                <tr>
                                    <td colSpan={7} className={`px-3 py-6 text-center ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                                        ยังไม่มีประวัติการย้ายขนาด
                                    </td>
                                </tr>
                            )}

                            {filteredSizeMoves.map((r) => (
                                <tr key={r.id} className={`border-b ${isDarkMode ? "border-white/5 hover:bg-white/5" : "border-slate-50 hover:bg-slate-50"}`}>
                                    <td className={`px-3 py-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                        {r.effective_date ? new Date(r.effective_date).toLocaleDateString("th-TH") : "-"}
                                    </td>
                                    <td className={`px-3 py-2 font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{r.species_name_th || "-"}</td>
                                    <td className={`px-3 py-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                        <span className="font-medium">{r.from_size_label}</span>
                                        <span className="mx-2 text-slate-400">→</span>
                                        <span className="font-medium">{r.to_size_label}</span>
                                        <span className="ml-1 text-slate-500 text-xs">นิ้ว</span>
                                    </td>
                                    <td className={`px-3 py-2 text-right font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{Number(r.qty || 0).toLocaleString("th-TH")}</td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={
                                                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
                                                (reasonBadgeClass[r.reason] || "bg-slate-50 text-slate-700 border-slate-100")
                                            }
                                        >
                                            {reasonLabelMap[r.reason] || r.reason}
                                        </span>
                                    </td>
                                    <td className={`px-3 py-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{r.note || "-"}</td>
                                    <td className="px-3 py-2 text-slate-500 text-xs">
                                        {r.created_at ? new Date(r.created_at).toLocaleString("th-TH") : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Inspection Results */}
            <section className={`rounded-xl shadow-sm border p-4 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>ผลสำรวจจำนวนต้นไม้ในแปลง (ตามขนาด)</h3>
                    {inspectionsLoading && <span className="text-xs text-slate-500">กำลังโหลด...</span>}
                </div>
                <p className={`mb-3 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    ใช้บันทึกผลสำรวจจำนวนต้นไม้จริงในแปลง ณ วันที่ตรวจสอบ เพื่อเปรียบเทียบกับจำนวน Tag และวางแผนการผลิตในระยะยาว{" "}
                    <span className={`font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>ข้อมูลส่วนนี้ไม่ได้ใช้เป็นฐานในการสร้างคำสั่งขุดล้อมโดยตรง</span>
                </p>

                {inspectionsError && (
                    <div className="mb-3 text-sm text-rose-600">เกิดข้อผิดพลาดในการโหลดผลสำรวจ: {inspectionsError}</div>
                )}

                <div className="mb-6">
                    <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>สรุปภาพรวม</h4>
                    <div className={`overflow-x-auto border rounded-lg ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
                        <table className="min-w-full text-sm">
                            <thead className={`${isDarkMode ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-600"}`}>
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                    <th className="px-3 py-2 text-center font-medium">ขนาด (นิ้ว)</th>
                                    <th className="px-3 py-2 text-right font-medium">จำนวนที่ประเมินได้ (ต้น)</th>
                                    <th className="px-3 py-2 text-left font-medium">วันที่สำรวจ</th>
                                    <th className="px-3 py-2 text-left font-medium">เกรด</th>
                                    <th className="px-3 py-2 text-left font-medium">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!summaryLoading && summaryRows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                                            ไม่มีข้อมูลสรุป
                                        </td>
                                    </tr>
                                )}
                                {summaryRows.map((row) => (
                                    <tr
                                        key={`${row.species_id}__${row.size_label}`}
                                        className={`border-t ${isDarkMode ? "border-white/5 hover:bg-white/5" : "border-slate-50 hover:bg-slate-50"}`}
                                    >
                                        <td className={`px-3 py-2 font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{row.species_name_th || "-"}</td>
                                        <td className={`px-3 py-2 text-center ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{row.size_label || "-"}</td>
                                        <td className={`px-3 py-2 text-right font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                            {row.total_estimated_qty?.toLocaleString() ?? "-"}
                                        </td>
                                        <td className={`px-3 py-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                            {row.last_inspection_date
                                                ? new Date(row.last_inspection_date).toLocaleDateString("th-TH")
                                                : "-"}
                                        </td>
                                        <td className={`px-3 py-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{row.grades || "-"}</td>
                                        <td className={`px-3 py-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>-</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mb-4">
                    <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>รายการบันทึกละเอียด</h4>
                    <div className={`overflow-x-auto border rounded-lg ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className={`${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                                    <th className="px-3 py-2 text-left text-xs font-semibold">ชนิดต้นไม้</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold">ขนาด</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold">เกรด</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold">จำนวน (ต้น)</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold">วันที่สำรวจ</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold">หมายเหตุ</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!inspectionsLoading && inspectionRows.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                                            ยังไม่มีข้อมูลสำรวจ
                                        </td>
                                    </tr>
                                )}
                                {inspectionRows.map((row) => (
                                    <tr key={row.id} className={`border-t ${isDarkMode ? "border-white/5" : ""}`}>
                                        <td className="px-3 py-1 text-sm">{row.species_name_th ?? "-"}</td>
                                        <td className="px-3 py-1 text-center text-sm">{row.size_label ?? "-"}</td>
                                        <td className="px-3 py-1 text-sm">{row.grade ?? "-"}</td>
                                        <td className="px-3 py-1 text-right text-sm">{row.estimated_qty?.toLocaleString() ?? "-"}</td>
                                        <td className="px-3 py-1 text-sm">{row.inspection_date ?? "-"}</td>
                                        <td className="px-3 py-1 text-sm">{row.notes ?? "-"}</td>
                                        <td className="px-3 py-1 text-right text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setEditingInspection(row)}
                                                className="text-blue-600 hover:underline mr-2"
                                            >
                                                แก้ไข
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteInspection(row)}
                                                className="text-red-600 hover:underline"
                                            >
                                                ลบ
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <ZoneTreeInspectionForm
                    zoneId={zoneId}
                    inventoryRows={inventoryItems}
                    editingRow={editingInspection}
                    onCancelEdit={() => setEditingInspection(null)}
                    onSaved={async () => {
                        setEditingInspection(null);
                        await Promise.all([reloadInspections(), reloadSummary(), reloadStockDiff()]);
                    }}
                    isDarkMode={isDarkMode}
                />
            </section>

            <ZoneInspectionHistory zoneId={zoneId} isDarkMode={isDarkMode} />
        </div>
    );
};
