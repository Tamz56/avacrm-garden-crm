// src/components/customers/deals/DealDigOrdersCard.tsx
// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle2, Loader2, Pencil, FileText, Eye, MapPin, ExternalLink } from "lucide-react";
import { useDealDigOrders } from "../../../hooks/useDealDigOrders";
import { supabase } from "../../../supabaseClient";
import DigOrderDetailDialog from "../../dig-orders/DigOrderDetailDialog";
import { parseLatLngFromGoogleMaps, openInGoogleMaps } from "../../../utils/maps";

interface DealDigOrdersCardProps {
    dealId: string;
}

const STATUS_OPTIONS = [
    { value: "draft", label: "ร่าง", color: "bg-slate-100 text-slate-700" },
    { value: "scheduled", label: "นัดขุดแล้ว", color: "bg-amber-100 text-amber-800" },
    { value: "completed", label: "ขุดเสร็จแล้ว", color: "bg-emerald-100 text-emerald-800" },
    { value: "cancelled", label: "ยกเลิก", color: "bg-rose-100 text-rose-800" },
];

function StatusBadge({ status }: { status: string }) {
    const conf =
        STATUS_OPTIONS.find((s) => s.value === status) ??
        STATUS_OPTIONS[0];

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${conf.color}`}
        >
            {conf.label}
        </span>
    );
}

type EditingState = {
    orderId: string;
    status: string;
    date: string;
    note: string;
    digPurpose: string;
    // Destination fields (only for to_customer)
    destinationAddress: string;
    destinationMapUrl: string;
    destinationLat: number | null;
    destinationLng: number | null;
} | null;

const DealDigOrdersCard: React.FC<DealDigOrdersCardProps> = ({ dealId }) => {
    const { orders, loading, error, refresh, updateOrderStatus } =
        useDealDigOrders(dealId);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<EditingState>(null);
    const [saving, setSaving] = useState(false);

    // For Detail Dialog
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    // Auto-parse lat/lng when map URL changes in editing
    useEffect(() => {
        if (editing?.destinationMapUrl) {
            const parsed = parseLatLngFromGoogleMaps(editing.destinationMapUrl);
            if (parsed) {
                setEditing(prev => prev ? {
                    ...prev,
                    destinationLat: parsed.lat,
                    destinationLng: parsed.lng
                } : prev);
            }
        }
    }, [editing?.destinationMapUrl]);

    const handleCreateFromDeal = async () => {
        if (!dealId) return;

        const ok = window.confirm(
            "ต้องการสร้างใบคำสั่งขุดสำหรับ Tag ที่จองไว้ในดีลนี้ใช่หรือไม่?"
        );
        if (!ok) return;

        try {
            setCreating(true);
            const { data, error } = await supabase.rpc(
                "create_dig_order_from_deal",
                { p_deal_id: dealId, p_dig_purpose: 'to_customer' }
            );

            if (error) throw error;

            alert(
                `สร้างใบคำสั่งขุดเรียบร้อย: ${data.code} (${data.count} ต้น)`
            );
            await refresh();
        } catch (err: any) {
            console.error("สร้างใบคำสั่งขุดไม่สำเร็จ:", err);
            alert(err.message ?? "ไม่สามารถสร้างใบคำสั่งขุดได้");
        } finally {
            setCreating(false);
        }
    };

    const startEdit = (order: any) => {
        setEditing({
            orderId: order.id,
            status: order.status,
            date: order.scheduled_date
                ? order.scheduled_date.slice(0, 10)
                : "",
            note: order.notes ?? "",
            digPurpose: order.dig_purpose ?? "to_customer",
            destinationAddress: order.destination_address ?? "",
            destinationMapUrl: order.destination_map_url ?? "",
            destinationLat: order.destination_lat ?? null,
            destinationLng: order.destination_lng ?? null,
        });
    };

    const handleSave = async () => {
        if (!editing) return;
        try {
            setSaving(true);

            await updateOrderStatus(
                editing.orderId,
                editing.status,
                editing.date || null,
                editing.note || null
            );

            // Call RPC to update destination if dig_purpose is to_customer
            if (editing.digPurpose === "to_customer") {
                const { error: rpcError } = await supabase.rpc("update_dig_order_destination", {
                    p_order_id: editing.orderId,
                    p_address: editing.destinationAddress || null,
                    p_lat: editing.destinationLat ?? null,
                    p_lng: editing.destinationLng ?? null,
                    p_map_url: editing.destinationMapUrl || null,
                });

                if (rpcError) {
                    console.error("update destination error:", rpcError);
                    // Non-fatal, continue
                }
            }

            alert("อัปเดตสถานะใบคำสั่งขุดเรียบร้อยแล้ว");
            setEditing(null);
            await refresh();
        } catch (err: any) {
            alert(err.message ?? "อัปเดตสถานะไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                            คำสั่งขุดล้อม (Dig Orders)
                        </h2>
                        <p className="text-[11px] text-slate-500">
                            จัดการใบสั่งงานขุดล้อมสำหรับดีลนี้
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleCreateFromDeal}
                    disabled={creating}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white text-xs px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-60"
                >
                    {creating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <span className="text-base leading-none">+</span>
                    )}
                    <span>สร้างใบคำสั่งขุดจากดีลนี้</span>
                </button>
            </div>

            {loading && (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    กำลังโหลดข้อมูลใบคำสั่งขุด...
                </div>
            )}

            {error && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                    {error}
                </div>
            )}

            {!loading && orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-500 gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-1">
                        <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <p>ยังไม่มีใบคำสั่งขุดล้อมจากดีลนี้</p>
                    <p>กดปุ่ม “สร้างใบคำสั่งขุดจากดีลนี้” เพื่อเริ่มต้น</p>
                </div>
            )}

            {orders.length > 0 && (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="min-w-full border-collapse text-xs">
                        <thead className="bg-slate-50 text-[11px] text-slate-500">
                            <tr>
                                <th className="px-3 py-2 text-left">ใบคำสั่ง</th>
                                <th className="px-3 py-2 text-left">สถานะ</th>
                                <th className="px-3 py-2 text-left">
                                    <div className="inline-flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        วันที่นัดขุด
                                    </div>
                                </th>
                                <th className="px-3 py-2 text-right">จำนวนต้น</th>
                                <th className="px-3 py-2 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr
                                    key={o.id}
                                    className="border-t border-slate-100 align-top"
                                >
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">
                                                {o.code}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                สร้างเมื่อ: {o.created_at?.slice(0, 10)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <StatusBadge status={o.status} />
                                    </td>
                                    <td className="px-3 py-2">
                                        {o.scheduled_date ? (
                                            <span className="text-xs text-slate-800">
                                                {o.scheduled_date.slice(0, 10)}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-slate-400">
                                                ยังไม่ได้กำหนด
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <span className="font-medium text-slate-900">
                                            {o.tags_count}
                                        </span>{" "}
                                        <span className="text-[11px] text-slate-400">ต้น</span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="inline-flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrderId(o.id);
                                                    setShowDetail(true);
                                                }}
                                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                                            >
                                                <Eye className="w-3 h-3" />
                                                รายละเอียด
                                            </button>

                                            <button
                                                onClick={() => startEdit(o)}
                                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                                            >
                                                <Pencil className="w-3 h-3" />
                                                แก้ไขสถานะ
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Editing Panel */}
            {editing && (
                <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-semibold text-slate-800">
                                อัปเดตสถานะใบคำสั่งขุด
                            </span>
                        </div>
                        <button
                            className="text-[11px] text-slate-500 hover:text-slate-700"
                            onClick={() => setEditing(null)}
                        >
                            ปิด
                        </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-500">
                                สถานะใหม่
                            </label>
                            <select
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                value={editing.status}
                                onChange={(e) =>
                                    setEditing((prev) =>
                                        prev ? { ...prev, status: e.target.value } : prev
                                    )
                                }
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-500">
                                วันที่นัดขุด (ถ้ามี)
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                value={editing.date}
                                onChange={(e) =>
                                    setEditing((prev) =>
                                        prev ? { ...prev, date: e.target.value } : prev
                                    )
                                }
                            />
                        </div>

                        <div className="space-y-1 md:col-span-1 md:col-start-3 md:row-span-2">
                            <label className="text-[11px] text-slate-500">
                                หมายเหตุภายในทีม
                            </label>
                            <textarea
                                rows={3}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs resize-none"
                                value={editing.note}
                                onChange={(e) =>
                                    setEditing((prev) =>
                                        prev ? { ...prev, note: e.target.value } : prev
                                    )
                                }
                            />
                        </div>
                    </div>

                    {/* Destination Location Section (only for to_customer) */}
                    {editing.digPurpose === "to_customer" && (
                        <div className="border-t border-slate-200 pt-3 mt-2">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-sky-600" />
                                <span className="text-[11px] font-medium text-slate-700">จุดหมายปลายทาง (ลูกค้า)</span>
                            </div>

                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-[11px] text-slate-500">ที่อยู่ปลายทาง</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                        placeholder="เช่น 123 ถ.สุขุมวิท กทม."
                                        value={editing.destinationAddress}
                                        onChange={(e) =>
                                            setEditing((prev) =>
                                                prev ? { ...prev, destinationAddress: e.target.value } : prev
                                            )
                                        }
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] text-slate-500">Google Maps URL</label>
                                    <div className="flex gap-1">
                                        <input
                                            type="url"
                                            className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                            placeholder="วาง URL จาก Google Maps"
                                            value={editing.destinationMapUrl}
                                            onChange={(e) =>
                                                setEditing((prev) =>
                                                    prev ? { ...prev, destinationMapUrl: e.target.value } : prev
                                                )
                                            }
                                        />
                                        {editing.destinationMapUrl && (
                                            <button
                                                type="button"
                                                onClick={() => openInGoogleMaps(editing.destinationMapUrl)}
                                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    {/* Short link warning */}
                                    {editing.destinationMapUrl && editing.destinationMapUrl.includes("maps.app.goo.gl") ? (
                                        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                                            ⚠️ ลิงก์สั้นดึงพิกัดไม่ได้ กรุณาเปิดแล้วคัดลอกลิงก์เต็มที่มี @lat,lng
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-slate-400">วาง URL แล้วระบบจะดึง Lat/Lng อัตโนมัติ</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] text-slate-500">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                        placeholder="เช่น 13.7563"
                                        value={editing.destinationLat ?? ""}
                                        onChange={(e) =>
                                            setEditing((prev) =>
                                                prev ? { ...prev, destinationLat: e.target.value ? Number(e.target.value) : null } : prev
                                            )
                                        }
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] text-slate-500">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                        placeholder="เช่น 100.5018"
                                        value={editing.destinationLng ?? ""}
                                        onChange={(e) =>
                                            setEditing((prev) =>
                                                prev ? { ...prev, destinationLng: e.target.value ? Number(e.target.value) : null } : prev
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            {/* Generate URL from lat/lng */}
                            {editing.destinationLat && editing.destinationLng && !editing.destinationMapUrl && (
                                <button
                                    type="button"
                                    onClick={() => setEditing((prev) =>
                                        prev ? { ...prev, destinationMapUrl: `https://www.google.com/maps?q=${prev.destinationLat},${prev.destinationLng}` } : prev
                                    )}
                                    className="mt-2 text-[11px] text-sky-600 hover:text-sky-700 underline"
                                >
                                    🔗 สร้างลิงก์จากพิกัด
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                        <button
                            className="text-[11px] px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100"
                            onClick={() => setEditing(null)}
                            disabled={saving}
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white text-[11px] px-4 py-1.5 hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {saving && (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            <span>บันทึกสถานะ</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Dialog */}
            <DigOrderDetailDialog
                orderId={selectedOrderId}
                open={showDetail}
                onClose={() => {
                    setShowDetail(false);
                    setTimeout(() => setSelectedOrderId(null), 200);
                }}
            />
        </section>
    );
};

export default DealDigOrdersCard;
