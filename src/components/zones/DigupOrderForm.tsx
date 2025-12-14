// src/components/zones/DigupOrderForm.tsx
import React from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
    useZoneTreeInventoryFlow,
    ZoneTreeInventoryRow,
} from "../../hooks/useZoneTreeInventoryFlow";

type DigupOrderFormProps = {
    zoneId: string;
    defaultDate?: string;
    onSaved?: () => void;
    onCancel?: () => void;
};

export const DigupOrderForm: React.FC<DigupOrderFormProps> = ({
    zoneId,
    defaultDate,
    onSaved,
    onCancel,
}) => {
    const {
        rows: inventoryRows,
        loading: inventoryLoading,
        error: inventoryError,
    } = useZoneTreeInventoryFlow(zoneId);

    const [selectedKey, setSelectedKey] = React.useState<string>("");
    const [digupDate, setDigupDate] = React.useState<string>(
        defaultDate ?? new Date().toISOString().slice(0, 10)
    );
    const [qty, setQty] = React.useState<number>(0);
    const [status, setStatus] = React.useState<"planned" | "in_progress" | "done">(
        "planned"
    );
    const [notes, setNotes] = React.useState<string>("");
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const selectedItem: ZoneTreeInventoryRow | undefined = React.useMemo(() => {
        if (!selectedKey) return undefined;
        return inventoryRows.find(
            (r) =>
                `${r.species_id || ""}__${r.size_label || ""}` === selectedKey
        );
    }, [selectedKey, inventoryRows]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!zoneId) return;

        if (!selectedItem) {
            setError("กรุณาเลือกชนิด/ขนาดต้นไม้ที่จะขุดล้อม");
            return;
        }

        if (!qty || qty <= 0) {
            setError("กรุณากรอกจำนวนต้นที่ขุดล้อมมากกว่า 0");
            return;
        }

        if (qty > selectedItem.available_to_order) {
            setError(
                `จำนวนที่ขอขุด (${qty.toLocaleString(
                    "th-TH"
                )}) มากกว่าจำนวนที่พร้อมสั่งขุด (${selectedItem.available_to_order.toLocaleString(
                    "th-TH"
                )})`
            );
            return;
        }

        setSaving(true);
        setError(null);

        const { error: insertError } = await supabase
            .from("zone_digup_orders")
            .insert({
                zone_id: zoneId,
                species_id: selectedItem.species_id,
                size_label: selectedItem.size_label,
                digup_date: digupDate,
                qty,
                status, // planned / in_progress / done
                notes: notes || null,
            });

        if (insertError) {
            console.error("insert digup order error", insertError);
            setError(insertError.message);
            setSaving(false);
            return;
        }

        setSaving(false);
        if (onSaved) onSaved();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {inventoryError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 mb-1">
                    โหลดข้อมูลต้นไม้ในแปลงไม่สำเร็จ: {inventoryError}
                </div>
            )}

            {error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {error}
                </div>
            )}
            <p className="text-[11px] text-slate-400">
                หมายเหตุ: ทุกครั้งที่กดบันทึก ระบบจะบันทึกเป็นคำสั่งใหม่ แม้จะเป็นวันที่และจำนวนเท่าเดิมกับคำสั่งก่อนหน้า
            </p>

            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                    เลือกชนิด/ขนาดต้นไม้
                </label>
                {inventoryLoading ? (
                    <p className="text-xs text-slate-500">กำลังโหลดข้อมูลต้นไม้...</p>
                ) : inventoryRows.length === 0 ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                        <div className="font-semibold mb-0.5">
                            ยังไม่มี Tag สำหรับใช้ขุดล้อมในแปลงนี้
                        </div>
                        <p>
                            กรุณาสร้าง <span className="font-medium">Tree Tag</span> จากตาราง
                            <span className="font-medium"> "รายการต้นไม้ในแปลง (Plot Inventory)"</span> ด้านบนก่อน
                            โดยใช้ปุ่ม <span className="font-medium">"+ Tag"</span> ที่แถวพันธุ์ไม้/ขนาดที่ต้องการขุดล้อม
                        </p>
                    </div>
                ) : (
                    <select
                        value={selectedKey}
                        onChange={(e) => setSelectedKey(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">- เลือกชนิด/ขนาดต้นไม้ -</option>
                        {inventoryRows.map((row) => (
                            <option
                                key={`${row.species_id}__${row.size_label}`}
                                value={`${row.species_id}__${row.size_label}`}
                            >
                                {row.species_name_th ?? "ไม่ทราบชนิด"} • ขนาด{" "}
                                {row.size_label ?? "-"} นิ้ว • พร้อมสั่งขุด{" "}
                                {row.available_to_order.toLocaleString("th-TH")} ต้น
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        วันที่ขุดล้อม
                    </label>
                    <input
                        type="date"
                        value={digupDate}
                        onChange={(e) => setDigupDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        จำนวนต้นที่ขุดล้อม
                    </label>
                    <input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => setQty(Number(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        สถานะคำสั่ง
                    </label>
                    <select
                        value={status}
                        onChange={(e) =>
                            setStatus(e.target.value as "planned" | "in_progress" | "done")
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="planned">แผนจะขุดล้อม</option>
                        <option value="in_progress">กำลังขุดล้อม</option>
                        <option value="done">ขุดล้อมเสร็จแล้ว</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        หมายเหตุ (ถ้ามี)
                    </label>
                    <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    >
                        ยกเลิก
                    </button>
                )}
                <button
                    type="submit"
                    disabled={saving || inventoryRows.length === 0}
                    className="inline-flex items-center px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    บันทึกคำสั่งขุดล้อม
                </button>
            </div>
        </form>
    );
};
