import React, { useMemo } from "react";
import {
    ArrowLeft,
    Loader2,
    MapPin,
    Plus,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Edit3,
    Trash2,
    ArrowRightLeft,
    History,
    Sprout,
} from "lucide-react";
import { supabase } from "../supabaseClient";

import { usePlantingPlotDetail } from "../hooks/usePlantingPlotDetail";
import { useZoneTreeInventoryFlow, ZoneTreeInventoryRow } from "../hooks/useZoneTreeInventoryFlow";
import { useZoneDigupOrders } from "../hooks/useZoneDigupOrders";
import ZoneDigupOrderModal from "./zones/ZoneDigupOrderModal";
import CreateDigupBatchForm from "./digup/CreateDigupBatchForm";
import { DigupOrderForm } from "./zones/DigupOrderForm";
import { useZoneTreeInspections, ZoneTreeInspectionRow } from "../hooks/useZoneTreeInspections";
import { useZoneTreeInspectionSummary } from "../hooks/useZoneTreeInspectionSummary";
import { useZoneTreeStockVsInspection } from "../hooks/useZoneTreeStockVsInspection";
import { ZoneTreeInspectionForm } from "./zones/ZoneTreeInspectionForm";
import { useZoneMismatchOverview } from "../hooks/useZoneMismatchOverview";
import { ZoneMismatchDetailTable } from "./zones/ZoneMismatchDetailTable";
import { ZoneInspectionHistory } from "./zones/ZoneInspectionHistory";
import { ZoneTreeTagsTable } from "./zones/ZoneTreeTagsTable";
import { usePlotInventory, PlotInventoryRow } from "../hooks/usePlotInventory";
import { normalizeHeightLabel, formatHeightLabel } from "../utils/heightLabel";
import { CreateTagDialog } from "./zones/CreateTagDialog";
import { trunkSizeOptions } from "../constants/treeOptions";
import { SpeciesFormDialog } from "./stock/SpeciesFormDialog";
import { ZoneReadyStockFromPlotSection } from "./zones/ZoneReadyStockFromPlotSection";
import { useStockZoneLifecycle, StockZoneLifecycleRow } from "../hooks/useStockZoneLifecycle";
import TagLifecycleSummaryCard from "./tags/TagLifecycleSummaryCard";
import { useTagLifecycleTotals } from "../hooks/useTagLifecycleTotals";
import { useZoneInventorySummary } from "../hooks/useZoneInventorySummary";
import { usePlotSizeTransitionHistory } from "../hooks/usePlotSizeTransitionHistory";
import { ZoneLocationSection } from "./zones/ZoneLocationSection";
import ZoneOverviewTab from "./zones/tabs/ZoneOverviewTab";
import ZoneTagsTab from "./zones/tabs/ZoneTagsTab";
import ZonePlotManagementTab from "./zones/tabs/ZonePlotManagementTab";

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

type TabId = "overview" | "tags" | "plot" | "operations" | "audit";

