// src/components/stock/StockGroupFormDialog.tsx
import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { StockGroup } from "../../hooks/useStockGroups";

type StockGroupFormDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: StockGroupFormData) => Promise<boolean>;
    editingGroup?: StockGroup | null;
    saving?: boolean;
};

export type StockGroupFormData = {
    zone_key: string;
    plot_key: string;
    species_name_th: string;
    species_name_en: string;
    size_label: string;
    qty_total: number;
};

const StockGroupFormDialog: React.FC<StockGroupFormDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    editingGroup,
    saving = false,
}) => {
    const [form, setForm] = useState<StockGroupFormData>({
        zone_key: "",
        plot_key: "",
        species_name_th: "",
        species_name_en: "",
        size_label: "",
        qty_total: 0,
    });

    useEffect(() => {
        if (editingGroup) {
            setForm({
                zone_key: editingGroup.zone_key || "",
                plot_key: editingGroup.plot_key || "",
                species_name_th: editingGroup.species_name_th || "",
                species_name_en: editingGroup.species_name_en || "",
                size_label: editingGroup.size_label || "",
                qty_total: editingGroup.qty_total,
            });
        } else {
            setForm({
                zone_key: "",
                plot_key: "",
                species_name_th: "",
                species_name_en: "",
                size_label: "",
                qty_total: 0,
            });
        }
    }, [editingGroup, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSave(form);
        if (success) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="text-base font-semibold text-slate-900">
                        {editingGroup ? "แก้ไขกลุ่มสต๊อก" : "เพิ่มกลุ่มสต๊อก"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                                โซน (zone_key)
                            </label>
                            <input
                                type="text"
                                value={form.zone_key}
                                onChange={(e) => setForm({ ...form, zone_key: e.target.value })}
                                placeholder="เช่น A1, B2"
                                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                                แปลง (plot_key)
                            </label>
                            <input
                                type="text"
                                value={form.plot_key}
                                onChange={(e) => setForm({ ...form, plot_key: e.target.value })}
                                placeholder="เช่น P01"
                                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                            ชื่อพันธุ์ (ภาษาไทย) *
                        </label>
                        <input
                            type="text"
                            value={form.species_name_th}
                            onChange={(e) => setForm({ ...form, species_name_th: e.target.value })}
                            placeholder="เช่น ประดู่แดง"
                            required
                            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                            ชื่อพันธุ์ (English)
                        </label>
                        <input
                            type="text"
                            value={form.species_name_en}
                            onChange={(e) => setForm({ ...form, species_name_en: e.target.value })}
                            placeholder="e.g. Burma Padauk"
                            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                                ขนาด (size_label)
                            </label>
                            <input
                                type="text"
                                value={form.size_label}
                                onChange={(e) => setForm({ ...form, size_label: e.target.value })}
                                placeholder="เช่น L, XL, 50cm"
                                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                                จำนวนทั้งหมด *
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={form.qty_total}
                                onChange={(e) => setForm({ ...form, qty_total: parseInt(e.target.value) || 0 })}
                                required
                                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !form.species_name_th}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                "บันทึก"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockGroupFormDialog;
