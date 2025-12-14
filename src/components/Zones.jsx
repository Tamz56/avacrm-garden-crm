import React, { useState, useMemo } from "react";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Sprout,
  X,
  Trees,
  Info,
  Loader2,
  CheckCircle2,
  FlaskConical,
  Baby
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useZonesData } from "../hooks/useZonesData";
import { useZoneMutations } from "../hooks/useZoneMutations";
import { useZoneMismatchOverview } from "../hooks/useZoneMismatchOverview";
import { ZoneMismatchBadge } from "./zones/ZoneMismatchBadge";
import { TRUNK_SIZE_OPTIONS } from "../config/treeSizes";
import ZoneDetailPage from "./ZoneDetailPage";

// default หนึ่งแถวของชนิดต้นไม้ในแปลง
const createEmptyTreeItem = () => ({
  id: `tree-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  species: "Silver Oak Ava1", // ชนิดต้นไม้
  productType: "ไม้ปลูก", // ประเภทต้นไม้
  plannedCount: "",
  size: "",
  height: "", // ความสูง (ม.)
  plantedAt: "",
  loopedCount: "",
  currentLoopingCount: "",
  loopSizes: "",
  loopDate: "",
  moveDate: "",
  remainingText: "",
});

const PLOT_TYPE_FILTERS = [
  { value: "ALL", label: "ทุกประเภทแปลง" },
  { value: "PRODUCTION", label: "แปลงผลิตจริง (PRODUCTION)" },
  { value: "TEST", label: "แปลงทดลอง (TEST)" },
  { value: "NURSERY", label: "แปลง nursery (NURSERY)" },
];

const MISMATCH_STATUS_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "ยังไม่สำรวจ", label: "ยังไม่สำรวจ" },
  { value: "ยังไม่ปลูก/บันทึก", label: "ยังไม่ปลูก/บันทึก" },
  { value: "ตรงตามระบบ", label: "ตรงตามระบบ" },
  { value: "คลาดเคลื่อนเล็กน้อย", label: "คลาดเคลื่อนเล็กน้อย" },
  { value: "คลาดเคลื่อนปานกลาง", label: "คลาดเคลื่อนปานกลาง" },
  { value: "คลาดเคลื่อนมาก", label: "คลาดเคลื่อนมาก" },
];

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

const getZonePlannedCount = (zone) => {
  return zone.total_planted_qty || 0;
};

const getZonePlantDate = (zone) => {
  return null;
};

const getAgeFromDate = (dateStr) => {
  if (!dateStr) return "";
  const start = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  if (years > 0) return `${years} ปี ${months} เดือน`;
  return `${months} เดือน`;
};

const getTreeSummary = (zone) => {
  return "-";
};

// Main Component

const Zones = () => {
  // Data Hooks
  const { zones, loading: loadingZones, reload: refetch, summary, error: loadError } = useZonesData();
  const { createZone, updateZone, deleteZone, saveZoneTrees, loading: mutating } = useZoneMutations();

  const {
    byZoneId: mismatchByZoneId,
    loading: mismatchLoading,
    error: mismatchError,
  } = useZoneMismatchOverview();

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentZone, setCurrentZone] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null); // For detail view

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlotType, setSelectedPlotType] = useState("ALL");
  const [plotTypes, setPlotTypes] = useState([]);
  const [mismatchFilter, setMismatchFilter] = useState("all");

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
  }, [zonesWithCode, searchQuery, selectedPlotType, mismatchFilter, mismatchByZoneId]);

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

      await refetch();
      handleCloseModal();
    } catch (err) {
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

  // ถ้ามีการเลือกแปลง ให้แสดงหน้า Detail
  if (selectedZoneId) {
    return (
      <ZoneDetailPage
        zoneId={selectedZoneId}
        onBack={() => setSelectedZoneId(null)}
      />
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มแปลงใหม่</span>
          </button>
        </div>
      </div>

      {/* การ์ดสรุป */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 mb-1">จำนวนแปลงทั้งหมด</div>
            <div className="text-lg font-semibold text-slate-900">
              {(summary?.totalZones || 0).toLocaleString("th-TH")} แปลง
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-sky-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              จำนวนต้นไม้รวม (ตามแผนปลูก/นำเข้า)
            </div>
            <div className="text-lg font-semibold text-emerald-700">
              {(summary?.totalPlanned || 0).toLocaleString("th-TH")} ต้น
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
            <Trees className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Mini-Analytics Dashboard Widget */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {/* PRODUCTION */}
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-100 text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            {plotTypeMetrics.PRODUCTION.label}{" "}
            <strong>{plotTypeMetrics.PRODUCTION.zones}</strong> แปลง ·{" "}
            พื้นที่รวม{" "}
            <strong>{plotTypeMetrics.PRODUCTION.areaRai.toLocaleString()}</strong> ไร่ ·{" "}
            จำนวนต้นตามแผน{" "}
            <strong>
              {plotTypeMetrics.PRODUCTION.plannedTrees.toLocaleString()}
            </strong>{" "}
            ต้น
          </span>
        </div>

        {/* TEST */}
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 border border-amber-100 text-amber-800">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>
            {plotTypeMetrics.TEST.label}{" "}
            <strong>{plotTypeMetrics.TEST.zones}</strong> แปลง · พื้นที่รวม{" "}
            <strong>{plotTypeMetrics.TEST.areaRai.toLocaleString()}</strong> ไร่ ·{" "}
            จำนวนต้นตามแผน{" "}
            <strong>{plotTypeMetrics.TEST.plannedTrees.toLocaleString()}</strong>{" "}
            ต้น
          </span>
        </div>

        {/* NURSERY */}
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 border border-sky-100 text-sky-800">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>
            {plotTypeMetrics.NURSERY.label}{" "}
            <strong>{plotTypeMetrics.NURSERY.zones}</strong> แปลง · พื้นที่รวม{" "}
            <strong>{plotTypeMetrics.NURSERY.areaRai.toLocaleString()}</strong> ไร่ ·{" "}
            จำนวนต้นตามแผน{" "}
            <strong>
              {plotTypeMetrics.NURSERY.plannedTrees.toLocaleString()}
            </strong>{" "}
            ต้น
          </span>
        </div>

        {/* UNSET */}
        {plotTypeMetrics.UNSET.zones > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 border border-slate-200 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>
              {plotTypeMetrics.UNSET.label}{" "}
              <strong>{plotTypeMetrics.UNSET.zones}</strong> แปลง · พื้นที่รวม{" "}
              <strong>{plotTypeMetrics.UNSET.areaRai.toLocaleString()}</strong> ไร่ ·{" "}
              จำนวนต้นตามแผน{" "}
              <strong>{plotTypeMetrics.UNSET.plannedTrees.toLocaleString()}</strong>{" "}
              ต้น
            </span>
          </div>
        )}
      </div>

      {/* Filter Section */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            placeholder="ค้นหาชื่อแปลง / สถานที่..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedPlotType}
            onChange={(e) => setSelectedPlotType(e.target.value)}
            className="text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-white"
          >
            {PLOT_TYPE_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {(searchQuery || selectedPlotType !== "ALL") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedPlotType("ALL");
            }}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* แสดง error จาก mismatch ถ้ามี */}
        {mismatchError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            ไม่สามารถโหลดข้อมูลความคลาดเคลื่อนของแปลงได้: {mismatchError.message}
          </div>
        )}

        {/* แถบสรุปจำนวนแปลงตามสถานะ */}
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(mismatchSummary).map(([status, count]) => (
            <span
              key={status}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1"
            >
              <span className="text-slate-600">{status}</span>
              <span className="font-semibold text-slate-900">{count}</span>
            </span>
          ))}
        </div>

        {/* แถว Filter ด้านขวา */}
        <div className="flex items-center justify-end gap-2">
          {mismatchLoading && (
            <span className="text-xs text-slate-400">กำลังโหลดสถานะคลาดเคลื่อน…</span>
          )}

          <label className="text-xs text-slate-500">
            สถานะความคลาดเคลื่อน:&nbsp;
          </label>
          <select
            value={mismatchFilter}
            onChange={(e) => setMismatchFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm"
          >
            {MISMATCH_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ตารางแปลงปลูก */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800">
              รายการแปลงปลูก
            </span>
          </div>

        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">ชื่อแปลง</th>
                <th className="text-left px-4 py-2.5 font-medium">สถานที่</th>
                <th className="text-left px-4 py-2.5 font-medium">
                  ชนิด / ประเภทต้นไม้
                </th>
                <th className="text-left px-4 py-2.5 font-medium">
                  ประเภทแปลง
                </th>
                <th className="text-right px-4 py-2.5 font-medium">
                  จำนวนรวมตามแผน
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
                    colSpan={11}
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
                    colSpan={11}
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
                  const plantDate = getZonePlantDate(zone);
                  const ageText = getAgeFromDate(plantDate);

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
                          {getTreeSummary(zone)}
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
                          {zone.total_planted_qty?.toLocaleString("th-TH") ?? 0}
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
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="เช่น แปลง Silver & Golden เข็ก #1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      สถานที่
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="เช่น เข็ก / เขาใหญ่ / 13 ไร่"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      ประเภทแปลง / รูปแบบการใช้พื้นที่
                    </label>
                    <select
                      name="zoneType"
                      value={formData.zoneType}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">-- เลือกประเภท --</option>
                      {plotTypes.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name_th} ({pt.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ส่วนขนาดพื้นที่ */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-700 mb-3">ขนาดพื้นที่แปลง</h4>
                  <div className="grid gap-3 md:grid-cols-4">
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
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="เช่น 2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        กว้าง (เมตร)
                      </label>
                      <input
                        type="number"
                        step="1"
                        name="areaWidth"
                        value={formData.areaWidth}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="เช่น 50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        ยาว (เมตร)
                      </label>
                      <input
                        type="number"
                        step="1"
                        name="areaLength"
                        value={formData.areaLength}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="เช่น 80"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        จำนวนแถวปลูก
                      </label>
                      <input
                        type="number"
                        step="1"
                        name="plantingRows"
                        value={formData.plantingRows}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="เช่น 10"
                      />
                    </div>
                  </div>
                </div>

                {/* ส่วนระบบน้ำ */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-700 mb-3">ระบบน้ำ</h4>
                  <div className="grid gap-3 md:grid-cols-2">
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
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="เช่น 2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        แหล่งน้ำ
                      </label>
                      <select
                        name="waterSource"
                        value={["บ่อบาดาล", "สระน้ำ", "ลำธาร/คลอง", "น้ำประปา"].includes(formData.waterSource) ? formData.waterSource : "other"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "other") {
                            setFormData(prev => ({ ...prev, waterSource: val, customWaterSource: "" }));
                          } else {
                            setFormData(prev => ({ ...prev, waterSource: "other" }));
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">-- เลือกแหล่งน้ำ --</option>
                        <option value="บ่อบาดาล">บ่อบาดาล</option>
                        <option value="สระน้ำ">สระน้ำ</option>
                        <option value="ลำธาร/คลอง">ลำธาร/คลอง</option>
                        <option value="น้ำประปา">น้ำประปา</option>
                        <option value="other">อื่นๆ (ระบุ)</option>
                      </select>
                      {formData.waterSource === "other" && (
                        <input
                          type="text"
                          name="customWaterSource"
                          value={formData.customWaterSource}
                          onChange={handleChange}
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="ระบุแหล่งน้ำ"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* ส่วนการตรวจแปลงล่าสุด */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-700 mb-3">การตรวจแปลงล่าสุด</h4>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        วันที่ตรวจ
                      </label>
                      <input
                        type="date"
                        name="inspectionDate"
                        value={formData.inspectionDate}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="เช่น 3.5"
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
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="เช่น 2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        ขนาดกระถาง (นิ้ว)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        name="inspectionPotInch"
                        value={formData.inspectionPotInch}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="เช่น 14"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      บันทึกงานในแปลง / การบำรุง (ถ้ามี)
                    </label>
                    <textarea
                      rows={2}
                      name="inspectionNotes"
                      value={formData.inspectionNotes}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="เช่น ตัดหญ้า ใส่ปุ๋ยอินทรีย์ เปลี่ยนกระถาง 10&quot; → 14&quot;"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={mutating}
                    className="px-6 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {mutating ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Zones;


