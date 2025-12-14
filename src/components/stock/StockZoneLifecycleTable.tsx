import React from "react";
import { StockZoneLifecycleRow } from "../../hooks/useStockZoneLifecycle";

type Props = {
    rows: StockZoneLifecycleRow[];
    lowStockThreshold?: number;
    onRowClick?: (row: StockZoneLifecycleRow) => void; // ไว้ต่อ Drilldown ภายหลัง
};

export const StockZoneLifecycleTable: React.FC<Props> = ({
    rows,
    lowStockThreshold = 10,
    onRowClick,
}) => {
    return (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-3 py-2 text-left">ฟาร์ม</th>
                        <th className="px-3 py-2 text-left">โซน</th>
                        <th className="px-3 py-2 text-left">ประเภทแปลง</th>
                        <th className="px-3 py-2 text-left">พันธุ์</th>
                        <th className="px-3 py-2 text-left">ขนาด</th>
                        <th className="px-3 py-2 text-right">รวม</th>
                        <th className="px-3 py-2 text-right">พร้อมขาย</th>
                        <th className="px-3 py-2 text-right">จองแล้ว</th>
                        <th className="px-3 py-2 text-right">ในใบสั่งขุด</th>
                        <th className="px-3 py-2 text-right">ขุดแล้ว</th>
                        <th className="px-3 py-2 text-right">ส่งออก</th>
                        <th className="px-3 py-2 text-right">ปลูกแล้ว</th>
                        <th className="px-3 py-2 text-left">Alert</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const lowStock =
                            r.available_qty > 0 && r.available_qty < lowStockThreshold;
                        const overbook = r.reserved_qty > r.available_qty;

                        const rowKey = `${r.zone_id}-${r.species_id}-${r.size_label}`;

                        return (
                            <tr
                                key={rowKey}
                                className="border-t hover:bg-slate-50 cursor-pointer"
                                onClick={() => onRowClick?.(r)}
                            >
                                <td className="px-3 py-2">{r.farm_name}</td>
                                <td className="px-3 py-2">{r.zone_name}</td>
                                <td className="px-3 py-2">{r.plot_type}</td>
                                <td className="px-3 py-2">{r.species_name_th}</td>
                                <td className="px-3 py-2">{r.size_label}</td>
                                <td className="px-3 py-2 text-right">{r.total_qty}</td>
                                <td className="px-3 py-2 text-right font-medium text-emerald-600">{r.available_qty}</td>
                                <td className="px-3 py-2 text-right text-amber-600">{r.reserved_qty}</td>
                                <td className="px-3 py-2 text-right">{r.dig_ordered_qty}</td>
                                <td className="px-3 py-2 text-right">{r.dug_qty}</td>
                                <td className="px-3 py-2 text-right">{r.shipped_qty}</td>
                                <td className="px-3 py-2 text-right">{r.planted_qty}</td>
                                <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-1">
                                        {lowStock && (
                                            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-[10px]">
                                                ใกล้หมด
                                            </span>
                                        )}
                                        {overbook && (
                                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-[10px]">
                                                Overbook
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}

                    {rows.length === 0 && (
                        <tr>
                            <td
                                colSpan={13}
                                className="px-3 py-6 text-center text-slate-500"
                            >
                                ยังไม่มีข้อมูลสต็อกในเงื่อนไขนี้
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
