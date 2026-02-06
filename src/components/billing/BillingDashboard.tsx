import React, { useMemo } from 'react';
import { useBillingDashboardSummary } from '../../hooks/useBillingDashboardSummary';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    BarChart,
    Bar,
} from 'recharts';

const thb = (n: number) => `฿${(n ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

function formatDMY(iso: string) {
    if (!iso) return '-';
    // 'YYYY-MM-DD' -> 'DD/MM/YYYY'
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
}

export const BillingDashboard = () => {
    const { preset, setPreset, from, to, setFrom, setTo, data, loading, error } =
        useBillingDashboardSummary('7d');

    const kpis = useMemo(() => {
        const t = data?.totals;
        return {
            doc_count: t?.doc_count ?? 0,
            total_amount: t?.total_amount ?? 0,
            paid_amount: t?.paid_amount ?? 0,
            outstanding_amount: t?.outstanding_amount ?? 0,
        };
    }, [data]);

    const daily = data?.daily ?? [];
    const byType = data?.by_type ?? [];

    return (
        <div className="p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-emerald-100 text-emerald-700 p-1 rounded-md">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
                        </span>
                        <span className="text-xl font-bold">Dashboard เอกสารการเงิน</span>
                    </div>

                    <div className="text-sm text-zinc-500 dark:text-slate-400 ml-1">
                        ช่วงวันที่: <span className="font-bold text-zinc-700 dark:text-slate-200">{formatDMY(from)}</span> ถึง <span className="font-bold text-zinc-700 dark:text-slate-200">{formatDMY(to)}</span>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                    <button
                        className={`px-3 py-2 rounded-lg text-sm border font-medium transition-all ${preset === '7d' ? 'bg-zinc-800 text-white border-zinc-800 shadow-md transform scale-105 dark:bg-white dark:text-zinc-800 dark:border-white' : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10'
                            }`}
                        onClick={() => setPreset('7d')}
                    >
                        7 วัน
                    </button>
                    <button
                        className={`px-3 py-2 rounded-lg text-sm border font-medium transition-all ${preset === '30d' ? 'bg-zinc-800 text-white border-zinc-800 shadow-md transform scale-105 dark:bg-white dark:text-zinc-800 dark:border-white' : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10'
                            }`}
                        onClick={() => setPreset('30d')}
                    >
                        30 วัน
                    </button>
                    <button
                        className={`px-3 py-2 rounded-lg text-sm border font-medium transition-all ${preset === 'this_month' ? 'bg-zinc-800 text-white border-zinc-800 shadow-md transform scale-105 dark:bg-white dark:text-zinc-800 dark:border-white' : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10'
                            }`}
                        onClick={() => setPreset('this_month')}
                    >
                        เดือนนี้
                    </button>

                    <div className="flex gap-2 items-center ml-2 bg-zinc-50 dark:bg-white/5 p-1 rounded-lg border border-zinc-200 dark:border-white/10">
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => {
                                setFrom(e.target.value);
                                setPreset('custom');
                            }}
                            className="px-2 py-1.5 rounded bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                        <span className="text-zinc-400 dark:text-slate-500 text-xs font-bold px-1">ถึง</span>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => {
                                setTo(e.target.value);
                                setPreset('custom');
                            }}
                            className="px-2 py-1.5 rounded bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <KpiCard title="จำนวนเอกสาร" value={`${kpis.doc_count} ใบ`} color="text-slate-700 dark:text-slate-100" bg="bg-white dark:bg-white/5" />
                <KpiCard title="ยอดรวม" value={thb(kpis.total_amount)} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50/30 dark:bg-indigo-500/10" />
                <KpiCard title="รับแล้ว" value={thb(kpis.paid_amount)} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50/30 dark:bg-emerald-500/10" />
                <KpiCard title="ค้างชำระ" value={thb(kpis.outstanding_amount)} color="text-rose-600 dark:text-rose-400" bg="bg-rose-50/30 dark:bg-rose-500/10" />
            </div>

            {error && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                    Error loading dashboard data: {error}
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="ยอดรวมรายวัน">
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickFormatter={(v) => {
                                        // YYYY-MM-DD -> DD/MM
                                        const [, m, d] = String(v).split('-');
                                        return `${d}/${m}`;
                                    }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                    formatter={(val: any) => [thb(Number(val)), 'ยอดขาย']}
                                    labelFormatter={(label: any) => `วันที่ ${formatDMY(String(label))}`}
                                />
                                <Line type="monotone" dataKey="total_amount" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3, fill: '#4f46e5', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="แยกตามประเภทเอกสาร">
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byType} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="doc_type"
                                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                    formatter={(val: any) => [thb(Number(val)), 'ยอดขาย']}
                                    labelFormatter={(label: any) => `ประเภท ${label}`}
                                />
                                <Bar dataKey="total_amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                    {/* Optional: dynamic colors per bar if needed */}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    <span className="ml-2 text-sm text-zinc-500">กำลังโหลดข้อมูลล่าสุด...</span>
                </div>
            )}
        </div>
    );
};

function KpiCard({ title, value, color, bg }: { title: string; value: string; color?: string, bg?: string }) {
    return (
        <div className={`rounded-2xl border border-zinc-100 dark:border-white/10 p-4 shadow-sm ${bg || 'bg-white dark:bg-white/5'}`}>
            <div className="text-xs font-bold text-zinc-400 dark:text-slate-500 uppercase tracking-wider">{title}</div>
            <div className={`text-2xl font-black mt-1 ${color || 'text-zinc-800 dark:text-slate-100'}`}>{value}</div>
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm">
            <div className="font-bold text-zinc-700 dark:text-slate-100 mb-4 flex items-center gap-2">
                {title}
            </div>
            {children}
        </div>
    );
}
