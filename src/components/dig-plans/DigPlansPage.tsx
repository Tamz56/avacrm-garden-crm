import React, { useState } from "react";
import { useDigPlans, DigPlanStatus } from "../../hooks/useDigPlans";
import { useZoneOptions } from "../../hooks/useZoneOptions";

const STATUS_OPTIONS: { value: DigPlanStatus | ""; label: string; color: string }[] = [
    { value: "", label: "ทั้งหมด", color: "bg-slate-100 text-slate-700" },
    { value: "planned", label: "วางแผน", color: "bg-amber-100 text-amber-700" },
    { value: "in_progress", label: "กำลังดำเนินการ", color: "bg-blue-100 text-blue-700" },
    { value: "completed", label: "เสร็จสิ้น", color: "bg-emerald-100 text-emerald-700" },
    { value: "cancelled", label: "ยกเลิก", color: "bg-rose-100 text-rose-700" },
];

const getStatusBadge = (status: DigPlanStatus) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    return opt || STATUS_OPTIONS[1];
};

export const DigPlansPage: React.FC = () => {
    const [filterStatus, setFilterStatus] = useState<DigPlanStatus | "">("");
    const [filterZone, setFilterZone] = useState<string>("");

    const { plans, loading, error, reload, updateStatus } = useDigPlans({
        status: filterStatus || null,
        zone_id: filterZone || null,
    });

    const { options: zoneOptions, loading: zonesLoading } = useZoneOptions();

    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleStatusChange = async (planId: string, newStatus: DigPlanStatus) => {
        setUpdatingId(planId);
        const result = await updateStatus(planId, newStatus);
        setUpdatingId(null);
        if (!result.ok) {
            alert("ไม่สามารถอัปเดตสถานะได้: " + result.error);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        🌱 แผนขุดต้นไม้ (Dig Plans)
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        รายการงานขุดจากดีลแบบ Preorder – ทีม Ops ใช้ติดตามและอัปเดตสถานะ
                    </p>
                </div>
                <button
                    onClick={reload}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? "กำลังโหลด..." : "🔄 รีเฟรช"}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                    <label className="block text-xs text-slate-500 mb-1">สถานะ</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as DigPlanStatus | "")}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">โซน</label>
                    <select
                        value={filterZone}
                        onChange={(e) => setFilterZone(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">{zonesLoading ? "กำลังโหลด..." : "ทุกโซน"}</option>
                        {zoneOptions.map(z => (
                            <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-end">
                    <span className="text-sm text-slate-400">
                        พบ {plans.length} รายการ
                    </span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">รหัส</th>
                            <th className="px-4 py-3 text-left font-medium">โซน</th>
                            <th className="px-4 py-3 text-left font-medium">พันธุ์</th>
                            <th className="px-4 py-3 text-left font-medium">ขนาด</th>
                            <th className="px-4 py-3 text-center font-medium">จำนวน</th>
                            <th className="px-4 py-3 text-left font-medium">วันเริ่มขุด</th>
                            <th className="px-4 py-3 text-left font-medium">วันพร้อมส่ง</th>
                            <th className="px-4 py-3 text-center font-medium">สถานะ</th>
                            <th className="px-4 py-3 text-left font-medium">ดีล</th>
                            <th className="px-4 py-3 text-center font-medium">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                                    กำลังโหลด...
                                </td>
                            </tr>
                        ) : plans.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                                    ไม่พบข้อมูล
                                </td>
                            </tr>
                        ) : (
                            plans.map((plan) => {
                                const statusInfo = getStatusBadge(plan.status);
                                const isUpdating = updatingId === plan.id;

                                return (
                                    <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                {plan.code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {plan.zone_name || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {plan.species_name || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {plan.size_label ? `${plan.size_label} นิ้ว` : "-"}
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-slate-800 dark:text-white">
                                            {plan.qty}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {plan.digup_date
                                                ? new Date(plan.digup_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
                                                : "-"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {plan.expected_ready_date ? (
                                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                    {new Date(plan.expected_ready_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {plan.deal_code ? (
                                                <a
                                                    href={`#deals/${plan.deal_id}`}
                                                    className="text-blue-600 hover:underline dark:text-blue-400 text-xs"
                                                >
                                                    {plan.deal_code}
                                                </a>
                                            ) : "-"}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <select
                                                value={plan.status}
                                                onChange={(e) => handleStatusChange(plan.id, e.target.value as DigPlanStatus)}
                                                disabled={isUpdating}
                                                className={`text-xs px-2 py-1 rounded border ${isUpdating ? 'opacity-50' : ''} ${statusInfo.color} border-current`}
                                            >
                                                {STATUS_OPTIONS.filter(s => s.value !== "").map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300"></span>
                    วางแผน (รอขุด)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span>
                    กำลังดำเนินการ
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></span>
                    เสร็จสิ้น
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300"></span>
                    ยกเลิก
                </span>
            </div>
        </div>
    );
};

export default DigPlansPage;
