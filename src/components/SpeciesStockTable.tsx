import React from "react";
import { getStockStatus, getStockStatusClassName, getStockStatusLabel } from "../utils/stockStatus";

export interface SpeciesStockRow {
    id: string;
    species: string;
    size_label: string;
    zone_name: string;
    planned_trees: number;
    reserved_trees: number;
    remaining_trees: number;
    price_per_tree?: number;
}

interface Props {
    rows: SpeciesStockRow[];
}

// Helper to sort sizes numerically if possible
const getSizeSortKey = (sizeLabel: string): number => {
    const m = sizeLabel.match(/\d+/);
    return m ? parseInt(m[0], 10) : 9999;
};

const groupRowsBySize = (rows: SpeciesStockRow[]) => {
    const map = new Map<string, SpeciesStockRow[]>();

    rows.forEach((row) => {
        const key = row.size_label || "ไม่ระบุ";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(row);
    });

    // Sort groups by size
    return Array.from(map.entries()).sort(
        ([sizeA], [sizeB]) => getSizeSortKey(sizeA) - getSizeSortKey(sizeB)
    );
};

export const SpeciesStockTable: React.FC<Props> = ({ rows }) => {
    if (!rows || rows.length === 0) {
        return (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-400 text-center">
                ยังไม่มีรายการสต็อกสำหรับต้นไม้นี้
                <br />
                คลิก "เพิ่มรายการสต็อก" เพื่อเริ่มต้น
            </div>
        );
    }

    const grouped = groupRowsBySize(rows);

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                        <th className="px-4 py-2 text-left w-24">ขนาด (นิ้ว)</th>
                        <th className="px-4 py-2 text-left">โซน / แปลง</th>
                        <th className="px-4 py-2 text-right">จำนวนรวม</th>
                        <th className="px-4 py-2 text-right">จองแล้ว</th>
                        <th className="px-4 py-2 text-right">เหลือ</th>
                        <th className="px-4 py-2 text-right">ราคา/ต้น</th>
                        <th className="px-4 py-2 text-center">สถานะ</th>
                        <th className="px-4 py-2 text-center w-20">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {grouped.map(([sizeLabel, items]) =>
                        items.map((row, index) => {
                            const status = getStockStatus(row.remaining_trees, row.planned_trees);

                            return (
                                <tr key={row.id || `${row.zone_name}-${index}`} className="hover:bg-slate-50/80">
                                    {/* Size column with rowSpan */}
                                    {index === 0 && (
                                        <td
                                            rowSpan={items.length}
                                            className="px-4 py-2 align-top font-medium text-slate-800 bg-slate-50 border-r border-slate-100"
                                        >
                                            {sizeLabel}
                                        </td>
                                    )}

                                    <td className="px-4 py-2 text-slate-700">{row.zone_name}</td>
                                    <td className="px-4 py-2 text-right text-slate-700">
                                        {row.planned_trees.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-amber-600">
                                        {row.reserved_trees > 0 ? row.reserved_trees.toLocaleString() : "-"}
                                    </td>
                                    <td className="px-4 py-2 text-right text-emerald-600 font-medium">
                                        {row.remaining_trees.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-600">
                                        {row.price_per_tree
                                            ? row.price_per_tree.toLocaleString("th-TH", {
                                                style: "currency",
                                                currency: "THB",
                                                maximumFractionDigits: 0,
                                            })
                                            : "-"}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span
                                            className={
                                                "inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-medium " +
                                                getStockStatusClassName(status)
                                            }
                                        >
                                            {getStockStatusLabel(status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button className="text-xs text-sky-600 hover:underline">
                                            แก้ไข
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};
