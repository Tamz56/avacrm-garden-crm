import React, { useEffect, useMemo, useState } from "react";
import { Leaf, Search, Loader2, AlertCircle, X, Info, Trash2, Sprout, Database, Map as MapIcon, Trees, ChevronRight } from "lucide-react";
import { supabase } from "../supabaseClient";

// --- Types ---

type SpeciesOverviewRow = {
    species_id: string;
    species_code?: string | null;
    name_th?: string | null;
    name_en?: string | null;
    scientific_name?: string | null;
    total_items: number | null;
    total_zones: number | null;
};

type SpeciesZoneRow = {
    zone_id: string;
    zone_name: string | null;
    farm_name: string | null;
    total_items: number;
};

type SpeciesStatusRow = {
    status: string;
    total_items: number;
};

type SpeciesSizeRow = {
    size_label: string | null;
    total_items: number;
};

interface TreeDatabaseMainProps {
    isDarkMode: boolean;
}

const TreeDatabaseMain: React.FC<TreeDatabaseMainProps> = ({ isDarkMode }) => {
    const [rows, setRows] = useState<SpeciesOverviewRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<SpeciesOverviewRow | null>(null);

    // Detail data
    const [zoneRows, setZoneRows] = useState<SpeciesZoneRow[]>([]);
    const [loadingZones, setLoadingZones] = useState(false);
    const [statusRows, setStatusRows] = useState<SpeciesStatusRow[]>([]);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [sizeRows, setSizeRows] = useState<SpeciesSizeRow[]>([]);
    const [loadingSizes, setLoadingSizes] = useState(false);

    // --- Data Loading ---

    async function loadZoneBreakdown(speciesId: string) {
        setLoadingZones(true);
        setZoneRows([]);
        const { data, error } = await supabase.rpc("get_species_zone_breakdown", { p_species_id: speciesId });
        if (error) console.error("load zone breakdown error:", error);
        else setZoneRows((data as SpeciesZoneRow[]) || []);
        setLoadingZones(false);
    }

    async function loadStatusBreakdown(speciesId: string) {
        setLoadingStatus(true);
        setStatusRows([]);
        const { data, error } = await supabase.rpc("get_species_status_breakdown", { p_species_id: speciesId });
        if (error) console.error("load status breakdown error:", error);
        else setStatusRows((data as SpeciesStatusRow[]) || []);
        setLoadingStatus(false);
    }

    async function loadSizeBreakdown(speciesId: string) {
        setLoadingSizes(true);
        setSizeRows([]);
        const { data, error } = await supabase.rpc("get_species_size_breakdown", { p_species_id: speciesId });
        if (error) console.error("load size breakdown error:", error);
        else setSizeRows((data as SpeciesSizeRow[]) || []);
        setLoadingSizes(false);
    }

    const loadData = async () => {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase.from("view_species_overview").select("*");
        if (error) {
            console.error("load species overview error:", error);
            setError(error.message || "โหลดข้อมูลไม่สำเร็จ");
        } else {
            setRows((data as SpeciesOverviewRow[]) || []);
        }
        setLoading(false);
    };

    const handleDelete = async (e: React.MouseEvent, speciesId: string, name: string) => {
        e.stopPropagation();
        if (!window.confirm(`คุณต้องการลบพันธุ์ไม้ "${name}" ใช่หรือไม่?\n\nหากพันธุ์ไม้นี้ถูกใช้งานอยู่ จะไม่สามารถลบได้`)) return;

        const { error } = await supabase.from('stock_species').delete().eq('id', speciesId);
        if (error) {
            console.error('Error deleting species:', error);
            alert(`ไม่สามารถลบได้: ${error.message}\n(อาจมีการใช้งานพันธุ์ไม้นี้ในสต็อกหรือดีล)`);
        } else {
            loadData();
            if (selected?.species_id === speciesId) setSelected(null);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- Derived State ---

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => {
            const parts = [r.species_code, r.name_th, r.name_en, r.scientific_name].filter(Boolean).map((x) => String(x).toLowerCase());
            return parts.some((p) => p.includes(q));
        });
    }, [rows, search]);

    const summary = useMemo(() => {
        const totalSpecies = rows.length;
        const totalTrees = rows.reduce((sum, r) => sum + (r.total_items || 0), 0);
        const totalZones = rows.reduce((sum, r) => sum + (r.total_zones || 0), 0);
        return { totalSpecies, totalTrees, totalZones };
    }, [rows]);

    // --- Styles ---
    const cardBg = isDarkMode ? "bg-slate-900/60 border-slate-800 shadow-sm" : "bg-white border-slate-200 shadow-sm";
    const textMain = isDarkMode ? "text-slate-50" : "text-slate-900";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
    const borderClass = isDarkMode ? "border-slate-800/80" : "border-slate-200";

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* 1. Top Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <StatCard
                    icon={<Sprout className="w-5 h-5" />}
                    label="จำนวนพันธุ์ไม้"
                    value={summary.totalSpecies}
                    subLabel="จาก stock_species"
                    isDarkMode={isDarkMode}
                    color="emerald"
                />
                <StatCard
                    icon={<Trees className="w-5 h-5" />}
                    label="ต้นทั้งหมดในระบบ"
                    value={summary.totalTrees}
                    subLabel="ข้อมูลจาก stock_items"
                    isDarkMode={isDarkMode}
                    color="sky"
                />
                <StatCard
                    icon={<MapIcon className="w-5 h-5" />}
                    label="จำนวนโซนที่ปลูก"
                    value={summary.totalZones}
                    subLabel="distinct zone_id"
                    isDarkMode={isDarkMode}
                    color="amber"
                />
            </div>

            {/* 2. Main Content Grid */}
            <div className="grid grid-cols-12 gap-6 min-h-0 flex-1">
                {/* Left: Species Table (8-9 cols) */}
                <div className="col-span-12 lg:col-span-8 xl:col-span-8 flex flex-col min-h-0">
                    <div className={`flex-1 flex flex-col rounded-2xl border overflow-hidden backdrop-blur ${cardBg}`}>
                        {/* Header */}
                        <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${borderClass}`}>
                            <div>
                                <h2 className={`text-base font-semibold ${textMain}`}>
                                    ฐานข้อมูลพันธุ์ไม้
                                </h2>
                                <p className={`text-xs mt-0.5 ${textMuted}`}>
                                    ดูรายการพันธุ์ไม้ทั้งหมดในระบบ AvaCRM
                                </p>
                            </div>
                            <div className="relative w-64">
                                <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                                <input
                                    type="text"
                                    placeholder="ค้นหา (ชื่อ, รหัส, วิทยาศาสตร์)..."
                                    className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${isDarkMode
                                        ? "bg-slate-950/50 border-slate-700 text-slate-200 placeholder-slate-600"
                                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                                        }`}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead className={`sticky top-0 z-10 ${isDarkMode ? "bg-slate-900/80 border-b border-slate-800" : "bg-slate-50 border-b border-slate-200"}`}>
                                    <tr>
                                        <th className={`px-5 py-3 text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Code</th>
                                        <th className={`px-5 py-3 text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>ชื่อพันธุ์ไม้</th>
                                        <th className={`px-5 py-3 text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>ชื่อวิทยาศาสตร์</th>
                                        <th className={`px-5 py-3 text-xs font-medium text-right ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>จำนวนต้น</th>
                                        <th className={`px-5 py-3 text-xs font-medium text-right ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>โซน</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className={`px-4 py-8 text-center text-xs ${textMuted}`}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    กำลังโหลดข้อมูล...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={`px-4 py-8 text-center text-xs ${textMuted}`}>
                                                ไม่พบข้อมูลพันธุ์ไม้
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRows.map((row) => (
                                            <tr
                                                key={row.species_id}
                                                onClick={() => {
                                                    setSelected(row);
                                                    if (row.species_id) {
                                                        loadZoneBreakdown(row.species_id);
                                                        loadStatusBreakdown(row.species_id);
                                                        loadSizeBreakdown(row.species_id);
                                                    }
                                                }}
                                                className={`transition-colors cursor-pointer group ${selected?.species_id === row.species_id
                                                    ? (isDarkMode ? "bg-slate-800/80" : "bg-emerald-50")
                                                    : (isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-50")
                                                    }`}
                                            >
                                                <td className={`px-5 py-3.5 text-xs font-mono ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                                    {row.species_code || "-"}
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                                    {row.name_th || "-"}
                                                    {row.name_en && <div className={`text-xs font-normal ${textMuted}`}>{row.name_en}</div>}
                                                </td>
                                                <td className={`px-5 py-3.5 text-xs italic ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                                                    {row.scientific_name || "-"}
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm text-right font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                                    {(row.total_items ?? 0).toLocaleString()}
                                                </td>
                                                <td className={`px-5 py-3.5 text-xs text-right ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                                    {(row.total_zones ?? 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Detail Panel (4 cols) */}
                <div className="col-span-12 lg:col-span-4 xl:col-span-4 flex flex-col min-h-0">
                    {selected ? (
                        <div className={`h-full flex flex-col rounded-2xl border overflow-hidden ${cardBg}`}>
                            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                                <div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 mb-2 text-[11px] font-medium ${isDarkMode ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                                        CODE: {selected.species_code || "-"}
                                    </span>
                                    <h3 className={`text-lg font-semibold ${textMain}`}>
                                        {selected.name_th}
                                    </h3>
                                    {selected.name_en && (
                                        <p className={`text-xs mt-0.5 ${textMuted}`}>
                                            {selected.name_en}
                                        </p>
                                    )}
                                    {selected.scientific_name && (
                                        <p className={`text-xs mt-1 italic ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                                            {selected.scientific_name}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className={`rounded-xl border px-3 py-2.5 ${isDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                                        <div className={`${textMuted} mb-1`}>จำนวนต้นในระบบ</div>
                                        <div className={`text-base font-semibold ${textMain}`}>
                                            {selected.total_items?.toLocaleString()} <span className={`text-[11px] ${textMuted}`}>ต้น</span>
                                        </div>
                                    </div>
                                    <div className={`rounded-xl border px-3 py-2.5 ${isDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                                        <div className={`${textMuted} mb-1`}>ปลูกอยู่ใน</div>
                                        <div className={`text-base font-semibold ${textMain}`}>
                                            {selected.total_zones} <span className={`text-[11px] ${textMuted}`}>โซน</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-emerald-500 text-xs font-medium text-white hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/20">
                                        ดูต้นไม้ทั้งหมดในระบบ
                                    </button>
                                    <button className={`inline-flex items-center justify-center px-3 py-2 rounded-lg border text-xs font-medium transition ${isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                                        แก้ไขข้อมูล
                                    </button>
                                </div>

                                {/* Breakdowns (Scrollable content) */}
                                <div className={`pt-4 border-t ${isDarkMode ? "border-slate-800" : "border-slate-100"} space-y-4`}>
                                    <BreakdownSection
                                        title="จำนวนต้นตามโซน"
                                        loading={loadingZones}
                                        empty={zoneRows.length === 0}
                                        isDarkMode={isDarkMode}
                                    >
                                        <table className="w-full text-xs">
                                            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                                {zoneRows.map(z => (
                                                    <tr key={z.zone_id}>
                                                        <td className={`py-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{z.zone_name}</td>
                                                        <td className={`py-2 text-right font-medium ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                                                            {z.total_items.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </BreakdownSection>

                                    <BreakdownSection
                                        title="จำนวนต้นตามขนาด"
                                        loading={loadingSizes}
                                        empty={sizeRows.length === 0}
                                        isDarkMode={isDarkMode}
                                    >
                                        <table className="w-full text-xs">
                                            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                                                {sizeRows.map(s => (
                                                    <tr key={s.size_label || 'unknown'}>
                                                        <td className={`py-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{s.size_label || "ไม่ระบุ"}</td>
                                                        <td className={`py-2 text-right font-medium ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                                                            {s.total_items.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </BreakdownSection>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`h-full flex flex-col items-center justify-center text-center px-6 py-8 rounded-2xl border ${cardBg}`}>
                            <div className="space-y-3">
                                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${isDarkMode ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-emerald-600"}`}>
                                    <Sprout className="w-6 h-6" />
                                </div>
                                <div className={`text-sm font-medium ${textMain}`}>
                                    เลือกพันธุ์ไม้จากตารางด้านซ้าย
                                </div>
                                <p className={`text-xs ${textMuted}`}>
                                    เพื่อดูรายละเอียดสายพันธุ์ จำนวนต้น และโซนที่ปลูกในระบบ
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TreeDatabaseMain;

// --- Sub-components ---

const StatCard = ({ icon, label, value, subLabel, isDarkMode, color }: any) => {
    const colors = {
        emerald: isDarkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600",
        sky: isDarkMode ? "bg-sky-500/10 text-sky-400" : "bg-sky-50 text-sky-600",
        amber: isDarkMode ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600",
    };

    return (
        <div className={`rounded-2xl border p-4 flex items-center gap-4 ${isDarkMode ? "bg-slate-900/60 border-slate-800 shadow-sm" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color as keyof typeof colors]}`}>
                {icon}
            </div>
            <div>
                <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
                <div className={`text-xl font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                    {value?.toLocaleString() ?? 0}
                </div>
                <div className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{subLabel}</div>
            </div>
        </div>
    );
};

const BreakdownSection = ({ title, children, loading, empty, isDarkMode }: any) => (
    <div className={`rounded-xl border p-4 ${isDarkMode ? "bg-slate-950/30 border-slate-800" : "bg-white border-slate-100"}`}>
        <h4 className={`text-xs font-semibold mb-3 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{title}</h4>
        {loading ? (
            <div className={`text-xs flex items-center gap-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                <Loader2 className="w-3 h-3 animate-spin" /> กำลังโหลด...
            </div>
        ) : empty ? (
            <div className={`text-xs italic ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>ไม่มีข้อมูล</div>
        ) : (
            children
        )}
    </div>
);

function mapStatusLabel(status: string): string {
    const map: Record<string, string> = {
        "in_zone": "อยู่ในแปลง",
        "available": "อยู่ในแปลง", // legacy alias
        "selected_for_dig": "เลือกไว้จะขุด",
        "root_prune_1": "ตัดราก 1",
        "root_prune_2": "ตัดราก 2",
        "root_prune_3": "ตัดราก 3",
        "root_prune_4": "ตัดราก 4",
        "ready_to_lift": "พร้อมยก/พร้อมขาย",
        "low": "ควรตรวจสอบ (Low)",
        "in_nursery": "Nursery",
        "in_field": "แปลงปลูก",
        "reserved": "จองแล้ว",
        "dig_ordered": "อยู่ในใบสั่งขุด",
        "digging": "กำลังขุด",
        "dug": "ขุดแล้ว",
        "ready_to_ship": "พร้อมส่ง",
        "shipped": "ส่งแล้ว",
        "planted": "ปลูกให้ลูกค้าแล้ว",
        "rehab": "พักฟื้น",
        "dead": "ตาย",
        "cancelled": "ยกเลิก"
    };
    return map[status] || status;
}
