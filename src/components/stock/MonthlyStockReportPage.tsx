// src/components/stock/MonthlyStockReportPage.tsx
import React, { useMemo, useState } from "react";
import { CalendarDays, TrendingUp, TrendingDown, Tag, Package, Truck } from "lucide-react";
import { useMonthlyStockReport, MonthlyStockReportRow } from "../../hooks/useMonthlyStockReport";
import { useStockMonthlyTrend, MonthlyTrendPoint } from "../../hooks/useStockMonthlyTrend";

const THAI_MONTHS = [
    "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

type Props = {
    defaultYear?: number;
    defaultMonth?: number;
    isDarkMode?: boolean;
};

export const MonthlyStockReportPage: React.FC<Props> = ({
    defaultYear,
    defaultMonth,
    isDarkMode = false,
}) => {
    const now = new Date();
    const [year, setYear] = useState(defaultYear ?? now.getFullYear());
    const [month, setMonth] = useState(defaultMonth ?? now.getMonth() + 1);

    const { rows, summary, loading, error } = useMonthlyStockReport(year, month);
    const { data: trendData, loading: trendLoading } = useStockMonthlyTrend(6);

    const groupedBySpecies = useMemo(() => {
        const map = new Map<string, MonthlyStockReportRow[]>();
        for (const row of rows) {
            const key = row.species_id ?? "unknown";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(row);
        }
        return Array.from(map.entries()).sort((a, b) => {
            const nameA = a[1][0]?.species_name_th ?? "";
            const nameB = b[1][0]?.species_name_th ?? "";
            return nameA.localeCompare(nameB, "th");
        });
    }, [rows]);

    const thaiYear = (year + 543) % 100;
    const monthLabel = THAI_MONTHS[month];

    // Theme-aware styles
    const pageBg = isDarkMode ? "bg-slate-900" : "bg-slate-50";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
    const textMutedLight = isDarkMode ? "text-slate-500" : "text-slate-400";
    const selectClass = isDarkMode
        ? "border-slate-600 bg-slate-800 text-white focus:border-emerald-500 focus:ring-emerald-500"
        : "border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:ring-emerald-500";
    const cardBg = isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white";
    const errorBg = isDarkMode ? "bg-red-900/50 border-red-700 text-red-300" : "bg-red-50 border-red-200 text-red-700";
    const theadBg = isDarkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200";
    const theadText = isDarkMode ? "text-slate-400" : "text-slate-600";
    const tbodyDivide = isDarkMode ? "divide-slate-700" : "divide-slate-100";
    const rowHover = isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50";
    const speciesHeaderBg = isDarkMode ? "bg-slate-700/30" : "bg-slate-50";
    const emeraldAccent = isDarkMode ? "text-emerald-400" : "text-emerald-600";
    const cyanAccent = isDarkMode ? "text-cyan-400" : "text-cyan-600";
    const amberAccent = isDarkMode ? "text-amber-400" : "text-amber-600";
    const redAccent = isDarkMode ? "text-red-400" : "text-red-600";

    return (
        <div className={`min-h-screen ${pageBg} p-4 md:p-6 space-y-6`}>
            {/* Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <CalendarDays className={`w-5 h-5 ${emeraldAccent}`} />
                    <div>
                        <h1 className={`text-xl font-semibold ${textMain}`}>รายงานสต็อกประจำเดือน</h1>
                        <p className={`mt-1 text-sm ${textMuted}`}>สรุปจำนวนต้นไม้ในระบบและความเคลื่อนไหวประจำเดือน</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select className={`h-9 rounded-lg border px-3 text-sm focus:ring-1 ${selectClass}`} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                        {THAI_MONTHS.slice(1).map((name, idx) => (<option key={idx + 1} value={idx + 1}>{name}</option>))}
                    </select>
                    <select className={`h-9 rounded-lg border px-3 text-sm focus:ring-1 ${selectClass}`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                        {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (<option key={y} value={y}>พ.ศ. {y + 543}</option>))}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                <KpiCard label="ต้นคงเหลือต้นเดือน" value={summary?.begin_total ?? 0} loading={loading} icon={<Package className={`w-4 h-4 ${textMuted}`} />} isDarkMode={isDarkMode} />
                <KpiCard label="ต้นคงเหลือปลายเดือน" value={summary?.end_total ?? 0} loading={loading} icon={<Package className={`w-4 h-4 ${emeraldAccent}`} />} tone="primary" isDarkMode={isDarkMode} />
                <KpiCard
                    label="เปลี่ยนแปลง"
                    value={summary?.change ?? 0}
                    suffix={summary?.change !== 0 ? `(${summary?.change_pct?.toFixed(1)}%)` : ""}
                    loading={loading}
                    icon={(summary?.change ?? 0) >= 0 ? <TrendingUp className={`w-4 h-4 ${emeraldAccent}`} /> : <TrendingDown className={`w-4 h-4 ${redAccent}`} />}
                    tone={(summary?.change ?? 0) >= 0 ? "positive" : "negative"}
                    isDarkMode={isDarkMode}
                />
                <KpiCard label="ขุด/ส่งออก/ปลูก" value={(summary?.dug ?? 0) + (summary?.shipped ?? 0) + (summary?.planted ?? 0)} loading={loading} icon={<Truck className={`w-4 h-4 ${amberAccent}`} />} isDarkMode={isDarkMode} />
                <KpiCard label="อัตราการทำ Tag" value={`${(summary?.tag_rate ?? 0).toFixed(1)}%`} loading={loading} icon={<Tag className={`w-4 h-4 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />} raw isDarkMode={isDarkMode} />
                <KpiCard label="ยังไม่ Tag" value={summary?.end_untagged ?? 0} loading={loading} icon={<Tag className={`w-4 h-4 ${amberAccent}`} />} tone={(summary?.end_untagged ?? 0) > 0 ? "warning" : "default"} isDarkMode={isDarkMode} />
            </div>

            {error && <div className={`rounded-lg border p-4 text-sm ${errorBg}`}>โหลดข้อมูลไม่สำเร็จ: {error}</div>}

            {!trendLoading && trendData.length > 0 && (
                <div className={`rounded-xl border ${cardBg} p-4 shadow-sm`}>
                    <h3 className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"} mb-4`}>เทรนด์ Stock รายเดือน (6 เดือนล่าสุด)</h3>
                    <SimpleTrendChart data={trendData} isDarkMode={isDarkMode} />
                </div>
            )}

            {/* Summary Table */}
            <div className={`rounded-xl border ${cardBg} shadow-sm overflow-hidden`}>
                <div className={`px-4 py-3 border-b ${isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}>
                    <h3 className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>สรุปสต็อกตามพันธุ์ / ขนาด — {monthLabel} {thaiYear}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead className={`${theadBg} border-b`}>
                            <tr>
                                <th className={`px-3 py-2 text-left font-medium ${theadText}`}>พันธุ์</th>
                                <th className={`px-3 py-2 text-left font-medium ${theadText}`}>ขนาด</th>
                                <th className={`px-3 py-2 text-right font-medium ${theadText}`}>ต้นเดือน</th>
                                <th className={`px-3 py-2 text-right font-medium ${theadText}`}>ปลายเดือน</th>
                                <th className={`px-3 py-2 text-right font-medium ${theadText}`}>เปลี่ยนแปลง</th>
                                <th className={`px-3 py-2 text-right font-medium ${theadText}`}>มี Tag</th>
                                <th className={`px-3 py-2 text-right font-medium ${theadText}`}>ยังไม่ Tag</th>
                                <th className={`px-3 py-2 text-left font-medium ${theadText}`}>หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${tbodyDivide}`}>
                            {loading && <tr><td colSpan={8} className={`px-3 py-12 text-center ${textMutedLight}`}>กำลังโหลด...</td></tr>}
                            {!loading && rows.length === 0 && <tr><td colSpan={8} className={`px-3 py-12 text-center ${textMutedLight}`}>ยังไม่มีข้อมูล snapshot สำหรับเดือนนี้</td></tr>}
                            {groupedBySpecies.map(([speciesId, speciesRows]) => {
                                const speciesName = speciesRows[0]?.species_name_th || speciesRows[0]?.species_name_en || "ไม่ระบุพันธุ์";
                                return (
                                    <React.Fragment key={speciesId}>
                                        <tr className={speciesHeaderBg}><td colSpan={8} className={`px-3 py-2 font-semibold ${emeraldAccent}`}>{speciesName}</td></tr>
                                        {speciesRows.map((row, idx) => {
                                            const change = row.end_total_qty - row.begin_total_qty;
                                            const needsTag = row.end_untagged_qty > 0 && row.end_untagged_qty > row.end_tagged_qty;
                                            const badgeClass = isDarkMode ? "bg-amber-900/50 border-amber-700 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700";
                                            return (
                                                <tr key={`${speciesId}-${row.size_label}-${idx}`} className={`${rowHover} transition-colors`}>
                                                    <td className="px-3 py-2"></td>
                                                    <td className={`px-3 py-2 font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{row.size_label}"</td>
                                                    <td className={`px-3 py-2 text-right tabular-nums ${textMuted}`}>{row.begin_total_qty.toLocaleString("th-TH")}</td>
                                                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${textMain}`}>{row.end_total_qty.toLocaleString("th-TH")}</td>
                                                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${change > 0 ? emeraldAccent : change < 0 ? redAccent : textMutedLight}`}>
                                                        {change > 0 ? "+" : ""}{change.toLocaleString("th-TH")}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right tabular-nums ${cyanAccent}`}>{row.end_tagged_qty > 0 ? row.end_tagged_qty.toLocaleString("th-TH") : "-"}</td>
                                                    <td className={`px-3 py-2 text-right tabular-nums ${amberAccent}`}>{row.end_untagged_qty > 0 ? row.end_untagged_qty.toLocaleString("th-TH") : "-"}</td>
                                                    <td className="px-3 py-2">
                                                        {needsTag && <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}>ควรทำ Tag เพิ่ม</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

type KpiCardProps = {
    label: string;
    value: number | string;
    suffix?: string;
    loading?: boolean;
    icon?: React.ReactNode;
    tone?: "default" | "primary" | "positive" | "negative" | "warning";
    raw?: boolean;
    isDarkMode?: boolean;
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, suffix, loading, icon, tone = "default", raw, isDarkMode = false }) => {
    const toneStyles = isDarkMode
        ? { default: "border-slate-700 bg-slate-800", primary: "border-emerald-800 bg-emerald-900/30", positive: "border-emerald-800 bg-emerald-900/30", negative: "border-red-800 bg-red-900/30", warning: "border-amber-800 bg-amber-900/30" }
        : { default: "border-slate-200 bg-white", primary: "border-emerald-200 bg-emerald-50", positive: "border-emerald-200 bg-emerald-50", negative: "border-red-200 bg-red-50", warning: "border-amber-200 bg-amber-50" };

    const displayValue = loading ? "..." : raw ? value : typeof value === "number" ? value.toLocaleString("th-TH") : value;
    const labelColor = isDarkMode ? "text-slate-400" : "text-slate-500";
    const valueColor = isDarkMode ? "text-white" : "text-slate-900";

    return (
        <div className={`rounded-xl border px-4 py-3 shadow-sm ${toneStyles[tone]}`}>
            <div className={`flex items-center gap-2 text-xs ${labelColor}`}>{icon}<span>{label}</span></div>
            <p className={`mt-1 text-lg font-semibold ${valueColor} tabular-nums`}>
                {displayValue}
                {suffix && <span className={`ml-1 text-sm font-normal ${labelColor}`}>{suffix}</span>}
            </p>
        </div>
    );
};

const SimpleTrendChart: React.FC<{ data: MonthlyTrendPoint[]; isDarkMode?: boolean }> = ({ data, isDarkMode = false }) => {
    const maxTotal = Math.max(...data.map(d => d.total_qty), 1);
    const labelColor = isDarkMode ? "text-slate-500" : "text-slate-400";
    const valueColor = isDarkMode ? "text-slate-300" : "text-slate-700";

    return (
        <div className="flex items-end gap-2 h-40">
            {data.map((point, idx) => {
                const totalHeight = (point.total_qty / maxTotal) * 100;
                const taggedHeight = point.tagged_qty > 0 ? (point.tagged_qty / point.total_qty) * totalHeight : 0;
                const untaggedHeight = totalHeight - taggedHeight;
                return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                            <div className="w-full bg-amber-600 rounded-t transition-all" style={{ height: `${untaggedHeight}%` }} title={`ยังไม่ Tag: ${point.untagged_qty}`} />
                            <div className="w-full bg-emerald-500 rounded-b transition-all" style={{ height: `${taggedHeight}%` }} title={`มี Tag: ${point.tagged_qty}`} />
                        </div>
                        <div className={`text-[10px] ${labelColor} text-center`}>{point.label}</div>
                        <div className={`text-[10px] ${valueColor} font-medium`}>{point.total_qty.toLocaleString()}</div>
                    </div>
                );
            })}
        </div>
    );
};

export default MonthlyStockReportPage;
