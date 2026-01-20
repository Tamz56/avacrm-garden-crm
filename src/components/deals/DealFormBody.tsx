import React, { useState } from "react";
import StockItemSelect, { StockItemOption } from "./StockItemSelect";
import { useDealStockSizeOptions } from "../../hooks/useDealStockSizeOptions";
import { DealItemStockPickerModal } from "./DealItemStockPickerModal";
import type { DealStockPickerRow } from "../../types/stockPicker";
import { buildStockDisplayLabel } from "../../lib/stockPickerFormat";
import { useZoneOptions } from "../../hooks/useZoneOptions";
import { useSpeciesOptions } from "../../hooks/useSpeciesOptions";

export interface DealItem {
    id?: string;
    stock_item_id?: string; // deprecated - ใช้ stock_group_id แทน
    stock_group_id?: string; // FK to stock_groups (canonical ref)
    stock_tree_id?: string; // deprecated - clear when using stock_group_id
    stock_row_id?: string; // deprecated - clear when using stock_group_id
    selected_size_label?: string; // ขนาดที่เลือก (สำหรับ 2-step picker)
    description?: string;
    tree_name?: string;
    size_label?: string;
    trunk_size_inch?: number;
    quantity: number;
    price_per_tree: number;
    // New fields for Price per Meter
    price_type?: "per_tree" | "per_meter";
    height_m?: number;
    price_per_meter?: number;
    gradeLabel?: string | null;
    // Preorder fields
    source_type?: "from_stock" | "preorder_from_zone" | "needs_confirm";
    preorder_zone_id?: string;
    preorder_plot_id?: string;
    species_id?: string;
    lead_time_days?: number;
    expected_ready_date?: string;
    unit_price_estimate?: number;
    preorder_notes?: string;
}

