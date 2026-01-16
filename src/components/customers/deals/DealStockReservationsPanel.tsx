// src/components/customers/deals/DealStockReservationsPanel.tsx
import React, { useState } from "react";
import { Package, Loader2, AlertCircle, X, Plus } from "lucide-react";
import { useAvailableStockGroups, StockGroup } from "../../../hooks/useStockGroups";
import { useDealStockReservations } from "../../../hooks/useDealStockReservations";

type DealStockReservationsPanelProps = {
    dealId: string;
};

const DealStockReservationsPanel: React.FC<DealStockReservationsPanelProps> = ({
    dealId,
}) => {
    const { data: stockGroups, loading: loadingGroups, refetch: refetchGroups } = useAvailableStockGroups();
    const {
        data: reservations,
        loading: loadingReservations,
        error,
        reserving,
        releasing,
        reserve,
        release,
    } = useDealStockReservations(dealId);

    // Form state
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [qty, setQty] = useState(1);
    const [notes, setNotes] = useState("");
    const [showForm, setShowForm] = useState(false);

    const selectedGroup = stockGroups.find((g) => g.id === selectedGroupId);
    const maxQty = selectedGroup?.qty_available ?? 0;

    const handleReserve = async () => {
        if (!selectedGroupId || qty < 1) return;

        const success = await reserve(selectedGroupId, qty, notes || undefined);
        if (success) {
            await refetchGroups(); // ✅ ให้ qty_available อัปเดตทันที
            setSelectedGroupId("");
            setQty(1);
            setNotes("");
            setShowForm(false);
        }
    };

    const handleRelease = async (reservationId: string) => {
        const confirmRelease = window.confirm("ยืนยันการปล่อยสต๊อกนี้?");
        if (!confirmRelease) return;

        const ok = await release(reservationId);
        if (ok) await refetchGroups(); // ✅ ให้ qty_available อัปเดตทันที
    };

    const formatStockLabel = (g: StockGroup) => {
        return `${g.species_name_th || "ไม่ระบุพันธุ์"} - ${g.size_label || "ไม่ระบุขนาด"} (${g.zone_key || "-"}) [ว่าง: ${g.qty_available}]`;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-900">
                            สต๊อกที่จองในดีล
                        </div>
                        <div className="text-xs text-slate-500">
                            Reserve / Release stock สำหรับดีลนี้
                        </div>
                    </div>
                </div>

                {!showForm && (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        จองสต๊อก
                    </button>
                )}
            </div>

            {/* Reserve Form */}
            {showForm && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-blue-700">จองสต๊อกใหม่</span>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="text-blue-500 hover:text-blue-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {/* Stock Group Select */}
                        <div>
                            <label className="text-[11px] text-slate-600 mb-1 block">เลือกกลุ่มสต๊อก</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => {
                                    setSelectedGroupId(e.target.value);
                                    setQty(1);
                                }}
                                disabled={loadingGroups || reserving}
                                className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                            >
                                <option value="">-- เลือก --</option>
                                {stockGroups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {formatStockLabel(g)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Quantity */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[11px] text-slate-600 mb-1 block">จำนวน</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={maxQty}
                                    value={qty}
                                    onChange={(e) => setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
                                    disabled={!selectedGroupId || reserving}
                                    className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5"
                                />
                                {selectedGroup && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        สูงสุด: {maxQty}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="text-[11px] text-slate-600 mb-1 block">หมายเหตุ</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="(ไม่บังคับ)"
                                    disabled={reserving}
                                    className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="button"
                            onClick={handleReserve}
                            disabled={!selectedGroupId || qty < 1 || qty > maxQty || reserving}
                            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {reserving ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    กำลังจอง...
                                </>
                            ) : (
                                "ยืนยันจองสต๊อก"
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                    <span>{error.message || "เกิดข้อผิดพลาด"}</span>
                </div>
            )}

            {/* Reservations List */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {loadingReservations ? (
                    <div className="flex-1 flex items-center justify-center py-6 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        กำลังโหลดรายการจอง...
                    </div>
                ) : reservations.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-4 text-xs text-slate-400">
                        ยังไม่มีสต๊อกที่จองสำหรับดีลนี้
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full text-xs">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-2 py-1 text-left font-medium text-slate-500">พันธุ์/ขนาด</th>
                                    <th className="px-2 py-1 text-left font-medium text-slate-500">โซน</th>
                                    <th className="px-2 py-1 text-center font-medium text-slate-500">จำนวน</th>
                                    <th className="px-2 py-1 text-left font-medium text-slate-500">หมายเหตุ</th>
                                    <th className="px-2 py-1 text-center font-medium text-slate-500"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {reservations.map((r) => (
                                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                                        <td className="px-2 py-1.5">
                                            <div className="text-[11px] text-slate-800">
                                                {r.species_name_th || "-"}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {r.size_label || "-"}
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5 text-slate-600">
                                            {r.zone_key || "-"}
                                        </td>
                                        <td className="px-2 py-1.5 text-center font-medium">
                                            {r.qty}
                                        </td>
                                        <td className="px-2 py-1.5 text-slate-500">
                                            {r.notes || "-"}
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRelease(r.id)}
                                                disabled={releasing === r.id}
                                                className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-0.5 text-[10px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                            >
                                                {releasing === r.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    "ปล่อย"
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DealStockReservationsPanel;
