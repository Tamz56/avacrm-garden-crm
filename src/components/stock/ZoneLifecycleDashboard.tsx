// src/components/stock/ZoneLifecycleDashboard.tsx
import React from "react";
import { useZoneLifecycleOverview } from "../../hooks/useZoneLifecycleOverview";

type ZoneLifecycleDashboardProps = {
    defaultFarmName?: string;
    defaultPlotType?: string;
    onZoneClick?: (zoneId: string) => void; // 👈 drilldown ไป Zone Detail
};

export const ZoneLifecycleDashboard: React.FC<ZoneLifecycleDashboardProps> = ({
    defaultFarmName,
    defaultPlotType,
    onZoneClick,
}) => {
    const { rows, loading, error, totals } = useZoneLifecycleOverview({
        farmName: defaultFarmName,
        plotType: defaultPlotType,
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        รายงานสต็อกตามโซน (Stock Zone Lifecycle)
                    </h2>
                    <p className="text-xs text-slate-400">
                        แสดงจำนวนต้นไม้ตามโซน / ชนิด / ขนาด / เกรด และสถานะในระบบ
                    </p>
                </div>
                {/* ถ้าภายหลังจะเพิ่ม Filter UI เช่น Farm / Plot Type ค่อยมาเพิ่มตรงนี้ */}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                    label="จำนวนโซน"
                    value={totals.zones.toLocaleString("th-TH")}
                    loading={loading}
                />
                <SummaryCard
                    label="ต้นทั้งหมด"
                    value={totals.total_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
                <SummaryCard
                    label="พร้อมขาย (Available)"
                    value={totals.available_qty.toLocaleString("th-TH")}
                    loading={loading}
                    tone="primary"
                />
                <SummaryCard
                    label="จองแล้ว (Reserved)"
                    value={totals.reserved_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
                <SummaryCard
                    label="ออกคำสั่งขุด (Dig Ordered)"
                    value={totals.dig_ordered_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
                <SummaryCard
                    label="ขุดแล้ว (Dug)"
                    value={totals.dug_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
                <SummaryCard
                    label="จัดส่งแล้ว (Shipped)"
                    value={totals.shipped_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
                <SummaryCard
                    label="ปลูกแล้ว (Planted)"
                    value={totals.planted_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="text-xs text-red-300 border border-red-700 bg-red-900/50 rounded-md px-3 py-2">
                    ไม่สามารถโหลดข้อมูลได้: {error}
                </div>
            )}

            {/* Table */}
            <div className="border border-slate-700 rounded-lg overflow-auto bg-slate-800">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-700/50 border-b border-slate-600">
                        <tr>
                            <Th>ฟาร์ม</Th>
                            <Th>โซน</Th>
                            <Th>ประเภทแปลง</Th>
                            <Th>พันธุ์ไม้</Th>
                            <Th>Size</Th>
                            <Th>เกรด</Th>
                            <Th className="text-right">ทั้งหมด</Th>
                            <Th className="text-right">พร้อมขาย</Th>
                            <Th className="text-right">จองแล้ว</Th>
                            <Th className="text-right">Dig Ordered</Th>
                            <Th className="text-right">Dug</Th>
                            <Th className="text-right">Shipped</Th>
                            <Th className="text-right">Planted</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {loading && !rows.length ? (
                            <tr>
                                <td
                                    colSpan={13}
                                    className="text-center text-slate-500 py-4"
                                >
                                    กำลังโหลดข้อมูล...
                                </td>
                            </tr>
                        ) : null}

                        {!loading && !rows.length ? (
                            <tr>
                                <td
                                    colSpan={13}
                                    className="text-center text-slate-500 py-4"
                                >
                                    ยังไม่มีข้อมูลสต็อกใน view นี้
                                </td>
                            </tr>
                        ) : null}

                        {rows.map((row) => (
                            <tr
                                key={`${row.zone_id}-${row.species_id}-${row.size_label}-${row.grade_id}`}
                                className={
                                    "hover:bg-slate-700/50 transition-colors " +
                                    (onZoneClick ? "cursor-pointer" : "")
                                }
                                onClick={() => {
                                    if (onZoneClick) onZoneClick(row.zone_id);
                                }}
                            >
                                <Td>{row.farm_name}</Td>
                                <Td className={onZoneClick ? "font-medium text-cyan-400 underline" : ""}>
                                    {row.zone_name}
                                </Td>
                                <Td>{row.plot_type}</Td>
                                <Td>
                                    {row.species_name_th ??
                                        row.species_name_en ??
                                        row.species_code}
                                </Td>
                                <Td>
                                    {row.size_label}
                                    {row.height_label
                                        ? ` (${row.height_label})`
                                        : ""}
                                </Td>
                                <Td>{row.grade_name ?? row.grade_code}</Td>
                                <Td className="text-right text-white font-medium">
                                    {row.total_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right text-emerald-400">
                                    {row.available_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right text-amber-400">
                                    {row.reserved_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right">
                                    {row.dig_ordered_qty?.toLocaleString(
                                        "th-TH"
                                    )}
                                </Td>
                                <Td className="text-right">
                                    {row.dug_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right">
                                    {row.shipped_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right">
                                    {row.planted_qty?.toLocaleString("th-TH")}
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

type SummaryCardProps = {
    label: string;
    value: string;
    loading?: boolean;
    tone?: "default" | "primary";
};

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, loading, tone = "default" }) => {
    const toneStyles = tone === "primary"
        ? "border-emerald-800 bg-emerald-900/30"
        : "border-slate-700 bg-slate-800";

    return (
        <div className={`border rounded-xl px-3 py-2 flex flex-col gap-1 shadow-lg ${toneStyles}`}>
            <span className="text-[11px] text-slate-400">{label}</span>
            <span className="text-base font-semibold text-white">
                {loading ? "..." : value}
            </span>
        </div>
    );
};

type ThProps = React.ThHTMLAttributes<HTMLTableCellElement>;
const Th: React.FC<ThProps> = ({ children, className = "", ...rest }) => (
    <th
        className={
            "px-2 py-2 text-left font-medium text-[11px] text-slate-400 whitespace-nowrap " +
            className
        }
        {...rest}
    >
        {children}
    </th>
);

type TdProps = React.TdHTMLAttributes<HTMLTableCellElement>;
const Td: React.FC<TdProps> = ({ children, className = "", ...rest }) => (
    <td
        className={
            "px-2 py-1 text-[11px] text-slate-300 whitespace-nowrap " +
            className
        }
        {...rest}
    >
        {children}
    </td>
);