const DEAL_TRUNK_SIZE_OPTIONS = [
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

export interface TeamShare {
    referral_id?: string | null;
    sales_agent_id?: string | null;
    team_leader_id?: string | null;
}

interface DealFormBodyProps {
    mode: "create" | "edit";
    dealData: {
        name: string;
        customer_id?: string | null;
        amount: number;
        deposit_amount?: number;
        shipping_cost?: number;
        expected_close_date?: string | null;
        note?: string;
    };
    setDealData: (updater: (prev: any) => any) => void;

    items: DealItem[];
    setItems: (items: DealItem[]) => void;

    teamShare: TeamShare;
    setTeamShare: (updater: (prev: TeamShare) => TeamShare) => void;

    customerOptions: { id: string; name: string }[];
    salesOptions: { id: string; full_name: string }[];
}

const DealFormBody: React.FC<DealFormBodyProps> = ({
    mode,
    dealData,
    setDealData,
    items,
    setItems,
    teamShare,
    setTeamShare,
    customerOptions,
    salesOptions,
}) => {
    // Auto-calculate deal amount
    React.useEffect(() => {
        const itemsTotal = items.reduce((sum, item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price_per_tree) || 0;
            return sum + (qty * price);
        }, 0);

        const shipping = Number(dealData.shipping_cost) || 0;
        const total = itemsTotal + shipping;

        if (dealData.amount !== total) {
            setDealData((prev: any) => ({ ...prev, amount: total }));
        }
    }, [items, dealData.shipping_cost, dealData.amount, setDealData]);

    const handleItemChange = (index: number, field: keyof DealItem, value: any) => {
        const next = [...items];
        // @ts-ignore
        next[index][field] = value;

        // Auto-calculate price_per_tree if using per_meter mode
        if (next[index].price_type === 'per_meter') {
            const height = Number(next[index].height_m) || 0;
            const rate = Number(next[index].price_per_meter) || 0;
            if (height > 0 && rate > 0) {
                next[index].price_per_tree = height * rate;
            }
        }

        setItems(next);
    };

    const handleStockSelect = (index: number, opt: StockItemOption | null) => {
        const next = [...items];
        const item = next[index];

        // ใช้ stock_group_id (ถ้ามี) + clear ALL deprecated refs
        item.stock_group_id = opt?.stockGroupId || undefined;
        item.stock_item_id = undefined;  // deprecated
        item.stock_tree_id = undefined;  // deprecated
        item.stock_row_id = undefined;   // deprecated

        if (opt) {
            // Use centralized formatter - SINGLE SOURCE OF TRUTH
            item.description = buildStockDisplayLabel([
                opt.speciesName,
                opt.speciesCode ? `(${opt.speciesCode})` : null,
                opt.sizeLabel,
                opt.zoneName,
            ]);
            item.tree_name = opt.speciesName;
            item.size_label = opt.sizeLabel;

            // Auto-set trunk_size_inch จาก sizeLabel (parse "6" จาก "6 นิ้ว" หรือ "6")
            if (opt.sizeLabel) {
                const sizeMatch = opt.sizeLabel.match(/(\d+)/);
                if (sizeMatch) {
                    item.trunk_size_inch = parseInt(sizeMatch[1], 10);
                }
            }

            // Auto-fill height if available (parse "2.5m" -> 2.5)
            if (opt.heightLabel) {
                const match = opt.heightLabel.match(/([\d.]+)/);
                if (match) {
                    item.height_m = parseFloat(match[1]);
                }
            }

            if (opt.basePrice) {
                item.price_per_tree = opt.basePrice;
            }
        } else {
            // Clear when deselected
            item.trunk_size_inch = undefined;
        }

        setItems(next);
    };

    // Handler: เปลี่ยนขนาด -> reset การเลือกสต็อก
    const handleSizeChange = (index: number, sizeLabel: string | null) => {
        const next = [...items];
        const item = next[index];

        item.selected_size_label = sizeLabel || undefined;

        // Reset ALL stock selection เมื่อเปลี่ยนขนาด
        item.stock_group_id = undefined;
        item.stock_item_id = undefined;  // deprecated
        item.stock_tree_id = undefined;  // deprecated
        item.stock_row_id = undefined;   // deprecated
        item.tree_name = undefined;
        item.description = "";
        item.price_per_tree = 0;

        // Auto-set trunk_size_inch จาก sizeLabel
        if (sizeLabel) {
            const sizeMatch = sizeLabel.match(/(\d+)/);
            if (sizeMatch) {
                item.trunk_size_inch = parseInt(sizeMatch[1], 10);
            }
        } else {
            item.trunk_size_inch = undefined;
        }

        setItems(next);
    };

    const addItem = () => {
        setItems([
            ...items,
            {
                quantity: 1,
                price_per_tree: 0,
                description: "",
                price_type: "per_tree",
                selected_size_label: undefined, // เริ่มจากไม่เลือกขนาด
                source_type: "from_stock", // default = พร้อมขายจากสต็อก
                lead_time_days: 30,
            },
        ]);
    };

    // ดึงขนาดที่มีของพร้อมขาย
    const { options: sizeOptions, loading: sizesLoading } = useDealStockSizeOptions();

    // ดึง Zone และ Species สำหรับ preorder
    const { options: zoneOptions, loading: zonesLoading } = useZoneOptions();
    const { options: speciesOptions, loading: speciesLoading } = useSpeciesOptions();

    // Helper: คำนวณ expected ready date
    const calcExpectedReadyDate = (leadTimeDays: number = 30): string => {
        const date = new Date();
        date.setDate(date.getDate() + leadTimeDays);
        return date.toISOString().split('T')[0];
    };

    // Handler: เปลี่ยน source_type
    const handleSourceTypeChange = (index: number, sourceType: "from_stock" | "preorder_from_zone") => {
        const next = [...items];
        const item = next[index];
        item.source_type = sourceType;

        if (sourceType === "preorder_from_zone") {
            // Clear stock-related fields
            item.stock_group_id = undefined;
            item.stock_item_id = undefined;
            item.selected_size_label = undefined;
            // Set defaults for preorder
            item.lead_time_days = item.lead_time_days || 30;
            item.expected_ready_date = calcExpectedReadyDate(item.lead_time_days);
        } else {
            // Clear preorder fields
            item.preorder_zone_id = undefined;
            item.species_id = undefined;
            item.expected_ready_date = undefined;
            item.unit_price_estimate = undefined;
        }
        setItems(next);
    };

    // Stock Picker Modal state
    const [stockPickerOpen, setStockPickerOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

    const removeItem = (index: number) => {
        const next = [...items];
        next.splice(index, 1);
        setItems(next);
    };

    // Handler: เมื่อเลือกสต็อกจาก Modal (Draft Pick Mode)
    const handleStockPicked = (row: DealStockPickerRow) => {
        if (activeItemIndex === null) return;

        const next = [...items];
        const item = next[activeItemIndex];

        // Set stock_group_id (canonical) + clear ALL deprecated stock refs
        item.stock_group_id = row.stock_group_id;
        item.stock_item_id = undefined; // deprecated
        item.stock_tree_id = undefined; // deprecated - prevent constraint conflict
        item.stock_row_id = undefined;  // deprecated - prevent constraint conflict

        // Set price from stock
        item.price_per_tree = Number(row.unit_price ?? 0);

        // Use centralized formatter - SINGLE SOURCE OF TRUTH
        item.description = buildStockDisplayLabel([
            row.species_name_th,
            row.size_label,
            row.zone_key,
            row.plot_key,
            row.height_label,
            row.pot_size_label,
        ]);
        item.tree_name = row.species_name_th ?? undefined;
        item.size_label = row.size_label ?? undefined;

        // Parse trunk size from size_label (e.g., "6 นิ้ว" -> 6)
        if (row.size_label) {
            const sizeMatch = row.size_label.match(/(\d+)/);
            if (sizeMatch) {
                item.trunk_size_inch = parseInt(sizeMatch[1], 10);
            }
        }

        setItems(next);
        setActiveItemIndex(null);
    };

    return (
        <div className="space-y-6">
            {/* --- ส่วนรายละเอียดดีลพื้นฐาน --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        ชื่อดีล / โปรเจกต์ *
                    </label>
                    <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={dealData.name}
                        placeholder="เช่น จัดสวนหน้าบ้าน – Silver Oak 20 ต้น"
                        onChange={(e) =>
                            setDealData((prev: any) => ({ ...prev, name: e.target.value }))
                        }
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        ลูกค้า *
                    </label>
                    <select
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={dealData.customer_id || ""}
                        onChange={(e) =>
                            setDealData((prev: any) => ({
                                ...prev,
                                customer_id: e.target.value || null,
                            }))
                        }
                    >
                        <option value="">– เลือกลูกค้า –</option>
                        {customerOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        มูลค่าดีล (บาท) *
                    </label>
                    <input
                        type="number"
                        readOnly
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm focus:outline-none text-slate-600 cursor-not-allowed"
                        value={dealData.amount}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                        ระบบคำนวณจาก (ค่าต้นไม้รวม + ค่าขนส่ง)
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        มัดจำ (ถ้ามี)
                    </label>
                    <input
                        type="number"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={dealData.deposit_amount || 0}
                        onChange={(e) =>
                            setDealData((prev: any) => ({
                                ...prev,
                                deposit_amount: Number(e.target.value || 0),
                            }))
                        }
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        ค่าขนส่ง (บาท)
                    </label>
                    <input
                        type="number"
                        min={0}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={dealData.shipping_cost || 0}
                        onChange={(e) =>
                            setDealData((prev: any) => ({
                                ...prev,
                                shipping_cost: Number(e.target.value || 0),
                            }))
                        }
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        วันที่คาดว่าจะปิดดีล
                    </label>
                    <input
                        type="date"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={dealData.expected_close_date || ""}
                        onChange={(e) =>
                            setDealData((prev: any) => ({
                                ...prev,
                                expected_close_date: e.target.value || null,
                            }))
                        }
                    />
                </div>
            </div>

            {/* ที่อยู่ส่ง / ปลูก */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    ที่อยู่ส่ง / ปลูก (Note Customer)
                </label>
                <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={dealData.note || ""}
                    placeholder="ระบุสถานที่ปลูก หรือหมายเหตุเพิ่มเติม..."
                    onChange={(e) =>
                        setDealData((prev: any) => ({ ...prev, note: e.target.value }))
                    }
                />
            </div>

            {/* --- รายการต้นไม้ในดีลนี้ --- */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">
                        รายการต้นไม้ในดีล (ต้องอย่างน้อย 1 รายการ)
                    </h3>
                    <button
                        type="button"
                        onClick={addItem}
                        className="text-sm px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    >
                        + เพิ่มรายการต้นไม้
                    </button>
                </div>

                {items.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">
                        ยังไม่มีรายการต้นไม้ในดีล กรุณาเพิ่มอย่างน้อย 1 รายการ
                    </p>
                )}

                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className={`grid grid-cols-1 gap-3 items-start bg-white rounded-lg p-3 border shadow-sm ${item.source_type === 'preorder_from_zone'
                                ? 'border-amber-300 bg-amber-50/30'
                                : 'border-slate-200'
                                }`}
                        >
                            {/* Row 1: Source Type Selector + Badge */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <label className="text-xs text-slate-500">แหล่งที่มา:</label>
                                    <div className="flex gap-2">
                                        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${item.source_type !== 'preorder_from_zone'
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}>
                                            <input
                                                type="radio"
                                                name={`source_type_${index}`}
                                                checked={item.source_type !== 'preorder_from_zone'}
                                                onChange={() => handleSourceTypeChange(index, 'from_stock')}
                                                className="sr-only"
                                            />
                                            <span>📦 พร้อมขายจากสต็อก</span>
                                        </label>
                                        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${item.source_type === 'preorder_from_zone'
                                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}>
                                            <input
                                                type="radio"
                                                name={`source_type_${index}`}
                                                checked={item.source_type === 'preorder_from_zone'}
                                                onChange={() => handleSourceTypeChange(index, 'preorder_from_zone')}
                                                className="sr-only"
                                            />
                                            <span>🌱 สั่งขุดจากแปลง (30 วัน)</span>
                                        </label>
                                    </div>
                                </div>
                                {item.source_type === 'preorder_from_zone' && (
                                    <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                                        PREORDER 30 วัน
                                    </span>
                                )}
                                {/* ลบรายการ */}
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="text-xs text-rose-500 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-full transition-colors ml-auto"
                                    title="ลบรายการ"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Row 2: Stock Selection OR Preorder Fields */}
                            {item.source_type !== 'preorder_from_zone' ? (
                                /* From Stock Mode */
                                <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,1fr] gap-3 items-start">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">
                                            ขนาด (จากสต็อก) *
                                        </label>
                                        <select
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500"
                                            value={item.selected_size_label || ""}
                                            onChange={(e) => handleSizeChange(index, e.target.value || null)}
                                        >
                                            <option value="">
                                                {sizesLoading ? "กำลังโหลด..." : "— เลือกขนาด —"}
                                            </option>
                                            {sizeOptions.map((s) => (
                                                <option key={s.size_label} value={s.size_label}>
                                                    {s.size_label} นิ้ว — พร้อมขายรวม {s.available_qty} ต้น
                                                </option>
                                            ))}
                                        </select>

                                        {/* Stock Picker */}
                                        <div className="mt-2 flex gap-2">
                                            <div className="flex-1">
                                                <StockItemSelect
                                                    value={item.stock_group_id || null}
                                                    onChange={(opt) => handleStockSelect(index, opt)}
                                                    sizeLabel={item.selected_size_label}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveItemIndex(index);
                                                    setStockPickerOpen(true);
                                                }}
                                                className="shrink-0 px-3 py-2 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                                                title="เปิดตารางเลือกสต็อกแบบละเอียด"
                                            >
                                                📋 ตาราง
                                            </button>
                                        </div>
                                    </div>

                                    <input
                                        className="mt-2 w-full text-xs border-b border-slate-100 focus:border-emerald-500 outline-none text-slate-600"
                                        placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                                        value={item.description || ""}
                                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                    />

                                    {/* ขนาดลำต้น / จำนวน / ราคา (from_stock) */}
                                    <div className="grid grid-cols-3 gap-3 mt-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">
                                                ขนาดลำต้น (นิ้ว)
                                            </label>
                                            <select
                                                className={`w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm ${item.stock_group_id ? "bg-slate-100 cursor-not-allowed" : ""}`}
                                                value={item.trunk_size_inch || ""}
                                                disabled={!!item.stock_group_id}
                                                onChange={(e) => handleItemChange(index, "trunk_size_inch", Number(e.target.value))}
                                            >
                                                <option value="">-- เลือก --</option>
                                                {DEAL_TRUNK_SIZE_OPTIONS.map((size) => (
                                                    <option key={size} value={size}>{size} นิ้ว</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">จำนวน (ต้น)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value || 0))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">ราคาต่อต้น (บาท)</label>
                                            <input
                                                type="number"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                                                value={item.price_per_tree}
                                                onChange={(e) => handleItemChange(index, "price_per_tree", Number(e.target.value || 0))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Preorder from Zone Mode */
                                <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,1fr,1fr] gap-3 items-start">
                                    {/* Zone */}
                                    <div>
                                        <label className="block text-xs text-amber-700 mb-1">
                                            โซน * <span className="text-slate-400">(บังคับ)</span>
                                        </label>
                                        <select
                                            className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                                            value={item.preorder_zone_id || ""}
                                            onChange={(e) => handleItemChange(index, "preorder_zone_id", e.target.value || undefined)}
                                        >
                                            <option value="">
                                                {zonesLoading ? "กำลังโหลด..." : "— เลือกโซน —"}
                                            </option>
                                            {zoneOptions.map((z) => (
                                                <option key={z.id} value={z.id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Species */}
                                    <div>
                                        <label className="block text-xs text-amber-700 mb-1">
                                            ชนิดพันธุ์ * <span className="text-slate-400">(บังคับ)</span>
                                        </label>
                                        <select
                                            className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                                            value={item.species_id || ""}
                                            onChange={(e) => handleItemChange(index, "species_id", e.target.value || undefined)}
                                        >
                                            <option value="">
                                                {speciesLoading ? "กำลังโหลด..." : "— เลือกพันธุ์ —"}
                                            </option>
                                            {speciesOptions.map((sp) => (
                                                <option key={sp.id} value={sp.id}>{sp.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Size Label */}
                                    <div>
                                        <label className="block text-xs text-amber-700 mb-1">
                                            ขนาด (นิ้ว) *
                                        </label>
                                        <select
                                            className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                                            value={item.size_label || ""}
                                            onChange={(e) => {
                                                handleItemChange(index, "size_label", e.target.value);
                                                // Also set trunk_size_inch
                                                const sizeMatch = e.target.value.match(/(\d+)/);
                                                if (sizeMatch) {
                                                    handleItemChange(index, "trunk_size_inch", parseInt(sizeMatch[1], 10));
                                                }
                                            }}
                                        >
                                            <option value="">— เลือกขนาด —</option>
                                            {DEAL_TRUNK_SIZE_OPTIONS.map((size) => (
                                                <option key={size} value={`${size}`}>{size} นิ้ว</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-xs text-amber-700 mb-1">จำนวน (ต้น) *</label>
                                        <input
                                            type="number"
                                            min={1}
                                            className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value || 0))}
                                        />
                                    </div>

                                    {/* Price Estimate */}
                                    <div>
                                        <label className="block text-xs text-amber-700 mb-1">
                                            ราคาประมาณการ (บาท/ต้น)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                                            value={item.unit_price_estimate || ""}
                                            onChange={(e) => {
                                                handleItemChange(index, "unit_price_estimate", Number(e.target.value || 0));
                                                handleItemChange(index, "price_per_tree", Number(e.target.value || 0));
                                            }}
                                            placeholder="ราคาประมาณ"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Expected Ready Date (preorder only) */}
                            {item.source_type === 'preorder_from_zone' && (
                                <div className="flex items-center gap-4 mt-2 p-3 bg-amber-100/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-amber-700">📅 วันพร้อมส่ง (โดยประมาณ):</span>
                                        <span className="text-sm font-medium text-amber-800">
                                            {item.expected_ready_date
                                                ? new Date(item.expected_ready_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : calcExpectedReadyDate(30)}
                                        </span>
                                    </div>
                                    <span className="text-xs text-amber-600 italic">
                                        (เตรียมต้น ~30 วัน: ขุดล้อม + ตัดราก)
                                    </span>
                                </div>
                            )}

                            {/* Preorder Notes */}
                            {item.source_type === 'preorder_from_zone' && (
                                <div className="mt-2">
                                    <input
                                        className="w-full text-xs border-b border-amber-200 focus:border-amber-500 outline-none text-slate-600 bg-transparent"
                                        placeholder="หมายเหตุสำหรับทีมขุด (ถ้ามี)"
                                        value={item.preorder_notes || ""}
                                        onChange={(e) => handleItemChange(index, "preorder_notes", e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- ทีมขายร่วมในดีลนี้ (เหมือนหน้าสร้างดีล) --- */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">
                    ทีมขายร่วมในดีลนี้
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { key: "referral_id", label: "คนแนะนำ (Referral)" },
                        { key: "sales_agent_id", label: "คนปิดดีล (Sales Agent)" },
                        { key: "team_leader_id", label: "หัวหน้าทีม (Team Leader)" },
                    ].map((field) => (
                        <div key={field.key}>
                            <label className="block text-xs text-slate-500 mb-1">
                                {field.label}
                            </label>
                            <select
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={(teamShare as any)[field.key] || ""}
                                onChange={(e) =>
                                    setTeamShare((prev) => ({
                                        ...prev,
                                        [field.key]: e.target.value || null,
                                    }))
                                }
                            >
                                <option value="">– ไม่ระบุ –</option>
                                {salesOptions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
                {mode === "edit" && (
                    <p className="text-xs text-amber-500 mt-1">
                        * การแก้ไขทีมขายจะมีผลเฉพาะการคำนวณค่าคอมมิชชั่นดีลนี้ใหม่เท่านั้น
                    </p>
                )}
            </div>

            {/* Stock Picker Modal (Draft Pick Mode) */}
            <DealItemStockPickerModal
                open={stockPickerOpen}
                onClose={() => {
                    setStockPickerOpen(false);
                    setActiveItemIndex(null);
                }}
                onPicked={handleStockPicked}
                initialFilters={{
                    size_label: activeItemIndex !== null ? items[activeItemIndex]?.selected_size_label : undefined,
                }}
            />
        </div>
    );
};

export default DealFormBody;
