import React, { useMemo } from "react";
import {
    ArrowLeft,
    Loader2,
    MapPin,
    Plus,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Trash2,
    Sprout,
} from "lucide-react";
import { supabase } from "../supabaseClient";

import { usePlantingPlotDetail } from "../hooks/usePlantingPlotDetail";
import { useZoneTreeInventoryFlow } from "../hooks/useZoneTreeInventoryFlow";
import { useZoneDigupOrders } from "../hooks/useZoneDigupOrders";
import CreateDigupBatchForm from "./digup/CreateDigupBatchForm";
import { DigupOrderForm } from "./zones/DigupOrderForm";
import { useZoneTreeInspections } from "../hooks/useZoneTreeInspections";
import { useZoneTreeInspectionSummary } from "../hooks/useZoneTreeInspectionSummary";
import { useZoneTreeStockVsInspection } from "../hooks/useZoneTreeStockVsInspection";
// import { ZoneTreeInspectionForm } from "./zones/ZoneTreeInspectionForm";
import { useZoneMismatchOverview } from "../hooks/useZoneMismatchOverview";
// import { ZoneMismatchDetailTable } from "./zones/ZoneMismatchDetailTable";
// import { ZoneInspectionHistory } from "./zones/ZoneInspectionHistory";
import { ZoneTreeTagsTable } from "./zones/ZoneTreeTagsTable";
import { usePlotInventory } from "../hooks/usePlotInventory";


import { trunkSizeOptions } from "../constants/treeOptions";
import { SpeciesFormDialog } from "./stock/SpeciesFormDialog";
// import { ZoneReadyStockFromPlotSection } from "./zones/ZoneReadyStockFromPlotSection";
import { useStockZoneLifecycle, StockZoneLifecycleRow } from "../hooks/useStockZoneLifecycle";
// import TagLifecycleSummaryCard from "./tags/TagLifecycleSummaryCard";
import { useTagLifecycleTotals } from "../hooks/useTagLifecycleTotals";
import { useZoneInventorySummary } from "../hooks/useZoneInventorySummary";
import { usePlotSizeTransitionHistory } from "../hooks/usePlotSizeTransitionHistory";
// import { ZoneLocationSection } from "./zones/ZoneLocationSection";
import ZoneOverviewTab from "./zones/tabs/ZoneOverviewTab";
// import ZoneTagsTab from "./zones/tabs/ZoneTagsTab";
import ZonePlotManagementTab from "./zones/tabs/ZonePlotManagementTab";
import { ZoneLegacySurveyAndLogs } from "./zones/tabs/ZoneLegacySurveyAndLogs";
import { ZoneInspectionTabNew } from "./zones/tabs/ZoneInspectionTabNew";
import { ZoneMovementsTab } from "./zones/tabs/ZoneMovementsTab";
import { ZoneFilesNotesTab } from "./zones/tabs/ZoneFilesNotesTab";
import { ZoneDigPlanTab } from "./zones/tabs/ZoneDigPlanTab";

// Helper to map Thai status from DB to English keys for color map
const mapThaiStatusToKey = (status?: string) => {
    if (!status) return "unknown";
    if (status === "ตรงตามระบบ") return "none";
    if (status === "คลาดเคลื่อนเล็กน้อย") return "low";
    if (status === "คลาดเคลื่อนปานกลาง") return "medium";
    if (status === "คลาดเคลื่อนมาก") return "high";
    if (status === "ยังไม่สำรวจ") return "unknown";
    return "unknown";
};

const mismatchColorMap: Record<string, string> = {
    none: "bg-emerald-100 text-emerald-800 border-emerald-200",
    low: "bg-yellow-100 text-yellow-800 border-yellow-200",
    medium: "bg-orange-100 text-orange-800 border-orange-200",
    high: "bg-red-100 text-red-800 border-red-200",
    unknown: "bg-slate-100 text-slate-700 border-slate-200",
};

const plotTypeColorMap: Record<string, string> = {
    customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stock: "bg-indigo-50 text-indigo-700 border-indigo-200",
    buffer: "bg-lime-50 text-lime-700 border-lime-200",
    nursery: "bg-amber-50 text-amber-700 border-amber-200",
};

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const toThaiNumber = (value?: number | null) =>
    (value ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });



type TabId = "overview" | "plot" | "audit" | "dig_plan" | "operations" | "tags" | "movements" | "files";

