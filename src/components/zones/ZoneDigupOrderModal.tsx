// src/components/zones/ZoneDigupOrderModal.tsx
import React from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";

type ZoneDigupOrderModalProps = {
    zoneId: string;
    speciesId: string;
    speciesName: string;
    sizeLabel: string | null;
    availableToOrder: number;
    onClose: () => void;
    onCreated: () => void; // parent จะ reload inventory
};

const ZoneDigupOrderModal: React.FC<ZoneDigupOrderModalProps> = ({
    zoneId,
    speciesId,
    speciesName,
    sizeLabel,
    availableToOrder,
    onClose,
    onCreated,
}) => {
    const [digupDate, setDigupDate] = React.useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [qty, setQty] = React.useState<number>(0);
    const [status, setStatus] = React.useState<"planned" | "in_progress" | "done">(
        "planned"
    );
    const [notes, setNotes] = React.useState<string>("");
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!zoneId || !speciesId) return;

        if (!qty || qty <= 0) {
            setError("กรุณากรอกจำนวนต้นที่ขุดล้อมมากกว่า 0");
            return;
        }

        if (qty > availableToOrder) {
            setError(
                `จำนวนที่ขอขุด (${qty.toLocaleString(
                    "th-TH"
                )}) มากกว่าจำนวนที่พร้อมสั่งขุด (${availableToOrder.toLocaleString(
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
                species_id: speciesId,
                size_label: sizeLabel,
                digup_date: digupDate,
                qty,
                status, // planned / in_progress / done
                notes: notes || null,
            });

        if (insertError) {
            console.error("insert zone_digup_orders error", insertError);
            setError(insertError.message);
            setSaving(false);
            return;
        }

        setSaving(false);
        onCreated(); // reload inventory จาก parent
        onClose();   // ปิด modal
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5">
                <h2 className="text-lg font-semibold mb-1">
                    สร้างคำสั่งขุดล้อมจากแถวนี้
                </h2>
                <p className="text-xs text-slate-500 mb-2">
                    ชนิดต้นไม้: <span className="font-medium text-slate-700">{speciesName}</span> • ขนาด {sizeLabel ?? "-"} นิ้ว • พร้อมสั่งขุด{" "}
                    <span className="font-semibold text-emerald-600">
                        {availableToOrder.toLocaleString("th-TH")}
                    </span>{" "}
                    ต้น
                </p>
                <p className="text-[11px] text-slate-400 mb-3">
                    ฟอร์มนี้สร้างคำสั่งใหม่สำหรับชนิด/ขนาดแถวที่เลือกเท่านั้น หากเคยบันทึกจำนวนเดียวกันไว้แล้ว ระบบจะถือว่าเป็นคำสั่งอีกชุดหนึ่ง
                </p>

                {error && (
                    <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            หมายเหตุ (ถ้ามี)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            บันทึกคำสั่ง
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ZoneDigupOrderModal;
