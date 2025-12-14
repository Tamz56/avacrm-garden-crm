import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { DealStockAllocation } from "../DealStockSummaryCard";
import { Edit2 } from "lucide-react";
import EditShipmentModal from "./EditShipmentModal";
import { SHIPMENT_STATUS_LABELS, ShipmentStatus } from "../../types/shipment";

export interface DealShipment {
    id: string;
    ship_date: string;
    transporter_name: string | null;
    note: string | null;
    status: ShipmentStatus | null;
    // Add other fields needed for edit modal
    tracking_code: string | null;
    distance_km: number | null;
    estimated_price: number | null;
    final_price: number | null;
    vehicle_code: string | null;
    deal_title?: string; // Optional for display
}

interface DealShipmentsCardProps {
    dealId: string;
    shipments: DealShipment[];
    allocations: DealStockAllocation[];
    onAfterApplyMovement?: () => void; // ให้หน้าแม่ใช้ reload ข้อมูล
    onAddShipment?: () => void;
}

const DealShipmentsCard: React.FC<DealShipmentsCardProps> = ({
    dealId,
    shipments,
    allocations,
    onAfterApplyMovement,
    onAddShipment,
}) => {
    const [editingShipment, setEditingShipment] = useState<DealShipment | null>(null);

    const handleApplyMovement = async (shipmentId: string) => {
        // กลยุทธ์: ตัดเฉพาะ "คงเหลือในดีล" ออกไปกับ shipment นี้
        // พยายามใช้ฟิลด์ที่มีอยู่แล้วใน DealStockAllocation ให้ครอบคลุมทุกกรณี

        const items = allocations
            .map((a) => {
                // ถ้า DealStockAllocation มี remainingAfterShip ใช้อันนั้นก่อน
                const remainingFromField =
                    (a as any).remainingAfterShip ??
                    (a as any).remaining_quantity; // กันกรณีชื่อเก่า

                let remainingToShip: number;

                if (typeof remainingFromField === "number") {
                    remainingToShip = Math.max(remainingFromField, 0);
                } else {
                    // fallback: ถ้าชนิด allocation เป็น ordered/shipped style
                    const ordered =
                        (a as any).ordered_quantity ??
                        (a as any).deal_quantity ??
                        0;
                    const shipped =
                        (a as any).shipped_quantity ??
                        (a as any).shipped ??
                        0;
                    remainingToShip = Math.max(ordered - shipped, 0);
                }

                return {
                    stock_item_id: a.stock_item_id,
                    quantity: remainingToShip,
                    note: `Auto apply from shipment ${shipmentId}`,
                };
            })
            .filter((x) => x.quantity > 0);

        if (items.length === 0) {
            alert("ไม่มีจำนวนคงเหลือในดีลสำหรับตัดสต็อกแล้วครับ (หรือตัดครบแล้ว)");
            return;
        }

        const { error } = await supabase.rpc("apply_shipment_stock_movement", {
            p_deal_id: dealId,
            p_shipment_id: shipmentId,
            p_items: items,
        });

        if (error) {
            console.error("apply_shipment_stock_movement error:", error);
            alert("ตัดสต็อกจาก Shipment ไม่สำเร็จ: " + error.message);
            return;
        }

        // ✅ อัปเดตสถานะ Shipment เป็น completed
        const { error: updateError } = await supabase
            .from("deal_shipments")
            .update({ status: "completed" })
            .eq("id", shipmentId);

        if (updateError) {
            console.error("update shipment status error:", updateError);
            // ไม่ต้อง alert ก็ได้ เพราะตัดสต็อกไปแล้ว แค่สถานะไม่อัปเดต
        }

        alert("ตัดสต็อกเรียบร้อยแล้ว ✅");
        if (onAfterApplyMovement) onAfterApplyMovement();
    };

    if (!shipments.length) {
        return (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-base text-slate-900">
                        การจัดส่งของดีลนี้
                    </h3>
                    {onAddShipment && (
                        <button
                            onClick={onAddShipment}
                            className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                        >
                            + เพิ่มการจัดส่ง
                        </button>
                    )}
                </div>
                <p className="text-sm text-slate-500">ยังไม่มีข้อมูลการจัดส่ง</p>
            </div>
        );
    }

    const lastShipment = shipments[shipments.length - 1];

    return (
        <>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-base text-slate-900">
                        การจัดส่งของดีลนี้
                    </h3>
                    <div className="flex items-center gap-2">
                        {onAddShipment && (
                            <button
                                onClick={onAddShipment}
                                className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                            >
                                + เพิ่มการจัดส่ง
                            </button>
                        )}
                        <button
                            onClick={() => handleApplyMovement(lastShipment.id)}
                            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            ตัดสต็อกจากดีลตาม Shipment ล่าสุด
                        </button>
                    </div>
                </div>

                {/* ตาราง shipments */}
                <div className="overflow-x-auto text-sm">
                    <table className="min-w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs text-slate-500">
                                <th className="py-2 pr-3 font-medium">วันที่จัดส่ง</th>
                                <th className="py-2 px-3 font-medium">ผู้ขนส่ง</th>
                                <th className="py-2 px-3 font-medium">สถานะ</th>
                                <th className="py-2 pl-3 font-medium">หมายเหตุ</th>
                                <th className="py-2 pl-3 font-medium w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {shipments.map((s) => (
                                <tr
                                    key={s.id}
                                    className="border-b border-slate-100 last:border-0 group"
                                >
                                    <td className="py-2 pr-3 text-slate-800">
                                        {new Date(s.ship_date).toLocaleDateString("th-TH")}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600">
                                        {s.transporter_name || "-"}
                                    </td>
                                    <td className="py-2 px-3">
                                        <span
                                            className={[
                                                'px-2 py-0.5 text-[10px] rounded-full border',
                                                (s.status || 'draft') === 'draft' && 'border-yellow-500/60 text-yellow-600 bg-yellow-50',
                                                s.status === 'completed' && 'border-emerald-500/60 text-emerald-600 bg-emerald-50',
                                                s.status === 'cancelled' && 'border-red-500/60 text-red-600 bg-red-50',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                        >
                                            {SHIPMENT_STATUS_LABELS[s.status || 'draft']}
                                        </span>
                                    </td>
                                    <td className="py-2 pl-3 text-slate-600">
                                        {s.note || "-"}
                                    </td>
                                    <td className="py-2 pl-3 text-right">
                                        <button
                                            onClick={() => setEditingShipment(s)}
                                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingShipment && (
                <EditShipmentModal
                    shipment={editingShipment}
                    onClose={() => setEditingShipment(null)}
                    onUpdated={() => {
                        if (onAfterApplyMovement) onAfterApplyMovement();
                        setEditingShipment(null);
                    }}
                />
            )}
        </>
    );
};

export default DealShipmentsCard;
