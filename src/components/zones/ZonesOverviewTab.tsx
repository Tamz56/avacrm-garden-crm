import React, { useState, useMemo } from "react";
import {
    Plus,
    Edit3,
    Trash2,
    Sprout,
    X,
    Trees,
    Info,
    Loader2,
    CheckCircle2,
    FlaskConical
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useZonesData } from "../../hooks/useZonesData";
import { useZoneMutations } from "../../hooks/useZoneMutations";
import { useZoneMismatchOverview } from "../../hooks/useZoneMismatchOverview";
import { ZoneMismatchBadge } from "./ZoneMismatchBadge";
import { ZoneTypeSummaryCards } from "./ZoneTypeSummaryCards";
import { ZoneFilterBar } from "./ZoneFilterBar";
import { trunkSizeOptions } from "../../constants/treeOptions";
import ZoneDetailPage from "../ZoneDetailPage";
import { SpeciesFormDialog } from "../stock/SpeciesFormDialog";
import { useStockZoneLifecycle, StockZoneLifecycleRow } from "../../hooks/useStockZoneLifecycle";
import CreateTaskModal from "../tasks/CreateTaskModal";

// default หนึ่งแถวของชนิดต้นไม้ในแปลง
// default หนึ่งแถวของชนิดต้นไม้ในแปลง
const createEmptyTreeItem = () => ({
    id: `tree-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    speciesId: "",
    sizeLabel: "",
    planQty: "",
    plantedDate: "",
    note: "",
});



const getPlotTypeBadgeClass = (code) => {
    switch (code) {
        case "PRODUCTION":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "TEST":
            return "bg-amber-50 text-amber-700 border-amber-200";
        case "NURSERY":
            return "bg-sky-50 text-sky-700 border-sky-200";
        default:
            return "bg-slate-50 text-slate-500 border-slate-200";
    }
};



// Main Component

type Props = {
    initialFilters?: {
        zoneIds?: string[];
        speciesId?: string; // Optional: for display or further filtering
        sizeLabel?: string; // Optional
        initialZoneId?: string; // New: Open detail page automatically
    };
    isDarkMode?: boolean;
};

export const ZonesOverviewTab: React.FC<Props> = ({ initialFilters, isDarkMode = false }) => {
    // Data Hooks
    const { zones, loading: loadingZones, reload: refetch, summary, error: loadError } = useZonesData();
    const { createZone, updateZone, deleteZone, loading: mutating } = useZoneMutations();

    const {
        byZoneId: mismatchByZoneId,
        loading: mismatchLoading,
    } = useZoneMismatchOverview();

    // Stock Lifecycle (for ready stock column)
    const { rows: lifecycleRows } = useStockZoneLifecycle({});

    const lifecycleByZone = useMemo(() => {
        const map = new Map<string, { available: number; reserved: number; digOrdered: number; dug: number; shipped: number }>();
        (lifecycleRows || []).forEach((r: StockZoneLifecycleRow) => {
            const key = String(r.zone_id);
            const curr = map.get(key) || { available: 0, reserved: 0, digOrdered: 0, dug: 0, shipped: 0 };
            curr.available += r.available_qty ?? 0;
            curr.reserved += r.reserved_qty ?? 0;
            curr.digOrdered += r.dig_ordered_qty ?? 0;
            curr.dug += r.dug_qty ?? 0;
            curr.shipped += r.shipped_qty ?? 0;
            map.set(key, curr);
        });
        return map;
    }, [lifecycleRows]);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentZone, setCurrentZone] = useState(null);
    const [selectedZoneId, setSelectedZoneId] = useState(null); // For detail view
    const [showTaskModal, setShowTaskModal] = useState(false);

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPlotType, setSelectedPlotType] = useState("ALL");
    const [plotTypes, setPlotTypes] = useState([]);
    const [mismatchFilter, setMismatchFilter] = useState("all");
    const [speciesOptions, setSpeciesOptions] = useState([]);
    const [showSpeciesDialog, setShowSpeciesDialog] = useState(false);
    const [pendingSpeciesRowId, setPendingSpeciesRowId] = useState<number | null>(null);

    // New: Zone IDs Filter (from Navigation)
    const [zoneIdsFilter, setZoneIdsFilter] = useState<string[] | null>(null);

    // Effect to apply initial filters
    React.useEffect(() => {
        if (initialFilters?.zoneIds) {
            setZoneIdsFilter(initialFilters.zoneIds);
        }
        if (initialFilters?.initialZoneId) {
            setSelectedZoneId(initialFilters.initialZoneId);
        }
    }, [initialFilters]);

    // รวมจำนวนแปลงแต่ละสถานะ (ใช้โชว์ summary badges)
    const mismatchSummary = useMemo(() => {
        const initial = {
            "ยังไม่สำรวจ": 0,
            "ยังไม่ปลูก/บันทึก": 0,
            "ตรงตามระบบ": 0,
            "คลาดเคลื่อนเล็กน้อย": 0,
            "คลาดเคลื่อนปานกลาง": 0,
            "คลาดเคลื่อนมาก": 0,
        };

        if (!mismatchByZoneId) return initial;

        Object.values(mismatchByZoneId).forEach((row) => {
            const status = row?.mismatch_status;
            if (status && initial.hasOwnProperty(status)) {
                initial[status] += 1;
            }
        });

        return initial;
    }, [mismatchByZoneId]);

    // Derive plotTypeCode from plotTypes lookup
    const zonesWithCode = useMemo(() => {
        return zones.map(z => {
            const pt = plotTypes.find(p => p.id === z.plot_type);
            return { ...z, plotTypeCode: pt?.code, plotTypeName: pt?.name_th };
        });
    }, [zones, plotTypes]);

    // Load Plot Types
    React.useEffect(() => {
        async function loadPlotTypes() {
            const { data } = await supabase
                .from("planting_plot_detail_lookup")
                .select("id, code, name_th, sort_order, is_active")
                .eq("is_active", true)
                .order("sort_order", { ascending: true });
            setPlotTypes(data ?? []);
        }
        loadPlotTypes();
    }, []);

    // Load Species
    const loadSpecies = async () => {
        const { data } = await supabase
            .from("stock_species")
            .select("id, name, name_th")
            .order("name_th"); // Sort by Thai name is usually better for users
        setSpeciesOptions(data ?? []);
    };

    React.useEffect(() => {
        loadSpecies();
    }, []);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        note: "",
        zoneType: "",
        // New fields
        areaRai: "",
        areaWidth: "",
        areaLength: "",
        plantingRows: "",
        pumpSize: "",
        waterSource: "",
        customWaterSource: "", // For "Other" option
        // Inspection fields
        inspectionDate: "",
        inspectionTrunkInch: "",
        inspectionHeightM: "",
        inspectionPotInch: "",
        inspectionNotes: "",
    });

    // Tree Form State (for the expanded detail view/edit)
    const [treeRows, setTreeRows] = useState([]);
    const [error, setError] = useState("");

    // Filter Logic
    const filteredZones = useMemo(() => {
        return zonesWithCode.filter((zone) => {
            // 1. Filter by Zone IDs (if active)
            if (zoneIdsFilter && zoneIdsFilter.length > 0) {
                if (!zoneIdsFilter.includes(zone.id)) {
                    return false;
                }
            }

            const matchesSearch =
                zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (zone.farm_name &&
                    zone.farm_name.toLowerCase().includes(searchQuery.toLowerCase()));

            let matchesPlotType = true;
            if (selectedPlotType && selectedPlotType !== "ALL") {
                if (!zone.plotTypeCode) matchesPlotType = false;
                else matchesPlotType = zone.plotTypeCode === selectedPlotType;
            }

            let matchesMismatch = true;
            if (mismatchFilter !== "all") {
                const mismatch = mismatchByZoneId?.[zone.id];
                // ถ้าไม่มีข้อมูลเลย -> ถือเป็น "ยังไม่สำรวจ"
                const status = mismatch?.mismatch_status ?? (mismatch ? null : "ยังไม่สำรวจ");
                matchesMismatch = status === mismatchFilter;
            }

            return matchesSearch && matchesPlotType && matchesMismatch;
        });
    }, [zonesWithCode, searchQuery, selectedPlotType, mismatchFilter, mismatchByZoneId, zoneIdsFilter]);

    // Summary Widget Logic (Mini-Analytics)
    const plotTypeMetrics = useMemo(() => {
        const base = {
            PRODUCTION: { label: "แปลงผลิตจริง", zones: 0, areaRai: 0, plannedTrees: 0 },
            TEST: { label: "แปลงทดลอง", zones: 0, areaRai: 0, plannedTrees: 0 },
            NURSERY: { label: "Nursery", zones: 0, areaRai: 0, plannedTrees: 0 },
            UNSET: { label: "ยังไม่กำหนดประเภท", zones: 0, areaRai: 0, plannedTrees: 0 },
        };

        zonesWithCode.forEach((z) => {
            const rawCode = z.plotTypeCode;
            const key =
                rawCode === "PRODUCTION" || rawCode === "TEST" || rawCode === "NURSERY"
                    ? rawCode
                    : "UNSET";

            const area = Number(z.area_rai || 0);
            const planned = z.total_planted_qty || 0;

            base[key].zones += 1;
            base[key].areaRai += area;
            base[key].plannedTrees += planned;
        });

        return base;
    }, [zonesWithCode]);

    // Handlers
    const handleOpenCreate = () => {
        setIsEditMode(false);
        setCurrentZone(null);
        setFormData({
            name: "",
            location: "",
            note: "",
            zoneType: "",
            areaRai: "",
            areaWidth: "",
            areaLength: "",
            plantingRows: "",
            pumpSize: "",
            waterSource: "",
            customWaterSource: "",
            inspectionDate: "",
            inspectionTrunkInch: "",
            inspectionHeightM: "",
            inspectionPotInch: "",
            inspectionNotes: ""
        });
        setTreeRows([createEmptyTreeItem()]);

        // Set Default Plot Type (PRODUCTION)
        const production = plotTypes.find((pt) => pt.code === "PRODUCTION");
        if (production) {
            setFormData(prev => ({ ...prev, zoneType: production.id }));
        }

        setIsModalOpen(true);
        setError("");
    };

    const handleOpenEdit = (zone) => {
        setIsEditMode(true);
        setCurrentZone(zone);

        // Find plotType ID from code
        const foundPlotType = plotTypes.find(pt => pt.code === zone.plotTypeCode);

        setFormData({
            name: zone.name,
            location: zone.farm_name || "",
            note: zone.description || "",
            zoneType: foundPlotType ? foundPlotType.id : "",
            areaRai: zone.area_rai || "",
            areaWidth: zone.area_width_m || "",
            areaLength: zone.area_length_m || "",
            plantingRows: zone.planting_rows || "",
            pumpSize: zone.pump_size_hp || "",
            waterSource: zone.water_source || "",
            customWaterSource: "",
            inspectionDate: zone.inspection_date || "",
            inspectionTrunkInch: zone.inspection_trunk_inch || "",
            inspectionHeightM: zone.inspection_height_m || "",
            inspectionPotInch: zone.inspection_pot_inch || "",
            inspectionNotes: zone.inspection_notes || "",
        });
        // Load trees for editing - currently empty as we don't fetch trees in list view
        setTreeRows([createEmptyTreeItem()]);
        setIsModalOpen(true);
        setError("");
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentZone(null);
        setTreeRows([]);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Tree Row Handlers
    const handleAddTreeRow = () => {
        setTreeRows(prev => [...prev, createEmptyTreeItem()]);
    };

    const handleRemoveTreeRow = (id) => {
        setTreeRows(prev => prev.filter(row => row.id !== id));
    };

    const handleTreeRowChange = (id: number, field: string, value: any) => {
        if (field === "speciesId" && value === "__add_new_species__") {
            setPendingSpeciesRowId(id);
            setShowSpeciesDialog(true);
            return;
        }

        setTreeRows((prev) =>
            prev.map((row) => {
                if (row.id === id) {
                    return { ...row, [field]: value };
                }
                return row;
            })
        );
    };

    const handleSaveZone = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError("กรุณากรอกชื่อแปลงปลูก");
            return;
        }

        try {
            // Prepare data with proper waterSource
            const dataToSave = {
                ...formData,
                waterSource: formData.waterSource === "other" ? formData.customWaterSource : formData.waterSource
            };

            let zoneId;
            if (isEditMode && currentZone) {
                await updateZone(currentZone.id, dataToSave);
                zoneId = currentZone.id;
            } else {
                const newZone = await createZone(dataToSave);
                zoneId = newZone.id;
            }

            // Note: We are not saving trees here anymore because the list view doesn't manage trees directly.
            // Tree management is done in ZoneDetailPage.
            // UPDATE: Mission 2 - Save initial tree inventory if provided
            if (treeRows.length > 0) {
                const validRows = treeRows.filter(r => r.speciesId && r.planQty);
                for (const row of validRows) {
                    await supabase.from("planting_plot_inventory").insert({
                        plot_id: zoneId,
                        species_id: row.speciesId,
                        size_label: row.sizeLabel || "",
                        planted_qty: Number(row.planQty) || 0,
                        planted_date: row.plantedDate || null,
                        note: row.note || null,
                    });
                }
            }

            await refetch();
            handleCloseModal();
        } catch (err: any) {
            setError("Error saving zone: " + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("ยืนยันการลบแปลงปลูกนี้? ข้อมูลต้นไม้ในแปลงจะถูกลบด้วย")) {
            try {
                await deleteZone(id);
                await refetch();
            } catch (err) {
                alert("Error deleting zone: " + err.message);
            }
        }
    };

    if (loadingZones) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <span className="ml-2 text-slate-500">กำลังโหลดข้อมูลแปลงปลูก...</span>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-rose-600 bg-rose-50 rounded-xl border border-rose-200 m-4">
                <p className="font-medium">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                <p className="text-sm mt-1">{loadError}</p>
                <button
                    onClick={refetch}
                    className="mt-4 px-4 py-2 bg-white border border-rose-200 rounded-lg text-sm hover:bg-rose-50"
                >
                    ลองใหม่
                </button>
            </div>
        );
    }

    const selectedZoneForTask = selectedZoneId ? zones.find(z => z.id === selectedZoneId) : null;

    // ถ้ามีการเลือกแปลง ให้แสดงหน้า Detail
    if (selectedZoneId) {
        return (
            <>
                <ZoneDetailPage
                    zoneId={selectedZoneId}
                    onBack={() => setSelectedZoneId(null)}
                    onCreateTask={() => setShowTaskModal(true)}
                />
                <CreateTaskModal
                    open={showTaskModal}
                    onClose={() => setShowTaskModal(false)}
                    initialContextType="zone"
                    initialContextId={selectedZoneId}
                    initialContextLabel={selectedZoneForTask ? selectedZoneForTask.name : undefined}
                />
            </>
        );
    }

    return (
        <div className="space-y-6 pb-24">
            {/* หัวเรื่อง */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
                        จัดการแปลงปลูก (Zones)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        ฐานข้อมูลแปลงปลูก แปลงทดลอง และแปลงพัฒนาต้นไม้
                        เพื่อส่งต่อข้อมูลไปยังสต็อกขาย (CRM Stock)
                    </p>
                </div >
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                    >
                        <Plus className="w-4 h-4" />
                        <span>เพิ่มแปลงใหม่</span>
                    </button>
                </div>
            </div >

            {/* Zone Summary Cards */}
            < ZoneTypeSummaryCards
                items={
                    [
                        {
                            key: "production",
                            label: "แปลงผลิตจริง",
                            zoneCount: plotTypeMetrics.PRODUCTION.zones,
                            areaRai: plotTypeMetrics.PRODUCTION.areaRai,
                            plannedTrees: plotTypeMetrics.PRODUCTION.plannedTrees,
                        },
                        {
                            key: "trial",
                            label: "แปลงทดลอง",
                            zoneCount: plotTypeMetrics.TEST.zones,
                            areaRai: plotTypeMetrics.TEST.areaRai,
                            plannedTrees: plotTypeMetrics.TEST.plannedTrees,
                        },
                        {
                            key: "nursery",
                            label: "Nursery / แปลงพัก",
                            zoneCount: plotTypeMetrics.NURSERY.zones,
                            areaRai: plotTypeMetrics.NURSERY.areaRai,
                            plannedTrees: plotTypeMetrics.NURSERY.plannedTrees,
                        },
                        {
                            key: "untyped",
                            label: "ยังไม่กำหนดประเภท",
                            zoneCount: plotTypeMetrics.UNSET.zones,
                            areaRai: plotTypeMetrics.UNSET.areaRai,
                            plannedTrees: plotTypeMetrics.UNSET.plannedTrees,
                        },
                    ]}
                totalZones={summary?.totalZones || 0}
                totalPlannedTrees={summary?.totalPlanned || 0}
            />

            {/* Filter Bar */}
            <ZoneFilterBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedPlotType={selectedPlotType}
                setSelectedPlotType={setSelectedPlotType}
                plotTypes={plotTypes}
                mismatchFilter={mismatchFilter}
                setMismatchFilter={setMismatchFilter}
                mismatchSummary={mismatchSummary}
                loading={mismatchLoading}
            />

            {/* ตารางแปลงปลูก */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            รายการแปลงปลูก
                        </span>
                        {zoneIdsFilter && (
                            <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100">
                                <span>กรองจากภาพรวมสต็อก ({zoneIdsFilter.length} แปลง)</span>
                                <button
                                    onClick={() => setZoneIdsFilter(null)}
                                    className="hover:bg-indigo-100 rounded-full p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="text-left px-4 py-2.5 font-medium">ชื่อแปลง</th>
                                <th className="text-left px-4 py-2.5 font-medium">สถานที่</th>
                                <th className="text-left px-4 py-2.5 font-medium">
                                    ประเภทแปลง
                                </th>
                                <th className="text-right px-4 py-2.5 font-medium">
                                    จำนวนรวมตามแผน
                                </th>
                                <th className="text-right px-4 py-2.5 font-medium">
                                    พร้อมขาย
                                </th>
                                <th className="text-right px-4 py-2.5 font-medium">
                                    ขุดล้อมแล้ว
                                </th>
                                <th className="text-right px-4 py-2.5 font-medium">
                                    กำลังขุด
                                </th>
                                <th className="text-right px-4 py-2.5 font-medium">
                                    แผนจะขุด
                                </th>
                                <th className="text-right px-4 py-2.5 font-medium">
                                    ตาย
                                </th>
                                <th className="text-right px-4 py-2.5 font-medium">
                                    คงเหลือ
                                </th>
                                <th className="text-right px-4 py-2.5 font-medium">การจัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {zones.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="px-4 py-8 text-center text-sm text-slate-400"
                                    >
                                        ยังไม่มีข้อมูลแปลงปลูก
                                        <button
                                            onClick={handleOpenCreate}
                                            className="ml-2 text-emerald-600 hover:underline"
                                        >
                                            เพิ่มแปลงแรกเลย
                                        </button>
                                    </td>
                                </tr>
                            ) : filteredZones.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="px-4 py-8 text-center text-sm text-slate-400"
                                    >
                                        ไม่พบข้อมูลตามเงื่อนไขการค้นหา
                                        <button
                                            onClick={() => {
                                                setSearchQuery("");
                                                setSelectedPlotType("ALL");
                                            }}
                                            className="ml-2 text-emerald-600 hover:underline"
                                        >
                                            ล้างตัวกรอง
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filteredZones.map((zone) => {


                                    const mismatch = mismatchByZoneId[zone.id];

                                    return (
                                        <React.Fragment key={zone.id}>
                                            <tr className="border-b border-slate-50 hover:bg-slate-50/60">
                                                <td className="px-4 py-3 align-top text-slate-800">
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                            onClick={() => setSelectedZoneId(zone.id)}
                                                            className="font-medium hover:text-emerald-600 hover:underline text-left"
                                                        >
                                                            {zone.name}
                                                        </button>

                                                        {mismatchLoading ? (
                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-slate-50 text-slate-400 border border-slate-100 w-fit">
                                                                กำลังโหลด...
                                                            </span>
                                                        ) : (
                                                            <ZoneMismatchBadge mismatch={mismatch} />
                                                        )}

                                                        {zone.description && (
                                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                                {zone.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-700 align-top">
                                                    {zone.farm_name || "-"}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-700 align-top">
                                                    {zone.plotTypeName ? (
                                                        <span
                                                            className={
                                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium " +
                                                                getPlotTypeBadgeClass(zone.plotTypeCode)
                                                            }
                                                        >
                                                            {zone.plotTypeName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">- ยังไม่ได้กำหนด -</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-slate-800">
                                                    {zone.total_planted_plan?.toLocaleString("th-TH") ?? 0}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-emerald-700 font-semibold">
                                                    {lifecycleByZone.get(zone.id)?.available?.toLocaleString("th-TH") ?? 0}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-slate-600">
                                                    {zone.total_digup_done_qty?.toLocaleString("th-TH") ?? 0}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-amber-600">
                                                    {zone.total_digup_in_progress_qty?.toLocaleString("th-TH") ?? 0}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-sky-600">
                                                    {zone.total_digup_planned_qty?.toLocaleString("th-TH") ?? 0}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-rose-500">
                                                    {zone.total_dead_qty?.toLocaleString("th-TH") ?? 0}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-emerald-700 font-semibold">
                                                    {zone.total_remaining_qty?.toLocaleString("th-TH") ?? 0}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedZoneId(zone.id)}
                                                            className="inline-flex items-center justify-center px-2 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] text-slate-700"
                                                            title="ดูรายละเอียด"
                                                        >
                                                            รายละเอียด
                                                        </button>

                                                        <button
                                                            onClick={() => handleOpenEdit(zone)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100"
                                                            title="แก้ไข"
                                                        >
                                                            <Edit3 className="w-4 h-4 text-slate-600" />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDelete(zone.id)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-200 hover:bg-rose-50"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-rose-600" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div >
            </div >

            {/* Modal ฟอร์มเพิ่ม/แก้ไขแปลงปลูก */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sprout className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-semibold text-slate-800">
                                        {isEditMode ? "แก้ไขแปลงปลูก" : "เพิ่มแปลงปลูกใหม่"}
                                    </span>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>

                            <form
                                onSubmit={handleSaveZone}
                                className="px-4 py-4 space-y-4 overflow-y-auto"
                            >
                                {error && (
                                    <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                                        {error}
                                    </div>
                                )}

                                {/* ส่วนข้อมูลแปลง */}
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            ชื่อแปลง <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            placeholder="ระบุชื่อแปลง"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            สถานที่ / ฟาร์ม
                                        </label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            placeholder="ระบุสถานที่"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            ประเภทแปลง
                                        </label>
                                        <select
                                            name="zoneType"
                                            value={formData.zoneType}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white"
                                        >
                                            <option value="">-- เลือกประเภท --</option>
                                            {plotTypes.map((pt) => (
                                                <option key={pt.id} value={pt.id}>
                                                    {pt.name_th} ({pt.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            หมายเหตุ
                                        </label>
                                        <input
                                            type="text"
                                            name="note"
                                            value={formData.note}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            placeholder="รายละเอียดเพิ่มเติม"
                                        />
                                    </div>
                                </div>

                                {/* ข้อมูลต้นไม้ในแปลง (Mission 2) */}
                                <div className="border-t border-slate-100 pt-4">
                                    <h3 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
                                        <Trees className="w-4 h-4 text-slate-400" />
                                        ชนิดต้นไม้ในแปลงนี้ (Tree Species in this Plot)
                                    </h3>
                                    <div className="space-y-3">
                                        {treeRows.map((row, index) => (
                                            <div key={row.id} className="flex flex-col md:flex-row gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="flex-1 grid gap-2 md:grid-cols-4 w-full">
                                                    <div className="md:col-span-1">
                                                        <label className="block text-[10px] font-medium text-slate-500 mb-1">ชนิดต้นไม้</label>
                                                        <select
                                                            value={row.speciesId}
                                                            onChange={(e) => handleTreeRowChange(row.id, "speciesId", e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                        >
                                                            <option value="">เลือกชนิด...</option>
                                                            {speciesOptions.map(sp => (
                                                                <option key={sp.id} value={sp.id}>{sp.name_th || sp.name}</option>
                                                            ))}
                                                            <option value="__add_new_species__" className="font-semibold text-emerald-600 bg-emerald-50">
                                                                + เพิ่มพันธุ์ไม้ใหม่...
                                                            </option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <label className="block text-[10px] font-medium text-slate-500 mb-1">ขนาด (นิ้ว)</label>
                                                        <select
                                                            value={row.sizeLabel}
                                                            onChange={(e) => handleTreeRowChange(row.id, "sizeLabel", e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                        >
                                                            <option value="">เลือกขนาด...</option>
                                                            {trunkSizeOptions.map((opt) => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <label className="block text-[10px] font-medium text-slate-500 mb-1">จำนวนปลูก</label>
                                                        <input
                                                            type="number"
                                                            value={row.planQty}
                                                            onChange={(e) => handleTreeRowChange(row.id, "planQty", e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <label className="block text-[10px] font-medium text-slate-500 mb-1">วันที่ปลูก</label>
                                                        <input
                                                            type="date"
                                                            value={row.plantedDate}
                                                            onChange={(e) => handleTreeRowChange(row.id, "plantedDate", e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-4">
                                                        <input
                                                            type="text"
                                                            value={row.note}
                                                            onChange={(e) => handleTreeRowChange(row.id, "note", e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                            placeholder="หมายเหตุ (ถ้ามี)"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTreeRow(row.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
                                                    title="ลบรายการ"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={handleAddTreeRow}
                                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            เพิ่มชนิดต้นไม้
                                        </button>
                                    </div>
                                </div>

                                {/* ข้อมูลกายภาพ */}
                                <div className="border-t border-slate-100 pt-4">
                                    <h3 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-slate-400" />
                                        ข้อมูลกายภาพ
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                พื้นที่ (ไร่)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                name="areaRai"
                                                value={formData.areaRai}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                กว้าง (ม.)
                                            </label>
                                            <input
                                                type="number"
                                                name="areaWidth"
                                                value={formData.areaWidth}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                ยาว (ม.)
                                            </label>
                                            <input
                                                type="number"
                                                name="areaLength"
                                                value={formData.areaLength}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                จำนวนร่องปลูก
                                            </label>
                                            <input
                                                type="number"
                                                name="plantingRows"
                                                value={formData.plantingRows}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ข้อมูลระบบน้ำ */}
                                <div className="border-t border-slate-100 pt-4">
                                    <h3 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
                                        <FlaskConical className="w-4 h-4 text-slate-400" />
                                        ระบบน้ำ
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                แหล่งน้ำ
                                            </label>
                                            <select
                                                name="waterSource"
                                                value={formData.waterSource}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white"
                                            >
                                                <option value="">-- เลือกแหล่งน้ำ --</option>
                                                <option value="คลองชลประทาน">คลองชลประทาน</option>
                                                <option value="บ่อบาดาล">บ่อบาดาล</option>
                                                <option value="สระเก็บน้ำ">สระเก็บน้ำ</option>
                                                <option value="other">อื่นๆ</option>
                                            </select>
                                            {formData.waterSource === "other" && (
                                                <input
                                                    type="text"
                                                    name="customWaterSource"
                                                    value={formData.customWaterSource}
                                                    onChange={handleChange}
                                                    className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                    placeholder="ระบุแหล่งน้ำ"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                ขนาดปั๊ม (แรงม้า)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                name="pumpSize"
                                                value={formData.pumpSize}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ข้อมูลการสำรวจล่าสุด */}
                                <div className="border-t border-slate-100 pt-4">
                                    <h3 className="text-sm font-medium text-slate-800 mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                                        ข้อมูลการสำรวจล่าสุด (Initial Inspection)
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                วันที่สำรวจ
                                            </label>
                                            <input
                                                type="date"
                                                name="inspectionDate"
                                                value={formData.inspectionDate}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                ขนาดลำต้น (นิ้ว)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                name="inspectionTrunkInch"
                                                value={formData.inspectionTrunkInch}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                ความสูง (เมตร)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                name="inspectionHeightM"
                                                value={formData.inspectionHeightM}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                ขนาดกระถาง (นิ้ว)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                name="inspectionPotInch"
                                                value={formData.inspectionPotInch}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                หมายเหตุการสำรวจ
                                            </label>
                                            <input
                                                type="text"
                                                name="inspectionNotes"
                                                value={formData.inspectionNotes}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                placeholder="เช่น สภาพต้นไม้, โรคพืช, ฯลฯ"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 mt-6">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={mutating}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {mutating && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {isEditMode ? "บันทึกการแก้ไข" : "สร้างแปลงใหม่"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Species Dialog */}
            <SpeciesFormDialog
                open={showSpeciesDialog}
                onClose={() => {
                    setShowSpeciesDialog(false);
                    setPendingSpeciesRowId(null);
                }}
                onSuccess={async (newId) => {
                    await loadSpecies();
                    if (pendingSpeciesRowId !== null) {
                        handleTreeRowChange(pendingSpeciesRowId, "speciesId", newId);
                    }
                    setShowSpeciesDialog(false);
                    setPendingSpeciesRowId(null);
                }}
            />

            {/* Task Modal */}
            <CreateTaskModal
                open={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                initialContextType="zone"
                initialContextId={selectedZoneId}
                initialContextLabel={selectedZoneForTask ? selectedZoneForTask.name : undefined}
            />
        </div >
    );
};
