
import React, { useState, useCallback } from "react";
import {
    TreePine,
    HandCoins,
    RefreshCcw,
    ChevronDown,
    Pickaxe,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { useDashboardKpis } from "../hooks/useDashboardKpis";
import { useDashboardChart } from "../hooks/useDashboardChart";
import { useDashboardDigAndAlerts } from "../hooks/useDashboardDigAndAlerts";
import { PREMIUM_STYLES } from "../constants/ui";
import { useDashboardZonesOverview } from "../hooks/useDashboardZonesOverview";
import DashboardPriorityTasksCard from "./dashboard/DashboardPriorityTasksCard";
import BillingKpiStrip from "./dashboard/BillingKpiStrip";
import OpsSnapshot from "./dashboard/OpsSnapshot";
import { MonthlyTargetCard } from "./dashboard/MonthlyTargetCard";
import { ZonesSnapshot } from "./dashboard/ZonesSnapshot";

interface DashboardProps {
    isDarkMode: boolean;
    onOpenZone?: (zoneId: string, opts?: any) => void;
    reloadKey?: number; // For global reload from parent
    // Quick actions
    onCreateDeal?: () => void;
    onCreateDigOrder?: () => void;
    onCreateShipment?: () => void;
    onOpenLifecycleView?: () => void;
    onOpenSpeciesStockView?: () => void;
    onSearchTags?: () => void;
    // Report buttons
    onOpenRevenueReport?: (mode: "revenue" | "trees_out", timeRange: string) => void;
    onOpenZonesList?: () => void;
    onOpenTasks?: () => void;
}

// ... existing imports ...

// Style Constants
const PAGE_BG = "min-h-screen bg-slate-50 dark:bg-black dark:bg-[radial-gradient(900px_circle_at_20%_-10%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(900px_circle_at_80%_0%,rgba(59,130,246,0.10),transparent_55%)]";

const { SURFACE, SURFACE_HOVER, TITLE, MUTED, SOFT_INNER } = PREMIUM_STYLES;

// Premium Toggle Pills
const PILL_BASE = "px-3 py-1 rounded-full text-xs border transition-colors font-medium";

export default function Dashboard({
    isDarkMode,
    onOpenZone,
    reloadKey,
    onCreateDeal,
    onCreateDigOrder,
    onCreateShipment,
    onOpenLifecycleView,
    onOpenSpeciesStockView,
    onSearchTags,
    onOpenRevenueReport,
    onOpenZonesList,
    onOpenTasks,
}: DashboardProps) {
    // Style Constants
    // Removed duplicate

    const [timeRange, setTimeRange] = useState("this_month");
    const [chartMode, setChartMode] = useState<"revenue" | "trees_out">("revenue");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 1. KPIs
    const { data: stats, loading: kpiLoading, refetch: refetchKpis } = useDashboardKpis(timeRange);

    // 2. Chart
    const { data: chartData, loading: chartLoading, refetch: refetchChart } = useDashboardChart(chartMode, timeRange);

    // 3. Tasks-Moved to DashboardPriorityTasksCard
    // const { rows:tasks, loading:tasksLoading, error:tasksError, refetch:refetchTasks, meta:tasksMeta } = useDashboardTasks(8);

    // 4. Zones overview
    const {
        data: zones,
        loading: _zonesLoading,
        error: _zonesError,
        refetch: refetchZones,
    } = useDashboardZonesOverview();
    void _zonesLoading;
    void _zonesError;

    // 5. Alerts for Ops Snapshot (Lifted up)
    const { alerts: digAlerts, loading: alertsLoading } = useDashboardDigAndAlerts();

    const opsAlerts = React.useMemo(() => {
        return digAlerts.map(a => ({
            type: a.alert_type,
            message: a.message,
            severity: (a.alert_type === 'inspection_overdue' ? 'high' : a.alert_type === 'low_stock' ? 'medium' : 'low') as 'high' | 'medium' | 'low'
        }));
    }, [digAlerts]);

    // Refresh all data at once
    const handleRefreshAll = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                refetchKpis?.(),
                refetchChart?.(),
                refetchZones?.(),
            ]);
        } finally {
            // หน่วงเล็กน้อยให้เห็น animation
            setTimeout(() => setIsRefreshing(false), 400);
        }
    }, [refetchKpis, refetchChart, refetchZones]);

    // Auto-reload when reloadKey changes (triggered by child pages)
    React.useEffect(() => {
        if (reloadKey && reloadKey > 0) {
            handleRefreshAll();
        }
    }, [reloadKey, handleRefreshAll]);

    // จำกัดจำนวนโซนที่แสดงบน Dashboard (Top 5 เฉพาะโซนที่มีต้น)
    const MAX_DASHBOARD_ZONES = 5;
    const _zonesForTable = React.useMemo(() => {
        if (!zones || zones.length === 0) return [];
        return [...zones]
            // เอาเฉพาะโซนที่มีต้นรวม > 0
            .filter((z) => {
                const total = (z.total_tagged ?? 0) + (z.total_remaining_for_tag ?? 0);
                return total > 0;
            })
            // เรียงจากต้นรวมมาก → น้อย
            .sort((a, b) => {
                const totalA = (a.total_tagged ?? 0) + (a.total_remaining_for_tag ?? 0);
                const totalB = (b.total_tagged ?? 0) + (b.total_remaining_for_tag ?? 0);
                return totalB - totalA;
            })
            // เอาเฉพาะ 5 แถว
            .slice(0, MAX_DASHBOARD_ZONES);
    }, [zones]);
    // void _zonesForTable; // Used in ZonesSnapshot now

    return (
        <div className={PAGE_BG}>
            <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-8 py-6 pb-12 space-y-4 lg:space-y-5 2xl:space-y-6">
                {/* Header Section */}
                <div className={`${SURFACE} ${SURFACE_HOVER} px-6 py-5`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Dashboard</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">ระบบบริหารงานขายและต้นไม้ในแปลง — Ava Farm 888</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRefreshAll}
                                disabled={isRefreshing}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${isRefreshing ? "opacity-70 cursor-wait" : "hover:bg-slate-50 dark:hover:bg-white/10"
                                    } ${isDarkMode ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-600"}`}
                            >
                                <RefreshCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                                <span className="hidden sm:inline">รีเฟรช</span>
                            </button>

                            <div className="relative">
                                <select
                                    value={timeRange}
                                    onChange={(e) => setTimeRange(e.target.value)}
                                    className={`appearance-none pl-4 pr-10 py-2 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isDarkMode ? "bg-black border-white/10 text-white" : "bg-white border-slate-200 text-slate-700"
                                        }`}
                                >
                                    <option value="this_month">เดือนนี้</option>
                                    <option value="last_3m">3 เดือนล่าสุด</option>
                                    <option value="last_6m">6 เดือนล่าสุด</option>
                                    <option value="last_12m">12 เดือนล่าสุด</option>
                                </select>
                                <ChevronDown className={`absolute right-3 top-2.5 w-4 h-4 pointer-events-none ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row A:Financials */}
                <BillingKpiStrip isDarkMode={isDarkMode} />

                {/* Row B:Key Metrics (3 Cards) */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 2xl:gap-6">
                    <KpiCard
                        icon={<HandCoins className="h-6 w-6" />}
                        label="Open deals"
                        value={kpiLoading ? "..." : stats?.open_deals_count?.toLocaleString() ?? "0"}
                        sub={kpiLoading ? "Loading..." : `฿${stats?.open_deals_amount?.toLocaleString() ?? "0"} in pipeline`}
                        trend="+3 ดีล"
                        trendPositive
                        iconColor={isDarkMode ? "bg-sky-500/15 text-sky-400" : "bg-sky-50 text-sky-600"}
                        isDarkMode={isDarkMode}
                    />
                    <KpiCard
                        icon={<TreePine className="h-6 w-6" />}
                        label="Ready to sell"
                        value={kpiLoading ? "..." : stats?.ready_qty?.toLocaleString() ?? "0"}
                        sub={kpiLoading ? "Loading..." : `${stats?.ready_species_count ?? 0} species · ${stats?.ready_zone_count ?? 0} zones`}
                        trend="+8.4% vs last month"
                        trendPositive
                        iconColor={isDarkMode ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600"}
                        isDarkMode={isDarkMode}
                    />
                    {/* Using Active Dig Orders Qty as proxy for "Trees in process/out" */}
                    <KpiCard
                        icon={<Pickaxe className="h-6 w-6" />}
                        label="Trees in process"
                        value={kpiLoading ? "..." : stats?.active_dig_orders_qty?.toLocaleString() ?? "0"}
                        sub={kpiLoading ? "Loading..." : `${stats?.active_dig_orders_count ?? 0} active orders`}
                        trend="Moving now"
                        trendPositive
                        iconColor={isDarkMode ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600"}
                        isDarkMode={isDarkMode}
                    />
                </section>

                {/* Row C:Trends (Chart + Target) */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 2xl:gap-6 items-stretch">
                    {/* Chart (2/3) */}
                    <div className={`lg:col-span-2 p-6 lg:p-7 2xl:p-8 flex flex-col h-[360px] ${SURFACE}`}>
                        <div className="flex items-start justify-between mb-4 gap-3">
                            <div className="min-w-0">
                                <h2 className={"text-base " + TITLE}>
                                    {chartMode === "revenue" ? "Revenue Trend" : "Trees Out Trend"}
                                </h2>
                                <p className={"text-sm " + MUTED}>
                                    {chartMode === "revenue" ? "ยอดขายรวม (บาท)" : "จำนวนต้นไม้ที่ส่งออก (ต้น)"}
                                </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setChartMode("revenue")}
                                    className={`${PILL_BASE} ${chartMode === "revenue"
                                        ? (isDarkMode
                                            ? "bg-white/15 text-white border-white/15"
                                            : "bg-slate-900 text-white border-slate-900 shadow-sm")
                                        : (isDarkMode
                                            ? "bg-white/10 text-slate-200 border-white/10 hover:bg-white/15"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                                        }`}
                                >
                                    Revenue
                                </button>
                                <button
                                    onClick={() => setChartMode("trees_out")}
                                    className={`${PILL_BASE} ${chartMode === "trees_out"
                                        ? (isDarkMode
                                            ? "bg-white/15 text-white border-white/15"
                                            : "bg-slate-900 text-white border-slate-900 shadow-sm")
                                        : (isDarkMode
                                            ? "bg-white/10 text-slate-200 border-white/10 hover:bg-white/15"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                                        }`}
                                >
                                    Trees out
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0">
                            {chartLoading ? (
                                <div className={"flex h-full items-center justify-center text-sm " + MUTED}>
                                    Loading chart...
                                </div>
                            ) : chartData.length === 0 ? (
                                <div className={`flex h-full flex-col items-center justify-center text-center p-6 ${SOFT_INNER}`}>
                                    <div className={"text-sm font-semibold " + TITLE}>
                                        ยังไม่มีข้อมูล{chartMode === 'trees_out' ? 'การขนส่ง' : ''}ในช่วงนี้
                                    </div>
                                    <div className={"text-xs mt-1 " + MUTED}>
                                        {chartMode === 'trees_out'
                                            ? "ลองสร้างรายการขนส่งเพื่อเริ่มนับ Trees out"
                                            : "ไม่มียอดขายในช่วงเวลาที่เลือก"}
                                    </div>
                                    {chartMode === 'trees_out' && (
                                        <button
                                            onClick={onCreateShipment}
                                            className="mt-3 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm hover:bg-slate-800 transition-colors"
                                        >
                                            Create shipment
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData.map((d) => ({
                                            name: new Date(d.date).toLocaleDateString("th-TH", { month: "short" }),
                                            value: d.value,
                                        }))}
                                        margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke={isDarkMode ? "#1E293B" : "#E5E7EB"}
                                        />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{
                                                fill: isDarkMode ? "#94a3b8" : "#9CA3AF",
                                                fontSize: 12,
                                            }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{
                                                fill: isDarkMode ? "#94a3b8" : "#9CA3AF",
                                                fontSize: 12,
                                            }}
                                            tickFormatter={(val) =>
                                                val >= 1000 ? `${(val / 1000).toFixed(0)} k` : val
                                            }
                                        />
                                        <Tooltip
                                            cursor={{ fill: isDarkMode ? "#1e293b" : "#F3F4F6" }}
                                            contentStyle={{
                                                backgroundColor: isDarkMode ? "#020617" : "#fff",
                                                border: isDarkMode ? "1px solid #1f2937" : "1px solid #e5e7eb",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                                                color: isDarkMode ? "#e5e7eb" : "#374151",
                                            }}
                                            formatter={(val: number) => [
                                                chartMode === "revenue"
                                                    ? `฿${val.toLocaleString()} `
                                                    : `${val.toLocaleString()} ต้น`,
                                                chartMode === "revenue" ? "ยอดขาย" : "จำนวนต้น",
                                            ]}
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill={
                                                chartMode === "revenue"
                                                    ? isDarkMode
                                                        ? "#22c55e"
                                                        : "#10B981"
                                                    : "#3B82F6"
                                            }
                                            radius={[6, 6, 0, 0]}
                                            barSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Target (1/3) */}
                    <div className="lg:col-span-1 h-[360px]">
                        <MonthlyTargetCard isDarkMode={isDarkMode} />
                    </div>
                </section>

                {/* Row D: Ops & Tasks */}
                <section className="grid grid-cols-1 gap-4 lg:gap-5 items-stretch xl:grid-cols-[minmax(0,1fr)_460px]">
                    {/* Ops Snapshot */}
                    <div className="min-w-0 flex flex-col gap-4 lg:gap-5">
                        <OpsSnapshot
                            stats={stats || {}}
                            alerts={opsAlerts}
                            loading={kpiLoading || alertsLoading}
                        />
                        <ZonesSnapshot
                            zones={_zonesForTable}
                            onOpenZone={onOpenZone}
                            onOpenZonesList={onOpenZonesList}
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* Priority Tasks */}
                    <div className="min-w-0 h-full">
                        <DashboardPriorityTasksCard onOpenTasks={onOpenTasks} />
                    </div>
                </section>
            </div>
        </div>
    );
}


/* ----------------- small components ----------------- */

type KpiCardProps = {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    trend: string;
    trendPositive?: boolean;
    iconColor?: string;
    isDarkMode?: boolean;
    cardBg?: string;
};

const KpiCard: React.FC<KpiCardProps> = ({
    icon,
    label,
    value,
    sub,
    trend,
    trendPositive = true,
    iconColor = "bg-emerald-50 text-emerald-600",
    isDarkMode = false,
    cardBg,
}) => (
    <div className={`flex flex-col justify-between p-5 min-h-[110px] ${SURFACE} ${SURFACE_HOVER}`}>
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
                <div className={"flex h-12 w-12 items-center justify-center rounded-full " + iconColor}>
                    {icon}
                </div>
                <div>
                    <div className={"text-sm font-medium " + MUTED}>{label}</div>
                    <div className={"text-2xl font-bold tracking-tight mt-0.5 " + (isDarkMode ? "text-slate-50" : "text-slate-900")}>
                        {value}
                    </div>
                </div>
            </div>
            <span
                className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 " +
                    (trendPositive
                        ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-700")
                        : (isDarkMode ? "bg-rose-500/15 text-rose-400" : "bg-rose-50 text-rose-700")
                    )}
            >
                {trend}
            </span>
        </div>
        <div className={"mt-4 text-xs pl-16 " + (isDarkMode ? "text-slate-400" : "text-slate-500")}>{sub}</div>
    </div>
);


