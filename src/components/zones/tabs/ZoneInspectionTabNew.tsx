// src/components/zones/tabs/ZoneInspectionTabNew.tsx
import React from "react";
import { Loader2, RefreshCw, ClipboardCheck, AlertTriangle } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { usePlotPlanTaggedInspectedSummary } from "../../../hooks/usePlotPlanTaggedInspectedSummary";
import { useLatestPlotInspection } from "../../../hooks/useLatestPlotInspection";
import { useMyRole } from "../../../hooks/useMyRole";
import { formatSizeLabel } from "../../../utils/formatSizeLabel";
import { ZoneTreeInspectionForm } from "../ZoneTreeInspectionForm";
import { ZoneInspectionHistory } from "../ZoneInspectionHistory";

type PlotOption = { id: string; note: string | null };

type Props = {
    zoneId: string;
    zone?: any;
    onReload?: () => void;
    mode?: "summary" | "audit";
    inventoryItems?: any[];
};

export function ZoneInspectionTabNew({
    zoneId,
    zone,
    onReload,
    mode = "audit",
    inventoryItems = []
}: Props) {
    // ========== PLOT STATE ==========
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
                // Auto-select first plot
                if (data.length > 0 && !selectedPlotId) {
                    setSelectedPlotId(data[0].id);
                }
            }
            setPlotsLoading(false);
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoneId]);

    // ========== SPECIES MAP ==========
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

    // ========== HOOKS ==========
    const { canEditPlan, loading: roleLoading } = useMyRole();
    const { rows: summaryRows, loading: summaryLoading, error: summaryError, refresh: refreshSummary } = usePlotPlanTaggedInspectedSummary(selectedPlotId || null);
    const { data: latestInspection, loading: inspectionLoading, error: inspectionError, refresh: refreshInspection } = useLatestPlotInspection(selectedPlotId || null);

    const refreshAll = async () => {
        await Promise.all([refreshSummary(), refreshInspection()]);
        onReload?.();
    };

    // Calculate totals
    const totals = React.useMemo(() => {
        return summaryRows.reduce(
            (acc, row) => ({
                plan: acc.plan + row.plan_qty,
                tagged: acc.tagged + row.tagged_qty,
                inspected: acc.inspected + row.inspected_qty,
            }),
            { plan: 0, tagged: 0, inspected: 0 }
        );
    }, [summaryRows]);

    const getSpeciesName = (speciesId: string) => {
        return speciesMap[speciesId]?.name_th || speciesMap[speciesId]?.name || speciesId.slice(0, 8);
    };

    return (
        <div className="space-y-6">
            {/* Header with Plot Selector */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">การตรวจแปลง & ความคลาดเคลื่อน</h2>
                    <p className="text-xs text-slate-500">เปรียบเทียบ Plan vs Tagged vs Inspected ตาม Plot</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">เลือกแปลง:</label>
                    <select
                        value={selectedPlotId}
                        onChange={(e) => setSelectedPlotId(e.target.value)}
                        disabled={plotsLoading || plots.length === 0}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-50"
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
                        onClick={refreshAll}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* No plots warning */}
            {plots.length === 0 && !plotsLoading && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    ⚠️ โซนนี้ยังไม่มีแปลงย่อย (Plot) กรุณาสร้างแปลงก่อน
                </div>
            )}

            {plots.length > 0 && (
                <>
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                            <div className="text-xs text-slate-500">Plan (ระบบ)</div>
                            <div className="text-lg font-bold text-slate-800">{totals.plan.toLocaleString("th-TH")}</div>
                        </div>
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
                            <div className="text-xs text-sky-600">Tagged</div>
                            <div className="text-lg font-bold text-sky-700">{totals.tagged.toLocaleString("th-TH")}</div>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                            <div className="text-xs text-emerald-600">Inspected</div>
                            <div className="text-lg font-bold text-emerald-700">{totals.inspected.toLocaleString("th-TH")}</div>
                        </div>
                        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-center">
                            <div className="text-xs text-purple-600">Diff (Insp - Plan)</div>
                            <div className={`text-lg font-bold ${totals.inspected - totals.plan === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                {totals.inspected - totals.plan > 0 ? "+" : ""}{(totals.inspected - totals.plan).toLocaleString("th-TH")}
                            </div>
                        </div>
                    </div>

                    {/* Summary Table: Plan vs Tagged vs Inspected */}
                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <h3 className="text-sm font-semibold text-slate-800">สรุป Plan vs Tagged vs Inspected</h3>
                            </div>
                            {!canEditPlan && !roleLoading && (
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                    🔒 เฉพาะ Admin/Manager เท่านั้นที่แก้ Plan ได้
                                </span>
                            )}
                        </div>

                        {summaryLoading ? (
                            <div className="py-4 text-center text-slate-500 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                                กำลังโหลด...
                            </div>
                        ) : summaryError ? (
                            <div className="text-sm text-red-600">Error: {summaryError}</div>
                        ) : summaryRows.length === 0 ? (
                            <div className="py-4 text-center text-slate-400 text-sm">
                                ยังไม่มีข้อมูลสรุป (Plan/Tagged/Inspected ว่างเปล่า)
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-100">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">ชนิด/พันธุ์</th>
                                            <th className="px-3 py-2 text-left font-medium">ขนาด</th>
                                            <th className="px-3 py-2 text-left font-medium">เกรด</th>
                                            <th className="px-3 py-2 text-right font-medium">Plan</th>
                                            <th className="px-3 py-2 text-right font-medium">Tagged</th>
                                            <th className="px-3 py-2 text-right font-medium">Inspected</th>
                                            <th className="px-3 py-2 text-right font-medium">Diff (I-P)</th>
                                            <th className="px-3 py-2 text-right font-medium">Diff (I-T)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryRows.map((row, idx) => {
                                            const diffIP = row.diff_inspected_vs_plan;
                                            const diffIT = row.diff_inspected_vs_tagged;
                                            return (
                                                <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-slate-700 font-medium">{getSpeciesName(row.species_id)}</td>
                                                    <td className="px-3 py-2 text-slate-600">{formatSizeLabel(row.size_label)}</td>
                                                    <td className="px-3 py-2 text-slate-600">{row.grade || "-"}</td>
                                                    <td className="px-3 py-2 text-right text-slate-600">{row.plan_qty.toLocaleString("th-TH")}</td>
                                                    <td className="px-3 py-2 text-right text-sky-600">{row.tagged_qty.toLocaleString("th-TH")}</td>
                                                    <td className="px-3 py-2 text-right text-emerald-600 font-medium">{row.inspected_qty.toLocaleString("th-TH")}</td>
                                                    <td className={`px-3 py-2 text-right font-medium ${diffIP === 0 ? "text-slate-400" : diffIP > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                        {diffIP > 0 ? "+" : ""}{diffIP.toLocaleString("th-TH")}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-medium ${diffIT === 0 ? "text-slate-400" : diffIT > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                        {diffIT > 0 ? "+" : ""}{diffIT.toLocaleString("th-TH")}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Mode Audit: Show Latest Inspection, Form & History */}
                    {mode === "audit" && (
                        <>
                            {/* Latest Inspection Section */}
                            <section className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                                        <h3 className="text-sm font-semibold text-slate-800">ผลสำรวจล่าสุด</h3>
                                    </div>
                                </div>

                                {inspectionLoading ? (
                                    <div className="py-4 text-center text-slate-500 text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                                        กำลังโหลด...
                                    </div>
                                ) : inspectionError ? (
                                    <div className="text-sm text-red-600">Error: {inspectionError}</div>
                                ) : !latestInspection.inspection ? (
                                    <div className="py-4 text-center text-slate-400 text-sm">
                                        ยังไม่มีการบันทึกผลสำรวจสำหรับแปลงนี้
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex gap-4 text-xs">
                                            <div>
                                                <span className="text-slate-500">วันที่สำรวจ: </span>
                                                <span className="font-medium text-slate-800">
                                                    {new Date(latestInspection.inspection.inspection_date).toLocaleDateString("th-TH", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">จำนวนรายการ: </span>
                                                <span className="font-medium text-slate-800">{latestInspection.items.length} รายการ</span>
                                            </div>
                                        </div>

                                        {latestInspection.items.length > 0 && (
                                            <div className="overflow-x-auto rounded-lg border border-slate-100">
                                                <table className="min-w-full text-xs">
                                                    <thead className="bg-slate-50 text-slate-500">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left font-medium">ชนิด/พันธุ์</th>
                                                            <th className="px-3 py-2 text-left font-medium">ขนาด</th>
                                                            <th className="px-3 py-2 text-left font-medium">เกรด</th>
                                                            <th className="px-3 py-2 text-right font-medium">จำนวน</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {latestInspection.items.map((item, idx) => (
                                                            <tr key={idx} className="border-t border-slate-50">
                                                                <td className="px-3 py-2 text-slate-700">{getSpeciesName(item.species_id)}</td>
                                                                <td className="px-3 py-2 text-slate-600">{formatSizeLabel(item.size_label)}</td>
                                                                <td className="px-3 py-2 text-slate-600">{item.grade || "-"}</td>
                                                                <td className="px-3 py-2 text-right text-emerald-600 font-medium">{item.estimated_qty}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {latestInspection.inspection.notes && (
                                            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                                <span className="font-medium">หมายเหตุ: </span>{latestInspection.inspection.notes}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            {/* New Inspection Form */}
                            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                <div className="mb-4">
                                    <h3 className="text-base font-semibold text-slate-800">บันทึกผลการตรวจแปลง</h3>
                                    <p className="text-xs text-slate-500">สร้างรายการสำรวจใหม่ (การแก้ไขให้ทำที่แท็บ "จัดการต้นไม้")</p>
                                </div>
                                <ZoneTreeInspectionForm
                                    zoneId={zoneId}
                                    inventoryRows={inventoryItems}
                                    editingRow={null}
                                    onCancelEdit={() => { }}
                                    onSaved={async () => {
                                        await refreshAll();
                                    }}
                                />
                            </section>

                            {/* Inspection History */}
                            <ZoneInspectionHistory zoneId={zoneId} />
                        </>
                    )}
                </>
            )}
        </div>
    );
}

export default ZoneInspectionTabNew;
