import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { ActiveStockPrice } from "../../hooks/useActiveStockPriceMap";

type Props = {
    open: boolean;
    onClose: () => void;
    group: {
        species: { id: string; name_th: string; name_en?: string | null };
        sizeLabel: string;
    } | null;
    currentPrice?: ActiveStockPrice | null;
    onSaved?: () => void;
};

export const SetStockPriceDialog: React.FC<Props> = ({
    open,
    onClose,
    group,
    currentPrice,
    onSaved,
}) => {
    const [grade, setGrade] = useState<string>("A");
    const [price, setPrice] = useState<string>("");
    const [currency, setCurrency] = useState<string>("THB");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !group) return;
        setError(null);
        setGrade(currentPrice?.grade || "A");
        setCurrency(currentPrice?.currency || "THB");
        setPrice(
            currentPrice ? String(Number(currentPrice.base_price || 0)) : ""
        );
    }, [open, group, currentPrice]);

    if (!open || !group) return null;

    const title = `${group.species.name_th} – ขนาด ${group.sizeLabel}"`;

    async function handleSave() {
        if (!group?.species.id) return;
        if (!price) {
            setError("กรุณากรอกราคา");
            return;
        }

        setSaving(true);
        setError(null);

        const { error } = await supabase.rpc("set_stock_price", {
            _species_id: group.species.id,
            _size_label: group.sizeLabel,
            _grade: grade,
            _base_price: Number(price),
            _currency: currency,
        });

        setSaving(false);

        if (error) {
            console.error(error);
            setError(error.message);
            return;
        }

        onSaved?.();
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                <div className="px-5 py-4 border-b flex justify-between items-center">
                    <div>
                        <div className="text-xs text-slate-500">
                            ตั้งราคา / ปรับราคา
                        </div>
                        <div className="font-semibold text-sm">{title}</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-800 text-sm"
                    >
                        ✕ ปิด
                    </button>
                </div>

                <div className="px-5 py-4 space-y-3 text-xs">
                    <div>
                        <label className="block text-slate-600 mb-1">เกรด</label>
                        <select
                            className="w-full border rounded-lg px-2 py-1"
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                        >
                            <option value="A">A (สวย / Premium)</option>
                            <option value="B">B (มาตรฐาน)</option>
                            <option value="C">C (รอง)</option>
                            <option value="Reject">Reject</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-600 mb-1">
                            ราคา (ต่อ 1 ต้น)
                        </label>
                        <input
                            type="number"
                            className="w-full border rounded-lg px-2 py-1"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-slate-600 mb-1">
                            สกุลเงิน
                        </label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-2 py-1"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-xs text-red-600">{error}</div>
                    )}
                </div>

                <div className="px-5 py-3 border-t flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1 rounded-lg border text-xs text-slate-600"
                        disabled={saving}
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs"
                        disabled={saving}
                    >
                        {saving ? "กำลังบันทึก..." : "บันทึกราคา"}
                    </button>
                </div>
            </div>
        </div>
    );
};
