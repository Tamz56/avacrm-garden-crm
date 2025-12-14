import React from "react";
import StockItemSelect, { StockItemOption } from "./StockItemSelect";

export interface DealItem {
    id?: string;
    stock_item_id?: string;
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

        item.stock_item_id = opt?.id;

        if (opt) {
            const desc = `${opt.speciesName} (${opt.speciesCode}) · ${opt.sizeLabel}${opt.zoneName ? ` · ${opt.zoneName}` : ""}`;
            item.description = desc;
            item.tree_name = opt.speciesName;
            item.size_label = opt.sizeLabel;

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
            },
        ]);
    };

    const removeItem = (index: number) => {
        const next = [...items];
        next.splice(index, 1);
        setItems(next);
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
                            className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-3 items-start bg-white rounded-lg p-3 border border-slate-200 shadow-sm"
                        >
                            {/* เลือกต้นไม้จากสต็อก */}
                            <div>
                                <StockItemSelect
                                    value={item.stock_item_id || null}
                                    onChange={(opt) => handleStockSelect(index, opt)}
                                />
                                <input
                                    className="mt-2 w-full text-xs border-b border-slate-100 focus:border-emerald-500 outline-none text-slate-600"
                                    placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                                    value={item.description || ""}
                                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                />

                                {/* Price Calculation Mode */}
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`price_type_${index}`}
                                            checked={item.price_type !== 'per_meter'}
                                            onChange={() => handleItemChange(index, 'price_type', 'per_tree')}
                                            className="text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>ราคาเหมา/ต้น</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`price_type_${index}`}
                                            checked={item.price_type === 'per_meter'}
                                            onChange={() => handleItemChange(index, 'price_type', 'per_meter')}
                                            className="text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>ราคาตามความสูง (เมตร)</span>
                                    </label>
                                </div>
                            </div>

                            {/* ขนาดลำต้น / ความสูง */}
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">
                                        ขนาดลำต้น (นิ้ว)
                                    </label>
                                    <select
                                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={item.trunk_size_inch || ""}
                                        onChange={(e) =>
                                            handleItemChange(
                                                index,
                                                "trunk_size_inch",
                                                Number(e.target.value)
                                            )
                                        }
                                    >
                                        <option value="">-- เลือก --</option>
                                        {DEAL_TRUNK_SIZE_OPTIONS.map((size) => (
                                            <option key={size} value={size}>
                                                {size} นิ้ว
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {item.price_type === 'per_meter' && (
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">
                                            ความสูง (เมตร)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
                                            value={item.height_m || ""}
                                            onChange={(e) => handleItemChange(index, "height_m", e.target.value)}
                                            placeholder="ระบุความสูง"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* จำนวนต้น / ราคาต่อเมตร */}
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">
                                        จำนวน (ต้น)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={item.quantity}
                                        onChange={(e) =>
                                            handleItemChange(
                                                index,
                                                "quantity",
                                                Number(e.target.value || 0)
                                            )
                                        }
                                    />
                                </div>

                                {item.price_type === 'per_meter' && (
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">
                                            ราคาต่อเมตร
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={item.price_per_meter || ""}
                                            onChange={(e) => handleItemChange(index, "price_per_meter", e.target.value)}
                                            placeholder="ระบุราคา"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* ราคาต่อต้น (รวม) */}
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                    ราคาต่อต้น (บาท)
                                </label>
                                <input
                                    type="number"
                                    className={`w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${item.price_type === 'per_meter' ? 'bg-slate-100 text-slate-500' : ''}`}
                                    value={item.price_per_tree}
                                    readOnly={item.price_type === 'per_meter'}
                                    onChange={(e) =>
                                        handleItemChange(
                                            index,
                                            "price_per_tree",
                                            Number(e.target.value || 0)
                                        )
                                    }
                                />
                                {item.price_type === 'per_meter' && (
                                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                                        = {item.height_m || 0}ม. x {item.price_per_meter || 0}บ.
                                    </p>
                                )}
                            </div>

                            {/* ลบรายการ */}
                            <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="mt-6 text-xs text-rose-500 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-full transition-colors"
                                title="ลบรายการ"
                            >
                                ✕
                            </button>
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
        </div>
    );
};

export default DealFormBody;
