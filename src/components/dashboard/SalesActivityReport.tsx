import React, { useMemo, useState } from "react";
import {
    Loader2,
    Calendar,
    Users,
    Phone,
    Repeat,
    Activity,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Bar,
} from "recharts";
import { useSalesActivityDaily } from "../../hooks/useSalesActivityDaily";
import { supabase } from "../../supabaseClient";

type RangePreset = "7d" | "30d" | "this-month";

function getDateRange(preset: RangePreset): { from: string; to: string } {
    const now = new Date();
    const end = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    );

    if (preset === "this-month") {
        const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        return {
            from: start.toISOString().slice(0, 10),
            to: end.toISOString().slice(0, 10),
        };
    }

    const days = preset === "7d" ? 7 : 30;
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    return {
        from: start.toISOString().slice(0, 10),
        to: end.toISOString().slice(0, 10),
    };
}

const SalesActivityReport: React.FC = () => {
    // สมมติใช้ user id จาก Supabase auth (ถ้ามี profile table ก็สามารถต่อเพิ่มภายหลัง)
    const [userId, setUserId] = useState<string | null>(null);
    const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
    const [viewMode, setViewMode] = useState<"me" | "all">("me");

    React.useEffect(() => {
        let cancelled = false;
        async function loadUser() {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!cancelled) {
                setUserId(session?.user?.id ?? null);
            }
        }
        loadUser();
        return () => {
            cancelled = true;
        };
    }, []);

    const { from, to } = useMemo(
        () => getDateRange(rangePreset),
        [rangePreset]
    );

    const { rows, loading, error } = useSalesActivityDaily({
        from,
        to,
        createdBy: viewMode === "me" ? userId ?? undefined : undefined,
    });

    // ---- สรุปยอดรวมทั้งหมดในช่วง ----
    const summary = useMemo(() => {
        const base = {
            totalActivities: 0,
            totalCalls: 0,
            totalFollowups: 0,
            totalMeetings: 0,
            customersTouched: 0,
            dealsTouched: 0,
        };
        if (!rows.length) return base;

        const acc = rows.reduce((acc, r) => {
            acc.totalActivities += r.total_activities;
            acc.totalCalls += r.total_calls;
            acc.totalFollowups += r.total_followups;
            acc.totalMeetings += r.total_meetings;
            acc.customersTouched += r.customers_touched;
            acc.dealsTouched += r.deals_touched;
            return acc;
        }, base);

        return acc;
    }, [rows]);

    // ---- เตรียม data สำหรับกราฟ ----
    const chartData = useMemo(
        () =>
            rows.map((r) => {
                const d = new Date(r.activity_day);
                const label = d.toLocaleDateString("th-TH", {
                    day: "2-digit",
                    month: "short",
                });
                return {
                    date: label,
                    total: r.total_activities,
                    calls: r.total_calls,
                    followups: r.total_followups,
                };
            }),
        [rows]
    );

    return (
        <div className="w-full h-full flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        Sales Activity Report
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        สรุปกิจกรรมการขายตามวัน (โทรคุย, Follow-up, นัดหมาย, ลูกค้าที่แตะ)
                    </p>
                </div>

                {/* Filter */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 p-1 text-xs">
                        {(["7d", "30d", "this-month"] as RangePreset[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setRangePreset(p)}
                                className={`px-3 py-1 rounded-full transition-all ${rangePreset === p
                                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                        : "text-slate-500 dark:text-slate-400"
                                    }`}
                            >
                                {p === "7d"
                                    ? "7 วันล่าสุด"
                                    : p === "30d"
                                        ? "30 วันล่าสุด"
                                        : "เดือนนี้"}
                            </button>
                        ))}
                    </div>

                    <div className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 p-1 text-xs">
                        <button
                            onClick={() => setViewMode("me")}
                            className={`px-3 py-1 rounded-full transition-all ${viewMode === "me"
                                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                        >
                            ของฉัน
                        </button>
                        <button
                            onClick={() => setViewMode("all")}
                            className={`px-3 py-1 rounded-full transition-all ${viewMode === "all"
                                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                        >
                            ทั้งทีม
                        </button>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>
                            {from} – {to}
                        </span>
                    </div>
                </div>
            </div>

            {/* Loading / Error */}
            {loading && (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">กำลังโหลดข้อมูลกิจกรรม...</span>
                </div>
            )}

            {error && !loading && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs px-4 py-2 rounded-xl border border-red-100 dark:border-red-800">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    รวมกิจกรรมทั้งหมด
                                </span>
                                <Activity className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
                                {summary.totalActivities}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    โทรคุย (Calls)
                                </span>
                                <Phone className="w-4 h-4 text-sky-500" />
                            </div>
                            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
                                {summary.totalCalls}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Follow-up
                                </span>
                                <Repeat className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
                                {summary.totalFollowups}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    ลูกค้าที่แตะ / ดีลที่แตะ
                                </span>
                                <Users className="w-4 h-4 text-violet-500" />
                            </div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                                ลูกค้า{" "}
                                <span className="text-lg font-bold">
                                    {summary.customersTouched}
                                </span>{" "}
                                | ดีล{" "}
                                <span className="text-lg font-bold">
                                    {summary.dealsTouched}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Chart + Table */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Chart */}
                        <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                    กราฟกิจกรรมรายวัน
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                                    แสดงจำนวนกิจกรรมรวม / Calls / Follow-up
                                </div>
                            </div>
                            {chartData.length === 0 ? (
                                <div className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">
                                    ยังไม่มีกิจกรรมในช่วงวันที่ที่เลือก
                                </div>
                            ) : (
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" fontSize={11} />
                                            <YAxis fontSize={11} />
                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12,
                                                    borderRadius: 12,
                                                }}
                                            />
                                            <Bar dataKey="total" name="กิจกรรมรวม" stackId="a" />
                                            <Bar dataKey="calls" name="Calls" stackId="a" />
                                            <Bar dataKey="followups" name="Follow-up" stackId="a" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Table */}
                        <div className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                    ตารางรายวัน
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-[11px]">
                                    <thead className="text-slate-400 dark:text-slate-500">
                                        <tr>
                                            <th className="py-1.5 text-left font-medium">วันที่</th>
                                            <th className="py-1.5 text-right font-medium">กิจกรรม</th>
                                            <th className="py-1.5 text-right font-medium">Calls</th>
                                            <th className="py-1.5 text-right font-medium">
                                                Follow-up
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-700 dark:text-slate-200">
                                        {rows.map((r) => {
                                            const d = new Date(r.activity_day);
                                            const label = d.toLocaleDateString("th-TH", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "2-digit",
                                            });
                                            return (
                                                <tr key={r.activity_day}>
                                                    <td className="py-1.5">{label}</td>
                                                    <td className="py-1.5 text-right">
                                                        {r.total_activities}
                                                    </td>
                                                    <td className="py-1.5 text-right">
                                                        {r.total_calls}
                                                    </td>
                                                    <td className="py-1.5 text-right">
                                                        {r.total_followups}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {rows.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="py-4 text-center text-slate-400 dark:text-slate-500"
                                                >
                                                    ยังไม่มีกิจกรรมในช่วงวันที่นี้
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SalesActivityReport;
