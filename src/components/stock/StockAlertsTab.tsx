// src/components/stock/StockAlertsTab.tsx
import React, { useState } from "react";
import { AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react";
import { useStockAlerts } from "../../hooks/useStockAlerts";

type StockAlertsTabProps = {
    defaultFarmName?: string;
    defaultPlotTypeId?: string;
    onZoneClick?: (zoneId: string) => void; // สำหรับ Drilldown ไป Zone Detail
};

export const StockAlertsTab: React.FC<StockAlertsTabProps> = ({
    defaultFarmName,
    defaultPlotTypeId,
    onZoneClick,
}) => {
    const [farmName] = useState<string | undefined>(defaultFarmName);
    const [plotTypeId] = useState<string | undefined>(defaultPlotTypeId);
    const [speciesId, setSpeciesId] = useState<string | undefined>(undefined);

    const { rows, loading, error, summary } = useStockAlerts({
        farmName,
        plotTypeId,
        speciesId,
    });

    // ในอนาคต ถ้าต้องการ Filter พันธุ์/โซน สามารถเพิ่ม dropdown ใช้ setSpeciesId / setPlotTypeId ได้

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        แจ้งเตือนสต็อก (Stock Alerts)
                    </h2>
                    <p className="text-xs text-gray-500">
                        รวมจุดเสี่ยงของสต็อก เช่น จองเกินของที่พร้อมขาย สต็อกใกล้หมด
                        และต้นที่อยู่ในใบสั่งขุด
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="แจ้งเตือนทั้งหมด"
                    value={summary.totalAlerts.toLocaleString("th-TH")}
                    variant="neutral"
                    loading={loading}
                />
                <SummaryCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="วิกฤติ (Critical)"
                    value={summary.criticalCount.toLocaleString("th-TH")}
                    variant="critical"
                    loading={loading}
                />
                <SummaryCard
                    icon={<AlertCircle className="w-4 h-4" />}
                    label="ต้องจับตา (Warning)"
                    value={summary.warningCount.toLocaleString("th-TH")}
                    variant="warning"
                    loading={loading}
                />
                <SummaryCard
                    icon={<Info className="w-4 h-4" />}
                    label="ข้อมูลทั่วไป (Info)"
                    value={summary.infoCount.toLocaleString("th-TH")}
                    variant="info"
                    loading={loading}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2">
                    ไม่สามารถโหลดข้อมูลแจ้งเตือนได้: {error}
                </div>
            )}

            {/* Table */}
            <div className="border rounded-lg overflow-auto bg-white">
                <table className="min-w-full text-[11px]">
                    <thead className="bg-gray-50">
                        <tr>
                            <Th>ประเภทแจ้งเตือน</Th>
                            <Th>พันธุ์ไม้</Th>
                            <Th>Size</Th>
                            <Th>เกรด</Th>
                            <Th>โซน</Th>
                            <Th className="text-right">รวม</Th>
                            <Th className="text-right">พร้อมขาย</Th>
                            <Th className="text-right">จองแล้ว</Th>
                            <Th className="text-right">ในใบสั่งขุด</Th>
                            <Th className="text-right">ปลูกแล้ว</Th>
                            <Th></Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !rows.length ? (
                            <tr>
                                <td colSpan={11} className="text-center py-4 text-gray-500">
                                    กำลังโหลดข้อมูลแจ้งเตือน...
                                </td>
                            </tr>
                        ) : null}

                        {!loading && !rows.length ? (
                            <tr>
                                <td colSpan={11} className="text-center py-4 text-gray-400">
                                    ยังไม่พบแจ้งเตือนสต็อกในขณะนี้
                                </td>
                            </tr>
                        ) : null}

                        {rows.map((row, index) => (
                            <tr
                                key={`${row.alert_type}-${row.zone_id}-${row.species_id}-${row.size_label}-${index}`}
                                className="border-t hover:bg-gray-50"
                            >
                                <Td>
                                    <AlertBadge type={row.alert_type} severity={row.alert_severity} />
                                    <div className="text-[10px] text-gray-500">
                                        {row.alert_message}
                                    </div>
                                </Td>
                                <Td>
                                    {row.species_name_th ??
                                        row.species_name_en ??
                                        row.species_code ??
                                        "-"}
                                </Td>
                                <Td>
                                    {row.size_label}
                                    {row.height_label
                                        ? ` (${row.height_label})`
                                        : ""}
                                </Td>
                                <Td>{row.grade_name ?? row.grade_code ?? "-"}</Td>
                                <Td>{row.zone_name}</Td>
                                <Td className="text-right">
                                    {row.total_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right">
                                    {row.available_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right">
                                    {row.reserved_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right">
                                    {row.dig_ordered_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right">
                                    {row.planted_qty?.toLocaleString("th-TH")}
                                </Td>
                                <Td className="text-right">
                                    {onZoneClick && (
                                        <button
                                            className="inline-flex items-center text-[10px] text-emerald-600 hover:text-emerald-800"
                                            onClick={() => onZoneClick(row.zone_id)}
                                        >
                                            ดูโซน
                                            <ArrowRight className="w-3 h-3 ml-1" />
                                        </button>
                                    )}
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

type SummaryVariant = "neutral" | "critical" | "warning" | "info";

type SummaryCardProps = {
    icon?: React.ReactNode;
    label: string;
    value: string;
    loading?: boolean;
    variant?: SummaryVariant;
};

const SummaryCard: React.FC<SummaryCardProps> = ({
    icon,
    label,
    value,
    loading,
    variant = "neutral",
}) => {
    const borderMap: Record<SummaryVariant, string> = {
        neutral: "border-gray-200",
        critical: "border-red-200",
        warning: "border-amber-200",
        info: "border-blue-200",
    };

    const bgMap: Record<SummaryVariant, string> = {
        neutral: "bg-white",
        critical: "bg-red-50",
        warning: "bg-amber-50",
        info: "bg-blue-50",
    };

    return (
        <div
            className={`border rounded-xl px-3 py-2 flex flex-col gap-1 shadow-sm ${borderMap[variant]} ${bgMap[variant]}`}
        >
            <div className="flex items-center gap-1 text-[11px] text-gray-600">
                {icon && <span>{icon}</span>}
                <span>{label}</span>
            </div>
            <span className="text-base font-semibold">
                {loading ? "..." : value}
            </span>
        </div>
    );
};

type ThProps = React.ThHTMLAttributes<HTMLTableCellElement>;
const Th: React.FC<ThProps> = ({ children, className = "", ...rest }) => (
    <th
        className={
            "px-2 py-2 text-left font-medium text-[11px] text-gray-600 whitespace-nowrap " +
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
            "px-2 py-1 text-[11px] text-gray-800 whitespace-nowrap " +
            className
        }
        {...rest}
    >
        {children}
    </td>
);

type AlertBadgeProps = {
    type: string;
    severity: number;
};

const AlertBadge: React.FC<AlertBadgeProps> = ({ type, severity }) => {
    let label = "";
    let color =
        "bg-gray-100 text-gray-700 border border-gray-200";

    if (type === "over_reserved") {
        label = "จองเกินของ";
        color =
            "bg-red-50 text-red-700 border border-red-200";
    } else if (type === "no_available") {
        label = "ไม่มีของพร้อมขาย";
        color =
            "bg-amber-50 text-amber-700 border border-amber-200";
    } else if (type === "low_stock") {
        label = "สต็อกใกล้หมด";
        color =
            "bg-amber-50 text-amber-700 border border-amber-200";
    } else if (type === "has_dig_order") {
        label = "มีใบสั่งขุดค้าง";
        color =
            "bg-blue-50 text-blue-700 border border-blue-200";
    } else {
        label = type;
    }

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${color}`}
        >
            {label}
            <span className="ml-1 text-[9px] opacity-70">
                Lv{severity}
            </span>
        </span>
    );
};
