// src/components/zones/ZoneReadyStockFromPlotSection.tsx
import React, { useState } from "react";
import { PlotInventoryRow } from "../../hooks/usePlotInventory";
import { Package } from "lucide-react";

type ZoneReadyStockFromPlotSectionProps = {
    zoneId: string;
    rows: PlotInventoryRow[];
    onReload?: () => void;
    onReloadLifecycle?: () => void;
    createTagsFromInventory?: (inventoryId: string, qty: number, category: string) => Promise<number | null>;
};

export const ZoneReadyStockFromPlotSection: React.FC<
    ZoneReadyStockFromPlotSectionProps
> = ({ zoneId, rows, onReload, onReloadLifecycle, createTagsFromInventory }) => {
    const [savingRowId, setSavingRowId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    async function handleAddReadyStock(
        row: PlotInventoryRow,
        qty: number,
        resetQty: () => void
    ) {
        const max = row.remaining_for_tag ?? 0;

        if (!qty || qty <= 0) {
            setError("กรุณากรอกจำนวนต้นที่จะส่งเข้าสต็อกพร้อมขายให้มากกว่า 0");
            return;
        }
        if (qty > max) {
            setError(`จำนวนที่ต้องการส่ง (${qty}) มากกว่าจำนวนที่สามารถสร้าง Tag ได้ (${max})`);
            return;
        }

        setSavingRowId(row.id);
        setError(null);
        setSuccessMsg(null);

        // Use the createTagsFromInventory from hook if available (preferred)
        if (createTagsFromInventory) {
            try {
                const result = await createTagsFromInventory(row.id, qty, "plot_ready_stock");
                if (result !== null) {
                    setSuccessMsg(`ส่งต้นจากแปลงเข้าสต็อกพร้อมขาย ${qty} ต้นเรียบร้อย ✅`);
                    resetQty();
                    if (onReload) onReload();
                    if (onReloadLifecycle) onReloadLifecycle();
                } else {
                    setError("สร้าง Tag ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                }
            } catch (err: any) {
                console.error("createTagsFromInventory error", err);
                setError(err?.message || "ไม่สามารถส่งต้นเข้าสต็อกพร้อมขายได้ กรุณาลองใหม่อีกครั้ง");
            }
        } else {
            // Fallback: direct RPC call (legacy)
            const { supabase } = await import("../../supabaseClient");
            const { error } = await supabase.rpc("add_ready_stock_from_zone", {
                p_zone_id: zoneId,
                p_species_id: row.species_id,
                p_size_label: row.size_label,
                p_grade_id: null,
                p_qty: qty,
            });

            if (error) {
                console.error("add_ready_stock_from_zone error", error);
                setError(error.message);
            } else {
                setSuccessMsg(`เพิ่ม ${qty} ต้น เข้าสต็อกพร้อมขายเรียบร้อยแล้ว ✅`);
                resetQty();
                if (onReload) onReload();
            }
        }

        setSavingRowId(null);
        setTimeout(() => {
            setSuccessMsg(null);
        }, 3000);
    }

    // Show only rows with remaining_for_tag > 0
    const eligibleRows = rows.filter((r) => r.remaining_for_tag > 0);

    if (eligibleRows.length === 0) {
        return null;
    }

    return (
        <section className="mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-700">
                        ส่งเข้าสต็อกพร้อมขายจากแปลงนี้
                    </span>
                </div>
                <span className="text-[11px] text-slate-500">
                    เลือกขนาด แล้วระบุจำนวนต้นที่จะส่งเข้าสต็อกสถานะ "พร้อมขาย"
                </span>
            </div>

            {error && (
                <div className="mx-4 mt-3 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="mx-4 mt-3 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                    {successMsg}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                        <tr>
                            <Th>พันธุ์ไม้</Th>
                            <Th>ขนาด (นิ้ว)</Th>
                            <Th>ความสูง</Th>
                            <Th className="text-right">คงเหลือในแปลง</Th>
                            <Th className="text-right">ส่งเข้าสต็อกพร้อมขาย</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {eligibleRows.map((row) => (
                            <ReadyStockRow
                                key={row.id}
                                row={row}
                                saving={savingRowId === row.id}
                                onSave={handleAddReadyStock}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

type ReadyStockRowProps = {
    row: PlotInventoryRow;
    saving: boolean;
    onSave: (row: PlotInventoryRow, qty: number, resetQty: () => void) => void;
};

const ReadyStockRow: React.FC<ReadyStockRowProps> = ({
    row,
    saving,
    onSave,
}) => {
    const [qty, setQty] = useState<number>(0);

    const max = row.remaining_for_tag ?? 0;

    // Clamp input value to [0, max] on change
    const handleChangeQty = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = parseInt(e.target.value || "0", 10);
        if (isNaN(value) || value < 0) value = 0;
        if (value > max) value = max;
        setQty(value);
    };

    // Reset callback to clear input after success
    const resetQty = () => setQty(0);

    const isDisabled = saving || qty <= 0 || qty > max || max <= 0;

    return (
        <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
            <Td className="font-medium text-slate-800">{row.species_name_th ?? "-"}</Td>
            <Td>{row.size_label ?? "-"}</Td>
            <Td>{row.height_label ? `${row.height_label} ม.` : "-"}</Td>
            <Td className="text-right text-emerald-600 font-semibold">
                {max.toLocaleString("th-TH")}
            </Td>
            <Td className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <div className="relative">
                        <input
                            type="number"
                            min={0}
                            max={max}
                            value={qty}
                            onChange={handleChangeQty}
                            disabled={max <= 0}
                            className="w-20 border rounded-md px-2 py-1 text-right text-xs border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed"
                            placeholder="0"
                        />
                        {max > 0 && (
                            <span className="absolute -bottom-4 right-0 text-[9px] text-slate-400">
                                สูงสุด {max.toLocaleString("th-TH")}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => onSave(row, qty, resetQty)}
                        className="px-2 py-1 text-[11px] rounded-md border border-emerald-500 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {saving ? "กำลังบันทึก..." : "ส่งเข้าสต็อกพร้อมขาย"}
                    </button>
                </div>
            </Td>
        </tr>
    );
};

type ThProps = React.ThHTMLAttributes<HTMLTableCellElement>;
const Th: React.FC<ThProps> = ({ children, className = "", ...rest }) => (
    <th
        className={
            "px-3 py-2 text-left font-medium text-xs text-slate-500 " +
            className
        }
        {...rest}
    >
        {children}
    </th>
);

type TdProps = React.TdHTMLAttributes<HTMLTableCellElement>;
const Td: React.FC<TdProps> = ({ children, className = "", ...rest }) => (
    <td
        className={
            "px-3 py-2 text-sm text-slate-600 " +
            className
        }
        {...rest}
    >
        {children}
    </td>
);
