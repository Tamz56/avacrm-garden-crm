import React, { useState, useCallback } from "react";
import {
    TreePine,
    Tag,
    HandCoins,
    Pickaxe,
    ArrowUpRight,
    AlertCircle,
    ChevronRight,
    PlusCircle,
    RefreshCw,
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
import { useDashboardTasks } from "../hooks/useDashboardTasks";
import { useDashboardDigAndAlerts } from "../hooks/useDashboardDigAndAlerts";
import { useDashboardZonesOverview } from "../hooks/useDashboardZonesOverview";
import SalesActivityMiniCard from "./dashboard/SalesActivityMiniCard";
import TagLifecycleSummaryCard from "./tags/TagLifecycleSummaryCard";

interface DashboardProps {
    isDarkMode: boolean;
    onOpenZone?: (zoneId: string) => void;
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
}

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
}: DashboardProps) {
    const [timeRange, setTimeRange] = useState("this_month");
    const [chartMode, setChartMode] = useState<"revenue" | "trees_out">("revenue");

    // 1. KPIs
    const { data: stats, loading: kpiLoading, refetch: refetchKpis } = useDashboardKpis(timeRange);

    // 2. Chart
    const { data: chartData, loading: chartLoading, refetch: refetchChart } = useDashboardChart(chartMode, timeRange);

    // 3. Tasks
    const { data: tasks, loading: tasksLoading, refetch: refetchTasks } = useDashboardTasks(timeRange);

    // 4. Zones overview
    const {
        data: zones,
        loading: zonesLoading,
        error: zonesError,
        refetch: refetchZones,
    } = useDashboardZonesOverview();

    // Refresh all data at once
    const handleRefreshAll = useCallback(() => {
        refetchKpis?.();
        refetchChart?.();
        refetchTasks?.();
        refetchZones?.();
    }, [refetchKpis, refetchChart, refetchTasks, refetchZones]);

    // Auto-reload when reloadKey changes (triggered by child pages)
    React.useEffect(() => {
        if (reloadKey && reloadKey > 0) {
            handleRefreshAll();
        }
    }, [reloadKey, handleRefreshAll]);

    // จำกัดจำนวนโซนที่แสดงบน Dashboard (Top 5 เฉพาะโซนที่มีต้น)
    const MAX_DASHBOARD_ZONES = 5;
    const zonesForTable = React.useMemo(() => {
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

    const bgClass = isDarkMode ? "bg-slate-950" : "bg-slate-50";
    const cardBg = isDarkMode
        ? "bg-slate-900/60 border-slate-800 shadow-[0_0_0_1px_rgba(15,23,42,0.8)]"
        : "bg-white border-slate-100 shadow-sm";
    const textMain = isDarkMode ? "text-slate-50" : "text-slate-900";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";


    return (
        <div className={`w-full min-h-screen ${bgClass} px-6 py-6 lg:px-8 transition-colors duration-200`}>
            <div className="mx-auto max-w-[1600px] space-y-6">
                {/* Top bar (Page Header) */}
                <header className={`flex items-center justify-between rounded-2xl border px-6 py-4 ${cardBg}`}>
                    <div>
                        <h1 className={`text-lg font-semibold ${textMain}`}>
                            Dashboard
                        </h1>
                        <p className={`text-xs ${textMuted}`}>
                            ระบบบริหารงานขายและต้นไม้ในแปลง – Ava Farm 888
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleRefreshAll}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors
                                ${isDarkMode
                                    ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500/50 hover:text-emerald-300"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                                }`}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            รีเฟรช
                        </button>
                        <select
                            className={`rounded-lg border px-3 py-1.5 text-xs shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ${isDarkMode
                                ? "bg-slate-950 border-slate-700 text-slate-200"
                                : "bg-white border-slate-200 text-slate-700"
                                }`}
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            <option value="this_month">เดือนนี้</option>
                            <option value="last_3m">3 เดือนล่าสุด</option>
                            <option value="last_6m">6 เดือนล่าสุด</option>
                            <option value="last_12m">12 เดือนล่าสุด</option>
                        </select>
                    </div>
                </header>

                {/* KPI row */}
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <KpiCard
                        icon={<TreePine className="h-6 w-6" />}
                        label="Ready to sell"
                        value={kpiLoading ? "..." : stats?.ready_qty?.toLocaleString() ?? "0"}
                        sub={kpiLoading ? "Loading..." : `${stats?.ready_species_count ?? 0} species · ${stats?.ready_zone_count ?? 0} zones`}
                        trend="+8.4% vs last month"
                        trendPositive
                        iconColor={isDarkMode ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600"}
                        isDarkMode={isDarkMode}
                        cardBg={cardBg}
                    />
                    <KpiCard
                        icon={<Tag className="h-6 w-6" />}
                        label="Untagged trees"
                        value={kpiLoading ? "..." : stats?.untagged_qty?.toLocaleString() ?? "0"}
                        sub={kpiLoading ? "Loading..." : `ใน ${stats?.untagged_zone_count ?? 0} zones`}
                        trend="-4.2% vs last month"
                        trendPositive={false}
                        iconColor={isDarkMode ? "bg-rose-500/15 text-rose-400" : "bg-rose-50 text-rose-600"}
                        isDarkMode={isDarkMode}
                        cardBg={cardBg}
                    />
                    <KpiCard
                        icon={<HandCoins className="h-6 w-6" />}
                        label="Open deals"
                        value={kpiLoading ? "..." : stats?.open_deals_count?.toLocaleString() ?? "0"}
                        sub={kpiLoading ? "Loading..." : `฿${stats?.open_deals_amount?.toLocaleString() ?? "0"} in pipeline`}
                        trend="+3 ดีล"
                        trendPositive
                        iconColor={isDarkMode ? "bg-sky-500/15 text-sky-400" : "bg-sky-50 text-sky-600"}
                        isDarkMode={isDarkMode}
                        cardBg={cardBg}
                    />
                    <KpiCard
                        icon={<Pickaxe className="h-6 w-6" />}
                        label="Active dig orders"
                        value={kpiLoading ? "..." : stats?.active_dig_orders_count?.toLocaleString() ?? "0"}
                        sub={kpiLoading ? "Loading..." : `รวม ${stats?.active_dig_orders_qty?.toLocaleString() ?? "0"} ต้น`}
                        trend="2 today"
                        trendPositive
                        iconColor={isDarkMode ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600"}
                        isDarkMode={isDarkMode}
                        cardBg={cardBg}
                    />
                </section>


                {/* Main content grid 1: Chart + Lifecycle (left) / Activity + Target (right) */}
                <section className="grid grid-cols-12 gap-6 items-start">
                    {/* LEFT: Chart + Tag lifecycle */}
                    <div className="col-span-12 xl:col-span-8 space-y-6">
                        {/* Chart card */}
                        <div className={`rounded-2xl border p-6 flex flex-col ${cardBg}`}>
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className={`text-base font-semibold ${textMain}`}>
                                        {chartMode === "revenue" ? "Revenue Trend" : "Trees Out Trend"}
                                    </h2>
                                    <p className={`text-sm ${textMuted}`}>
                                        {chartMode === "revenue" ? "ยอดขายรวม (บาท)" : "จำนวนต้นไม้ที่ส่งออก (ต้น)"}
                                    </p>
                                </div>
                                <div
                                    className={`flex items-center gap-1 rounded-full p-1 text-xs ${isDarkMode ? "bg-slate-950" : "bg-slate-50"
                                        }`}
                                >
                                    <button
                                        onClick={() => setChartMode("revenue")}
                                        className={`rounded-full px-3 py-1.5 font-medium transition-all ${chartMode === "revenue"
                                            ? isDarkMode
                                                ? "bg-slate-800 text-slate-200 shadow-sm"
                                                : "bg-white text-slate-900 shadow-sm"
                                            : isDarkMode
                                                ? "text-slate-500 hover:text-slate-300"
                                                : "text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        Revenue
                                    </button>
                                    <button
                                        onClick={() => setChartMode("trees_out")}
                                        className={`rounded-full px-3 py-1.5 font-medium transition-all ${chartMode === "trees_out"
                                            ? isDarkMode
                                                ? "bg-slate-800 text-slate-200 shadow-sm"
                                                : "bg-white text-slate-900 shadow-sm"
                                            : isDarkMode
                                                ? "text-slate-500 hover:text-slate-300"
                                                : "text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        Trees out
                                    </button>
                                </div>
                            </div>

                            <div className="w-full h-52 lg:h-60 xl:h-64 max-h-[260px]">
                                {chartLoading ? (
                                    <div className={`flex h-full items-center justify-center text-sm ${textMuted}`}>
                                        Loading chart...
                                    </div>
                                ) : chartData.length === 0 ? (
                                    <div className={`flex h-full items-center justify-center text-sm ${textMuted}`}>
                                        No data available for this period
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
                                                    val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
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
                                                        ? `฿${val.toLocaleString()}`
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
                                )
                                }
                            </div>

                            <div
                                className={`mt-3 flex items-center justify-between text-xs ${textMuted} pt-3 border-t ${isDarkMode ? "border-slate-800" : "border-slate-50"
                                    }`}
                            >
                                <span>แหล่งข้อมูล: {chartMode === "revenue" ? "deal payments" : "shipments"}</span>
                                <button
                                    type="button"
                                    onClick={() => onOpenRevenueReport?.(chartMode, timeRange)}
                                    className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:text-emerald-700"
                                >
                                    View full report
                                    <ArrowUpRight className="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        {/* Tag Lifecycle Summary */}
                        <TagLifecycleSummaryCard isDarkMode={isDarkMode} />
                    </div>

                    {/* RIGHT: Monthly target + Priority tasks */}
                    <div className="col-span-12 xl:col-span-4 space-y-6">
                        <MonthlyTargetCard isDarkMode={isDarkMode} />

                        {/* Priority tasks */}
                        <div className={`rounded-2xl border p-6 ${cardBg}`}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className={`text-base font-semibold ${textMain}`}>
                                    Priority tasks
                                </h2>
                                <button className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                                    See all
                                </button>
                            </div>

                            <div className="space-y-3">
                                {tasksLoading ? (
                                    <div className={`py-8 text-center text-sm ${textMuted}`}>
                                        Loading tasks...
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <div className={`py-8 text-center text-sm ${textMuted}`}>
                                        No priority tasks today
                                    </div>
                                ) : (
                                    tasks.map((task, idx) => (
                                        <PriorityTask
                                            key={idx}
                                            label={task.title}
                                            detail={task.subtitle}
                                            badge={task.badge}
                                            badgeColor={
                                                task.task_type === "dig_overdue"
                                                    ? isDarkMode
                                                        ? "bg-rose-500/15 text-rose-400"
                                                        : "bg-rose-50 text-rose-700"
                                                    : task.task_type === "zone_inspection"
                                                        ? isDarkMode
                                                            ? "bg-amber-500/15 text-amber-400"
                                                            : "bg-amber-50 text-amber-700"
                                                        : isDarkMode
                                                            ? "bg-emerald-500/15 text-emerald-400"
                                                            : "bg-emerald-50 text-emerald-700"
                                            }
                                            isDarkMode={isDarkMode}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main content grid 2: Zones + Dig/Stock alerts (left) / Tasks + Quick actions (right) */}
                <section className="grid grid-cols-12 gap-6 items-start mt-6">
                    {/* LEFT: Zones overview + Dig & stock alerts */}
                    <div className="col-span-12 xl:col-span-8 space-y-6">
                        {/* Zones / stock table */}
                        <div className={`rounded-2xl border p-6 ${cardBg}`}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className={`text-base font-semibold ${textMain}`}>
                                    Zones & stock overview
                                </h2>
                                <button
                                    type="button"
                                    onClick={onOpenZonesList}
                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                                >
                                    View all zones
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full border-separate border-spacing-y-1 text-xs">
                                    <thead>
                                        <tr className={textMuted}>
                                            <th className="px-3 py-2 text-left font-medium">Zone</th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Main species / size
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">Ready</th>
                                            <th className="px-3 py-2 text-right font-medium">Untagged</th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Last inspection
                                            </th>
                                            <th className="px-3 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {zonesLoading ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className={`px-3 py-6 text-center text-xs ${textMuted}`}
                                                >
                                                    Loading zones...
                                                </td>
                                            </tr>
                                        ) : zonesError ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-3 py-6 text-center text-xs text-rose-500"
                                                >
                                                    Error loading zones overview: {zonesError}
                                                </td>
                                            </tr>
                                        ) : zones.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className={`px-3 py-6 text-center text-xs ${textMuted}`}
                                                >
                                                    ยังไม่มีโซนที่มีข้อมูลสต็อก
                                                </td>
                                            </tr>
                                        ) : (
                                            zonesForTable.map((z) => {
                                                const ready = z.total_tagged ?? 0;
                                                const untagged = z.total_remaining_for_tag ?? 0;

                                                return (
                                                    <tr
                                                        key={z.id}
                                                        className={`rounded-xl transition-colors align-middle ${isDarkMode
                                                            ? "bg-slate-950 hover:bg-slate-800"
                                                            : "bg-slate-50 hover:bg-slate-100"
                                                            }`}
                                                    >
                                                        {/* Zone / farm */}
                                                        <td
                                                            className={`px-3 py-2 text-left font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"
                                                                }`}
                                                        >
                                                            {z.name}
                                                            <div
                                                                className={`text-[10px] font-normal ${textMuted}`}
                                                            >
                                                                {z.farm_name ?? ""}
                                                            </div>
                                                        </td>

                                                        {/* Main species / size */}
                                                        <td
                                                            className={`px-3 py-2 text-left ${isDarkMode ? "text-slate-300" : "text-slate-700"
                                                                }`}
                                                        >
                                                            {z.main_species_name_th ?? "Multiple species"}
                                                            <div className={`text-[10px] ${textMuted}`}>
                                                                {z.main_size_label
                                                                    ? z.main_size_label
                                                                    : z.main_species_name_th
                                                                        ? "หลายขนาด"
                                                                        : "—"}
                                                            </div>
                                                        </td>

                                                        {/* Ready */}
                                                        <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                                                            {ready.toLocaleString()}
                                                        </td>

                                                        {/* Untagged */}
                                                        <td
                                                            className={`px-3 py-2 text-right ${isDarkMode
                                                                ? "text-slate-400"
                                                                : "text-slate-600"
                                                                }`}
                                                        >
                                                            {untagged.toLocaleString()}
                                                        </td>

                                                        {/* Last inspection */}
                                                        <td
                                                            className={`px-3 py-2 text-left ${isDarkMode
                                                                ? "text-slate-400"
                                                                : "text-slate-600"
                                                                }`}
                                                        >
                                                            {z.last_inspection_date
                                                                ? new Date(
                                                                    z.last_inspection_date
                                                                ).toLocaleDateString("en-GB", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })
                                                                : "-"}
                                                        </td>

                                                        {/* View button */}
                                                        <td className="px-3 py-2 text-right">
                                                            <button
                                                                onClick={() =>
                                                                    onOpenZone && onOpenZone(z.id)
                                                                }
                                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition-colors ${isDarkMode
                                                                    ? "border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                    }`}
                                                            >
                                                                View
                                                                <ChevronRight className="h-3 w-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* แสดงจำนวนโซนทั้งหมด */}
                            {!zonesLoading && !zonesError && zones.length > 0 && (
                                <div className={`mt-3 text-[11px] ${textMuted}`}>
                                    Showing {zonesForTable.length} of {zones.length} zones
                                </div>
                            )}
                        </div>

                        {/* Dig report & Stock alerts */}
                        <DigAndStockAlertsCard isDarkMode={isDarkMode} onOpenZone={onOpenZone} />
                    </div>

                    {/* RIGHT: Sales activity + Quick actions */}
                    <div className="col-span-12 xl:col-span-4 space-y-6">
                        {/* Sales activity */}
                        <SalesActivityMiniCard />

                        {/* Quick actions */}
                        <div className={`rounded-2xl border p-6 h-fit ${cardBg}`}>
                            <h2 className={`mb-4 text-base font-semibold ${textMain}`}>
                                Quick actions
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                <QuickAction label="Create deal" isDarkMode={isDarkMode} onClick={onCreateDeal} />
                                <QuickAction label="Create dig order" isDarkMode={isDarkMode} onClick={onCreateDigOrder} />
                                <QuickAction label="Create shipment" isDarkMode={isDarkMode} onClick={onCreateShipment} />
                                <QuickAction label="Open lifecycle view" isDarkMode={isDarkMode} onClick={onOpenLifecycleView} />
                                <QuickAction label="Species stock view" isDarkMode={isDarkMode} onClick={onOpenSpeciesStockView} />
                                <QuickAction label="Search tags" isDarkMode={isDarkMode} onClick={onSearchTags} />
                            </div>

                            <div
                                className={`mt-6 flex items-start gap-3 rounded-xl p-3 text-xs ${isDarkMode
                                    ? "bg-slate-950 text-slate-400"
                                    : "bg-slate-50 text-slate-500"
                                    }`}
                            >
                                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                                <p>
                                    ภาพรวมนี้ยังเป็น mock data – ต่อ Supabase จาก views /
                                    RPC ได้ทีหลังตาม field เดียวกันนี้เลย
                                </p>
                            </div>
                        </div>
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
    cardBg = "bg-white border-slate-100 shadow-sm",
}) => (
    <div className={`flex flex-col justify-between rounded-2xl border p-5 hover:shadow-md transition-shadow ${cardBg}`}>
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconColor}`}>
                    {icon}
                </div>
                <div>
                    <div className={`text-sm font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
                    <div className={`text-2xl font-bold tracking-tight mt-0.5 ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                        {value}
                    </div>
                </div>
            </div>
            <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${trendPositive
                    ? (isDarkMode ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-700")
                    : (isDarkMode ? "bg-rose-500/15 text-rose-400" : "bg-rose-50 text-rose-700")
                    }`}
            >
                {trend}
            </span>
        </div>
        <div className={`mt-4 text-xs pl-16 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{sub}</div>
    </div>
);

type PriorityTaskProps = {
    label: string;
    detail: string;
    badge: string;
    badgeColor?: string;
    isDarkMode?: boolean;
};

const PriorityTask: React.FC<PriorityTaskProps> = ({
    label,
    detail,
    badge,
    badgeColor = "bg-emerald-50 text-emerald-700",
    isDarkMode = false,
}) => (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors cursor-pointer ${isDarkMode ? "bg-slate-950 hover:bg-slate-800" : "bg-slate-50 hover:bg-slate-100"}`}>
        <div>
            <div className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                {label}
            </div>
            <div className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{detail}</div>
        </div>
        <span
            className={`ml-3 rounded-full px-2.5 py-1 text-[10px] font-medium ${badgeColor}`}
        >
            {badge}
        </span>
    </div>
);

const MonthlyTargetCard = ({ isDarkMode }: { isDarkMode?: boolean }) => {
    // Mock data for now
    const target = 600000;    // ฿600k
    const current = 540000;   // ฿540k
    const percent = Math.round((current / target) * 100);

    return (
        <div className={`rounded-2xl p-6 shadow-md relative overflow-hidden ${isDarkMode ? "bg-slate-900 text-white border border-slate-800" : "bg-slate-900 text-white"}`}>
            {/* Background decorations */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute bottom-0 right-4 w-16 h-16 bg-emerald-500/20 rounded-full" />

            <h3 className="text-sm font-medium text-slate-200 mb-2">
                Monthly revenue target
            </h3>
            <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold">
                    ฿{current.toLocaleString("th-TH")}
                </span>
                <span className="text-sm text-slate-400 mb-1">
                    / ฿{target.toLocaleString("th-TH")}
                </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-2 bg-emerald-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>

            <p className="mt-2 text-xs text-emerald-300">
                🎉 Achieved {percent}% of this month&apos;s target
            </p>
        </div>
    );
};

type QuickActionProps = {
    label: string;
    isDarkMode?: boolean;
    onClick?: () => void;
};

const QuickAction: React.FC<QuickActionProps> = ({ label, isDarkMode = false, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-xs font-medium transition-all shadow-sm hover:shadow ${isDarkMode
            ? "border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/30 hover:text-emerald-700"
            }`}>
        <span>{label}</span>
        <PlusCircle className={`h-4 w-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
    </button>
);

type DigAndStockAlertsCardProps = {
    isDarkMode?: boolean;
    onOpenZone?: (zoneId: string) => void;
};

const DigAndStockAlertsCard: React.FC<DigAndStockAlertsCardProps> = ({
    isDarkMode = false,
    onOpenZone,
}) => {
    const { summary, alerts, loading, error } = useDashboardDigAndAlerts();

    const monthDigQty = summary?.month_dig_qty ?? 0;
    const upcomingQty = summary?.upcoming_7d_qty ?? 0;

    const cardTextMain = isDarkMode ? "text-slate-50" : "text-slate-900";
    const cardTextMuted = isDarkMode ? "text-slate-400" : "text-slate-600";
    const border = isDarkMode ? "border-slate-800" : "border-slate-100";
    const bg = isDarkMode ? "bg-slate-900/60" : "bg-white";

    const getBadgeColor = (type: string, isDarkMode: boolean) => {
        if (type === "low_stock") {
            // 🟠 ส้ม
            return isDarkMode
                ? "bg-amber-500/15 text-amber-300"
                : "bg-amber-50 text-amber-700";
        }
        if (type === "high_untagged") {
            // 🔵 ฟ้า
            return isDarkMode
                ? "bg-sky-500/15 text-sky-300"
                : "bg-sky-50 text-sky-700";
        }
        // inspection_overdue / อื่น ๆ → 🔴 แดง
        return isDarkMode
            ? "bg-rose-500/15 text-rose-300"
            : "bg-rose-50 text-rose-700";
    };

    const getAlertIcon = (type: string) => {
        if (type === "low_stock") return "🟠";
        if (type === "high_untagged") return "🔵";
        return "🔴"; // inspection_overdue หรืออย่างอื่น
    };

    return (
        <div className={`rounded-2xl border ${border} ${bg} p-4`}>
            {/* Header + Stats in one row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className={`text-sm font-semibold ${cardTextMain}`}>
                    Dig & Stock Alerts
                </h2>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className={cardTextMuted}>ขุดเดือนนี้</span>
                        <span className={`font-semibold ${cardTextMain}`}>{monthDigQty.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={cardTextMuted}>แผน 7 วัน</span>
                        <span className={`font-semibold ${cardTextMain}`}>{upcomingQty.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Stock alerts - compact list (max 3) */}
            {loading ? (
                <div className={`py-2 text-xs ${cardTextMuted}`}>กำลังโหลด...</div>
            ) : error ? (
                <div className="py-2 text-xs text-rose-500">Error: {error}</div>
            ) : alerts.length === 0 ? (
                <div className={`py-2 text-xs ${cardTextMuted}`}>
                    ✓ ไม่มี alert ที่ต้องจัดการ
                </div>
            ) : (
                <div className="space-y-2">
                    {alerts.slice(0, 3).map((a, idx) => {
                        const clickable = !!a.zone_id && a.alert_type !== "inspection_overdue";

                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (clickable && a.zone_id && onOpenZone) {
                                        onOpenZone(a.zone_id);
                                    }
                                }}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${isDarkMode ? "bg-slate-950" : "bg-slate-50"
                                    } ${clickable
                                        ? isDarkMode
                                            ? "hover:bg-slate-800 cursor-pointer"
                                            : "hover:bg-slate-100 cursor-pointer"
                                        : ""
                                    }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <span>{getAlertIcon(a.alert_type)}</span>
                                    <span className={`truncate ${cardTextMain}`}>
                                        {a.alert_type === "inspection_overdue"
                                            ? `${a.message}`
                                            : `${a.zone_name ?? ""} · ${a.message}`}
                                    </span>
                                </div>
                                <span
                                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getBadgeColor(
                                        a.alert_type,
                                        isDarkMode
                                    )}`}
                                >
                                    {a.alert_type === "low_stock"
                                        ? "Low"
                                        : a.alert_type === "high_untagged"
                                            ? "Untagged"
                                            : "Inspect"}
                                </span>
                            </div>
                        );
                    })}
                    {alerts.length > 3 && (
                        <div className={`text-center text-[11px] ${cardTextMuted}`}>
                            +{alerts.length - 3} more alerts
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

