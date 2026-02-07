// src/components/zones/tabs/ZonePlotManagementTab.tsx
import React from "react";
import { Plus, Loader2, CheckCircle2, Trash2, ChevronDown, AlertCircle } from "lucide-react";
import { trunkSizeOptions } from "../../../constants/treeOptions";
import { supabase } from "../../../supabaseClient";
import { usePlotPlanVsTagged, PlotPlanVsTaggedRow } from "../../../hooks/usePlotPlanVsTagged";
import { PlotInventorySummaryTable } from "../PlotInventorySummaryTable";
import { CreateTagModal, PlotOption } from "../CreateTagModal";

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
    isDarkMode?: boolean;
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
    isDarkMode = false,
}: Props) {
    // Local state for accordion
    const [localOpen, setLocalOpen] = React.useState(isInventoryOpen ?? false);

    // Toggle function
    const handleToggle = () => {
        setLocalOpen(prev => !prev);
    };

    // ========== PLOT INVENTORY SUMMARY STATE ==========
    const [plots, setPlots] = React.useState<PlotOption[]>([]);
    const [plotsLoading, setPlotsLoading] = React.useState(false);
    const [selectedPlotId, setSelectedPlotId] = React.useState<string>("");

    // Fetch plots for this zone
    React.useEffect(() => {
        if (!zoneId) return;
        let cancelled = false;

        (async () => {
            setPlotsLoading(true);
            const { data, error } = await supabase
                .from("planting_plots")
                .select("id, note")
                .eq("zone_id", zoneId)
                .order("created_at", { ascending: false, nullsFirst: false });

            if (cancelled) return;
            if (!error && data) {
                setPlots(data as PlotOption[]);
                // Auto-select first plot if available
                if (data.length > 0 && !selectedPlotId) {
                    setSelectedPlotId(data[0].id);
                }
            }
            setPlotsLoading(false);
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoneId]);

    // Species map for display names
    const [speciesMap, setSpeciesMap] = React.useState<Record<string, { name_th: string; name?: string }>>({});
    React.useEffect(() => {
        (async () => {
            const { data } = await supabase.from("stock_species").select("id, name_th, name");
            if (data) {
                const map: Record<string, { name_th: string; name?: string }> = {};
                for (const sp of data) {
                    map[sp.id] = { name_th: sp.name_th, name: sp.name };
                }
                setSpeciesMap(map);
            }
        })();
    }, []);

    // Hook: Plot inventory summary
    const { rows: plotSummaryRows, loading: plotSummaryLoading, error: plotSummaryError, refresh: refreshPlotSummary } = usePlotPlanVsTagged(selectedPlotId || null);

    // Quick Create Tag Modal state
    const [showCreateTagModal, setShowCreateTagModal] = React.useState(false);
    const [createTagDefaults, setCreateTagDefaults] = React.useState<{
        plotId: string;
        speciesId: string;
        sizeLabel: string;
    }>({ plotId: "", speciesId: "", sizeLabel: "" });

    const handleQuickCreateTag = (row: PlotPlanVsTaggedRow) => {
        setCreateTagDefaults({
            plotId: selectedPlotId,
            speciesId: row.species_id,
            sizeLabel: row.size_label || "",
        });
        setShowCreateTagModal(true);
    };

    const handleTagSaved = () => {
        setShowCreateTagModal(false);
        // Refresh cascading
        refreshPlotSummary();
        onReload?.();
    };

    // Validation: check if all rows are valid
    const invalidRows = plantCountDrafts.filter((r) => {
        const hasSpecies = !!r?.species_id;
        const hasSize = !!r?.size_label && r.size_label !== "";
        const hasValidQty = typeof r?.planted_count === "number" && r.planted_count > 0;
        return !hasSpecies || !hasSize || !hasValidQty;
    });

    const canSavePlantCounts = invalidRows.length === 0 && plantCountDrafts.length > 0;

    // Helper to check if a row is invalid
    const isRowInvalid = (row: PlantCountDraft) => {
        return !row.species_id || !row.size_label ||
            (typeof row.planted_count !== "number" || row.planted_count <= 0);
    };

    // Plot type options with filter for active only
    const plotTypeOptions = (plotTypes ?? [])
        .filter((pt: any) => pt?.is_active !== false)
        .map((pt: any) => {
            const id = pt?.id ?? pt?.plot_type_id ?? pt?.code ?? pt?.value ?? "";
            const label =
                pt?.name_th ??
                pt?.name_en ??
                pt?.name ??
                pt?.label ??
                pt?.title ??
                pt?.code ??
                pt?.detail ??
                "";
            return { id: String(id), label: String(label) };
        })
        .filter((o) => o.id && o.label);

    return (
        <div className="space-y-6">
            {/* SECTION 1: กำหนดจำนวนต้นไม้ในแปลง (ระบบ) */}
            <section className={`rounded-xl border overflow-hidden ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggle();
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                >
                    <div>
                        <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>กำหนดจำนวนต้นไม้ในแปลง (ระบบ)</h3>
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{plantCountDrafts.length} รายการ</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!localOpen && (
                            <span className="text-xs text-sky-600 font-medium">แก้ไข</span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${localOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {localOpen && (
                    <div className={`px-4 pb-4 space-y-3 border-t ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-2 pt-3">
                            <button
                                type="button"
                                onClick={addPlantCountRow}
                                disabled={savingPlantCounts}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50 ${isDarkMode ? "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                            >
                                <Plus className="h-3.5 w-3.5" /> เพิ่มแถว
                            </button>
                            <button
                                type="button"
                                onClick={savePlantCounts}
                                disabled={savingPlantCounts || !canSavePlantCounts}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingPlantCounts ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                {savingPlantCounts ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>

                        {/* Validation warning */}
                        {plantCountDrafts.length > 0 && invalidRows.length > 0 && (
                            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${isDarkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>มี {invalidRows.length} แถวที่ยังไม่ครบถ้วน (ต้องเลือกชนิด, ขนาด และระบุจำนวน)</span>
                            </div>
                        )}

                        {/* Success message */}
                        {plantCountsMsg && (
                            <div className="text-xs text-emerald-600 font-medium">{plantCountsMsg}</div>
                        )}

                        {/* Table */}
                        <div className={`overflow-x-auto border rounded-lg ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
                            <table className="min-w-full text-xs">
                                <thead className={`border-b ${isDarkMode ? "bg-white/5 text-slate-400 border-white/10" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">ชนิด</th>
                                        <th className="px-3 py-2 text-left font-medium">ขนาด</th>
                                        <th className="px-3 py-2 text-right font-medium w-24">จำนวน</th>
                                        <th className="px-3 py-2 text-center font-medium w-16">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plantCountDrafts.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className={`px-3 py-6 text-center ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                                                ยังไม่มีข้อมูล — กดปุ่ม "เพิ่มแถว" เพื่อเริ่มต้น
                                            </td>
                                        </tr>
                                    )}
                                    {plantCountDrafts.map((d) => {
                                        const hasSpeciesError = !d.species_id;
                                        const hasSizeError = !d.size_label;
                                        const hasQtyError = typeof d.planted_count !== "number" || d.planted_count <= 0;

                                        return (
                                            <tr key={d.id} className={`border-b ${isDarkMode ? "border-white/5 hover:bg-white/5" : "border-slate-100 hover:bg-slate-50"} ${isRowInvalid(d) ? (isDarkMode ? 'bg-rose-500/10' : 'bg-rose-50/50') : ''}`}>
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={d.species_id}
                                                        onChange={(e) => updatePlantCountRow?.(d.id, { species_id: e.target.value })}
                                                        disabled={savingPlantCounts}
                                                        className={`w-full rounded-lg border px-2 py-1.5 text-xs disabled:text-slate-400 ${isDarkMode
                                                                ? `bg-black text-white disabled:bg-white/5 ${hasSpeciesError ? 'border-rose-500' : 'border-white/10'}`
                                                                : `bg-white disabled:bg-slate-50 ${hasSpeciesError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-300'}`
                                                            }`}
                                                    >
                                                        <option value="">-- เลือกชนิด --</option>
                                                        {speciesOptions.map((s: any) => (
                                                            <option key={s.id} value={s.id}>{s.name_th || s.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={d.size_label}
                                                        onChange={(e) => updatePlantCountRow?.(d.id, { size_label: e.target.value })}
                                                        disabled={savingPlantCounts}
                                                        className={`w-full rounded-lg border px-2 py-1.5 text-xs disabled:text-slate-400 ${isDarkMode
                                                                ? `bg-black text-white disabled:bg-white/5 ${hasSizeError ? 'border-rose-500' : 'border-white/10'}`
                                                                : `bg-white disabled:bg-slate-50 ${hasSizeError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-300'}`
                                                            }`}
                                                    >
                                                        <option value="">-- เลือกขนาด --</option>
                                                        {trunkSizeOptions.map((opt) => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={d.planted_count}
                                                        onChange={(e) => updatePlantCountRow?.(d.id, { planted_count: e.target.value === "" ? "" : Number(e.target.value) })}
                                                        disabled={savingPlantCounts}
                                                        placeholder="0"
                                                        className={`w-20 rounded-lg border px-2 py-1.5 text-right text-xs disabled:text-slate-400 ${isDarkMode
                                                                ? `bg-black text-white disabled:bg-white/5 ${hasQtyError ? 'border-rose-500' : 'border-white/10'}`
                                                                : `disabled:bg-slate-50 ${hasQtyError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-300'}`
                                                            }`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePlantCountRow?.(d.id)}
                                                        disabled={savingPlantCounts}
                                                        title="ลบแถวนี้"
                                                        className={`p-1.5 rounded-lg disabled:opacity-50 transition-colors ${isDarkMode ? "text-rose-400 hover:bg-rose-500/10" : "text-rose-500 hover:bg-rose-50 hover:text-rose-600"}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            {/* SECTION 2: ตั้งค่าประเภทแปลง */}
            <section className={`rounded-xl border p-5 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                <div className="flex items-center justify-between gap-3">
                    <h3 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>ตั้งค่าประเภทแปลง</h3>
                    <button
                        type="button"
                        onClick={handleSavePlotType}
                        disabled={savingPlotType || !selectedPlotTypeId}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {savingPlotType ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                </div>

                <div className="mt-4">
                    <select
                        value={selectedPlotTypeId ?? ""}
                        onChange={(e) => setSelectedPlotTypeId?.(String(e.target.value))}
                        disabled={savingPlotType || plotTypeOptions.length === 0}
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm disabled:text-slate-400 ${isDarkMode
                                ? "bg-black text-white border-white/10 disabled:bg-white/5"
                                : "bg-white border-slate-200 disabled:bg-slate-50"
                            }`}
                    >
                        <option value="">-- เลือกประเภทแปลง --</option>
                        {plotTypeOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>

                    {plotTypeOptions.length === 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                            ยังไม่มีข้อมูลประเภทแปลง
                        </p>
                    )}

                    {saveMessage && (
                        <p className="mt-3 text-sm text-emerald-600 font-medium">{saveMessage}</p>
                    )}
                </div>
            </section>

            {/* SECTION 3: Plot Inventory Summary */}
            <section className={`rounded-xl border p-5 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>สรุป Tag ตามแปลง (Plot)</h3>
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>ข้อมูลจำนวนต้นที่บันทึกในระบบ vs ติด Tag แล้ว</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>เลือกแปลง:</label>
                        <select
                            value={selectedPlotId}
                            onChange={(e) => setSelectedPlotId(e.target.value)}
                            disabled={plotsLoading || plots.length === 0}
                            className={`rounded-lg border px-2 py-1 text-xs disabled:text-slate-400 ${isDarkMode
                                    ? "bg-black text-white border-white/10 disabled:bg-white/5"
                                    : "border-slate-200 disabled:bg-slate-50"
                                }`}
                        >
                            {plotsLoading && <option value="">กำลังโหลด...</option>}
                            {!plotsLoading && plots.length === 0 && <option value="">ไม่มีแปลง</option>}
                            {plots.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {(p.note ?? "Plot")} — {String(p.id).slice(0, 8)}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => refreshPlotSummary()}
                            className={`rounded-lg border px-2 py-1 text-xs hover:bg-opacity-50 ${isDarkMode ? "border-white/10 text-slate-300 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        >
                            🔄
                        </button>
                    </div>
                </div>

                {plots.length === 0 && !plotsLoading && (
                    <div className="py-4 text-center text-sm text-amber-600">
                        ⚠️ โซนนี้ยังไม่มีแปลงย่อย (Plot) กรุณาสร้างแปลงก่อน
                    </div>
                )}

                {plots.length > 0 && (
                    <PlotInventorySummaryTable
                        rows={plotSummaryRows}
                        loading={plotSummaryLoading}
                        error={plotSummaryError}
                        speciesMap={speciesMap}
                        onCreateTag={handleQuickCreateTag}
                    />
                )}
            </section>

            {/* Quick Create Tag Modal */}
            {showCreateTagModal && (
                <CreateTagModal
                    zoneId={zoneId}
                    speciesOptions={speciesOptions}
                    plots={plots}
                    plotsLoading={plotsLoading}
                    onClose={() => setShowCreateTagModal(false)}
                    onSaved={handleTagSaved}
                    defaultPlotId={createTagDefaults.plotId}
                    defaultSpeciesId={createTagDefaults.speciesId}
                    defaultSizeLabel={createTagDefaults.sizeLabel}
                    lockPlot={true}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
}

export default ZonePlotManagementTab;
