import React, { useEffect, useMemo, useState } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { useTransferTreesFromPlotToStock } from "../../hooks/useTransferTreesFromPlotToStock";
import { supabase } from "../../supabaseClient";

type ZoneOption = { id: string; label: string };

interface MoveTreesToStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    plotTreeId: string;
    plotName: string;
    speciesName: string;
    sizeLabel: string;
    remainingInPlot: number;
    availableToOrder: number;
    onSuccess?: () => void;
}

const MoveTreesToStockModal: React.FC<MoveTreesToStockModalProps> = ({
    isOpen,
    onClose,
    plotTreeId,
    plotName,
    speciesName,
    sizeLabel,
    remainingInPlot,
    availableToOrder,
    onSuccess,
}) => {
    const [zones, setZones] = useState<ZoneOption[]>([]);
    const [zoneId, setZoneId] = useState<string>("");
    const [quantity, setQuantity] = useState<number>(availableToOrder); // Default to available
    const [date, setDate] = useState<string>("");
    const [note, setNote] = useState<string>("");
    const { transfer, loading, error } = useTransferTreesFromPlotToStock();

    useEffect(() => {
        if (!isOpen) return;
        // load zones อย่างง่าย ๆ
        supabase
            .from("stock_zones")
            .select("id, name")
            // .eq("is_active", true) // Assuming is_active might not be on all envs yet, check if needed
            .then(({ data, error }) => {
                if (error || !data) return;
                const opts = data.map((z) => ({
                    id: z.id,
                    label: z.name as string,
                }));
                setZones(opts);
                if (!zoneId && opts[0]) setZoneId(opts[0].id);
            });
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        setQuantity(availableToOrder);
    }, [isOpen, availableToOrder]);

    const maxQty = useMemo(() => availableToOrder || 0, [availableToOrder]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!zoneId) return;
        if (!quantity || quantity <= 0) return;

        await transfer({
            plotTreeId: plotTreeId,
            targetZoneId: zoneId,
            quantity,
            transferDate: date || undefined,
            note,
        });

        if (onSuccess) onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        <h2 className="text-sm font-semibold">
                            ล้อมต้นไม้จากแปลงเข้า Stock
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                        <div>แปลง: <span className="font-medium">{plotName}</span></div>
                        <div>ชนิด: <span className="font-medium">{speciesName}</span></div>
                        <div>ขนาด: <span className="font-medium">{sizeLabel}</span></div>
                        <div>คงเหลือในแปลง: <span className="font-medium">{remainingInPlot.toLocaleString()} ต้น</span></div>
                        <div>พร้อมสั่งขุด: <span className="font-semibold text-emerald-700">{maxQty.toLocaleString()} ต้น</span></div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-gray-500">โซนที่รับเข้าสต็อก</label>
                        <select
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                            value={zoneId}
                            onChange={(e) => setZoneId(e.target.value)}
                        >
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>
                                    {z.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500">
                                จำนวนที่ล้อมเข้าสต็อก
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={maxQty}
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                            />
                            <div className="mt-1 text-[11px] text-gray-400">
                                สูงสุด {maxQty.toLocaleString()} ต้น
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500">วันที่ล้อม</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500">หมายเหตุ</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="เช่น ล้อมชุดแรก, ล้อมเพื่อเตรียม stock ขนาด 4 นิ้ว ฯลฯ"
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                            {error}
                        </div>
                    )}

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
                            {loading ? "กำลังบันทึก..." : "ย้ายเข้าสต็อก"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MoveTreesToStockModal;