const ZoneDetailPage = ({ zoneId, onBack, onCreateTask }: { zoneId: string; onBack: () => void, onCreateTask?: () => void }) => {
    // --- State & Hooks ---
    const [zone, setZone] = React.useState<any>(null);
    const [loadingZone, setLoadingZone] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [zoneOverview, setZoneOverview] = React.useState<any | null>(null);
    const [loadingOverview, setLoadingOverview] = React.useState(false);

    // ✅ Tabs State (Fix)
    const [activeTab, setActiveTab] = React.useState<TabId>("overview");
    const [focusDigupOrderId, setFocusDigupOrderId] = React.useState<string | null>(null);

    const handleJumpToDigupOrder = (orderId: string) => {
        setActiveTab("operations");
        setFocusDigupOrderId(orderId);
    };

    const rowRefs = React.useRef<Record<string, HTMLTableRowElement | null>>({});

    // Scroll to focused order when operations tab is active
    React.useEffect(() => {
        if (!activeTab || activeTab !== "operations") return;
        if (!focusDigupOrderId) return;

        // Small timeout to ensure DOM is rendered
        setTimeout(() => {
            const el = rowRefs.current[focusDigupOrderId];
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }, 100);

        // Auto-clear focus
        const t = setTimeout(() => {
            setFocusDigupOrderId(null);
        }, 1200);

        return () => clearTimeout(t);
    }, [activeTab, focusDigupOrderId]);
    const [isMapOpen, setIsMapOpen] = React.useState(false);
    const handleTabChange = (tab: TabId) => setActiveTab(tab);

    // Plot Type State
    const [selectedPlotTypeId, setSelectedPlotTypeId] = React.useState<string | "">("");
    const [savingPlotType, setSavingPlotType] = React.useState(false);
    const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
    const [plotTypes, setPlotTypes] = React.useState<any[]>([]);

    // Hooks (use only what we need to avoid unused var errors)
    const { refetch: refetchRows } = usePlantingPlotDetail(zoneId);

    const {
        rows: inventoryRows,
        loading: inventoryLoading,
        // error: inventoryError,
        reload: reloadInventory,
    } = useZoneTreeInventoryFlow(zoneId);

    const {
        rows: digupOrders,
        loading: digupOrdersLoading,
        error: digupOrdersError,
        updateStatus: updateDigupStatus,
        reload: reloadDigupOrders,
    } = useZoneDigupOrders(zoneId);

    const {
        rows: inspectionRows,
        loading: inspectionsLoading,
        error: inspectionsError,
        reload: reloadInspections,
    } = useZoneTreeInspections(zoneId);

    const { rows: summaryRows, loading: summaryLoading, reload: reloadSummary } =
        useZoneTreeInspectionSummary(zoneId);

    const {
        // rows: stockDiffRows,
        // loading: stockDiffLoading,
        // error: stockDiffError,
        reload: reloadStockDiff,
    } = useZoneTreeStockVsInspection(zoneId);

    // Mismatch Hook
    const { byZoneId } = useZoneMismatchOverview();
    const mismatch = zoneId && byZoneId ? byZoneId[String(zoneId)] ?? null : null;

    // Form States


    // const [selectedInventoryItem, setSelectedInventoryItem] = React.useState<ZoneTreeInventoryRow | null>(null);
    const [showPlotDigupForm, setShowPlotDigupForm] = React.useState(false);
    const [selectedPlotTreeId, setSelectedPlotTreeId] = React.useState<string | null>(null);
    const [showDigupModal, setShowDigupModal] = React.useState(false);

    // New Plant Form State
    const [speciesOptions, setSpeciesOptions] = React.useState<any[]>([]);



    const [showSpeciesDialog, setShowSpeciesDialog] = React.useState(false);

    // --- Plot Inventory Hook ---
    const {
        rows: inventoryItems,
        // loading: plotInventoryLoading,
        // error: plotInventoryError,
        reload: reloadPlotInventory,

        // createTagsFromInventory,
    } = usePlotInventory(zoneId);

    // --- Stock Lifecycle (Tag ตามสถานะ) ---
    const {
        rows: lifecycleRows,
        // loading: lifecycleLoading,
        // error: lifecycleError,
        reload: reloadLifecycle,
    } = useStockZoneLifecycle({ zoneId: zoneId as string });

    // --- Zone Inventory & Inspection Summary (from new view) ---
    const {
        summary: zoneInvSummary,
        loading: zoneInvLoading,
        // error: zoneInvError,
        reload: reloadZoneInvSummary,
    } = useZoneInventorySummary(zoneId);

    const { data: tagLifecycleTotals, loading: tagLifecycleLoading, reload: reloadTagLife } =
        useTagLifecycleTotals({ zoneId });

    // --- Average Tree Size (from RPC) ---
    const [avgTreeSize, setAvgTreeSize] = React.useState<{
        value: number | null;
        unit: "inch" | "m" | null;
        sourceCount: number;
        note?: string;
    } | null>(null);


    const readyStockSummary = React.useMemo(() => {
        let available = 0;
        let reserved = 0;
        let digOrdered = 0;
        let dug = 0;
        let shipped = 0;

        (lifecycleRows || []).forEach((r: StockZoneLifecycleRow) => {
            available += r.available_qty ?? 0;
            reserved += r.reserved_qty ?? 0;
            digOrdered += r.dig_ordered_qty ?? 0;
            dug += r.dug_qty ?? 0;
            shipped += r.shipped_qty ?? 0;
        });

        return { available, reserved, digOrdered, dug, shipped };
    }, [lifecycleRows]);

    // --- Planting Plot Tree Counts (ระบบ) ---
    type PlantCountDraft = {
        id: string;
        species_id: string;
        size_label: string;
        planted_count: number | "";
        _dirty?: boolean;
        _error?: string | null;
    };

    const makeLocalId = () => `draft_${Math.random().toString(36).slice(2)}_${Date.now()} `;

    const [plantCountDrafts, setPlantCountDrafts] = React.useState<PlantCountDraft[]>([]);
    const [savingPlantCounts, setSavingPlantCounts] = React.useState(false);
    const [plantCountsMsg, setPlantCountsMsg] = React.useState<string | null>(null);



    // --- Size Transition History ---
    const { rows: sizeMoveRows, loading: sizeMoveLoading, error: sizeMoveError, reload: reloadSizeMoves } =
        usePlotSizeTransitionHistory(zoneId);



    // --- Plot Totals ---
    const [plotTotals, setPlotTotals] = React.useState<{
        totalSystem: number;
        totalTagged: number;
        totalRemaining: number;
        loading: boolean;
    }>({
        totalSystem: 0,
        totalTagged: 0,
        totalRemaining: 0,
        loading: true,
    });

    const fetchPlotTotals = React.useCallback(async () => {
        if (!zoneId) return;
        setPlotTotals((prev) => ({ ...prev, loading: true }));

        const { data, error } = await supabase
            .from("view_plot_tree_inventory_totals")
            .select("total_system, total_tagged, total_remaining")
            .eq("plot_id", zoneId)
            .maybeSingle();

        if (error) {
            console.warn("fetchPlotTotals error", error);
            setPlotTotals({ totalSystem: 0, totalTagged: 0, totalRemaining: 0, loading: false });
            return;
        }

        setPlotTotals({
            totalSystem: Number(data?.total_system ?? 0),
            totalTagged: Number(data?.total_tagged ?? 0),
            totalRemaining: Number(data?.total_remaining ?? 0),
            loading: false,
        });
    }, [zoneId]);

    React.useEffect(() => {
        fetchPlotTotals();
    }, [fetchPlotTotals]);

    const onTagMutated = React.useCallback(async () => {
        await Promise.all([fetchPlotTotals(), reloadPlotInventory?.(), reloadLifecycle?.(), reloadTagLife?.()]);
    }, [fetchPlotTotals, reloadPlotInventory, reloadLifecycle, reloadTagLife]);

    // Sync drafts from inventoryRows (system flow)
    React.useEffect(() => {
        if (inventoryLoading || !inventoryRows) return;

        const next: PlantCountDraft[] = (inventoryRows || []).map((r) => ({
            id: makeLocalId(),
            species_id: r.species_id,
            size_label: r.size_label || "",
            planted_count: Number(r.planted_count ?? 0),
            _dirty: false,
            _error: null,
        }));

        setPlantCountDrafts(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoneId, inventoryLoading, inventoryRows]);

    // Load Zone Overview
    React.useEffect(() => {
        if (!zoneId) return;
        let cancelled = false;

        async function loadOverview() {
            setLoadingOverview(true);
            const { data, error } = await supabase.from("view_zone_overview").select("*").eq("id", zoneId).single();
            if (error) console.error("loadOverview error", error);
            else if (!cancelled) setZoneOverview(data);
            if (!cancelled) setLoadingOverview(false);
        }

        loadOverview();
        return () => {
            cancelled = true;
        };
    }, [zoneId]);

    // Load Average Tree Size from RPC
    React.useEffect(() => {
        let cancelled = false;

        async function loadAvgSize() {
            if (!zoneId) return;

            const { data, error } = await supabase
                .rpc("get_zone_avg_tree_size", { p_zone_id: zoneId });

            if (cancelled) return;

            if (error || !data || !data[0]) {
                setAvgTreeSize(null);
                return;
            }

            const row = data[0];
            setAvgTreeSize({
                value: row.value == null ? null : Number(row.value),
                unit: row.unit === "m" ? "m" : row.unit === "inch" ? "inch" : null,
                sourceCount: Number(row.source_count ?? 0),
                note: row.note ?? undefined,
            });
        }

        loadAvgSize();

        return () => {
            cancelled = true;
        };
    }, [zoneId]);

    // Load Zone (Legacy)
    React.useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoadingZone(true);
            const { data, error } = await supabase.from("stock_zones").select("*").eq("id", zoneId).single();
            if (cancelled) return;

            if (error) {
                setError(error.message);
                setZone(null);
            } else {
                setZone(data);
                setSelectedPlotTypeId(data?.plot_type ?? "");
            }
            setLoadingZone(false);
        }

        if (zoneId) load();
        return () => {
            cancelled = true;
        };
    }, [zoneId]);

    // Load Lookups
    React.useEffect(() => {
        let cancelled = false;

        async function loadPlotTypes() {
            const { data, error } = await supabase
                .from("planting_plot_detail_lookup")
                .select("*")
                .eq("is_active", true)
                .order("sort_order");
            if (!cancelled) {
                if (error) console.error("loadPlotTypes error", error);
                else setPlotTypes(data ?? []);
            }
        }

        loadPlotTypes();
        return () => {
            cancelled = true;
        };
    }, []);

    // Load Species
    const loadSpecies = async () => {
        const { data, error } = await supabase
            .from("stock_species")
            .select("id, name, name_th, measure_by_height")
            .order("name_th");
        if (error) console.error("loadSpecies error", error);
        else setSpeciesOptions(data ?? []);
    };

    React.useEffect(() => {
        loadSpecies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Handlers ---
    const handleSavePlotType = async () => {
        if (!zoneId) return;
        setSavingPlotType(true);
        setSaveMessage(null);

        const payload: any = {
            plot_type: selectedPlotTypeId === "" ? null : selectedPlotTypeId,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("stock_zones").update(payload).eq("id", zoneId);

        if (error) {
            console.error("update plot_type error", error);
            setSaveMessage("บันทึกประเภทแปลงไม่สำเร็จ: " + error.message);
        } else {
            setSaveMessage("บันทึกประเภทแปลงเรียบร้อยแล้ว ✅");
            setZone((prev: any) => (prev ? { ...prev, plot_type: selectedPlotTypeId || null } : prev));
        }

        setSavingPlotType(false);
        setTimeout(() => setSaveMessage(null), 3000);
    };









    const statusLabel: Record<string, string> = {
        planned: "แผนจะขุดล้อม",
        in_progress: "กำลังขุดล้อม",
        done: "ขุดล้อมแล้ว",
        cancelled: "ยกเลิก",
    };

    const statusBadgeClass: Record<string, string> = {
        planned: "bg-sky-50 text-sky-700 border border-sky-100",
        in_progress: "bg-amber-50 text-amber-700 border border-amber-100",
        done: "bg-emerald-50 text-emerald-700 border border-emerald-100",
        cancelled: "bg-slate-100 text-slate-500 border border-slate-200 line-through",
    };

    const handleDigupSaved = () => {
        refetchRows?.();
        reloadInventory?.();
        reloadDigupOrders?.();
        setShowDigupModal(false);
    };

    // --- Planting Plot Tree Counts Handlers ---
    const addPlantCountRow = () => {
        setPlantCountDrafts((prev) => [...prev, { id: makeLocalId(), species_id: "", size_label: "", planted_count: "", _dirty: true }]);
    };

    const removePlantCountRow = (id: string) => {
        setPlantCountDrafts((prev) => prev.filter((x) => x.id !== id));
    };

    const updatePlantCountRow = (id: string, patch: Partial<PlantCountDraft>) => {
        setPlantCountDrafts((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch, _dirty: true } : x)));
    };

    const savePlantCounts = async () => {
        if (!zoneId) return;

        let hasError = false;

        const normalized = plantCountDrafts.map((d) => {
            const planted = d.planted_count === "" ? NaN : Number(d.planted_count);
            let err: string | null = null;

            if (!d.species_id) err = "กรุณาเลือกชนิดต้นไม้";
            else if (!d.size_label) err = "กรุณาระบุขนาด";
            else if (!Number.isFinite(planted) || planted < 0) err = "จำนวนต้องเป็นตัวเลข ≥ 0";

            if (err) hasError = true;

            return {
                ...d,
                planted_count: Number.isFinite(planted) ? Math.trunc(planted) : d.planted_count,
                _error: err,
            };
        });

        const keyMap = new Map<string, number>();
        normalized.forEach((d) => {
            const k = `${d.species_id}__${d.size_label} `;
            keyMap.set(k, (keyMap.get(k) || 0) + 1);
        });

        const withDupCheck = normalized.map((d) => {
            const k = `${d.species_id}__${d.size_label} `;
            if (d.species_id && d.size_label && (keyMap.get(k) || 0) > 1) {
                hasError = true;
                return { ...d, _error: "มีรายการซ้ำ (ชนิด+ขนาด) กรุณารวมเป็นแถวเดียว" };
            }
            return d;
        });

        setPlantCountDrafts(withDupCheck);

        if (hasError) {
            setPlantCountsMsg("มีข้อมูลไม่ถูกต้อง กรุณาแก้ไขช่องที่ขึ้นเตือนก่อนบันทึก");
            setTimeout(() => setPlantCountsMsg(null), 3500);
            return;
        }

        const items = withDupCheck.map((d) => ({
            species_id: d.species_id,
            size_label: d.size_label,
            planted_count: Number(d.planted_count),
        }));

        setSavingPlantCounts(true);
        setPlantCountsMsg(null);

        const { error } = await supabase.rpc("upsert_planting_plot_tree_counts", {
            p_plot_id: zoneId,
            p_items: items,
        });

        if (error) {
            console.error("savePlantCounts rpc error", error);
            setPlantCountsMsg("บันทึกไม่สำเร็จ: " + error.message);
            setSavingPlantCounts(false);
            return;
        }

        const { error: syncError } = await supabase.rpc("sync_plot_inventory_from_system", {
            p_plot_id: zoneId,
        });

        if (syncError) console.warn("sync_plot_inventory_from_system warning:", syncError);

        await Promise.all([reloadInventory?.(), reloadZoneInvSummary?.(), reloadPlotInventory?.()]);
        setPlantCountDrafts((prev) => prev.map((x) => ({ ...x, _dirty: false, _error: null })));
        setPlantCountsMsg("บันทึกจำนวนปลูกเรียบร้อยแล้ว ✅");
        setSavingPlantCounts(false);
        setTimeout(() => setPlantCountsMsg(null), 2500);
    };

    // --- Derived Values ---
    // const plannedTotal = mismatch?.system_qty ?? 0;
    const inspectedTotal = mismatch?.inspected_qty ?? 0;
    // const diffTotal = mismatch?.diff_qty ?? 0;

    const mismatchStatusRaw = mismatch?.mismatch_status;
    const mismatchKey = mapThaiStatusToKey(mismatchStatusRaw);
    const mismatchLabel = mismatchStatusRaw || "ยังไม่สำรวจ";
    const mismatchClass = mismatchColorMap[mismatchKey];

    const plotTypeName = zoneOverview?.plot_type_name || "ประเภทแปลง";
    const currentPlotType = plotTypes.find((pt) => pt.id === selectedPlotTypeId);
    const plotTypeCode = currentPlotType?.code || "customer";
    const plotTypeClass = plotTypeColorMap[plotTypeCode] || "bg-slate-50 text-slate-700 border-slate-200";

    const inventorySummary = useMemo(() => {
        const speciesSet = new Set<string>();
        (inventoryItems || []).forEach((r) => {
            if (r.species_id) speciesSet.add(r.species_id);
        });

        const totalPlanted = plotTotals.totalSystem;
        const totalTagged = plotTotals.totalTagged;
        const remaining = plotTotals.totalRemaining;

        return { totalPlanted, totalTagged, remaining, speciesCount: speciesSet.size };
    }, [inventoryItems, plotTotals]);



    if (loadingZone || loadingOverview) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <h3 className="font-semibold">เกิดข้อผิดพลาด</h3>
                <p>{error}</p>
                <button onClick={onBack} className="mt-2 text-sm underline">
                    กลับไปหน้าแปลงทั้งหมด
                </button>
            </div>
        );
    }

    if (!zone) return null;

    return (
        <div className="flex flex-col gap-4 pb-24">
            {/* --- Header --- */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับไปหน้าแปลงปลูก
                    </button>

                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg font-semibold text-slate-900">{zone.name}</h1>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                <MapPin className="h-3.5 w-3.5" />
                                {zone.farm_name || "-"}
                            </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " + plotTypeClass}>
                                {plotTypeName}
                            </span>

                            <span className={"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium " + mismatchClass}>
                                {mismatch?.mismatch_status === "ตรงตามระบบ" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                )}
                                {mismatchLabel}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                                <Calendar className="h-3.5 w-3.5" />
                                ตรวจล่าสุด: {formatDate(mismatch?.last_inspection_date)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={onCreateTask}
                    >
                        + เพิ่มงาน
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                        onClick={() => handleTabChange("audit")}
                    >
                        บันทึกการตรวจแปลง
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowDigupModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
                    >
                        คำสั่งขุดล้อม / เคลื่อนย้าย
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        พิมพ์ / Export
                    </button>
                </div>
            </div>

            {/* ===== SECTION 1: ภาพรวมแปลง (Top Row) ===== */}
            <section className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">จำนวนต้นไม้ทั้งหมดในแปลง (ระบบ)</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">
                        {zoneInvLoading ? "..." : toThaiNumber(zoneInvSummary?.trees_in_plot_now ?? inventorySummary.totalPlanted)}{" "}
                        <span className="text-sm font-normal">ต้น</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                        {inventorySummary.speciesCount} ชนิดไม้ · จำนวนตามแผน
                    </div>
                    <div className="mt-0.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 inline-block">
                        ⚠️ ตัวเลขระบบ ไม่ใช่จำนวนพร้อมขาย
                    </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-emerald-700">พร้อมขาย (จาก Tag)</div>
                        <Sprout className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-1 text-2xl font-bold text-emerald-700">
                        {tagLifecycleLoading ? "..." : toThaiNumber(tagLifecycleTotals?.available_qty ?? 0)}{" "}
                        <span className="text-sm font-normal">ต้น</span>
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-600">สถานะ: in_zone (ยังไม่จอง/ยังไม่สั่งขุด)</div>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-amber-700">จองแล้ว (จาก Tag)</div>
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="mt-1 text-2xl font-bold text-amber-700">
                        {tagLifecycleLoading ? "..." : toThaiNumber(tagLifecycleTotals?.reserved_qty ?? 0)}{" "}
                        <span className="text-sm font-normal">ต้น</span>
                    </div>
                    <div className="mt-1 text-[11px] text-amber-600">สถานะ: reserved (จองไว้แล้ว รอดำเนินการ)</div>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm">
                    <div className="text-xs font-medium text-sky-700">จำนวนต้นจากการสำรวจล่าสุด</div>
                    <div className="mt-1 text-2xl font-bold text-sky-700">
                        {zoneInvLoading ? "..." : toThaiNumber(zoneInvSummary?.latest_inspection_qty ?? inspectedTotal)}{" "}
                        <span className="text-sm font-normal">ต้น</span>
                    </div>
                    <div className="mt-1 text-[11px] text-sky-600">
                        {zoneInvSummary?.latest_inspection_date
                            ? `ตรวจเมื่อ ${formatDate(zoneInvSummary.latest_inspection_date)} `
                            : mismatch?.last_inspection_date
                                ? `ตรวจเมื่อ ${formatDate(mismatch.last_inspection_date)} `
                                : "ยังไม่เคยมีการสำรวจ"}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-medium text-slate-500">ข้อมูลพื้นที่</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                        {zone.area_rai ?? zoneInvSummary?.area_rai ?? "-"} ไร่
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                        {zone.area_width_m && zone.area_length_m ? `ขนาดโดยประมาณ ${zone.area_width_m}×${zone.area_length_m} ม.` : "รายละเอียดขนาด: -"}
                    </div>
                    <div className="text-[11px] text-slate-500">ฟาร์ม: {zone.farm_name ?? zoneInvSummary?.farm_name ?? "-"}</div>
                </div>
            </section>

            {/* ===== TAB NAVIGATION ===== */}
            <nav className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl">
                {[
                    { id: "overview" as const, label: "ภาพรวม", icon: "📊" },
                    { id: "plot" as const, label: "จัดการต้นไม้ในแปลง", icon: "🌱" },
                    { id: "audit" as const, label: "ตรวจแปลง", icon: "📋" },
                    { id: "dig_plan" as const, label: "วางแผนขุด", icon: "🗓️" },
                    { id: "operations" as const, label: "ขุดล้อม", icon: "🚜" },
                    { id: "tags" as const, label: "Tags (ขายจากแปลง)", icon: "🏷️" },
                    { id: "movements" as const, label: "ย้าย/เคลื่อนย้าย", icon: "🔄" },
                    { id: "files" as const, label: "เอกสาร/บันทึก", icon: "📁" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={[
                            "flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                            activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-200/50",
                        ].join(" ")}
                    >
                        <span className="mr-1">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* ===================== TAB: OVERVIEW ===================== */}
            {/* ===================== TAB: OVERVIEW ===================== */}
            {/* ===================== TAB: OVERVIEW ===================== */}
            {/* ===================== TAB: OVERVIEW ===================== */}
            {activeTab === "overview" && (
                <div className="space-y-2">
                    <ZoneOverviewTab
                        zoneId={zoneId}
                        zone={zone}
                        readyStockSummary={readyStockSummary}
                        tagLifeTotals={tagLifecycleTotals || undefined}
                        inventorySummary={inventorySummary}
                        plotTotals={plotTotals}
                        zoneInvSummary={zoneInvSummary}
                        isMapOpen={isMapOpen}
                        setIsMapOpen={setIsMapOpen}
                        onReload={onTagMutated}
                        avgTreeSize={avgTreeSize}
                    />

                    <ZonePlotManagementTab
                        zoneId={zoneId}
                        zone={zone}
                        plantCountDrafts={plantCountDrafts}
                        speciesOptions={speciesOptions}
                        addPlantCountRow={addPlantCountRow}
                        updatePlantCountRow={updatePlantCountRow}
                        removePlantCountRow={removePlantCountRow}
                        savePlantCounts={savePlantCounts}
                        savingPlantCounts={savingPlantCounts}
                        plantCountsMsg={plantCountsMsg}
                        plotTypes={plotTypes}
                        selectedPlotTypeId={selectedPlotTypeId}
                        setSelectedPlotTypeId={setSelectedPlotTypeId}
                        handleSavePlotType={handleSavePlotType}
                        savingPlotType={savingPlotType}
                        saveMessage={saveMessage}
                        onReload={onTagMutated}
                    />
                </div>
            )}

            {/* ===================== TAB: TAGS ===================== */}
            {activeTab === "tags" && (
                <div className="space-y-6">
                    <ZoneTreeTagsTable zoneId={zoneId} onTagsChanged={onTagMutated} />
                </div>
            )}
            {/* ===================== TAB: PLOT MANAGEMENT ===================== */}
            {activeTab === "plot" && (
                <>
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">กำหนดจำนวนต้นไม้ในแปลง (ระบบ)</h2>
                                <p className="text-xs text-slate-500 mt-1">บันทึกลงตาราง planting_plot_trees (มีผลกับสรุประบบ/Inventory Flow)</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={addPlantCountRow}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    เพิ่มแถว
                                </button>
                                <button
                                    type="button"
                                    onClick={savePlantCounts}
                                    disabled={savingPlantCounts || plantCountDrafts.length === 0}
                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                    {savingPlantCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    บันทึก
                                </button>
                            </div>
                        </div>

                        {plantCountsMsg && <div className="text-xs text-slate-600 mb-3">{plantCountsMsg}</div>}

                        <div className="overflow-x-auto border rounded-xl border-slate-100">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                        <th className="px-3 py-2 text-left font-medium">ขนาด</th>
                                        <th className="px-3 py-2 text-right font-medium">จำนวนปลูก</th>
                                        <th className="px-3 py-2 text-left font-medium">สถานะ</th>
                                        <th className="px-3 py-2 text-right font-medium">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plantCountDrafts.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                                                ยังไม่มีข้อมูล planting_plot_trees — กด "เพิ่มแถว" เพื่อเริ่มต้น
                                            </td>
                                        </tr>
                                    )}
                                    {plantCountDrafts.map((d) => {
                                        const rowStatus = d._error ? (
                                            <span className="text-xs text-rose-600">{d._error}</span>
                                        ) : d._dirty ? (
                                            <span className="text-xs text-amber-600">มีการแก้ไข</span>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        );

                                        return (
                                            <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={d.species_id}
                                                        onChange={(e) => updatePlantCountRow(d.id, { species_id: e.target.value })}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                                                    >
                                                        <option value="">เลือกชนิด...</option>
                                                        {speciesOptions.map((s) => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.name_th || s.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={d.size_label}
                                                        onChange={(e) => updatePlantCountRow(d.id, { size_label: e.target.value })}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                                                    >
                                                        <option value="">เลือกขนาด...</option>
                                                        {trunkSizeOptions.map((opt) => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={d.planted_count}
                                                        onChange={(e) =>
                                                            updatePlantCountRow(d.id, {
                                                                planted_count: e.target.value === "" ? "" : Number(e.target.value),
                                                            })
                                                        }
                                                        className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">{rowStatus}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePlantCountRow(d.id)}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 border border-rose-100 hover:bg-rose-100"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        ลบ
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <div className="mb-6">
                        <ZoneInspectionTabNew
                            zoneId={zoneId}
                            zone={zone}
                            inventoryItems={inventoryItems}
                            onReload={async () => {
                                await Promise.all([reloadInspections(), reloadSummary(), reloadStockDiff()]);
                                onTagMutated?.();
                            }}
                            mode="summary"
                        />
                    </div>

                    <ZoneLegacySurveyAndLogs
                        zoneId={zoneId}
                        speciesOptions={speciesOptions}
                        sizeMoveRows={sizeMoveRows}
                        sizeMoveLoading={sizeMoveLoading}
                        sizeMoveError={sizeMoveError}
                        reloadSizeMoves={reloadSizeMoves}
                        inspectionRows={inspectionRows}
                        inspectionsLoading={inspectionsLoading}
                        inspectionsError={inspectionsError}
                        reloadInspections={reloadInspections}
                        summaryRows={summaryRows}
                        summaryLoading={summaryLoading}
                        reloadSummary={reloadSummary}
                        reloadStockDiff={reloadStockDiff}
                        inventoryItems={inventoryItems}
                    />
                </>
            )}

            {/* ===================== TAB: OPERATIONS ===================== */}
            {activeTab === "operations" && (
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">ประวัติคำสั่งขุดล้อมในแปลงนี้</h2>
                            <p className="text-xs text-slate-500 mt-1">
                                ใช้ติดตามคำสั่งขุดล้อมแต่ละชุด แก้ไขสถานะจาก แผน → กำลังขุด → ขุดแล้ว หรือยกเลิกได้
                            </p>
                        </div>
                    </div>

                    {digupOrdersLoading && <p className="text-sm text-slate-500">กำลังโหลดประวัติคำสั่งขุดล้อม...</p>}
                    {digupOrdersError && <p className="text-sm text-rose-500">โหลดประวัติคำสั่งขุดล้อมไม่สำเร็จ: {digupOrdersError}</p>}
                    {!digupOrdersLoading && !digupOrdersError && digupOrders.length === 0 && (
                        <p className="text-sm text-slate-400">ยังไม่มีการบันทึกคำสั่งขุดล้อมในแปลงนี้</p>
                    )}

                    {!digupOrdersLoading && digupOrders.length > 0 && (
                        <div className="overflow-x-auto mt-2">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">วันที่ขุด</th>
                                        <th className="px-3 py-2 text-left font-medium">ชนิด/พันธุ์ต้นไม้</th>
                                        <th className="px-3 py-2 text-left font-medium">ขนาด</th>
                                        <th className="px-3 py-2 text-right font-medium">จำนวน</th>
                                        <th className="px-3 py-2 text-left font-medium">สถานะ</th>
                                        <th className="px-3 py-2 text-left font-medium">หมายเหตุ</th>
                                        <th className="px-3 py-2 text-right font-medium">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {digupOrders.map((o) => (
                                        <tr
                                            key={o.id}
                                            ref={(el) => { rowRefs.current[o.id] = el; }}
                                            className={`border - b border - slate - 50 transition - colors relative ${focusDigupOrderId === o.id
                                                ? "bg-amber-50 ring-1 ring-amber-200 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-amber-400"
                                                : "hover:bg-slate-50"
                                                } `}
                                        >
                                            <td className="px-3 py-2 text-slate-700">{o.digup_date ? new Date(o.digup_date).toLocaleDateString("th-TH") : "-"}</td>
                                            <td className="px-3 py-2 text-slate-800 font-medium">{o.species_name_th || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{o.size_label ? `${o.size_label} นิ้ว` : "-"}</td>
                                            <td className="px-3 py-2 text-right text-slate-800">{o.qty.toLocaleString("th-TH")}</td>
                                            <td className="px-3 py-2">
                                                <span className={"inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium " + (statusBadgeClass[o.status] || "")}>
                                                    {statusLabel[o.status] || o.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-500">{o.notes || "-"}</td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="inline-flex gap-1">
                                                    {o.status === "planned" && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    await updateDigupStatus(o.id, "in_progress");
                                                                } catch {
                                                                    alert("อัปเดตสถานะไม่สำเร็จ");
                                                                }
                                                            }}
                                                            className="px-2 py-1 rounded-lg text-xs bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                        >
                                                            เริ่มขุด
                                                        </button>
                                                    )}

                                                    {o.status !== "done" && o.status !== "cancelled" && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    await updateDigupStatus(o.id, "done");
                                                                } catch {
                                                                    alert("อัปเดตสถานะไม่สำเร็จ");
                                                                }
                                                            }}
                                                            className="px-2 py-1 rounded-lg text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                        >
                                                            เสร็จแล้ว
                                                        </button>
                                                    )}

                                                    {o.status !== "cancelled" && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!window.confirm("ยกเลิกคำสั่งขุดล้อมนี้หรือไม่?")) return;
                                                                try {
                                                                    await updateDigupStatus(o.id, "cancelled");
                                                                } catch {
                                                                    alert("อัปเดตสถานะไม่สำเร็จ");
                                                                }
                                                            }}
                                                            className="px-2 py-1 rounded-lg text-xs bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                        >
                                                            ยกเลิก
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* ===================== TAB: DIG PLAN ===================== */}
            {activeTab === "dig_plan" && <ZoneDigPlanTab zoneId={zoneId} onJumpToOrder={handleJumpToDigupOrder} />}

            {/* ===================== TAB: OPERATIONS ===================== */}

            {/* ===================== TAB: AUDIT ===================== */}

            {activeTab === "audit" && (
                <section className="mb-6">
                    <ZoneInspectionTabNew
                        zoneId={zoneId}
                        zone={zone}
                        inventoryItems={inventoryItems}
                        onReload={async () => {
                            await Promise.all([reloadInspections(), reloadSummary(), reloadStockDiff()]);
                            onTagMutated?.();
                        }}
                        mode="audit"
                    />
                </section>
            )}

            {/* ===================== TAB: MOVEMENTS ===================== */}
            {activeTab === "movements" && <ZoneMovementsTab zoneId={zoneId} />}

            {/* ===================== TAB: FILES ===================== */}
            {activeTab === "files" && <ZoneFilesNotesTab />}



            {/* ===================== MODALS / DIALOGS (GLOBAL) ===================== */}





            {/* Plot Digup Form */}
            {showPlotDigupForm && selectedPlotTreeId && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-md">
                        <h2 className="text-base font-semibold mb-3">สร้างคำสั่งขุดล้อม (จากแปลง)</h2>
                        <CreateDigupBatchForm
                            plantingPlotTreeId={selectedPlotTreeId}
                            onSuccess={() => {
                                setShowPlotDigupForm(false);
                                setSelectedPlotTreeId(null);
                                reloadInventory?.();
                                refetchRows?.();
                            }}
                            onCancel={() => {
                                setShowPlotDigupForm(false);
                                setSelectedPlotTreeId(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Digup Planning Modal */}
            {showDigupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5">
                        <h2 className="text-lg font-semibold mb-1">วางแผนคำสั่งขุดล้อมใหม่</h2>
                        <p className="text-xs text-slate-500 mb-4">
                            ฟอร์มนี้ใช้สำหรับสร้างแผนขุดล้อมชุดใหม่ ระบบจะบันทึกเป็นคำสั่งใหม่ทุกครั้งที่กดบันทึก
                        </p>
                        <DigupOrderForm zoneId={zoneId} onSaved={handleDigupSaved} onCancel={() => setShowDigupModal(false)} />
                    </div>
                </div>
            )
            }

            {/* Species Dialog */}
            <SpeciesFormDialog
                open={showSpeciesDialog}
                onClose={() => setShowSpeciesDialog(false)}
                onSuccess={async (newId) => {
                    await loadSpecies();

                    setShowSpeciesDialog(false);
                }}
            />
        </div>
    );
};

export default ZoneDetailPage;
