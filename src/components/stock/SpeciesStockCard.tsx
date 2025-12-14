import React, { useState } from "react";
import { SpeciesStockBlock } from "../../types/stockLifecycle";

type Props = {
    block: SpeciesStockBlock;
};

export const SpeciesStockCard: React.FC<Props> = ({ block }) => {
    const [expanded, setExpanded] = useState(true);

    const {
        speciesNameTh,
        speciesNameEn,
        measureByHeight,
        totalQty,
        availableQty,
        reservedQty,
        digOrderedQty,
        shippedQty,
        estimatedValue,
    } = block;

    return (
        <div className="mb-3 rounded-xl border bg-white shadow-sm">
            {/* Header */}
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                            {speciesNameTh}
                        </h3>
                        {speciesNameEn && (
                            <span className="text-xs text-slate-500">{speciesNameEn}</span>
                        )}
                        {measureByHeight && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                                วัดตามความสูง (เมตร)
                            </span>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                        <span>รวม {totalQty.toLocaleString("th-TH")} ต้น</span>
                        <span className="text-emerald-700">
                            พร้อมขาย {availableQty.toLocaleString("th-TH")}
                        </span>
                        <span className="text-amber-700">
                            จองแล้ว {reservedQty.toLocaleString("th-TH")}
                        </span>
                        <span className="text-sky-700">
                            ในใบสั่งขุด {digOrderedQty.toLocaleString("th-TH")}
                        </span>
                        <span className="text-slate-600">
                            ส่งออกแล้ว {shippedQty.toLocaleString("th-TH")}
                        </span>
                        {estimatedValue != null && (
                            <span className="font-medium text-emerald-800">
                                มูลค่าพร้อมขาย ~ {estimatedValue.toLocaleString("th-TH")} บาท
                            </span>
                        )}
                    </div>
                </div>

                <div className="text-xs text-slate-400">
                    {expanded ? "ซ่อนรายละเอียด ▲" : "ดูรายละเอียด ▼"}
                </div>
            </button>

            {/* Body: zone table */}
            {expanded && (
                <div className="border-t px-4 py-3">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                                    <th className="px-2 py-2 text-left">โซน / ฟาร์ม</th>
                                    <th className="px-2 py-2 text-left">ประเภทแปลง</th>
                                    <th className="px-2 py-2 text-center">ขนาด</th>
                                    <th className="px-2 py-2 text-center">ความสูง</th>
                                    <th className="px-2 py-2 text-center">พร้อมขาย</th>
                                    <th className="px-2 py-2 text-center">จองแล้ว</th>
                                    <th className="px-2 py-2 text-center">ในใบสั่งขุด</th>
                                    <th className="px-2 py-2 text-center">ส่งออกแล้ว</th>
                                    <th className="px-2 py-2 text-center">ปลูกแล้ว</th>
                                    <th className="px-2 py-2 text-center">สถานะ Tag</th>
                                </tr>
                            </thead>
                            <tbody>
                                {block.zones.map((row) => (
                                    <tr key={`${row.zoneId}-${row.sizeLabel}-${row.heightLabel}`}>
                                        <td className="px-2 py-1 align-top">
                                            <div className="font-medium text-slate-800">
                                                {row.zoneName}
                                            </div>
                                            {row.farmName && (
                                                <div className="text-[11px] text-slate-500">
                                                    {row.farmName}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-2 py-1 text-center text-[11px] text-slate-600">
                                            {row.plotTypeName || "-"}
                                        </td>
                                        <td className="px-2 py-1 text-center">
                                            {row.sizeLabel || "-"}
                                        </td>
                                        <td className="px-2 py-1 text-center">
                                            {row.heightLabel || "-"}
                                        </td>
                                        <td className="px-2 py-1 text-center text-emerald-700">
                                            {row.availableQty.toLocaleString("th-TH")}
                                        </td>
                                        <td className="px-2 py-1 text-center text-amber-700">
                                            {row.reservedQty.toLocaleString("th-TH")}
                                        </td>
                                        <td className="px-2 py-1 text-center text-sky-700">
                                            {row.digOrderedQty.toLocaleString("th-TH")}
                                        </td>
                                        <td className="px-2 py-1 text-center text-slate-700">
                                            {row.shippedQty.toLocaleString("th-TH")}
                                        </td>
                                        <td className="px-2 py-1 text-center text-slate-700">
                                            {row.plantedQty.toLocaleString("th-TH")}
                                        </td>
                                        <td className="px-2 py-1 text-center">
                                            {row.untaggedQty > 0 ? (
                                                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800">
                                                    ยังไม่ Tag {row.untaggedQty.toLocaleString("th-TH")}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Action buttons ด้านล่างการ์ด */}
                    {/* ให้ atgt ไปเสียบ route จริง */}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:border-emerald-500">
                            ไปหน้าแปลง / โซน
                        </button>
                        <button className="rounded-md border border-emerald-500 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                            สร้าง Tag เพิ่ม
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
