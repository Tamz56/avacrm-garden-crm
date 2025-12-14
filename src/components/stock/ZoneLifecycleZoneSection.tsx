// src/components/stock/ZoneLifecycleZoneSection.tsx
import React, { useMemo } from "react";
import {
    useZoneLifecycleByZoneId,
    ZoneLifecycleRow,
} from "../../hooks/useZoneLifecycleOverview";

type ZoneLifecycleZoneSectionProps = {
    zoneId?: string;
};

type SpeciesGroup = {
    key: string;
    label: string;
    rows: ZoneLifecycleRow[];
    totals: {
        total_qty: number;
        available_qty: number;
        reserved_qty: number;
        dig_ordered_qty: number;
        dug_qty: number;
        shipped_qty: number;
        planted_qty: number;
    };
};

export const ZoneLifecycleZoneSection: React.FC<
    ZoneLifecycleZoneSectionProps
> = ({ zoneId }) => {
    const { rows, loading, error, totals } = useZoneLifecycleByZoneId(zoneId);

    const speciesGroups: SpeciesGroup[] = useMemo(() => {
        if (!rows.length) return [];

        const map = new Map<string, SpeciesGroup>();

        for (const r of rows) {
            const key = r.species_id;
            const label =
                r.species_name_th ??
                r.species_name_en ??
                r.species_code ??
                "ไม่ทราบชื่อพันธุ์";

            if (!map.has(key)) {
                map.set(key, {
                    key,
                    label,
                    rows: [],
                    totals: {
                        total_qty: 0,
                        available_qty: 0,
                        reserved_qty: 0,
                        dig_ordered_qty: 0,
                        dug_qty: 0,
                        shipped_qty: 0,
                        planted_qty: 0,
                    },
                });
            }

            const group = map.get(key)!;
            group.rows.push(r);

            group.totals.total_qty += r.total_qty ?? 0;
            group.totals.available_qty += r.available_qty ?? 0;
            group.totals.reserved_qty += r.reserved_qty ?? 0;
            group.totals.dig_ordered_qty += r.dig_ordered_qty ?? 0;
            group.totals.dug_qty += r.dug_qty ?? 0;
            group.totals.shipped_qty += r.shipped_qty ?? 0;
            group.totals.planted_qty += r.planted_qty ?? 0;
        }

        return Array.from(map.values()).sort((a, b) =>
            a.label.localeCompare(b.label, "th-TH")
        );
    }, [rows]);

    return (
        <section className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-base font-semibold">
                        สถานะสต็อกในโซนนี้
                    </h3>
                    <p className="text-xs text-gray-500">
                        สรุปจำนวนต้นไม้ในโซน แยกตามพันธุ์ / ขนาด / เกรด และสถานะ
                    </p>
                </div>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <SummaryCard
                    label="ต้นทั้งหมดในโซนนี้"
                    value={totals.total_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
                <SummaryCard
                    label="พร้อมขาย (Available)"
                    value={totals.available_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
                <SummaryCard
                    label="จองแล้ว (Reserved)"
                    value={totals.reserved_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
                <SummaryCard
                    label="ปลูกแล้ว (Planted)"
                    value={totals.planted_qty.toLocaleString("th-TH")}
                    loading={loading}
                />
            </div>

            {error && (
                <div className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2 mb-3">
                    ไม่สามารถโหลดข้อมูลสต็อกของโซนนี้ได้: {error}
                </div>
            )}

            {loading && !rows.length && (
                <div className="text-xs text-gray-500 py-3">
                    กำลังโหลดข้อมูลสต็อกในโซนนี้...
                </div>
            )}

            {!loading && !rows.length && (
                <div className="text-xs text-gray-400 py-3">
                    ยังไม่มีข้อมูลใน view_stock_zone_lifecycle สำหรับโซนนี้
                </div>
            )}

            {/* แสดงทีละ Species */}
            <div className="flex flex-col gap-4">
                {speciesGroups.map((group) => (
                    <div
                        key={group.key}
                        className="border rounded-lg overflow-hidden bg-white"
                    >
                        <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                            <div>
                                <div className="text-[13px] font-semibold">
                                    {group.label}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                    รวมทั้งหมด{" "}
                                    {group.totals.total_qty.toLocaleString(
                                        "th-TH"
                                    )}{" "}
                                    ต้น
                                </div>
                            </div>
                            <div className="flex gap-3 text-[11px] text-gray-600">
                                <span>
                                    Available:{" "}
                                    {group.totals.available_qty.toLocaleString(
                                        "th-TH"
                                    )}
                                </span>
                                <span>
                                    Reserved:{" "}
                                    {group.totals.reserved_qty.toLocaleString(
                                        "th-TH"
                                    )}
                                </span>
                                <span>
                                    Planted:{" "}
                                    {group.totals.planted_qty.toLocaleString(
                                        "th-TH"
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-auto">
                            <table className="min-w-full text-[11px]">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <Th>Size</Th>
                                        <Th>เกรด</Th>
                                        <Th className="text-right">
                                            ทั้งหมด
                                        </Th>
                                        <Th className="text-right">
                                            Available
                                        </Th>
                                        <Th className="text-right">
                                            Reserved
                                        </Th>
                                        <Th className="text-right">
                                            Dig Ordered
                                        </Th>
                                        <Th className="text-right">Dug</Th>
                                        <Th className="text-right">
                                            Shipped
                                        </Th>
                                        <Th className="text-right">
                                            Planted
                                        </Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.rows.map((row) => (
                                        <tr
                                            key={`${row.species_id}-${row.size_label}-${row.grade_id}`}
                                            className="border-t hover:bg-gray-50"
                                        >
                                            <Td>
                                                {row.size_label}
                                                {row.height_label
                                                    ? ` (${row.height_label})`
                                                    : ""}
                                            </Td>
                                            <Td>
                                                {row.grade_name ??
                                                    row.grade_code ??
                                                    "-"}
                                            </Td>
                                            <Td className="text-right">
                                                {row.total_qty?.toLocaleString(
                                                    "th-TH"
                                                )}
                                            </Td>
                                            <Td className="text-right">
                                                {row.available_qty?.toLocaleString(
                                                    "th-TH"
                                                )}
                                            </Td>
                                            <Td className="text-right">
                                                {row.reserved_qty?.toLocaleString(
                                                    "th-TH"
                                                )}
                                            </Td>
                                            <Td className="text-right">
                                                {row.dig_ordered_qty?.toLocaleString(
                                                    "th-TH"
                                                )}
                                            </Td>
                                            <Td className="text-right">
                                                {row.dug_qty?.toLocaleString(
                                                    "th-TH"
                                                )}
                                            </Td>
                                            <Td className="text-right">
                                                {row.shipped_qty?.toLocaleString(
                                                    "th-TH"
                                                )}
                                            </Td>
                                            <Td className="text-right">
                                                {row.planted_qty?.toLocaleString(
                                                    "th-TH"
                                                )}
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

type SummaryCardProps = {
    label: string;
    value: string;
    loading?: boolean;
};

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, loading }) => {
    return (
        <div className="border rounded-xl px-3 py-2 flex flex-col gap-1 bg-white shadow-sm">
            <span className="text-[11px] text-gray-500">{label}</span>
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
