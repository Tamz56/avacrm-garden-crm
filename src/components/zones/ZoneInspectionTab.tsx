import React, { useMemo, useState } from "react";
import { Search, AlertTriangle, Loader2 } from "lucide-react";
import { useZoneMismatchOverviewList } from "../../hooks/useZoneMismatchOverviewList";
import { ZoneMismatchStatusBadge } from "./ZoneMismatchStatusBadge";

const MISMATCH_FILTER_OPTIONS = [
    { value: "all", label: "ทั้งหมด" },
    { value: "ยังไม่สำรวจ", label: "ยังไม่สำรวจ" },
    { value: "ยังไม่ปลูก/บันทึก", label: "ยังไม่ปลูก/บันทึก" },
    { value: "ตรงตามระบบ", label: "ตรงตามระบบ" },
    { value: "คลาดเคลื่อนเล็กน้อย", label: "คลาดเคลื่อนเล็กน้อย" },
    { value: "คลาดเคลื่อนปานกลาง", label: "คลาดเคลื่อนปานกลาง" },
    { value: "คลาดเคลื่อนมาก", label: "คลาดเคลื่อนมาก" },
];

type Props = { isDarkMode?: boolean };

export const ZoneInspectionTab: React.FC<Props> = ({ isDarkMode = false }) => {
    const { rows, loading, error } = useZoneMismatchOverviewList();

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchText, setSearchText] = useState<string>("");

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const matchStatus =
                statusFilter === "all" || row.mismatch_status === statusFilter;

            const matchSearch =
                !searchText ||
                row.zone_name.toLowerCase().includes(searchText.toLowerCase());

            return matchStatus && matchSearch;
        });
    }, [rows, statusFilter, searchText]);

    const totalZones = rows.length;
    const totalMismatch = rows.filter(
        (r) =>
            r.mismatch_status === "คลาดเคลื่อนเล็กน้อย" ||
            r.mismatch_status === "คลาดเคลื่อนปานกลาง" ||
            r.mismatch_status === "คลาดเคลื่อนมาก"
    ).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        การตรวจแปลง & ความคลาดเคลื่อน
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        ใช้ตรวจดูว่าแปลงไหนข้อมูลในระบบไม่ตรงกับการสำรวจภาคสนาม
                    </p>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">
                        จำนวนแปลงทั้งหมด
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {totalZones.toLocaleString()} <span className="text-base">แปลง</span>
                    </p>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">
                        แปลงที่มีความคลาดเคลื่อน
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-700 flex items-baseline gap-2">
                        {totalMismatch.toLocaleString()}{" "}
                        <span className="text-base text-slate-500">แปลง</span>
                    </p>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                    <div>
                        <p className="text-xs font-medium text-slate-500">
                            หมายเหตุ
                        </p>
                        <p className="text-sm text-slate-700">
                            แนะนำให้เริ่มจากแปลงที่ “คลาดเคลื่อนมาก” ก่อน
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อแปลง..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 outline-none"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>

                <select
                    className="text-sm rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    {MISMATCH_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                {loading && (
                    <div className="flex items-center justify-center py-10 text-sm text-slate-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        กำลังโหลดข้อมูล...
                    </div>
                )}

                {error && !loading && (
                    <div className="p-6 text-sm text-red-600">
                        ไม่สามารถโหลดข้อมูลได้: {error}
                    </div>
                )}

                {!loading && !error && filteredRows.length === 0 && (
                    <div className="p-6 text-sm text-slate-500">
                        ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                    </div>
                )}

                {!loading && !error && filteredRows.length > 0 && (
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-xs font-semibold text-slate-500">
                                <th className="px-4 py-3 text-left">ชื่อแปลง</th>
                                <th className="px-4 py-3 text-left">สถานะความคลาดเคลื่อน</th>
                                <th className="px-4 py-3 text-right">จำนวนในระบบ (ต้น)</th>
                                <th className="px-4 py-3 text-right">จำนวนสำรวจ (ต้น)</th>
                                <th className="px-4 py-3 text-right">ส่วนต่าง (ต้น)</th>
                                <th className="px-4 py-3 text-left">ทิศทาง</th>
                                <th className="px-4 py-3 text-left">วันที่สำรวจล่าสุด</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row) => (
                                <tr
                                    key={row.zone_id}
                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                                >
                                    <td className="px-4 py-2.5 text-slate-900">
                                        {row.zone_name}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <ZoneMismatchStatusBadge status={row.mismatch_status} />
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-900">
                                        {row.system_qty?.toLocaleString() ?? "-"}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-900">
                                        {row.inspected_qty != null
                                            ? row.inspected_qty.toLocaleString()
                                            : "-"}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        {row.diff_qty != null ? (
                                            <span
                                                className={
                                                    row.diff_qty > 0
                                                        ? "text-emerald-700"
                                                        : row.diff_qty < 0
                                                            ? "text-red-600"
                                                            : "text-slate-700"
                                                }
                                            >
                                                {row.diff_qty.toLocaleString()}
                                            </span>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-700">
                                        {row.diff_direction ?? "-"}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-600">
                                        {row.last_inspection_date
                                            ? new Date(row.last_inspection_date).toLocaleDateString(
                                                "th-TH"
                                            )
                                            : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
