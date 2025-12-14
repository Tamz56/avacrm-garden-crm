import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useStockZones } from "../../hooks/useStockZones";
import { useDigFromPlot } from "../../hooks/useDigFromPlot";

type DigFromPlotModalProps = {
    open: boolean;
    onClose: () => void;
    plotTree: {
        id: string;
        species_name_th?: string | null;
        species_name_en?: string | null;
        size_label: string;
        planted_count: number;
        moved_to_stock_count: number;
        remaining_in_plot: number;
    };
    onSuccess?: () => void; // เรียก reload data หลังล้อมเสร็จ
};

const DigFromPlotModal: React.FC<DigFromPlotModalProps> = ({
    open,
    onClose,
    plotTree,
    onSuccess,
}) => {
    const { zones } = useStockZones();
    const { digFromPlot, loading, error } = useDigFromPlot();

    const [zoneId, setZoneId] = useState<string>("");
    const [digCount, setDigCount] = useState<number>(0);
    const [digDate, setDigDate] = useState<string>(() =>
        new Date().toISOString().slice(0, 10)
    );

    const remaining = useMemo(
        () => plotTree.remaining_in_plot ?? 0,
        [plotTree.remaining_in_plot]
    );

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!zoneId) {
            alert("กรุณาเลือกโซนปลายทางสำหรับสต็อก");
            return;
        }
        if (!digCount || digCount <= 0) {
            alert("กรุณาระบุจำนวนต้นที่จะล้อมให้ถูกต้อง");
            return;
        }
        if (digCount > remaining) {
            alert("จำนวนที่จะล้อมเกินจำนวนคงเหลือในแปลง");
            return;
        }

        await digFromPlot({
            plotTreeId: plotTree.id,
            digCount,
            zoneId,
            digDate,
        });

        if (onSuccess) onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <div className="text-sm font-semibold">
                            ล้อมต้นเข้า Stock จากแปลง
                        </div>
                        <div className="text-xs text-gray-500">
                            {plotTree.species_name_th ?? "ไม่ทราบพันธุ์"} • ขนาด{" "}
                            {plotTree.size_label}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 text-sm">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-xs">
                        <div>
                            <div className="text-gray-500">ปลูกทั้งหมด</div>
                            <div className="mt-0.5 font-semibold">
                                {plotTree.planted_count.toLocaleString()} ต้น
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500">ล้อมออกแล้ว</div>
                            <div className="mt-0.5 font-semibold">
                                {plotTree.moved_to_stock_count.toLocaleString()} ต้น
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500">คงเหลือในแปลง</div>
                            <div className="mt-0.5 font-semibold text-emerald-700">
                                {remaining.toLocaleString()} ต้น
                            </div>
                        </div>
                    </div>

                    {/* Zone */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-600">โซนสต็อกปลายทาง</label>
                        <select
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                            value={zoneId}
                            onChange={(e) => setZoneId(e.target.value)}
                        >
                            <option value="">-- เลือกโซน --</option>
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>
                                    {z.name ?? z.code ?? z.id}
                                    {z.farm_name ? ` • ${z.farm_name}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Count + Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-600">
                                จำนวนต้นที่จะล้อมเข้า Stock
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={remaining}
                                value={digCount || ""}
                                onChange={(e) => setDigCount(Number(e.target.value))}
                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                            />
                            <div className="text-[10px] text-gray-400">
                                คงเหลือในแปลง {remaining.toLocaleString()} ต้น
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-600">วันที่ล้อม</label>
                            <input
                                type="date"
                                value={digDate}
                                onChange={(e) => setDigDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {loading ? "กำลังล้อม..." : "ยืนยันล้อมเข้า Stock"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DigFromPlotModal;
