import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { X } from "lucide-react";
import { useStockUpdate } from "../../hooks/useStockUpdate";
import ProductSelect from "./ProductSelect";
import { StockProduct } from "../../hooks/useStockProducts";

import { trunkSizeOptions, potSizeOptions } from "../../constants/treeOptions";

// ขนาดกระถาง 6"–20" -> Use potSizeOptions instead

type DbZone = {
    id: string;
    name: string;
    farm_name: string | null;
};

type StockItemModalProps = {
    open: boolean;
    mode: "create" | "edit";
    speciesId: string | null;
    initialData?: any; // Should be typed properly with StockOverviewRow
    onClose: () => void;
    onSaved: () => void;
};

export const StockItemModal: React.FC<StockItemModalProps> = ({
    open,
    mode,
    speciesId,
    initialData,
    onClose,
    onSaved,
}) => {
    const [zones, setZones] = useState<DbZone[]>([]);
    const { createStockItem, updateStockItem, saving: hookSaving, error: hookError } = useStockUpdate();

    const [form, setForm] = useState<{
        product_id: string | null;
        zone_id: string;
        size_label: string;
        trunk_size_inch: number | null;
        pot_size_inch: number | null;
        height_text: string;
        quantity: number | "";
        price_per_tree: number | "";
        ready_date: string | null;
        dig_date: string | null;
        lift_date: string | null;
        plant_status: string;
        status: string;
    }>({
        product_id: null,
        zone_id: "",
        size_label: "",
        trunk_size_inch: null,
        pot_size_inch: null,
        height_text: "",
        quantity: "",
        price_per_tree: "",
        ready_date: null,
        dig_date: null,
        lift_date: null,
        plant_status: "balled", // Default to balled (ไม้ขุดล้อม)
        status: "available",
    });

    const [localError, setLocalError] = useState<string | null>(null);

    // Fetch zones on mount/open
    useEffect(() => {
        if (open) {
            const fetchZones = async () => {
                const { data } = await supabase
                    .from("stock_zones")
                    .select("id, name, farm_name")
                    .order("name");
                setZones(data || []);
            };
            fetchZones();

            if (mode === "edit" && initialData) {
                setForm({
                    product_id: initialData.product_id || null,
                    zone_id: initialData.zone_id || "",
                    size_label: initialData.size_label || "",
                    trunk_size_inch: initialData.trunk_size_inch,
                    pot_size_inch: initialData.pot_size_inch,
                    height_text: initialData.height_text || "",
                    quantity: initialData.quantity_available ?? "", // Use quantity_available from view
                    price_per_tree: initialData.base_price ?? "",
                    ready_date: initialData.ready_date || null,
                    dig_date: initialData.dig_date || null,
                    lift_date: initialData.lift_date || null,
                    plant_status: initialData.plant_status || "balled",
                    status: initialData.status || "available",
                });
            } else {
                // Reset form for create
                setForm({
                    product_id: null,
                    zone_id: "",
                    size_label: "",
                    trunk_size_inch: null,
                    pot_size_inch: null,
                    height_text: "",
                    quantity: "",
                    price_per_tree: "",
                    ready_date: null,
                    dig_date: null,
                    lift_date: null,
                    plant_status: "balled",
                    status: "available",
                });
            }
            setLocalError(null);
        }
    }, [open, mode, initialData]);

    if (!open) return null;

    const handleProductChange = (productId: string | null, product?: StockProduct) => {
        if (product) {
            // Auto-fill from product
            let derivedInch: number | null = null;
            const match = product.size_label.match(/^(\d+)"$/);
            if (match) {
                derivedInch = parseInt(match[1], 10);
            }

            setForm(f => ({
                ...f,
                product_id: productId,
                size_label: product.size_label,
                trunk_size_inch: derivedInch,
            }));
        } else {
            setForm(f => ({
                ...f,
                product_id: null,
                size_label: "",
                trunk_size_inch: null,
            }));
        }
    };

    const handleSave = async () => {
        // If we have product_id, we don't strictly need speciesId passed in prop
        // But for legacy support or mixed usage, we might check.
        // For now, if product_id is set, we rely on it.

        if (!form.product_id && !speciesId && mode === "create") {
            setLocalError("กรุณาเลือกสินค้า (Product)");
            return;
        }

        if (!form.zone_id && mode === "create") {
            setLocalError("กรุณากรอกข้อมูลจำเป็น (โซน) ให้ครบถ้วน");
            return;
        }
        if (form.quantity === "") {
            setLocalError("กรุณากรอกจำนวน");
            return;
        }

        try {
            setLocalError(null);

            const payload: any = {
                product_id: form.product_id,
                size_label: form.size_label,
                trunk_size_inch: form.trunk_size_inch,
                pot_size_inch: form.pot_size_inch,
                height_text: form.height_text || null,
                ready_date: form.ready_date,
                dig_date: form.dig_date,
                lift_date: form.lift_date,
                plant_status: form.plant_status,
                quantity_available: Number(form.quantity),
                base_price:
                    form.price_per_tree === "" ? null : Number(form.price_per_tree),
                status: form.status,
                is_active: true,
            };

            if (mode === "create") {
                if (speciesId) {
                    payload.species_id = speciesId;
                }

                payload.zone_id = form.zone_id;
                await createStockItem(payload);
            } else {
                // Edit mode
                if (!initialData?.stock_item_id) {
                    throw new Error("Missing ID for update");
                }
                if (form.zone_id) payload.zone_id = form.zone_id;
                await updateStockItem(initialData.stock_item_id, payload);
            }

            onSaved();
            onClose();
        } catch (err: any) {
            console.error("Save stock error:", err);
            // Error is handled by hookError usually, but we set local just in case
            setLocalError(err.message || "บันทึกไม่สำเร็จ");
        }
    };

    const errorMsg = localError || hookError;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                        {mode === "create" ? "เพิ่มรายการสต็อก" : "แก้ไขรายการสต็อก"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {errorMsg && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {errorMsg}
                        </div>
                    )}

                    {/* Product Select */}
                    <div>
                        <ProductSelect
                            value={form.product_id}
                            onChange={handleProductChange}
                            label="เลือกสินค้า (พันธุ์ / ขนาด)"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            โซน <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.zone_id}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, zone_id: e.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            disabled={mode === "edit"} // Disable zone change in edit mode for simplicity
                        >
                            <option value="">-- เลือกโซน --</option>
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>
                                    {z.name} {z.farm_name ? `(${z.farm_name})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Size inputs - Disable if product selected? Or keep as override? 
                        User said "ไม่ต้องกรอกพันธุ์/size แยกแล้ว". 
                        Let's make them read-only or hidden if product is selected.
                        For now, let's keep them visible but maybe disabled if product is selected to avoid confusion.
                    */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                ขนาด (Standard)
                            </label>
                            <select
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                                value={form.size_label}
                                disabled={!!form.product_id} // Disable if product selected
                                onChange={(e) => {
                                    const val = e.target.value;
                                    let derivedInch: number | null = null;
                                    const match = val.match(/^(\d+)"$/);
                                    if (match) {
                                        derivedInch = parseInt(match[1], 10);
                                    } else {
                                        // Try to parse if it's just a number string
                                        const parsed = parseInt(val, 10);
                                        if (!isNaN(parsed)) derivedInch = parsed;
                                    }

                                    setForm((f) => ({
                                        ...f,
                                        size_label: val,
                                        trunk_size_inch: derivedInch,
                                    }));
                                }}
                            >
                                <option value="">-- เลือกขนาด --</option>
                                {trunkSizeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                ขนาดกระถาง (นิ้ว)
                            </label>
                            <select
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                value={form.pot_size_inch ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        pot_size_inch: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                    }))
                                }
                            >
                                <option value="">-- เลือก --</option>
                                {potSizeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            ความสูง (เช่น 1.5 m, 2.0 m)
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            placeholder="ระบุความสูง..."
                            value={form.height_text}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    height_text: e.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                ประเภท
                            </label>
                            <select
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                value={form.plant_status}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, plant_status: e.target.value }))
                                }
                            >
                                <option value="balled">ไม้ขุดล้อม</option>
                                <option value="potted">ไม้กระถาง</option>
                                <option value="planted">ไม้ปลูกลงดิน</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                วันที่พร้อมขาย
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                value={form.ready_date ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        ready_date: e.target.value || null,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                วันที่ขุดล้อม
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                value={form.dig_date ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        dig_date: e.target.value || null,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                วันที่ยกออก
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                value={form.lift_date ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        lift_date: e.target.value || null,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                จำนวน (ต้น) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={form.quantity}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, quantity: Number(e.target.value) }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                ราคา (บาท)
                            </label>
                            <input
                                type="number"
                                value={form.price_per_tree}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        price_per_tree: Number(e.target.value),
                                    }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                placeholder="ระบุราคา..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            สถานะ
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            value={form.status}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, status: e.target.value }))
                            }
                        >
                            <option value="available">Available (พร้อมขาย)</option>
                            <option value="low">Low Stock (ใกล้หมด)</option>
                            <option value="out">Out of Stock (หมด)</option>
                            <option value="inactive">Inactive (ไม่ใช้งาน)</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={hookSaving}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {hookSaving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                </div>
            </div>
        </div>
    );
};
