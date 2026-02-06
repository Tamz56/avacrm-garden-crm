
import React, { useState, useCallback } from "react";
import {
    TreePine,
    HandCoins,
    RefreshCcw,
    ChevronDown,
    Pickaxe,
    PlusCircle,
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
import { useDashboardZonesOverview } from "../hooks/useDashboardZonesOverview";
// import SalesActivityMiniCard from "./dashboard/SalesActivityMiniCard";
import DashboardPriorityTasksCard from "./dashboard/DashboardPriorityTasksCard";
// import TagLifecycleSummaryCard from "./tags/TagLifecycleSummaryCard";
import BillingKpiStrip from "./dashboard/BillingKpiStrip";
import OpsSnapshot from "./dashboard/OpsSnapshot";

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
    onOpenTasks?: () => void;
}



// ... existing imports ...

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
    void _zonesForTable;

    const bgClass = isDarkMode ? "bg-black" : "bg-slate-50";
    const cardBg = isDarkMode
        ? "bg-slate-900/60 border-slate-800 shadow-[0_0_0_1px_rgba(15,23,42,0.8)]"
        : "bg-white border-slate-100 shadow-sm";
    const textMain = isDarkMode ? "text-slate-50" : "text-slate-900";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";


    return (
        <div className={"w-full min-h-screen px-6 py-6 lg:px-8 transition-colors duration-200 " + bgClass}>
            <div className="mx-auto max-w-[1600px] space-y-6">
                {/* Top bar (Page Header) */}
                <header className={"flex items-center justify-between rounded-2xl border px-6 py-4 " + cardBg}>
                    <div>
                        <h1 className={"text-lg font-semibold " + textMain}>
                            Dashboard
                        </h1>
                        <p className={"text-xs " + textMuted}>
                            ระบบบริหารงานขายและต้นไม้ในแปลง – Ava Farm 888
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Refresh */}
                        <button
                            type="button"
                            onClick={handleRefreshAll}
                            disabled={isRefreshing}
                            className={
                                "inline-flex items-center gap-2 h-9 px-3 rounded-xl border text-sm font-medium transition-colors " +
                                (isDarkMode
                                    ? "bg-slate-900/40 border-slate-700 text-slate-100 hover:bg-slate-900/60"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50") +
                                " disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                            }
                            title="รีเฟรชข้อมูล"
                        >
                            <RefreshCcw className={"w-4 h-4 " + (isRefreshing ? "animate-spin" : "")} />
                            <span>รีเฟรช</span>
                        </button>

                        {/* Month select */}
                        <div className="relative">
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className={
                                    "appearance-none h-9 pl-3 pr-9 rounded-xl border text-sm font-medium shadow-sm outline-none cursor-pointer transition-colors " +
                                    (isDarkMode
                                        ? "bg-slate-900/40 border-slate-700 text-slate-100 focus:border-slate-500"
                                        : "bg-white border-slate-200 text-slate-700 focus:border-slate-400")
                                }
                            >
                                <option value="this_month">เดือนนี้</option>
                                <option value="last_3m">3 เดือนล่าสุด</option>
                                <option value="last_6m">6 เดือนล่าสุด</option>
                                <option value="last_12m">12 เดือนล่าสุด</option>
                            </select>
                            <ChevronDown
                                className={
                                    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 " +
                                    (isDarkMode ? "text-slate-300" : "text-slate-500")
                                }
                            />
                        </div>
                    </div>
                </header>

                {/* Row A:Financials */}
                <BillingKpiStrip />

                {/* Row B:Key Metrics (3 Cards) */}
                <section className="grid gap-6 md:grid-cols-3">
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
                        cardBg={cardBg}
                    />
                </section>

                {/* Row C:Trends (Chart + Target) */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {/* Chart (2/3) */}
                    <div className={"lg:col-span-2 rounded-2xl border p-6 flex flex-col h-[360px] " + cardBg}>
                        <div className="flex items-start justify-between mb-4 gap-3">
                            <div className="min-w-0">
                                <h2 className={"text-base font-semibold " + textMain}>
                                    {chartMode === "revenue" ? "Revenue Trend" : "Trees Out Trend"}
                                </h2>
                                <p className={"text-sm " + textMuted}>
                                    {chartMode === "revenue" ? "ยอดขายรวม (บาท)" : "จำนวนต้นไม้ที่ส่งออก (ต้น)"}
                                </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setChartMode("revenue")}
                                    className={"px-3 py-1 rounded-full text-xs border transition-colors " +
                                        (chartMode === "revenue"
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        )}
                                >
                                    Revenue
                                </button>
                                <button
                                    onClick={() => setChartMode("trees_out")}
                                    className={"px-3 py-1 rounded-full text-xs border transition-colors " +
                                        (chartMode === "trees_out"
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        )}
                                >
                                    Trees out
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0">
                            {chartLoading ? (
                                <div className={"flex h-full items-center justify-center text-sm " + textMuted}>
                                    Loading chart...
                                </div>
                            ) : chartData.length === 0 ? (
                                <div className={"flex h-full flex-col items-center justify-center text-center p-6 rounded-xl " + (isDarkMode ? "bg-slate-900/40" : "bg-slate-50")}>
                                    <div className={"text-sm font-semibold " + textMain}>
                                        ยังไม่มีข้อมูล{chartMode === 'trees_out' ? 'การขนส่ง' : ''}ในช่วงนี้
                                    </div>
                                    <div className={"text-xs mt-1 " + textMuted}>
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

                {/* Row D:Ops & Tasks */}
                <section className="grid grid-cols-1 gap-6 items-start xl:grid-cols-[minmax(0,1fr)_480px]">
                    {/* Ops Snapshot */}
                    <div>
                        <OpsSnapshot
                            stats={stats || {}}
                            alerts={opsAlerts}
                            loading={kpiLoading || alertsLoading}
                        />
                    </div>

                    {/* Priority Tasks */}
                    <div className="h-full">
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
    cardBg = "bg-white border-slate-100 shadow-sm",
}) => (
    <div className={"flex flex-col justify-between rounded-2xl border p-5 hover:shadow-md transition-shadow min-h-[110px] " + cardBg}>
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
                <div className={"flex h-12 w-12 items-center justify-center rounded-full " + iconColor}>
                    {icon}
                </div>
                <div>
                    <div className={"text-sm font-medium " + (isDarkMode ? "text-slate-400" : "text-slate-500")}>{label}</div>
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

type PriorityTaskProps = {
    label: string;
    detail: string;
    badge: string;
    badgeColor?: string;
    isDarkMode?: boolean;
};

const _PriorityTask: React.FC<PriorityTaskProps> = ({
    label,
    detail,
    badge,
    badgeColor = "bg-emerald-50 text-emerald-700",
    isDarkMode = false,
}) => (
    <div className={`flex items - center justify - between rounded - xl px - 4 py - 3 transition - colors cursor - pointer ${isDarkMode ? "bg-slate-950 hover:bg-slate-800" : "bg-slate-50 hover:bg-slate-100"} `}>
        <div>
            <div className={`text - sm font - medium ${isDarkMode ? "text-slate-200" : "text-slate-900"} `}>
                {label}
            </div>
            <div className={`text - xs mt - 0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"} `}>{detail}</div>
        </div>
        <span
            className={`ml - 3 rounded - full px - 2.5 py - 1 text - [10px] font - medium ${badgeColor} `}
        >
            {badge}
        </span>
    </div>
);
void _PriorityTask;

const MonthlyTargetCard = ({ isDarkMode }: { isDarkMode?: boolean }) => {
    // Mock data for now
    const target = 600000; // ฿600k
    const current = 540000; // ฿540k

    const remaining = Math.max(target - current, 0);
    const progress = target > 0 ? (current / target) * 100 : 0;
    const percent = Math.round(progress);
    const barWidth = `${Math.min(100, Math.max(0, progress))}% `;

    const fmt = (n: number) => `฿${n.toLocaleString("th-TH")} `;

    // --- optional:required per day (until end of this month) ---
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = Math.max(
        1,
        Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const requiredPerDay = Math.ceil(remaining / daysLeft);

    const cardBase =
        "rounded-2xl p-6 shadow-md relative overflow-hidden bg-slate-900 text-white h-full flex flex-col justify-between";
    const cardBorder = isDarkMode ? " border border-slate-800" : "";

    return (
        <div className={`${cardBase}${cardBorder} `}>
            {/* Background decorations */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute bottom-0 right-4 w-16 h-16 bg-emerald-500/20 rounded-full" />

            <h3 className="text-sm font-medium text-slate-200 mb-2">
                Monthly revenue target
            </h3>

            <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-2">
                    <span className="text-3xl font-semibold tabular-nums">
                        {fmt(current)}
                    </span>
                    <span className="text-sm text-slate-400 mb-1 tabular-nums">
                        / {fmt(target)}
                    </span>
                </div>

                {/* Compact percent badge */}
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/10 border border-white/10 tabular-nums">
                    {Math.min(999, Math.max(0, progress)).toFixed(1)}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-2 bg-emerald-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: barWidth }}
                />
            </div>

            <p className="mt-2 text-xs text-emerald-300">
                🎉 Achieved {Math.min(100, Math.max(0, percent))}% of this month&apos;s target
            </p>

            {/* Executive stats row */}
            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                    <div className="text-[11px] text-white/60">คืบหน้า</div>
                    <div className="text-sm font-bold text-white tabular-nums">
                        {Math.min(100, Math.max(0, progress)).toFixed(1)}%
                    </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                    <div className="text-[11px] text-white/60">ยอดที่เหลือ</div>
                    <div className="text-sm font-bold text-white tabular-nums">
                        {fmt(remaining)}
                    </div>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                    <div className="text-[11px] text-white/60">ต้องได้/วัน</div>
                    <div className="text-sm font-bold text-white tabular-nums">
                        {fmt(requiredPerDay)}
                    </div>
                </div>
            </div>

            {/* Tiny helper line */}
            <div className="mt-2 text-[11px] text-white/50">
                เหลืออีก {daysLeft} วันในเดือนนี้
            </div>
        </div>
    );
};

type QuickActionProps = {
    label: string;
    isDarkMode?: boolean;
    onClick?: () => void;
};

const _QuickAction: React.FC<QuickActionProps> = ({ label, isDarkMode = false, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex items - center justify - between rounded - xl border px - 4 py - 3 text - left text - xs font - medium transition - all shadow - sm hover:shadow ${isDarkMode
            ? "border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/30 hover:text-emerald-700"
            } `}>
        <span>{label}</span>
        <PlusCircle className={`h - 4 w - 4 ${isDarkMode ? "text-slate-500" : "text-slate-400"} `} />
    </button>
);
void _QuickAction;

type DigAndStockAlertsCardProps = {
    isDarkMode?: boolean;
    onOpenZone?: (zoneId: string) => void;
};

const _DigAndStockAlertsCard: React.FC<DigAndStockAlertsCardProps> = ({
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
        <div className={`rounded - 2xl border ${border} ${bg} p - 4`}>
            {/* Header + Stats in one row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className={`text - sm font - semibold ${cardTextMain} `}>
                    Dig & Stock Alerts
                </h2>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className={cardTextMuted}>ขุดเดือนนี้</span>
                        <span className={"font-semibold " + cardTextMain}>{monthDigQty.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={cardTextMuted}>แผน 7 วัน</span>
                        <span className={"font-semibold " + cardTextMain}>{upcomingQty.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Stock alerts-compact list (max 3) */}
            {loading ? (
                <div className={"py-2 text-xs " + cardTextMuted}>กำลังโหลด...</div>
            ) : error ? (
                <div className="py-2 text-xs text-rose-500">Error:{error}</div>
            ) : alerts.length === 0 ? (
                <div className={"py-2 text-xs " + cardTextMuted}>
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
                                className={"flex items-center justify-between rounded-lg px-3 py-2 text-xs " + (isDarkMode ? "bg-slate-950" : "bg-slate-50") +
                                    (clickable
                                        ? isDarkMode
                                            ? " hover:bg-slate-800 cursor-pointer"
                                            : " hover:bg-slate-100 cursor-pointer"
                                        : "")
                                }
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <span>{getAlertIcon(a.alert_type)}</span>
                                    <span className={"truncate " + cardTextMain}>
                                        {a.alert_type === "inspection_overdue"
                                            ? `${a.message}`
                                            : `${a.zone_name ?? ""} · ${a.message}`}
                                    </span>
                                </div>
                                <span
                                    className={"ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " + getBadgeColor(
                                        a.alert_type,
                                        isDarkMode
                                    )}
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
                        <div className={"text-center text-[11px] " + cardTextMuted}>
                            +{alerts.length - 3} more alerts
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
void _DigAndStockAlertsCard;

