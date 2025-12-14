import React, { useMemo } from "react";
import { Sprout, Trees, LayoutGrid } from "lucide-react";
import { useSpeciesStockAndPlots } from "../../hooks/useSpeciesStockAndPlots";

const toNumber = (v: number | null | undefined) => v ?? 0;

const PlantInventoryDashboard: React.FC = () => {
    const { rows, loading, error } = useSpeciesStockAndPlots();

    const summary = useMemo(() => {
        const totalStock = rows.reduce(
            (sum, r) => sum + toNumber(r.total_stock_trees),
            0
        );
        const planted = rows.reduce(
            (sum, r) => sum + toNumber(r.planted_in_plots),
            0
        );

        const available = rows.reduce(
            (sum, r) => sum + toNumber(r.available_trees),
            0
        );

        // “รวมทั้งระบบ” = ต้นที่เคยอยู่ในระบบทั้งหมด (ไม่รวมที่ขายไปแล้ว หรือรวม? User บอก Stock + Planted)
        // ถ้า shipped คือขายไปแล้ว อาจจะไม่นับรวมใน "Inventory" ปัจจุบัน
        // แต่ grandTotal ในโค้ด user คือ totalStock + planted
        const grandTotal = totalStock + planted;

        return {
            grandTotal,
            totalStock,
            planted,
            available,
        };
    }, [rows]);

    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-emerald-600" />
                    <div>
                        <h1 className="text-lg font-semibold">
                            ภาพรวมต้นไม้ทั้งหมด (Stock + ปลูกในแปลง)
                        </h1>
                        <p className="text-xs text-slate-500">
                            ดูจำนวนต้นแยกตามพันธุ์ / ขนาด ว่ามีอยู่ในสต็อกเท่าไหร่ และปลูกลงแปลงแล้วเท่าไหร่
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="text-xs text-slate-500">ต้นไม้ทั้งหมดในระบบ (รวมปลูกแล้ว)</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">
                        {loading ? "..." : summary.grandTotal.toLocaleString()}
                    </div>
                </div>

                <div className="p-4 rounded-xl border border-sky-100 bg-sky-50">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-sky-700">อยู่ในสต็อก (ยังไม่ปลูก)</div>
                        <Trees className="w-4 h-4 text-sky-500" />
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-sky-900">
                        {loading ? "..." : summary.totalStock.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-sky-700">
                        พร้อมขาย / พร้อมย้ายปลูก {loading ? "..." : summary.available.toLocaleString()} ต้น
                    </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-emerald-700">ปลูกลงแปลงแล้ว</div>
                        <Sprout className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-emerald-900">
                        {loading ? "..." : summary.planted.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-700">
                        รวมทุกแปลงที่บันทึกไว้
                    </div>
                </div>

                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50">
                    <div className="text-xs text-amber-700">จำนวนพันธุ์ / ขนาด ที่มีบันทึก</div>
                    <div className="mt-1 text-2xl font-semibold text-amber-900">
                        {loading ? "..." : rows.length.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-amber-700">
                        แถวในตารางด้านล่าง (species + size)
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Trees className="w-4 h-4" />
                        รายละเอียดแยกตามพันธุ์ / ขนาด
                    </div>
                    <div className="text-xs text-slate-400">
                        ทั้งหมด {rows.length.toLocaleString()} แถว
                    </div>
                </div>

                {loading && (
                    <div className="p-8 text-center text-sm text-slate-400">
                        กำลังโหลดข้อมูล...
                    </div>
                )}

                {error && !loading && (
                    <div className="p-8 text-center text-sm text-red-500">{error}</div>
                )}

                {!loading && !error && rows.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-400">
                        ยังไม่มีข้อมูลจาก stock หรือแปลงปลูก
                    </div>
                )}

                {!loading && !error && rows.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-slate-500">
                                        พันธุ์
                                    </th>
                                    <th className="px-2 py-2 text-left font-medium text-slate-500">
                                        ขนาด
                                    </th>
                                    <th className="px-2 py-2 text-right font-medium text-slate-500">
                                        อยู่ในสต็อก
                                    </th>
                                    <th className="px-2 py-2 text-right font-medium text-slate-500">
                                        ปลูกในแปลงแล้ว
                                    </th>
                                    <th className="px-2 py-2 text-right font-medium text-slate-500">
                                        รวม (สต็อก + แปลง)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const totalRow =
                                        toNumber(row.total_stock_trees) +
                                        toNumber(row.planted_in_plots);

                                    return (
                                        <tr
                                            key={`${row.species_id}-${row.size_label}`}
                                            className="border-b border-slate-100 hover:bg-slate-50/60"
                                        >
                                            <td className="px-4 py-2">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-800">
                                                        {row.species_name_th ||
                                                            row.species_name_en ||
                                                            "-"}
                                                    </span>
                                                    {row.species_name_en && (
                                                        <span className="text-[10px] text-slate-400">
                                                            {row.species_name_en}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-xs text-slate-700">
                                                {row.size_label || "-"}
                                            </td>
                                            <td className="px-2 py-2 text-right text-sky-800 font-medium">
                                                {toNumber(row.total_stock_trees).toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2 text-right text-emerald-800 font-medium">
                                                {toNumber(row.planted_in_plots).toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2 text-right text-slate-900 font-semibold">
                                                {totalRow.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlantInventoryDashboard;
