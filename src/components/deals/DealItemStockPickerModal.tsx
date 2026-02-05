// src/components/deals/DealItemStockPickerModal.tsx
import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useDealStockPicker } from "../../hooks/useDealStockPicker";
import { useDealTagStockPicker, type DealTagStockPickerRow } from "../../hooks/useDealTagStockPicker";
import { useDealTagStockPickerTotalsV2 } from "../../hooks/useDealTagStockPickerTotals";
import type { DealStockPickerRow, DealStockPickerFilters } from "../../types/stockPicker";
import { displayValue, zoneDisplayText } from "../../lib/stockPickerFormat";
import { Loader2, X, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";

export type PickerMode = "rpc" | "tag";

type Props = {
    open: boolean;
    onClose: () => void;
    /** If provided, calls RPC to assign stock. If not, uses onPicked. */
    dealItemId?: string;
    /** Called when picking in draft mode (no dealItemId) - RPC mode. */
    onPicked?: (row: DealStockPickerRow) => void;
    /** Called when picking in Tag mode. */
    onTagPicked?: (row: DealTagStockPickerRow) => void;
    /** Called after successful assign (when dealItemId present). */
    onAssigned?: () => Promise<void> | void;
    /** Initial filter values (e.g., pre-fill from selected size). */
    initialFilters?: Partial<DealStockPickerFilters>;
    /** Picker mode: "rpc" for stock groups, "tag" for individual trees. Default: "rpc" */
    mode?: PickerMode;
    /** Allow user to toggle between modes? Default: false */
    allowModeToggle?: boolean;
};

export function DealItemStockPickerModal({
    open,
    onClose,
    dealItemId,
    onPicked,
    onTagPicked,
    onAssigned,
    initialFilters,
    mode: initialMode = "rpc",
    allowModeToggle = false,
}: Props) {
    const [filters, setFilters] = useState<DealStockPickerFilters>({
        species_name_th: initialFilters?.species_name_th ?? null,
        size_label: initialFilters?.size_label ?? null,
        zone_key: initialFilters?.zone_key ?? null,
        plot_key: initialFilters?.plot_key ?? null,
        height_label: initialFilters?.height_label ?? null,
        pot_size_label: initialFilters?.pot_size_label ?? null,
    });

    // --- Mode state ---
    const [pickerMode, setPickerMode] = useState<PickerMode>(initialMode);

    // --- RPC mode hook (existing) ---
    const rpcData = useDealStockPicker(filters, open && pickerMode === "rpc");

    // --- TAG mode hooks (new) ---
    const tagFilters = {
        speciesNameTh: filters.species_name_th ?? undefined,
        sizeLabel: filters.size_label ?? undefined,
        zoneId: filters.zone_key ?? undefined,
        onlyAvailable: true,
        limit: 300,
    };
    const tagData = useDealTagStockPicker(open && pickerMode === "tag" ? tagFilters : {});
    const totals = useDealTagStockPickerTotalsV2();

    // --- Unified data based on mode ---
    const rows = pickerMode === "tag" ? tagData.rows : rpcData.rows;
    const loading = pickerMode === "tag" ? tagData.loading : rpcData.loading;
    const error = pickerMode === "tag" ? tagData.error : rpcData.error;
    const refetch = pickerMode === "tag" ? tagData.refresh : rpcData.refetch;

    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [assignErr, setAssignErr] = useState<string | null>(null);

    // Determine assign mode (existing deal item)
    const isAssignMode = Boolean(dealItemId);

    const canPickRpc = (r: DealStockPickerRow) => (r.qty_available ?? 0) > 0 && r.unit_price != null;
    const canPickTag = (r: DealTagStockPickerRow) => r.is_available !== false;

    async function handleSelect(row: DealStockPickerRow) {
        if (!canPickRpc(row)) return;

        // Assign Mode: Call RPC to update existing deal_item
        if (isAssignMode && dealItemId) {
            setAssigningId(row.stock_group_id);
            setAssignErr(null);
            try {
                const { error: rpcError } = await supabase.rpc("set_deal_item_stock_group_v1", {
                    p_deal_item_id: dealItemId,
                    p_stock_group_id: row.stock_group_id,
                });
                if (rpcError) throw rpcError;

                await onAssigned?.();
                onClose();
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Assign failed";
                setAssignErr(message);
            } finally {
                setAssigningId(null);
            }
            return;
        }

        // Draft Pick Mode: Return row data to caller (no DB call)
        onPicked?.(row);
        onClose();
    }

    // Handle selection for Tag mode
    function handleTagSelect(row: DealTagStockPickerRow) {
        if (!canPickTag(row)) return;
        onTagPicked?.(row);
        onClose();
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {pickerMode === "tag"
                                ? "เลือกต้นไม้ (รายต้น)"
                                : isAssignMode
                                    ? "เลือกสต็อก"
                                    : "เลือกต้นไม้จากสต็อก"}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            {pickerMode === "tag"
                                ? "เลือกต้นเฉพาะจาก Tag (Tag-based picker)"
                                : isAssignMode
                                    ? "กด Assign เพื่อผูก stock_group_id ให้รายการนี้"
                                    : "เลือกแล้วราคาจะเด้งเข้าฟอร์มทันที"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Mode Toggle */}
                        {allowModeToggle && (
                            <button
                                type="button"
                                onClick={() => setPickerMode(pickerMode === "rpc" ? "tag" : "rpc")}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pickerMode === "tag"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
                                    }`}
                                title="สลับโหมด: สต็อก (รวม) ↔ รายต้น (Tag)"
                            >
                                {pickerMode === "tag" ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                {pickerMode === "tag" ? "Tag" : "Stock"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={refetch}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            รีเฟรช
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 grid grid-cols-2 md:grid-cols-6 gap-2 shrink-0">
                    <input
                        className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
                        placeholder="Species"
                        value={filters.species_name_th ?? ""}
                        onChange={(e) => setFilters((s) => ({ ...s, species_name_th: e.target.value || null }))}
                    />
                    <input
                        className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
                        placeholder="Size"
                        value={filters.size_label ?? ""}
                        onChange={(e) => setFilters((s) => ({ ...s, size_label: e.target.value || null }))}
                    />
                    <input
                        className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
                        placeholder="Zone"
                        value={filters.zone_key ?? ""}
                        onChange={(e) => setFilters((s) => ({ ...s, zone_key: e.target.value || null }))}
                    />
                    <input
                        className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
                        placeholder="Plot"
                        value={filters.plot_key ?? ""}
                        onChange={(e) => setFilters((s) => ({ ...s, plot_key: e.target.value || null }))}
                    />
                    <input
                        className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
                        placeholder="Height"
                        value={filters.height_label ?? ""}
                        onChange={(e) => setFilters((s) => ({ ...s, height_label: e.target.value || null }))}
                    />
                    <input
                        className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-400"
                        placeholder="Pot"
                        value={filters.pot_size_label ?? ""}
                        onChange={(e) => setFilters((s) => ({ ...s, pot_size_label: e.target.value || null }))}
                    />
                </div>

                {/* Table Container */}
                <div className="p-4 overflow-auto flex-1">
                    {error && (
                        <div className="mb-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                            Load error: {error}
                        </div>
                    )}
                    {assignErr && (
                        <div className="mb-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                            Assign error: {assignErr}
                        </div>
                    )}

                    <div className="overflow-auto border border-gray-200 dark:border-slate-700 rounded-xl">
                        {/* RPC Mode Table */}
                        {pickerMode === "rpc" && (
                            <table className="min-w-[1100px] w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Species</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Size</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Zone</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Plot</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Height</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Pot</th>
                                        <th className="text-right p-3 font-medium text-gray-600 dark:text-slate-300">Avail</th>
                                        <th className="text-right p-3 font-medium text-gray-600 dark:text-slate-300">Price</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Updated</th>
                                        <th className="text-right p-3 font-medium text-gray-600 dark:text-slate-300">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {loading ? (
                                        <tr>
                                            <td className="p-4 text-center text-gray-500 dark:text-slate-400" colSpan={10}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    กำลังโหลด…
                                                </div>
                                            </td>
                                        </tr>
                                    ) : rpcData.rows.length === 0 ? (
                                        <tr>
                                            <td className="p-4 text-center text-gray-500 dark:text-slate-400" colSpan={10}>
                                                ไม่พบรายการ
                                            </td>
                                        </tr>
                                    ) : (
                                        rpcData.rows.map((r) => {
                                            const disabled = !canPickRpc(r);
                                            const busy = assigningId === r.stock_group_id;
                                            return (
                                                <tr key={r.stock_group_id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                    <td className="p-3 text-gray-900 dark:text-white">{displayValue(r.species_name_th)}</td>
                                                    <td className="p-3 text-gray-700 dark:text-slate-300">{displayValue(r.size_label)}</td>
                                                    <td className="p-3 text-gray-700 dark:text-slate-300">{zoneDisplayText(r)}</td>
                                                    <td className="p-3 text-gray-700 dark:text-slate-300">{displayValue(r.plot_key)}</td>
                                                    <td className="p-3 text-gray-700 dark:text-slate-300">{displayValue(r.height_label)}</td>
                                                    <td className="p-3 text-gray-700 dark:text-slate-300">{displayValue(r.pot_size_label)}</td>
                                                    <td className="p-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                                        {r.qty_available ?? 0}
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-gray-700 dark:text-slate-300">
                                                        {r.unit_price != null ? `฿${r.unit_price.toLocaleString()}` : "-"}
                                                    </td>
                                                    <td className="p-3 text-xs text-gray-500 dark:text-slate-400">
                                                        {r.updated_at
                                                            ? new Date(r.updated_at).toLocaleString("th-TH", { hour12: false })
                                                            : "-"}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            type="button"
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${disabled
                                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
                                                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                                                                }`}
                                                            disabled={disabled || busy}
                                                            onClick={() => handleSelect(r)}
                                                            title={disabled ? "ต้องมีราคาและจำนวนคงเหลือ" : isAssignMode ? "Assign สต็อกนี้" : "เลือกสต็อกนี้"}
                                                        >
                                                            {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            {busy ? "กำลังบันทึก…" : isAssignMode ? "Assign" : "เลือก"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* TAG Mode Table */}
                        {pickerMode === "tag" && (
                            <table className="min-w-[900px] w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Tag Code</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Species</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Size</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Zone</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Status</th>
                                        <th className="text-right p-3 font-medium text-gray-600 dark:text-slate-300">Price</th>
                                        <th className="text-left p-3 font-medium text-gray-600 dark:text-slate-300">Updated</th>
                                        <th className="text-right p-3 font-medium text-gray-600 dark:text-slate-300">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {loading ? (
                                        <tr>
                                            <td className="p-4 text-center text-gray-500 dark:text-slate-400" colSpan={8}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    กำลังโหลด…
                                                </div>
                                            </td>
                                        </tr>
                                    ) : tagData.rows.length === 0 ? (
                                        <tr>
                                            <td className="p-4 text-center text-gray-500 dark:text-slate-400" colSpan={8}>
                                                ไม่พบรายการ
                                            </td>
                                        </tr>
                                    ) : (
                                        tagData.rows.map((r) => {
                                            const disabled = !canPickTag(r);
                                            return (
                                                <tr key={r.tag_id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                    <td className="p-3 text-gray-900 dark:text-white font-mono">{r.tag_code}</td>
                                                    <td className="p-3 text-gray-700 dark:text-slate-300">{displayValue(r.species_name_th)}</td>
                                                    <td className="p-3 text-gray-700 dark:text-slate-300">{displayValue(r.size_label)}</td>
                                                    <td className="p-3 text-gray-700 dark:text-slate-300">{displayValue(r.zone_name ?? r.zone_key)}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.is_available
                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                            : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                                                            }`}>
                                                            {r.is_available ? "พร้อมขาย" : r.status ?? "ไม่พร้อม"}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-gray-700 dark:text-slate-300">
                                                        {r.unit_price != null ? `฿${r.unit_price.toLocaleString()}` : "-"}
                                                    </td>
                                                    <td className="p-3 text-xs text-gray-500 dark:text-slate-400">
                                                        {r.updated_at
                                                            ? new Date(r.updated_at).toLocaleString("th-TH", { hour12: false })
                                                            : "-"}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            type="button"
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${disabled
                                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
                                                                : "bg-blue-600 text-white hover:bg-blue-700"
                                                                }`}
                                                            disabled={disabled}
                                                            onClick={() => handleTagSelect(r)}
                                                            title={disabled ? "ต้นไม้ไม่พร้อมขาย" : "เลือกต้นนี้"}
                                                        >
                                                            เลือก
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                        {pickerMode === "rpc"
                            ? "หมายเหตุ: ปุ่มจะเปิดใช้เฉพาะรายการที่ qty_available > 0 และ unit_price ไม่เป็นค่าว่าง"
                            : "หมายเหตุ: เลือกต้นไม้เป็นรายต้น (Tag-based) สำหรับดีลที่ต้องการระบุต้นเฉพาะ"}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default DealItemStockPickerModal;