const ZoneDetailPage = ({ zoneId, onBack }: { zoneId: string; onBack: () => void }) => {
    // --- State & Hooks ---
    const [zone, setZone] = React.useState<any>(null);
    const [loadingZone, setLoadingZone] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [zoneOverview, setZoneOverview] = React.useState<any | null>(null);
    const [loadingOverview, setLoadingOverview] = React.useState(false);

    // ✅ Tabs State (Fix)
    const [activeTab, setActiveTab] = React.useState<TabId>("overview");
    const [isMapOpen, setIsMapOpen] = React.useState(false);
    const handleTabChange = (tab: TabId) => setActiveTab(tab);

    // Plot Type State
    const [selectedPlotTypeId, setSelectedPlotTypeId] = React.useState<string | "">("");
    const [savingPlotType, setSavingPlotType] = React.useState(false);
    const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
    const [plotTypes, setPlotTypes] = React.useState<any[]>([]);
    const [plotTypesLoading, setPlotTypesLoading] = React.useState(false);
    const [plotTypesError, setPlotTypesError] = React.useState<string | null>(null);

    // Hooks (use only what we need to avoid unused var errors)
    const { refetch: refetchRows } = usePlantingPlotDetail(zoneId);

    const {
        rows: inventoryRows,
        loading: inventoryLoading,
        error: inventoryError,
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
        rows: stockDiffRows,
        loading: stockDiffLoading,
        error: stockDiffError,
        reload: reloadStockDiff,
    } = useZoneTreeStockVsInspection(zoneId);

    // Mismatch Hook
    const { byZoneId, loading: _mismatchLoading, error: mismatchError } = useZoneMismatchOverview();
    const mismatch = zoneId && byZoneId ? byZoneId[String(zoneId)] ?? null : null;

    // Form States
    const [editingInspection, setEditingInspection] = React.useState<ZoneTreeInspectionRow | null>(null);
    const [digupModalOpen, setDigupModalOpen] = React.useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = React.useState<ZoneTreeInventoryRow | null>(null);
    const [showPlotDigupForm, setShowPlotDigupForm] = React.useState(false);
    const [selectedPlotTreeId, setSelectedPlotTreeId] = React.useState<string | null>(null);
    const [showDigupModal, setShowDigupModal] = React.useState(false);

    // New Plant Form State
    const [speciesOptions, setSpeciesOptions] = React.useState<any[]>([]);
    const [speciesLoading, setSpeciesLoading] = React.useState(false);
    const [speciesError, setSpeciesError] = React.useState<string | null>(null);
    const [newSpeciesId, setNewSpeciesId] = React.useState<string>("");
    const [newSizeLabel, setNewSizeLabel] = React.useState<string>("");
    const [newHeightLabel, setNewHeightLabel] = React.useState<string>("");
    const [newPlantedCount, setNewPlantedCount] = React.useState<string>("");
    const [newPlantedDate, setNewPlantedDate] = React.useState<string>(new Date().toISOString().split("T")[0]);
    const [newNote, setNewNote] = React.useState<string>("");
    const [savingNewPlant, setSavingNewPlant] = React.useState(false);
    const [newPlantMessage, setNewPlantMessage] = React.useState<string | null>(null);
    const [showSpeciesDialog, setShowSpeciesDialog] = React.useState(false);

    // --- Plot Inventory Hook ---
    const {
        rows: inventoryItems,
        loading: plotInventoryLoading,
        error: plotInventoryError,
        reload: reloadPlotInventory,
        addInventoryItem,
        createTagsFromInventory,
        updateInventoryItem,
        deleteInventoryItem,
        applySizeTransition,
    } = usePlotInventory(zoneId);

    // --- Stock Lifecycle (Tag ตามสถานะ) ---
    const {
        rows: lifecycleRows,
        loading: lifecycleLoading,
        error: lifecycleError,
        reload: reloadLifecycle,
    } = useStockZoneLifecycle({ zoneId: zoneId as string });

    // --- Zone Inventory & Inspection Summary (from new view) ---
    const {
        summary: zoneInvSummary,
        loading: zoneInvLoading,
        error: zoneInvError,
        reload: reloadZoneInvSummary,
    } = useZoneInventorySummary(zoneId);

    // --- Tag Lifecycle Totals ---
    const { data: tagLifecycleTotals, loading: tagLifecycleLoading, reload: reloadTagLife } =
        useTagLifecycleTotals({ zoneId });



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

    const [createTagDialogOpen, setCreateTagDialogOpen] = React.useState(false);
    const [selectedInventoryForTag, setSelectedInventoryForTag] = React.useState<PlotInventoryRow | null>(null);

    // Editing Inventory State
    const [editingInventoryId, setEditingInventoryId] = React.useState<string | null>(null);
    const [editFormData, setEditFormData] = React.useState<{
        speciesId: string;
        sizeLabel: string;
        heightLabel: string;
        plantedQty: number;
        plantedDate: string;
        note: string;
    } | null>(null);

    // --- Planting Plot Tree Counts (ระบบ) ---
    type PlantCountDraft = {
        id: string;
        species_id: string;
        size_label: string;
        planted_count: number | "";
        _dirty?: boolean;
        _error?: string | null;
    };

    const makeLocalId = () => `draft_${Math.random().toString(36).slice(2)}_${Date.now()}`;

    const [plantCountDrafts, setPlantCountDrafts] = React.useState<PlantCountDraft[]>([]);
    const [savingPlantCounts, setSavingPlantCounts] = React.useState(false);
    const [plantCountsMsg, setPlantCountsMsg] = React.useState<string | null>(null);

    // --- Size Transition Modal State ---
    const [sizeTransitionOpen, setSizeTransitionOpen] = React.useState(false);
    const [sizeTransitionData, setSizeTransitionData] = React.useState<{
        speciesId: string;
        speciesName: string;
        fromSizeLabel: string;
        maxQty: number;
    } | null>(null);
    const [toSizeLabel, setToSizeLabel] = React.useState("");
    const [transitionQty, setTransitionQty] = React.useState<number | "">("");
    const [transitionDate, setTransitionDate] = React.useState(new Date().toISOString().split("T")[0]);
    const [transitionReason, setTransitionReason] = React.useState<
        "growth" | "sale" | "loss" | "correction" | "transfer"
    >("growth");
    const [transitionNote, setTransitionNote] = React.useState("");
    const [savingTransition, setSavingTransition] = React.useState(false);
    const [transitionMsg, setTransitionMsg] = React.useState<string | null>(null);

    // --- Size Transition History ---
    const { rows: sizeMoveRows, loading: sizeMoveLoading, error: sizeMoveError, reload: reloadSizeMoves } =
        usePlotSizeTransitionHistory(zoneId);

    const [moveFilterReason, setMoveFilterReason] = React.useState<string>("all");
    const [moveFilterSpecies, setMoveFilterSpecies] = React.useState<string>("all");

    const filteredSizeMoves = React.useMemo(() => {
        return (sizeMoveRows || []).filter((r) => {
            if (moveFilterReason !== "all" && r.reason !== moveFilterReason) return false;
            if (moveFilterSpecies !== "all" && r.species_id !== moveFilterSpecies) return false;
            return true;
        });
    }, [sizeMoveRows, moveFilterReason, moveFilterSpecies]);

    const reasonLabelMap: Record<string, string> = {
        growth: "โตขึ้น",
        sale: "ขายออก",
        loss: "สูญหาย/ตาย",
        correction: "แก้ไขข้อมูล",
        transfer: "ย้ายแปลง",
    };

    const reasonBadgeClass: Record<string, string> = {
        growth: "bg-sky-50 text-sky-700 border-sky-100",
        sale: "bg-emerald-50 text-emerald-700 border-emerald-100",
        loss: "bg-rose-50 text-rose-700 border-rose-100",
        correction: "bg-amber-50 text-amber-700 border-amber-100",
        transfer: "bg-indigo-50 text-indigo-700 border-indigo-100",
    };

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
            setPlotTypesLoading(true);
            setPlotTypesError(null);
            const { data, error } = await supabase
                .from("planting_plot_detail_lookup")
                .select("*")
                .eq("is_active", true)
                .order("sort_order");
            if (!cancelled) {
                if (error) setPlotTypesError(error.message);
                else setPlotTypes(data ?? []);
                setPlotTypesLoading(false);
            }
        }

        loadPlotTypes();
        return () => {
            cancelled = true;
        };
    }, []);

    // Load Species
    const loadSpecies = async () => {
        setSpeciesLoading(true);
        setSpeciesError(null);
        const { data, error } = await supabase
            .from("stock_species")
            .select("id, name, name_th, measure_by_height")
            .order("name_th");
        if (error) setSpeciesError(error.message);
        else setSpeciesOptions(data ?? []);
        setSpeciesLoading(false);
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

    const selectedSpecies = speciesOptions.find((s) => s.id === newSpeciesId);
    const isHeightSpecies = selectedSpecies?.measure_by_height === true;

    const canCreatePlanting =
        !!zoneId &&
        !!newSpeciesId &&
        !!newPlantedCount &&
        !!newPlantedDate &&
        (isHeightSpecies ? !!newHeightLabel : !!newSizeLabel);

    const handleCreatePlanting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreatePlanting) return;

        setSavingNewPlant(true);
        setNewPlantMessage(null);

        let finalHeightLabel: string | null = null;

        if (isHeightSpecies) {
            finalHeightLabel = normalizeHeightLabel(newHeightLabel);
            if (!finalHeightLabel) {
                setNewPlantMessage("กรุณาระบุความสูงเป็นตัวเลข (หน่วยเมตร)");
                setSavingNewPlant(false);
                return;
            }
        } else {
            if (!newSizeLabel) {
                setNewPlantMessage("กรุณาระบุขนาด (นิ้ว)");
                setSavingNewPlant(false);
                return;
            }
            if (newHeightLabel) {
                finalHeightLabel = normalizeHeightLabel(newHeightLabel);
            }
        }

        const success = await addInventoryItem(
            zoneId,
            newSpeciesId,
            newSizeLabel,
            finalHeightLabel || "",
            Number(newPlantedCount) || 0,
            newPlantedDate,
            newNote
        );

        if (!success) {
            setNewPlantMessage("บันทึกต้นไม้ในแปลงไม่สำเร็จ");
        } else {
            setNewPlantMessage("บันทึกต้นไม้ในแปลงเรียบร้อยแล้ว ✅");
            setNewSpeciesId("");
            setNewSizeLabel("");
            setNewHeightLabel("");
            setNewPlantedCount("");
            setNewPlantedDate(new Date().toISOString().split("T")[0]);
            setNewNote("");
            reloadPlotInventory();
        }

        setSavingNewPlant(false);
        setTimeout(() => setNewPlantMessage(null), 3000);
    };

    const handleEditInventory = (row: PlotInventoryRow) => {
        setEditingInventoryId(row.id);
        setEditFormData({
            speciesId: row.species_id,
            sizeLabel: row.size_label,
            heightLabel: row.height_label || "",
            plantedQty: row.planted_qty,
            plantedDate: row.planted_date ? row.planted_date.split("T")[0] : "",
            note: row.note || "",
        });
    };

    const handleCancelEditInventory = () => {
        setEditingInventoryId(null);
        setEditFormData(null);
    };

    const handleSaveEditInventory = async () => {
        if (!editingInventoryId || !editFormData) return;

        const editingSpecies = speciesOptions.find((s) => s.id === editFormData.speciesId);
        const isEditingHeightSpecies = editingSpecies?.measure_by_height === true;

        let finalHeightLabel: string | null = null;

        if (isEditingHeightSpecies) {
            finalHeightLabel = normalizeHeightLabel(editFormData.heightLabel);
            if (!finalHeightLabel) {
                alert("กรุณาระบุความสูงเป็นตัวเลข (หน่วยเมตร)");
                return;
            }
        } else {
            if (!editFormData.sizeLabel) {
                alert("กรุณาระบุขนาด (นิ้ว)");
                return;
            }
            if (editFormData.heightLabel) {
                finalHeightLabel = normalizeHeightLabel(editFormData.heightLabel);
            }
        }

        const success = await updateInventoryItem(editingInventoryId, {
            species_id: editFormData.speciesId,
            size_label: editFormData.sizeLabel,
            height_label: finalHeightLabel || null,
            planted_qty: Number(editFormData.plantedQty),
            planted_date: editFormData.plantedDate || null,
            note: editFormData.note || null,
        });

        if (success) {
            setEditingInventoryId(null);
            setEditFormData(null);
            reloadPlotInventory();
        } else {
            alert("บันทึกการแก้ไขไม่สำเร็จ");
        }
    };

    const handleDeleteInventory = async (id: string) => {
        if (!window.confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;
        const success = await deleteInventoryItem(id);
        if (success) reloadPlotInventory();
        else alert("ลบรายการไม่สำเร็จ");
    };

    const handleDeleteInspection = async (row: ZoneTreeInspectionRow) => {
        if (!window.confirm("ต้องการลบรายการสำรวจนี้ใช่หรือไม่?")) return;
        const { error } = await supabase.from("zone_tree_inspections").delete().eq("id", row.id);
        if (error) {
            console.error("delete zone_tree_inspections error", error);
            alert("ลบไม่สำเร็จ: " + error.message);
            return;
        }
        if (editingInspection?.id === row.id) setEditingInspection(null);
        await Promise.all([reloadInspections(), reloadSummary(), reloadStockDiff()]);
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
            const k = `${d.species_id}__${d.size_label}`;
            keyMap.set(k, (keyMap.get(k) || 0) + 1);
        });

        const withDupCheck = normalized.map((d) => {
            const k = `${d.species_id}__${d.size_label}`;
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
    const plannedTotal = mismatch?.system_qty ?? 0;
    const inspectedTotal = mismatch?.inspected_qty ?? 0;
    const diffTotal = mismatch?.diff_qty ?? 0;

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

    // --- Render Tab Content ---
    const renderTab = () => {
        if (activeTab === "overview") {
            return (
                <div className="space-y-6">
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
            );
        }

        if (activeTab === "tags") {
            return (
                <div className="space-y-6">
                    <ZoneTagsTab
                        zoneId={zoneId}
                        zone={zone}
                        tagLifeTotals={tagLifecycleTotals || undefined}
                        plotTotals={plotTotals}
                        inventorySummary={inventorySummary}
                        onReload={onTagMutated}
                    />

                    {/* === Plot Inventory Table + Create Tag === */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">รายการต้นไม้ในแปลง (Plot Inventory)</span>
                            <span className="text-xs text-slate-500">รวมทั้งสิ้น {inventoryItems.length} รายการ</span>
                        </div>

                        <div className="mx-4 mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-900">
                            <div className="font-semibold mb-1">ขั้นตอนการทำงานในแปลงนี้</div>
                            <ol className="list-decimal pl-4 space-y-0.5">
                                <li>กำหนดแผนปลูกในตาราง <span className="font-medium">"รายการต้นไม้ในแปลง (Plot Inventory)"</span></li>
                                <li>สร้าง <span className="font-medium">Tag</span> สำหรับต้นไม้ที่จะขาย/ขุดล้อม จากปุ่ม <span className="font-medium">"+ Tag"</span> ในแต่ละแถว</li>
                                <li>วางแผนคำสั่งขุดล้อมจาก <span className="font-medium">Tag</span> ที่สร้างแล้ว (ระบบจะดึงเฉพาะต้นที่มี Tag)</li>
                            </ol>
                            <p className="mt-2 text-[11px] text-emerald-800">
                                * ผลสำรวจใช้สำหรับตรวจสอบจำนวนจริง เปรียบเทียบกับจำนวน Tag (ไม่ได้ใช้เป็นฐานขุดล้อมโดยตรง)
                            </p>
                        </div>

                        <div className="px-4 py-2 flex flex-wrap gap-2 bg-slate-50 border-b border-slate-100">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-xs">
                                พร้อมขาย: <span className="font-semibold">{readyStockSummary.available.toLocaleString("th-TH")} ต้น</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 text-xs">
                                จองแล้ว: <span className="font-semibold">{readyStockSummary.reserved.toLocaleString("th-TH")} ต้น</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 px-3 py-1 text-xs">
                                อยู่ในใบสั่งขุด: <span className="font-semibold">{readyStockSummary.digOrdered.toLocaleString("th-TH")} ต้น</span>
                            </span>
                        </div>

                        {plotInventoryLoading && (
                            <div className="py-8 text-center text-slate-500">
                                <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                                กำลังโหลดรายการต้นไม้...
                            </div>
                        )}

                        {!plotInventoryLoading && plotInventoryError && <div className="py-8 text-center text-rose-500 text-sm">{plotInventoryError}</div>}

                        {!plotInventoryLoading && !plotInventoryError && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                            <th className="px-3 py-2 text-left font-medium">ขนาด</th>
                                            <th className="px-3 py-2 text-left font-medium">ความสูง</th>
                                            <th className="px-3 py-2 text-right font-medium">จำนวนที่ปลูก</th>
                                            <th className="px-3 py-2 text-right font-medium">สร้าง Tag แล้ว</th>
                                            <th className="px-3 py-2 text-right font-medium">คงเหลือให้สร้าง Tag</th>
                                            <th className="px-3 py-2 text-left font-medium">วันที่ปลูก</th>
                                            <th className="px-3 py-2 text-left font-medium">หมายเหตุ</th>
                                            <th className="px-3 py-2 text-right font-medium">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryItems.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="py-8 text-center text-slate-400 text-sm">
                                                    ยังไม่มีข้อมูลต้นไม้ในแปลงนี้
                                                </td>
                                            </tr>
                                        )}

                                        {inventoryItems.map((row) => {
                                            const isEditing = editingInventoryId === row.id;
                                            const editingSpeciesId = editFormData?.speciesId;
                                            const editingSpecies = speciesOptions.find((s) => s.id === editingSpeciesId);
                                            const isEditingHeightSpecies = editingSpecies?.measure_by_height === true;

                                            return (
                                                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <td className="px-3 py-2 text-slate-800 font-medium">
                                                        {isEditing ? (
                                                            <select
                                                                value={editFormData?.speciesId}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const sp = speciesOptions.find((s) => s.id === val);
                                                                    setEditFormData((prev) => {
                                                                        if (!prev) return null;
                                                                        const next = { ...prev, speciesId: val };
                                                                        if (sp?.measure_by_height) next.sizeLabel = "";
                                                                        else next.heightLabel = "";
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-sm"
                                                            >
                                                                {speciesOptions.map((sp) => (
                                                                    <option key={sp.id} value={sp.id}>
                                                                        {sp.name_th || sp.name}
                                                                        {sp.measure_by_height ? " • วัดตามความสูง" : ""}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            row.species_name_th || "-"
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-slate-600">
                                                        {isEditing ? (
                                                            <select
                                                                value={editFormData?.sizeLabel}
                                                                onChange={(e) => setEditFormData((prev) => (prev ? { ...prev, sizeLabel: e.target.value } : null))}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                                disabled={isEditingHeightSpecies}
                                                            >
                                                                {trunkSizeOptions.map((opt) => (
                                                                    <option key={opt.value} value={opt.value}>
                                                                        {opt.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            `${row.size_label} นิ้ว`
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-slate-600">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editFormData?.heightLabel}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.,]/g, "");
                                                                    setEditFormData((prev) => (prev ? { ...prev, heightLabel: val } : null));
                                                                }}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                                placeholder={isEditingHeightSpecies ? "เช่น 1.5" : "-"}
                                                            />
                                                        ) : (
                                                            formatHeightLabel(row.height_label)
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-right text-slate-600">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={editFormData?.plantedQty}
                                                                onChange={(e) => setEditFormData((prev) => (prev ? { ...prev, plantedQty: Number(e.target.value) } : null))}
                                                                className="w-20 px-2 py-1 rounded border border-slate-300 text-sm text-right"
                                                            />
                                                        ) : (
                                                            row.planted_qty.toLocaleString("th-TH")
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-right text-slate-600">{row.created_tag_qty.toLocaleString("th-TH")}</td>

                                                    <td className="px-3 py-2 text-right text-emerald-600 font-semibold">
                                                        {row.remaining_for_tag.toLocaleString("th-TH")}
                                                    </td>

                                                    <td className="px-3 py-2 text-slate-600">
                                                        {isEditing ? (
                                                            <input
                                                                type="date"
                                                                value={editFormData?.plantedDate}
                                                                onChange={(e) => setEditFormData((prev) => (prev ? { ...prev, plantedDate: e.target.value } : null))}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-sm"
                                                            />
                                                        ) : (
                                                            row.planted_date ? new Date(row.planted_date).toLocaleDateString("th-TH") : "-"
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-xs text-slate-500">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editFormData?.note}
                                                                onChange={(e) => setEditFormData((prev) => (prev ? { ...prev, note: e.target.value } : null))}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                                                            />
                                                        ) : (
                                                            row.note || "-"
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-right">
                                                        {isEditing ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={handleSaveEditInventory} className="text-emerald-600 hover:text-emerald-700 font-medium text-xs">
                                                                    บันทึก
                                                                </button>
                                                                <button onClick={handleCancelEditInventory} className="text-slate-400 hover:text-slate-600 text-xs">
                                                                    ยกเลิก
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedInventoryForTag(row);
                                                                        setCreateTagDialogOpen(true);
                                                                    }}
                                                                    disabled={row.remaining_for_tag <= 0}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title="สร้าง Tag"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                    Tag
                                                                </button>

                                                                <button onClick={() => handleEditInventory(row)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="แก้ไข">
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                </button>

                                                                <button onClick={() => handleDeleteInventory(row.id)} className="p-1 text-slate-400 hover:text-rose-600 transition-colors" title="ลบ">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!plotInventoryLoading && !plotInventoryError && (
                            <ZoneReadyStockFromPlotSection
                                zoneId={zoneId}
                                rows={inventoryItems}
                                onReload={reloadPlotInventory}
                                onReloadLifecycle={reloadLifecycle}
                                createTagsFromInventory={createTagsFromInventory}
                            />
                        )}

                        <div className="border-t border-slate-100 mt-4 pt-4 px-4 pb-2">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">+ เพิ่มต้นไม้ใหม่</h4>
                        </div>

                        <form
                            onSubmit={handleCreatePlanting}
                            className="px-4 pb-6 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] items-end"
                        >
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">ชนิด/พันธุ์ต้นไม้</label>
                                <select
                                    value={newSpeciesId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "__add_new_species__") setShowSpeciesDialog(true);
                                        else {
                                            setNewSpeciesId(val);
                                            const sp = speciesOptions.find((s) => s.id === val);
                                            if (sp?.measure_by_height) setNewSizeLabel("");
                                            else setNewHeightLabel("");
                                        }
                                    }}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    disabled={speciesLoading || savingNewPlant}
                                >
                                    <option value="">เลือกชนิดต้นไม้...</option>
                                    {speciesOptions.map((sp) => (
                                        <option key={sp.id} value={sp.id}>
                                            {sp.name_th || sp.name}
                                            {sp.measure_by_height ? " • วัดตามความสูง" : ""}
                                        </option>
                                    ))}
                                    <option value="__add_new_species__" className="font-semibold text-emerald-600 bg-emerald-50">
                                        + เพิ่มพันธุ์ไม้ใหม่...
                                    </option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">
                                    ขนาด (นิ้ว) {isHeightSpecies ? "" : <span className="text-red-500">*</span>}
                                </label>
                                <select
                                    value={newSizeLabel}
                                    onChange={(e) => setNewSizeLabel(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    disabled={!newSpeciesId || isHeightSpecies}
                                >
                                    <option value="">เลือกขนาด...</option>
                                    {trunkSizeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">
                                    ความสูง {isHeightSpecies ? <span className="text-red-500">*</span> : ""}
                                </label>
                                <input
                                    type="text"
                                    value={newHeightLabel}
                                    onChange={(e) => setNewHeightLabel(e.target.value.replace(/[^0-9.,]/g, ""))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    placeholder={isHeightSpecies ? "เช่น 1.5m" : "เช่น 1.5m (ไม่บังคับ)"}
                                    disabled={!newSpeciesId}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">จำนวนที่ปลูก</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={newPlantedCount}
                                    onChange={(e) => setNewPlantedCount(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="เช่น 2,000"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">วันที่ปลูก</label>
                                <input
                                    type="date"
                                    value={newPlantedDate}
                                    onChange={(e) => setNewPlantedDate(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                    placeholder="หมายเหตุ (ถ้ามี)"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={!canCreatePlanting || savingNewPlant}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {savingNewPlant && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <Plus className="w-4 h-4" />
                                    เพิ่มต้นไม้
                                </button>
                            </div>

                            {speciesError && <div className="md:col-span-6 text-xs text-rose-500">โหลดรายชื่อชนิดต้นไม้ไม่สำเร็จ: {speciesError}</div>}
                            {newPlantMessage && <div className="md:col-span-6 text-xs text-slate-600">{newPlantMessage}</div>}
                        </form>
                    </div>
                </div>
            );
        }

        if (activeTab === "operations") {
            return (
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
                                        <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
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
                                                    {(o.status === "planned" || o.status === "cancelled") && (
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
            );
        }

        if (activeTab === "audit") {
            return (
                <>
                    {/* Growth Log */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <History className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-900">ประวัติการย้ายขนาด (Growth Log)</h3>
                                <span className="text-xs text-slate-500">{filteredSizeMoves.length.toLocaleString("th-TH")} รายการ</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <select value={moveFilterSpecies} onChange={(e) => setMoveFilterSpecies(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
                                    <option value="all">ทุกชนิด</option>
                                    {speciesOptions.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name_th || s.name}
                                        </option>
                                    ))}
                                </select>

                                <select value={moveFilterReason} onChange={(e) => setMoveFilterReason(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
                                    <option value="all">ทุกเหตุผล</option>
                                    <option value="growth">โตขึ้น</option>
                                    <option value="sale">ขายออก</option>
                                    <option value="loss">สูญหาย/ตาย</option>
                                    <option value="correction">แก้ไขข้อมูล</option>
                                    <option value="transfer">ย้ายแปลง</option>
                                </select>

                                <button type="button" onClick={() => reloadSizeMoves?.()} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                                    รีเฟรช
                                </button>
                            </div>
                        </div>

                        {sizeMoveLoading && <div className="text-xs text-slate-500">กำลังโหลดประวัติ...</div>}
                        {!sizeMoveLoading && sizeMoveError && <div className="text-xs text-rose-600">โหลดไม่สำเร็จ: {sizeMoveError}</div>}

                        <div className="overflow-x-auto border rounded-xl border-slate-100">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">วันที่มีผล</th>
                                        <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                        <th className="px-3 py-2 text-left font-medium">ย้าย</th>
                                        <th className="px-3 py-2 text-right font-medium">จำนวน</th>
                                        <th className="px-3 py-2 text-left font-medium">เหตุผล</th>
                                        <th className="px-3 py-2 text-left font-medium">หมายเหตุ</th>
                                        <th className="px-3 py-2 text-left font-medium">บันทึกเมื่อ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!sizeMoveLoading && filteredSizeMoves.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                                                ยังไม่มีประวัติการย้ายขนาด
                                            </td>
                                        </tr>
                                    )}

                                    {filteredSizeMoves.map((r) => (
                                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="px-3 py-2 text-slate-700">{r.effective_date ? new Date(r.effective_date).toLocaleDateString("th-TH") : "-"}</td>
                                            <td className="px-3 py-2 text-slate-800 font-medium">{r.species_name_th || "-"}</td>
                                            <td className="px-3 py-2 text-slate-700">
                                                <span className="font-medium">{r.from_size_label}</span>
                                                <span className="mx-2 text-slate-400">→</span>
                                                <span className="font-medium">{r.to_size_label}</span>
                                                <span className="ml-1 text-slate-500 text-xs">นิ้ว</span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-800 font-semibold">{Number(r.qty || 0).toLocaleString("th-TH")}</td>
                                            <td className="px-3 py-2">
                                                <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " + (reasonBadgeClass[r.reason] || "bg-slate-50 text-slate-700 border-slate-100")}>
                                                    {reasonLabelMap[r.reason] || r.reason}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 text-xs">{r.note || "-"}</td>
                                            <td className="px-3 py-2 text-slate-500 text-xs">{r.created_at ? new Date(r.created_at).toLocaleString("th-TH") : "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Inspection Results */}
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-semibold text-slate-800">ผลสำรวจจำนวนต้นไม้ในแปลง (ตามขนาด)</h3>
                            {inspectionsLoading && <span className="text-xs text-slate-500">กำลังโหลด...</span>}
                        </div>
                        <p className="mb-3 text-xs text-slate-500">
                            ใช้บันทึกผลสำรวจจำนวนต้นไม้จริงในแปลง ณ วันที่ตรวจสอบ เพื่อเปรียบเทียบกับจำนวน Tag และวางแผนการผลิตในระยะยาว{" "}
                            <span className="font-medium text-slate-600">ข้อมูลส่วนนี้ไม่ได้ใช้เป็นฐานในการสร้างคำสั่งขุดล้อมโดยตรง</span>
                        </p>

                        {inspectionsError && <div className="mb-3 text-sm text-rose-600">เกิดข้อผิดพลาดในการโหลดผลสำรวจ: {inspectionsError}</div>}

                        <div className="mb-6">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">สรุปภาพรวม</h4>
                            <div className="overflow-x-auto border rounded-lg border-slate-100">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                            <th className="px-3 py-2 text-center font-medium">ขนาด (นิ้ว)</th>
                                            <th className="px-3 py-2 text-right font-medium">จำนวนที่ประเมินได้ (ต้น)</th>
                                            <th className="px-3 py-2 text-left font-medium">วันที่สำรวจ</th>
                                            <th className="px-3 py-2 text-left font-medium">เกรด</th>
                                            <th className="px-3 py-2 text-left font-medium">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!summaryLoading && summaryRows.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                                                    ไม่มีข้อมูลสรุป
                                                </td>
                                            </tr>
                                        )}
                                        {summaryRows.map((row) => (
                                            <tr key={`${row.species_id}__${row.size_label}`} className="border-t border-slate-50 hover:bg-slate-50">
                                                <td className="px-3 py-2 text-slate-800 font-medium">{row.species_name_th || "-"}</td>
                                                <td className="px-3 py-2 text-center text-slate-600">{row.size_label || "-"}</td>
                                                <td className="px-3 py-2 text-right text-slate-800 font-semibold">{row.total_estimated_qty?.toLocaleString() ?? "-"}</td>
                                                <td className="px-3 py-2 text-slate-600">{row.last_inspection_date ? new Date(row.last_inspection_date).toLocaleDateString("th-TH") : "-"}</td>
                                                <td className="px-3 py-2 text-slate-600">{row.grades || "-"}</td>
                                                <td className="px-3 py-2 text-slate-600">-</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">รายการบันทึกละเอียด</h4>
                            <div className="overflow-x-auto border rounded-lg border-slate-100">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-3 py-2 text-left text-xs font-semibold">ชนิดต้นไม้</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold">ขนาด</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">เกรด</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold">จำนวน (ต้น)</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">วันที่สำรวจ</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">หมายเหตุ</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!inspectionsLoading && inspectionRows.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                                                    ยังไม่มีข้อมูลสำรวจ
                                                </td>
                                            </tr>
                                        )}
                                        {inspectionRows.map((row) => (
                                            <tr key={row.id} className="border-t">
                                                <td className="px-3 py-1 text-sm">{row.species_name_th ?? "-"}</td>
                                                <td className="px-3 py-1 text-center text-sm">{row.size_label ?? "-"}</td>
                                                <td className="px-3 py-1 text-sm">{row.grade ?? "-"}</td>
                                                <td className="px-3 py-1 text-right text-sm">{row.estimated_qty?.toLocaleString() ?? "-"}</td>
                                                <td className="px-3 py-1 text-sm">{row.inspection_date ?? "-"}</td>
                                                <td className="px-3 py-1 text-sm">{row.notes ?? "-"}</td>
                                                <td className="px-3 py-1 text-right text-xs">
                                                    <button type="button" onClick={() => setEditingInspection(row)} className="text-blue-600 hover:underline mr-2">
                                                        แก้ไข
                                                    </button>
                                                    <button type="button" onClick={() => handleDeleteInspection(row)} className="text-red-600 hover:underline">
                                                        ลบ
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Add Inspection Form */}
                        {/* TODO: Inspection Form - temporarily commented out due to missing state
                        <div className="mt-6 border-t pt-4">
                            ... inspection form temporarily disabled ...
                        </div>
                        */}
                        {/* Optional: history component ถ้าต้องการ */}
                        <ZoneInspectionHistory zoneId={zoneId} />
                    </section>
                </>
            );
        }

        return null;
    };
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
                            ? `ตรวจเมื่อ ${formatDate(zoneInvSummary.latest_inspection_date)}`
                            : mismatch?.last_inspection_date
                                ? `ตรวจเมื่อ ${formatDate(mismatch.last_inspection_date)}`
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
                    { id: "tags" as const, label: "Tags (ขายจากแปลง)", icon: "🏷️" },
                    { id: "plot" as const, label: "จัดการต้นไม้ในแปลง", icon: "🌱" },
                    { id: "operations" as const, label: "ขุดล้อม", icon: "🚜" },
                    { id: "audit" as const, label: "ตรวจแปลง", icon: "📋" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={[
                            "flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
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
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* 1. KPI Cards / Lifecycle Summary -- COMMENTED: redundant with SECTION 1 above
                    <TagLifecycleSummaryCard
                        data={tagLifecycleTotals ? { ...tagLifecycleTotals, zone_id: zoneId } : null}
                        loading={tagLifecycleLoading}
                        zoneId={zoneId}
                        isDarkMode={false}
                        className="bg-white"
                    />
                    */}

                    {/* 2. Layout Grid */}
                    <div className="grid gap-6 lg:grid-cols-2 items-start">
                        {/* LEFT COLUMN: Zone Details & Plot Type */}
                        <div className="space-y-6">
                            {/* ข้อมูลแปลง + note ล่าสุด */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">ข้อมูลแปลง</h3>
                                <div className="grid gap-3 grid-cols-2 text-sm text-slate-600">
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-slate-500">สถานที่:</span> {zone.farm_name || "-"}
                                        </div>
                                        <div>
                                            <span className="text-slate-500">ขนาดแปลง:</span>{" "}
                                            {zone.area_width_m && zone.area_length_m ? `${zone.area_width_m} × ${zone.area_length_m} ม.` : "-"}
                                        </div>
                                        <div>
                                            <span className="text-slate-500">จำนวนแถวปลูก:</span> {zone.planting_rows != null ? `${zone.planting_rows} แถว` : "-"}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-slate-500">ระบบน้ำ:</span> ปั๊ม {zone.pump_size_hp != null ? `${zone.pump_size_hp} แรงม้า` : "-"}
                                        </div>
                                        <div>
                                            <span className="text-slate-500">แหล่งน้ำ:</span> {zone.water_source || "-"}
                                        </div>
                                        <div>
                                            <span className="text-slate-500">ตรวจล่าสุด:</span>{" "}
                                            {zone.inspection_date ? new Date(zone.inspection_date).toLocaleDateString("th-TH") : "ยังไม่เคยบันทึก"}
                                        </div>
                                    </div>
                                </div>

                                {zone.inspection_notes && (
                                    <div className="mt-4 text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                                        <div className="font-medium mb-1 text-slate-600 text-xs uppercase tracking-wider">บันทึกงานแปลงล่าสุด</div>
                                        <div className="italic">{zone.inspection_notes}</div>
                                    </div>
                                )}
                            </div>

                            {/* ตั้งค่าประเภทแปลง */}
                            <section className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                <h2 className="text-sm font-semibold text-slate-800 mb-3">ตั้งค่าประเภทแปลง</h2>

                                {plotTypesError && <div className="text-xs text-red-500 mb-2">โหลดรายการประเภทแปลงไม่สำเร็จ: {plotTypesError}</div>}

                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <select
                                            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                            value={selectedPlotTypeId ?? ""}
                                            onChange={(e) => setSelectedPlotTypeId(e.target.value)}
                                            disabled={plotTypesLoading || savingPlotType}
                                        >
                                            <option value="">- ยังไม่กำหนดประเภทแปลง -</option>
                                            {plotTypes.map((pt) => (
                                                <option key={pt.id} value={pt.id}>
                                                    {pt.name_th} ({pt.code})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleSavePlotType}
                                            disabled={savingPlotType}
                                            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            {savingPlotType && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                                            บันทึก
                                        </button>
                                    </div>
                                    {saveMessage && <p className="text-xs text-emerald-600">{saveMessage}</p>}
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Location */}
                        <div>
                            <ZoneLocationSection
                                zone={zone}
                                onSaved={() => {
                                    supabase
                                        .from("stock_zones")
                                        .select("*")
                                        .eq("id", zone.id)
                                        .single()
                                        .then(({ data }) => {
                                            if (data) setZone(data);
                                        });
                                }}
                            />
                        </div>
                    </div>

                    {mismatchError && (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                            ไม่สามารถโหลดข้อมูลความคลาดเคลื่อนได้: {mismatchError}
                        </div>
                    )}

                    {/* Mismatch Detail */}
                    <div className="space-y-6">
                        <ZoneMismatchDetailTable zoneId={zoneId} speciesOptions={speciesOptions} />
                    </div>
                </div>
            )}

            {/* ===================== TAB: TAGS ===================== */}
            {activeTab === "tags" && (
                <div className="space-y-6">
                    <ZoneTreeTagsTable zoneId={zoneId} onTagsChanged={onTagMutated} />

                    {/* === Plot Inventory Table + Create Tag === */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">รายการต้นไม้ในแปลง (Plot Inventory)</span>
                            <span className="text-xs text-slate-500">รวมทั้งสิ้น {inventoryItems.length} รายการ</span>
                        </div>

                        <div className="mx-4 mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-900">
                            <div className="font-semibold mb-1">ขั้นตอนการทำงานในแปลงนี้</div>
                            <ol className="list-decimal pl-4 space-y-0.5">
                                <li>กำหนดแผนปลูกในตาราง <span className="font-medium">"รายการต้นไม้ในแปลง (Plot Inventory)"</span></li>
                                <li>สร้าง <span className="font-medium">Tag</span> สำหรับต้นไม้ที่จะขาย/ขุดล้อม จากปุ่ม <span className="font-medium">"+ Tag"</span> ในแต่ละแถว</li>
                                <li>วางแผนคำสั่งขุดล้อมจาก <span className="font-medium">Tag</span> ที่สร้างแล้ว (ระบบจะดึงเฉพาะต้นที่มี Tag)</li>
                            </ol>
                            <p className="mt-2 text-[11px] text-emerald-800">
                                * ผลสำรวจใช้สำหรับตรวจสอบจำนวนจริง เปรียบเทียบกับจำนวน Tag (ไม่ได้ใช้เป็นฐานขุดล้อมโดยตรง)
                            </p>
                        </div>

                        <div className="px-4 py-2 flex flex-wrap gap-2 bg-slate-50 border-b border-slate-100">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-xs">
                                พร้อมขาย: <span className="font-semibold">{readyStockSummary.available.toLocaleString("th-TH")} ต้น</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 text-xs">
                                จองแล้ว: <span className="font-semibold">{readyStockSummary.reserved.toLocaleString("th-TH")} ต้น</span>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 px-3 py-1 text-xs">
                                อยู่ในใบสั่งขุด: <span className="font-semibold">{readyStockSummary.digOrdered.toLocaleString("th-TH")} ต้น</span>
                            </span>
                        </div>

                        {plotInventoryLoading && (
                            <div className="py-8 text-center text-slate-500">
                                <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                                กำลังโหลดรายการต้นไม้...
                            </div>
                        )}

                        {!plotInventoryLoading && plotInventoryError && <div className="py-8 text-center text-rose-500 text-sm">{plotInventoryError}</div>}

                        {!plotInventoryLoading && !plotInventoryError && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                            <th className="px-3 py-2 text-left font-medium">ขนาด</th>
                                            <th className="px-3 py-2 text-left font-medium">ความสูง</th>
                                            <th className="px-3 py-2 text-right font-medium">จำนวนที่ปลูก</th>
                                            <th className="px-3 py-2 text-right font-medium">สร้าง Tag แล้ว</th>
                                            <th className="px-3 py-2 text-right font-medium">คงเหลือให้สร้าง Tag</th>
                                            <th className="px-3 py-2 text-left font-medium">วันที่ปลูก</th>
                                            <th className="px-3 py-2 text-left font-medium">หมายเหตุ</th>
                                            <th className="px-3 py-2 text-right font-medium">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryItems.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="py-8 text-center text-slate-400 text-sm">
                                                    ยังไม่มีข้อมูลต้นไม้ในแปลงนี้
                                                </td>
                                            </tr>
                                        )}

                                        {inventoryItems.map((row) => {
                                            const isEditing = editingInventoryId === row.id;
                                            const editingSpeciesId = editFormData?.speciesId;
                                            const editingSpecies = speciesOptions.find((s) => s.id === editingSpeciesId);
                                            const isEditingHeightSpecies = editingSpecies?.measure_by_height === true;

                                            return (
                                                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <td className="px-3 py-2 text-slate-800 font-medium">
                                                        {isEditing ? (
                                                            <select
                                                                value={editFormData?.speciesId}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const sp = speciesOptions.find((s) => s.id === val);
                                                                    setEditFormData((prev) => {
                                                                        if (!prev) return null;
                                                                        const next = { ...prev, speciesId: val };
                                                                        if (sp?.measure_by_height) next.sizeLabel = "";
                                                                        else next.heightLabel = "";
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-sm"
                                                            >
                                                                {speciesOptions.map((sp) => (
                                                                    <option key={sp.id} value={sp.id}>
                                                                        {sp.name_th || sp.name}
                                                                        {sp.measure_by_height ? " • วัดตามความสูง" : ""}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            row.species_name_th || "-"
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-slate-600">
                                                        {isEditing ? (
                                                            <select
                                                                value={editFormData?.sizeLabel}
                                                                onChange={(e) => setEditFormData((prev) => (prev ? { ...prev, sizeLabel: e.target.value } : null))}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                                disabled={isEditingHeightSpecies}
                                                            >
                                                                {trunkSizeOptions.map((opt) => (
                                                                    <option key={opt.value} value={opt.value}>
                                                                        {opt.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            `${row.size_label} นิ้ว`
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-slate-600">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editFormData?.heightLabel}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.,]/g, "");
                                                                    setEditFormData((prev) => (prev ? { ...prev, heightLabel: val } : null));
                                                                }}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                                placeholder={isEditingHeightSpecies ? "เช่น 1.5" : "-"}
                                                            />
                                                        ) : (
                                                            formatHeightLabel(row.height_label)
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-right text-slate-600">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={editFormData?.plantedQty}
                                                                onChange={(e) => setEditFormData((prev) => (prev ? { ...prev, plantedQty: Number(e.target.value) } : null))}
                                                                className="w-20 px-2 py-1 rounded border border-slate-300 text-sm text-right"
                                                            />
                                                        ) : (
                                                            row.planted_qty.toLocaleString("th-TH")
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-right text-slate-600">{row.created_tag_qty.toLocaleString("th-TH")}</td>

                                                    <td className="px-3 py-2 text-right text-emerald-600 font-semibold">
                                                        {row.remaining_for_tag.toLocaleString("th-TH")}
                                                    </td>

                                                    <td className="px-3 py-2 text-slate-600">
                                                        {isEditing ? (
                                                            <input
                                                                type="date"
                                                                value={editFormData?.plantedDate}
                                                                onChange={(e) => setEditFormData((prev) => (prev ? { ...prev, plantedDate: e.target.value } : null))}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-sm"
                                                            />
                                                        ) : (
                                                            row.planted_date ? new Date(row.planted_date).toLocaleDateString("th-TH") : "-"
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-xs text-slate-500">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editFormData?.note}
                                                                onChange={(e) => setEditFormData((prev) => (prev ? { ...prev, note: e.target.value } : null))}
                                                                className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                                                            />
                                                        ) : (
                                                            row.note || "-"
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 text-right">
                                                        {isEditing ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={handleSaveEditInventory} className="text-emerald-600 hover:text-emerald-700 font-medium text-xs">
                                                                    บันทึก
                                                                </button>
                                                                <button onClick={handleCancelEditInventory} className="text-slate-400 hover:text-slate-600 text-xs">
                                                                    ยกเลิก
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedInventoryForTag(row);
                                                                        setCreateTagDialogOpen(true);
                                                                    }}
                                                                    disabled={row.remaining_for_tag <= 0}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title="สร้าง Tag"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                    Tag
                                                                </button>

                                                                <button onClick={() => handleEditInventory(row)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="แก้ไข">
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                </button>

                                                                <button onClick={() => handleDeleteInventory(row.id)} className="p-1 text-slate-400 hover:text-rose-600 transition-colors" title="ลบ">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!plotInventoryLoading && !plotInventoryError && (
                            <ZoneReadyStockFromPlotSection
                                zoneId={zoneId}
                                rows={inventoryItems}
                                onReload={reloadPlotInventory}
                                onReloadLifecycle={reloadLifecycle}
                                createTagsFromInventory={createTagsFromInventory}
                            />
                        )}

                        <div className="border-t border-slate-100 mt-4 pt-4 px-4 pb-2">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">+ เพิ่มต้นไม้ใหม่</h4>
                        </div>

                        <form
                            onSubmit={handleCreatePlanting}
                            className="px-4 pb-6 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] items-end"
                        >
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">ชนิด/พันธุ์ต้นไม้</label>
                                <select
                                    value={newSpeciesId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "__add_new_species__") setShowSpeciesDialog(true);
                                        else {
                                            setNewSpeciesId(val);
                                            const sp = speciesOptions.find((s) => s.id === val);
                                            if (sp?.measure_by_height) setNewSizeLabel("");
                                            else setNewHeightLabel("");
                                        }
                                    }}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    disabled={speciesLoading || savingNewPlant}
                                >
                                    <option value="">เลือกชนิดต้นไม้...</option>
                                    {speciesOptions.map((sp) => (
                                        <option key={sp.id} value={sp.id}>
                                            {sp.name_th || sp.name}
                                            {sp.measure_by_height ? " • วัดตามความสูง" : ""}
                                        </option>
                                    ))}
                                    <option value="__add_new_species__" className="font-semibold text-emerald-600 bg-emerald-50">
                                        + เพิ่มพันธุ์ไม้ใหม่...
                                    </option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">
                                    ขนาด (นิ้ว) {isHeightSpecies ? "" : <span className="text-red-500">*</span>}
                                </label>
                                <select
                                    value={newSizeLabel}
                                    onChange={(e) => setNewSizeLabel(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    disabled={!newSpeciesId || isHeightSpecies}
                                >
                                    <option value="">เลือกขนาด...</option>
                                    {trunkSizeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">
                                    ความสูง {isHeightSpecies ? <span className="text-red-500">*</span> : ""}
                                </label>
                                <input
                                    type="text"
                                    value={newHeightLabel}
                                    onChange={(e) => setNewHeightLabel(e.target.value.replace(/[^0-9.,]/g, ""))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    placeholder={isHeightSpecies ? "เช่น 1.5m" : "เช่น 1.5m (ไม่บังคับ)"}
                                    disabled={!newSpeciesId}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">จำนวนที่ปลูก</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={newPlantedCount}
                                    onChange={(e) => setNewPlantedCount(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="เช่น 2,000"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">วันที่ปลูก</label>
                                <input
                                    type="date"
                                    value={newPlantedDate}
                                    onChange={(e) => setNewPlantedDate(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                    placeholder="หมายเหตุ (ถ้ามี)"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={!canCreatePlanting || savingNewPlant}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {savingNewPlant && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <Plus className="w-4 h-4" />
                                    เพิ่มต้นไม้
                                </button>
                            </div>

                            {speciesError && <div className="md:col-span-6 text-xs text-rose-500">โหลดรายชื่อชนิดต้นไม้ไม่สำเร็จ: {speciesError}</div>}
                            {newPlantMessage && <div className="md:col-span-6 text-xs text-slate-600">{newPlantMessage}</div>}
                        </form>
                    </div>
                </div>
            )}
            {/* ===================== TAB: PLOT MANAGEMENT ===================== */}
            {activeTab === "plot" && (
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
                                    const sp = speciesOptions.find((x) => x.id === d.species_id);
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
                                        <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
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
                                                    {(o.status === "planned" || o.status === "cancelled") && (
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

            {/* ===================== TAB: AUDIT ===================== */}

            {activeTab === "audit" && (
                <>
                    {/* Growth Log */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <History className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-900">ประวัติการย้ายขนาด (Growth Log)</h3>
                                <span className="text-xs text-slate-500">{filteredSizeMoves.length.toLocaleString("th-TH")} รายการ</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <select value={moveFilterSpecies} onChange={(e) => setMoveFilterSpecies(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
                                    <option value="all">ทุกชนิด</option>
                                    {speciesOptions.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name_th || s.name}
                                        </option>
                                    ))}
                                </select>

                                <select value={moveFilterReason} onChange={(e) => setMoveFilterReason(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
                                    <option value="all">ทุกเหตุผล</option>
                                    <option value="growth">โตขึ้น</option>
                                    <option value="sale">ขายออก</option>
                                    <option value="loss">สูญหาย/ตาย</option>
                                    <option value="correction">แก้ไขข้อมูล</option>
                                    <option value="transfer">ย้ายแปลง</option>
                                </select>

                                <button type="button" onClick={() => reloadSizeMoves?.()} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                                    รีเฟรช
                                </button>
                            </div>
                        </div>

                        {sizeMoveLoading && <div className="text-xs text-slate-500">กำลังโหลดประวัติ...</div>}
                        {!sizeMoveLoading && sizeMoveError && <div className="text-xs text-rose-600">โหลดไม่สำเร็จ: {sizeMoveError}</div>}

                        <div className="overflow-x-auto border rounded-xl border-slate-100">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">วันที่มีผล</th>
                                        <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                        <th className="px-3 py-2 text-left font-medium">ย้าย</th>
                                        <th className="px-3 py-2 text-right font-medium">จำนวน</th>
                                        <th className="px-3 py-2 text-left font-medium">เหตุผล</th>
                                        <th className="px-3 py-2 text-left font-medium">หมายเหตุ</th>
                                        <th className="px-3 py-2 text-left font-medium">บันทึกเมื่อ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!sizeMoveLoading && filteredSizeMoves.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                                                ยังไม่มีประวัติการย้ายขนาด
                                            </td>
                                        </tr>
                                    )}

                                    {filteredSizeMoves.map((r) => (
                                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="px-3 py-2 text-slate-700">{r.effective_date ? new Date(r.effective_date).toLocaleDateString("th-TH") : "-"}</td>
                                            <td className="px-3 py-2 text-slate-800 font-medium">{r.species_name_th || "-"}</td>
                                            <td className="px-3 py-2 text-slate-700">
                                                <span className="font-medium">{r.from_size_label}</span>
                                                <span className="mx-2 text-slate-400">→</span>
                                                <span className="font-medium">{r.to_size_label}</span>
                                                <span className="ml-1 text-slate-500 text-xs">นิ้ว</span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-800 font-semibold">{Number(r.qty || 0).toLocaleString("th-TH")}</td>
                                            <td className="px-3 py-2">
                                                <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " + (reasonBadgeClass[r.reason] || "bg-slate-50 text-slate-700 border-slate-100")}>
                                                    {reasonLabelMap[r.reason] || r.reason}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 text-xs">{r.note || "-"}</td>
                                            <td className="px-3 py-2 text-slate-500 text-xs">{r.created_at ? new Date(r.created_at).toLocaleString("th-TH") : "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Inspection Results */}
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-semibold text-slate-800">ผลสำรวจจำนวนต้นไม้ในแปลง (ตามขนาด)</h3>
                            {inspectionsLoading && <span className="text-xs text-slate-500">กำลังโหลด...</span>}
                        </div>
                        <p className="mb-3 text-xs text-slate-500">
                            ใช้บันทึกผลสำรวจจำนวนต้นไม้จริงในแปลง ณ วันที่ตรวจสอบ เพื่อเปรียบเทียบกับจำนวน Tag และวางแผนการผลิตในระยะยาว{" "}
                            <span className="font-medium text-slate-600">ข้อมูลส่วนนี้ไม่ได้ใช้เป็นฐานในการสร้างคำสั่งขุดล้อมโดยตรง</span>
                        </p>

                        {inspectionsError && <div className="mb-3 text-sm text-rose-600">เกิดข้อผิดพลาดในการโหลดผลสำรวจ: {inspectionsError}</div>}

                        <div className="mb-6">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">สรุปภาพรวม</h4>
                            <div className="overflow-x-auto border rounded-lg border-slate-100">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                            <th className="px-3 py-2 text-center font-medium">ขนาด (นิ้ว)</th>
                                            <th className="px-3 py-2 text-right font-medium">จำนวนที่ประเมินได้ (ต้น)</th>
                                            <th className="px-3 py-2 text-left font-medium">วันที่สำรวจ</th>
                                            <th className="px-3 py-2 text-left font-medium">เกรด</th>
                                            <th className="px-3 py-2 text-left font-medium">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!summaryLoading && summaryRows.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                                                    ไม่มีข้อมูลสรุป
                                                </td>
                                            </tr>
                                        )}
                                        {summaryRows.map((row) => (
                                            <tr key={`${row.species_id}__${row.size_label}`} className="border-t border-slate-50 hover:bg-slate-50">
                                                <td className="px-3 py-2 text-slate-800 font-medium">{row.species_name_th || "-"}</td>
                                                <td className="px-3 py-2 text-center text-slate-600">{row.size_label || "-"}</td>
                                                <td className="px-3 py-2 text-right text-slate-800 font-semibold">{row.total_estimated_qty?.toLocaleString() ?? "-"}</td>
                                                <td className="px-3 py-2 text-slate-600">{row.last_inspection_date ? new Date(row.last_inspection_date).toLocaleDateString("th-TH") : "-"}</td>
                                                <td className="px-3 py-2 text-slate-600">{row.grades || "-"}</td>
                                                <td className="px-3 py-2 text-slate-600">-</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">รายการบันทึกละเอียด</h4>
                            <div className="overflow-x-auto border rounded-lg border-slate-100">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-3 py-2 text-left text-xs font-semibold">ชนิดต้นไม้</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold">ขนาด</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">เกรด</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold">จำนวน (ต้น)</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">วันที่สำรวจ</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold">หมายเหตุ</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!inspectionsLoading && inspectionRows.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                                                    ยังไม่มีข้อมูลสำรวจ
                                                </td>
                                            </tr>
                                        )}
                                        {inspectionRows.map((row) => (
                                            <tr key={row.id} className="border-t">
                                                <td className="px-3 py-1 text-sm">{row.species_name_th ?? "-"}</td>
                                                <td className="px-3 py-1 text-center text-sm">{row.size_label ?? "-"}</td>
                                                <td className="px-3 py-1 text-sm">{row.grade ?? "-"}</td>
                                                <td className="px-3 py-1 text-right text-sm">{row.estimated_qty?.toLocaleString() ?? "-"}</td>
                                                <td className="px-3 py-1 text-sm">{row.inspection_date ?? "-"}</td>
                                                <td className="px-3 py-1 text-sm">{row.notes ?? "-"}</td>
                                                <td className="px-3 py-1 text-right text-xs">
                                                    <button type="button" onClick={() => setEditingInspection(row)} className="text-blue-600 hover:underline mr-2">
                                                        แก้ไข
                                                    </button>
                                                    <button type="button" onClick={() => handleDeleteInspection(row)} className="text-red-600 hover:underline">
                                                        ลบ
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ✅ Fix: ส่ง inventoryItems (PlotInventoryRow[]) ให้ถูก Type */}
                        <ZoneTreeInspectionForm
                            zoneId={zoneId}
                            inventoryRows={inventoryItems}
                            editingRow={editingInspection}
                            onCancelEdit={() => setEditingInspection(null)}
                            onSaved={async () => {
                                setEditingInspection(null);
                                await Promise.all([reloadInspections(), reloadSummary(), reloadStockDiff()]);
                            }}
                        />
                    </section>

                    {/* Stock vs Inspection */}
                    <section className="mt-6 mb-6">
                        <h3 className="text-sm font-semibold mb-2 text-slate-700">ความคลาดเคลื่อนระหว่างสต็อกระบบ vs ผลสำรวจ</h3>

                        {stockDiffLoading && <div className="text-xs text-gray-500">กำลังโหลดข้อมูล...</div>}
                        {stockDiffError && <div className="text-xs text-red-600">ไม่สามารถโหลดข้อมูลเปรียบเทียบได้: {stockDiffError}</div>}
                        {!stockDiffLoading && !stockDiffError && stockDiffRows.length === 0 && (
                            <div className="text-xs text-gray-500">ยังไม่มีข้อมูลเปรียบเทียบ (อาจยังไม่มีการปลูกหรือยังไม่เคยบันทึกผลสำรวจ)</div>
                        )}

                        {stockDiffRows.length > 0 && (
                            <div className="overflow-x-auto border rounded-lg border-slate-100">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold">ชนิดต้นไม้</th>
                                            <th className="px-3 py-2 text-center font-semibold">ขนาด (นิ้ว)</th>
                                            <th className="px-3 py-2 text-right font-semibold">ยอดตามระบบ (ต้น)</th>
                                            <th className="px-3 py-2 text-right font-semibold">ยอดจากสำรวจ (ต้น)</th>
                                            <th className="px-3 py-2 text-right font-semibold">ส่วนต่าง</th>
                                            <th className="px-3 py-2 text-left font-semibold">วันที่สำรวจล่าสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockDiffRows.map((r, idx) => {
                                            const sp = speciesOptions.find((s) => s.id === r.species_id);
                                            const speciesName = sp?.name_th || sp?.name || r.species_id;
                                            const sizeLabel = r.size_label || "-";
                                            const systemQty = r.system_qty ?? 0;
                                            const inspectedQty = r.inspected_qty ?? 0;
                                            const diff = r.diff_qty ?? 0;

                                            const diffClass = diff === 0 ? "text-gray-700" : diff > 0 ? "text-emerald-700" : "text-red-600";

                                            return (
                                                <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-slate-800 font-medium">{speciesName}</td>
                                                    <td className="px-3 py-2 text-center text-slate-600">{sizeLabel}</td>
                                                    <td className="px-3 py-2 text-right text-slate-600">{systemQty.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-right text-slate-600">{inspectedQty.toLocaleString()}</td>
                                                    <td className={`px-3 py-2 text-right font-semibold ${diffClass}`}>{diff > 0 ? "+" : ""}{diff.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-slate-600">{r.last_inspection_date ? new Date(r.last_inspection_date).toLocaleDateString("th-TH") : "-"}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Optional: history component ถ้าต้องการ */}
                    <ZoneInspectionHistory zoneId={zoneId} />
                </>
            )}

            {/* ===================== MODALS / DIALOGS (GLOBAL) ===================== */}

            {/* MODAL: ย้ายขนาด/โตขึ้น */}
            {sizeTransitionOpen && sizeTransitionData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">โตขึ้น / ย้ายขนาด</h3>
                            <button type="button" onClick={() => setSizeTransitionOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        <div className="text-sm text-slate-600">
                            <strong>{sizeTransitionData.speciesName}</strong> ขนาด <strong>{sizeTransitionData.fromSizeLabel} นิ้ว</strong>
                            <span className="ml-2 text-slate-500">(คงเหลือ {sizeTransitionData.maxQty.toLocaleString("th-TH")} ต้น)</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">ย้ายไปขนาด</label>
                                <select value={toSizeLabel} onChange={(e) => setToSizeLabel(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                    <option value="">เลือกขนาดใหม่...</option>
                                    {(() => {
                                        const fromIdx = trunkSizeOptions.findIndex((opt) => opt.value === sizeTransitionData.fromSizeLabel);
                                        const toOptions = trunkSizeOptions
                                            .filter((opt) => opt.value !== sizeTransitionData.fromSizeLabel)
                                            .filter((opt) => {
                                                if (transitionReason !== "growth") return true;
                                                const toIdx = trunkSizeOptions.findIndex((x) => x.value === opt.value);
                                                if (fromIdx < 0 || toIdx < 0) return true;
                                                return toIdx > fromIdx;
                                            });
                                        return toOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ));
                                    })()}
                                </select>
                                {transitionReason === "growth" && <p className="mt-1 text-[11px] text-slate-500">เมื่อเลือก "โตขึ้น" จะแสดงเฉพาะขนาดที่ใหญ่ขึ้นเท่านั้น</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">จำนวนที่ย้าย</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={sizeTransitionData.maxQty}
                                    value={transitionQty}
                                    onChange={(e) => setTransitionQty(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    placeholder={`สูงสุด ${sizeTransitionData.maxQty}`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">วันที่มีผล</label>
                                <input type="date" value={transitionDate} onChange={(e) => setTransitionDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">เหตุผล</label>
                                <select value={transitionReason} onChange={(e) => setTransitionReason(e.target.value as any)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                    <option value="growth">โตขึ้น (Growth)</option>
                                    <option value="sale">ขายออก (Sale)</option>
                                    <option value="correction">แก้ไขข้อมูล (Correction)</option>
                                    <option value="transfer">ย้ายแปลง (Transfer)</option>
                                    <option value="loss">สูญหาย/ตาย (Loss)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุ (ถ้ามี)</label>
                                <input type="text" value={transitionNote} onChange={(e) => setTransitionNote(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="เช่น ตรวจพบว่าขนาดใหญ่ขึ้น" />
                            </div>
                        </div>

                        {transitionMsg && <div className={`text-sm ${transitionMsg.includes("สำเร็จ") ? "text-emerald-600" : "text-rose-600"}`}>{transitionMsg}</div>}

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setSizeTransitionOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                                ยกเลิก
                            </button>

                            <button
                                type="button"
                                onClick={async () => {
                                    if (!toSizeLabel) {
                                        setTransitionMsg("กรุณาเลือกขนาดใหม่");
                                        return;
                                    }
                                    if (toSizeLabel === sizeTransitionData.fromSizeLabel) {
                                        setTransitionMsg("ไม่สามารถย้ายไปขนาดเดิมได้");
                                        return;
                                    }
                                    const qty = Number(transitionQty);
                                    if (!qty || qty <= 0) {
                                        setTransitionMsg("กรุณาระบุจำนวนที่ต้องการย้าย");
                                        return;
                                    }
                                    if (qty > sizeTransitionData.maxQty) {
                                        setTransitionMsg(`จำนวนเกินกว่าที่มี (${sizeTransitionData.maxQty})`);
                                        return;
                                    }

                                    setSavingTransition(true);
                                    setTransitionMsg(null);

                                    const result = await applySizeTransition({
                                        plotId: zoneId,
                                        speciesId: sizeTransitionData.speciesId,
                                        fromSizeLabel: sizeTransitionData.fromSizeLabel,
                                        toSizeLabel,
                                        qty,
                                        effectiveDate: transitionDate || undefined,
                                        reason: transitionReason,
                                        note: transitionNote || undefined,
                                    });

                                    setSavingTransition(false);

                                    if (result.success) {
                                        setTransitionMsg("ย้ายขนาดสำเร็จ ✅");
                                        await Promise.all([reloadInventory?.(), reloadZoneInvSummary?.(), reloadPlotInventory?.(), reloadSizeMoves?.()]);
                                        setTimeout(() => setSizeTransitionOpen(false), 1000);
                                    } else {
                                        setTransitionMsg("ย้ายไม่สำเร็จ: " + (result.error || "Unknown error"));
                                    }
                                }}
                                disabled={savingTransition}
                                className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingTransition && <Loader2 className="h-4 w-4 animate-spin" />}
                                ยืนยันย้ายขนาด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Digup Modal (legacy) */}
            {digupModalOpen && selectedInventoryItem && (
                <ZoneDigupOrderModal
                    zoneId={zoneId}
                    speciesId={selectedInventoryItem.species_id}
                    speciesName={selectedInventoryItem.species_name_th || ""}
                    sizeLabel={selectedInventoryItem.size_label}
                    availableToOrder={selectedInventoryItem.available_to_order}
                    onClose={() => setDigupModalOpen(false)}
                    onCreated={handleDigupSaved}
                />
            )}

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

            {/* Create Tag Dialog */}

            {createTagDialogOpen && selectedInventoryForTag && (
                <CreateTagDialog
                    open={createTagDialogOpen}
                    inventoryItem={selectedInventoryForTag}
                    onClose={() => setCreateTagDialogOpen(false)}
                    onSuccess={onTagMutated}
                />
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
                    setNewSpeciesId(newId);
                    setShowSpeciesDialog(false);
                }}
            />
        </div>
    );
};

export default ZoneDetailPage;
