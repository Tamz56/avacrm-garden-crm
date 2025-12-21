// src/components/dig-orders/DigOrderDetailDialog.tsx
import React from "react";
import { X, Printer, MapPin, User, FileText, Clock, ChevronRight } from "lucide-react";
import { useDigOrderDetail } from "../../hooks/useDigOrderDetail";
import { TagTimeline } from "../tags/TagTimeline";

type Props = {
    orderId: string | null;
    open: boolean;
    onClose: () => void;
};

// ... (Imports and Previous Code remain the same until the Return statement) ...
// Actually, I need to completely replace the component return to insert the drawer logic.
// Let's rewrite the component part.

const DigOrderDetailDialog: React.FC<Props> = ({ orderId, open, onClose }) => {
    const { rows, loading, error } = useDigOrderDetail(orderId);

    // Drawer State
    const [selectedTagId, setSelectedTagId] = React.useState<string | null>(null);

    if (!open) return null;

    const first = rows[0];

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 print:bg-transparent print:static">
            {/* Main Dialog */}
            <div className={`bg-white transition-all duration-300 w-full mx-4 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-0 print:max-w-full print:m-0 print:rounded-none flex flex-col max-h-[90vh] relative overflow-hidden
                ${selectedTagId ? 'max-w-6xl' : 'max-w-5xl'} 
            `}>
                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Main Content */}
                    <div className={`flex-1 flex flex-col min-w-0 transition-all ${selectedTagId ? 'w-2/3 border-r border-slate-200' : 'w-full'}`}>
                        {/* Header (Non-printable controls) */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 print:hidden shrink-0">
                            <h2 className="text-sm font-semibold text-slate-900">
                                รายละเอียดใบคำสั่งขุด
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    พิมพ์ใบคำสั่งขุด
                                </button>
                                <button
                                    onClick={onClose}
                                    className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Printable Content */}
                        <div id="dig-order-print" className="flex-1 overflow-auto px-6 py-6 print:overflow-visible print:px-0 print:py-0">
                            {/* Header for Print */}
                            <div className="mb-6">
                                <div className="text-xs uppercase tracking-wide text-slate-400">
                                    ใบคำสั่งขุดล้อม
                                </div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {first ? first.code : "กำลังโหลด..."}
                                </h2>
                                {first && (
                                    <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>
                                                ดีล: {first.deal_title} (ลูกค้า: {first.customer_name})
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="inline-flex items-center gap-1">
                                                <User className="w-3.5 h-3.5" />
                                                <span>สถานะ: {first.status}</span>
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span>โซนหลัก: {first.zone_name ?? "-"}</span>
                                            </span>
                                            <span>
                                                วันที่ขุด:{" "}
                                                {first.scheduled_date
                                                    ? first.scheduled_date.toString().slice(0, 10)
                                                    : "-"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Body */}
                            <div className="space-y-4">
                                {/* หมายเหตุใบคำสั่ง */}
                                {first && (
                                    <div className="text-xs text-slate-600">
                                        <span className="font-medium">หมายเหตุใบคำสั่ง:</span>{" "}
                                        {first.notes || "-"}
                                    </div>
                                )}

                                {/* ตาราง list ต้นไม้ในใบคำสั่ง */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                                    <table className="min-w-full text-xs">
                                        <thead className="bg-slate-50 print:bg-slate-100">
                                            <tr className="text-slate-600">
                                                <th className="px-3 py-2 text-left">TAG</th>
                                                <th className="px-3 py-2 text-left">พันธุ์</th>
                                                <th className="px-3 py-2 text-left">ขนาด</th>
                                                <th className="px-3 py-2 text-left">จำนวน</th>
                                                <th className="px-3 py-2 text-left">แถว / ต้นที่</th>
                                                <th className="px-3 py-2 text-left">โซน</th>
                                                <th className="px-3 py-2 text-left">หมายเหตุ Tag</th>
                                                <th className="px-3 py-2 text-right print:hidden">Timeline</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading && (
                                                <tr>
                                                    <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                                                        กำลังโหลดข้อมูล...
                                                    </td>
                                                </tr>
                                            )}
                                            {error && !loading && (
                                                <tr>
                                                    <td colSpan={8} className="px-3 py-6 text-center text-rose-500">
                                                        โหลดข้อมูลไม่สำเร็จ: {error}
                                                    </td>
                                                </tr>
                                            )}
                                            {!loading && !error && rows.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                                                        ไม่มีรายการต้นไม้ในใบคำสั่งนี้
                                                    </td>
                                                </tr>
                                            )}
                                            {rows.map((row) => (
                                                <tr
                                                    key={row.tag_id}
                                                    className={`border-t border-slate-100 text-slate-800 print:border-slate-200 transition-colors
                                                        ${selectedTagId === row.tag_id ? 'bg-sky-50' : 'hover:bg-slate-50'}
                                                    `}
                                                >
                                                    <td className="px-3 py-2 font-mono text-[11px]">
                                                        {row.tag_code}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {row.species_name_th || row.species_name_en || "-"}
                                                    </td>
                                                    <td className="px-3 py-2">{row.size_label ?? "-"}</td>
                                                    <td className="px-3 py-2">{row.qty ?? 1}</td>
                                                    <td className="px-3 py-2">
                                                        {row.planting_row != null || row.planting_position != null
                                                            ? `แถว ${row.planting_row ?? "-"} / ต้นที่ ${row.planting_position ?? "-"
                                                            }`
                                                            : "-"}
                                                    </td>
                                                    <td className="px-3 py-2">{row.zone_name ?? "-"}</td>
                                                    <td className="px-3 py-2">{row.tag_notes ?? "-"}</td>
                                                    <td className="px-3 py-2 text-right print:hidden">
                                                        <button
                                                            onClick={() => setSelectedTagId(selectedTagId === row.tag_id ? null : row.tag_id)}
                                                            className={`p-1.5 rounded-md transition-colors ${selectedTagId === row.tag_id ? 'bg-sky-100 text-sky-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                            title="ดู Timeline"
                                                        >
                                                            <Clock className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Note สำหรับภาคสนาม (print ลงกระดาษ) */}
                                <div className="text-[11px] text-slate-500 mt-2 print:block">
                                    สำหรับใช้เป็นใบงานภาคสนาม: ให้ทีมขุดเซ็นรับงาน / บันทึกเวลา / ผู้ขุด และสภาพต้นไม้ในหน้างานเพิ่มได้
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Drawer: Timeline */}
                    {selectedTagId && (
                        <div className="w-[320px] bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-right duration-200 print:hidden">
                            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
                                <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    Timeline ของ Tag
                                </h3>
                                <button
                                    onClick={() => setSelectedTagId(null)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                                    <TagTimeline tagId={selectedTagId} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DigOrderDetailDialog;
