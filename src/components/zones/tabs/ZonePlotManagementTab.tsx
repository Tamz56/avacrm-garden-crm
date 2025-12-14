// src/components/zones/tabs/ZonePlotManagementTab.tsx
import React from "react";
import { Plus, Loader2, CheckCircle2, Trash2, ChevronDown } from "lucide-react";
import { trunkSizeOptions } from "../../../constants/treeOptions";

type PlantCountDraft = {
    id: string;
    species_id: string;
    size_label: string;
    planted_count: number | "";
    _dirty?: boolean;
    _error?: string;
};

type Props = {
    zoneId: string;
    zone?: any;
    // Planting Plan Props
    plantCountDrafts?: PlantCountDraft[];
    speciesOptions?: any[];
    isInventoryOpen?: boolean;
    setIsInventoryOpen?: (open: boolean) => void;
    addPlantCountRow?: () => void;
    updatePlantCountRow?: (id: string, updates: Partial<PlantCountDraft>) => void;
    removePlantCountRow?: (id: string) => void;
    savePlantCounts?: () => void;
    savingPlantCounts?: boolean;
    plantCountsMsg?: string | null;
    // Plot Type Props
    plotTypes?: any[];
    selectedPlotTypeId?: string;
    setSelectedPlotTypeId?: (id: string) => void;
    handleSavePlotType?: () => void;
    savingPlotType?: boolean;
    saveMessage?: string | null;
    onReload?: () => void;
};

export function ZonePlotManagementTab({
    zoneId,
    zone,
    plantCountDrafts = [],
    speciesOptions = [],
    isInventoryOpen = false,
    setIsInventoryOpen,
    addPlantCountRow,
    updatePlantCountRow,
    removePlantCountRow,
    savePlantCounts,
    savingPlantCounts = false,
    plantCountsMsg,
    plotTypes = [],
    selectedPlotTypeId = "",
    setSelectedPlotTypeId,
    handleSavePlotType,
    savingPlotType = false,
    saveMessage,
    onReload,
}: Props) {
    const [localInventoryOpen, setLocalInventoryOpen] = React.useState(false);
    const inventoryOpen = isInventoryOpen ?? localInventoryOpen;
    const toggleInventory = setIsInventoryOpen ?? setLocalInventoryOpen;

    return (
        <div className="space-y-6">
            {/* SECTION 1: กำหนดจำนวนต้นไม้ในแปลง (ระบบ) */}
            <section className="rounded-xl border border-slate-200 bg-white">
                <button
                    type="button"
                    onClick={() => toggleInventory(!inventoryOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors rounded-xl"
                >
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">กำหนดจำนวนต้นไม้ในแปลง (ระบบ)</h3>
                        <p className="text-xs text-slate-500">{plantCountDrafts.length} รายการ</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!inventoryOpen && (
                            <span className="text-xs text-sky-600">แก้ไข</span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${inventoryOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {inventoryOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                        <div className="flex items-center justify-end gap-2 pt-3">
                            <button
                                type="button"
                                onClick={addPlantCountRow}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                                <Plus className="h-3.5 w-3.5" /> เพิ่มแถว
                            </button>
                            <button
                                type="button"
                                onClick={savePlantCounts}
                                disabled={savingPlantCounts || plantCountDrafts.length === 0}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                                {savingPlantCounts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} บันทึก
                            </button>
                        </div>
                        {plantCountsMsg && <div className="text-xs text-slate-600">{plantCountsMsg}</div>}
                        <div className="overflow-x-auto border rounded-lg border-slate-100">
                            <table className="min-w-full text-xs">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left font-medium">ชนิด</th>
                                        <th className="px-2 py-1.5 text-left font-medium">ขนาด</th>
                                        <th className="px-2 py-1.5 text-right font-medium">จำนวน</th>
                                        <th className="px-2 py-1.5 text-right font-medium">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plantCountDrafts.length === 0 && (
                                        <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400">ยังไม่มีข้อมูล</td></tr>
                                    )}
                                    {plantCountDrafts.map((d) => (
                                        <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="px-2 py-1.5">
                                                <select
                                                    value={d.species_id}
                                                    onChange={(e) => updatePlantCountRow?.(d.id, { species_id: e.target.value })}
                                                    className="w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
                                                >
                                                    <option value="">เลือก...</option>
                                                    {speciesOptions.map((s) => <option key={s.id} value={s.id}>{s.name_th || s.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <select
                                                    value={d.size_label}
                                                    onChange={(e) => updatePlantCountRow?.(d.id, { size_label: e.target.value })}
                                                    className="w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
                                                >
                                                    <option value="">เลือก...</option>
                                                    {trunkSizeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-2 py-1.5 text-right">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={d.planted_count}
                                                    onChange={(e) => updatePlantCountRow?.(d.id, { planted_count: e.target.value === "" ? "" : Number(e.target.value) })}
                                                    className="w-16 rounded border border-slate-300 px-1.5 py-1 text-right text-xs"
                                                />
                                            </td>
                                            <td className="px-2 py-1.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removePlantCountRow?.(d.id)}
                                                    className="text-rose-600 hover:text-rose-700"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            {/* SECTION 2: ตั้งค่าประเภทแปลง */}
            <section className="rounded-2xl border bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900">ตั้งค่าประเภทแปลง</h3>
                    <button
                        onClick={handleSavePlotType}
                        disabled={savingPlotType}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        บันทึก
                    </button>
                </div>

                <div className="mt-3">
                    <select
                        value={selectedPlotTypeId}
                        onChange={(e) => setSelectedPlotTypeId?.(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                    >
                        <option value="">-- เลือกประเภทแปลง --</option>
                        {plotTypes.map((pt) => (
                            <option key={pt.id} value={pt.id}>{pt.name}</option>
                        ))}
                    </select>
                    {saveMessage && (
                        <p className="mt-2 text-xs text-slate-600">{saveMessage}</p>
                    )}
                </div>
            </section>

            {/* TODO: SECTION 3: Plot Inventory - จะเพิ่มจาก ZonePlotInventorySection */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Plot Inventory</h3>
                <p className="text-xs text-slate-500">
                    [Placeholder] รายการต้นไม้ในแปลง (view_plot_inventory) จะย้ายมาที่นี่
                </p>
            </section>
        </div>
    );
}

export default ZonePlotManagementTab;
