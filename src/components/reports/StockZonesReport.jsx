// src/components/reports/StockZonesReport.jsx
import React, { useMemo, useState } from "react";
import { Download, Sprout, Trees, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useZoneStockSummary } from "../../hooks/useZoneStockSummary.ts";
import { getStockStatus, getStockStatusClassName, getStockStatusLabel } from "../../utils/stockStatus";
import { LowStockAlertPanel } from "./LowStockAlertPanel";

const StockZonesReport = () => {
    const { data: stockRows, loading, error } = useZoneStockSummary();

    // 3. Filter Logic
    const [statusFilter, setStatusFilter] = useState("all"); // all | ready | low | empty | planned_only
    const [speciesFilter, setSpeciesFilter] = useState("all"); // all | silver | golden
    const [trunkSizeFilter, setTrunkSizeFilter] = useState("all"); // all | number
    const [potSizeFilter, setPotSizeFilter] = useState("all"); // all | number

    const filteredRows = useMemo(() => {
        return stockRows.filter((row) => {
            const status = getStockStatus(row.remaining_trees, row.planned_trees);

            if (statusFilter !== "all" && status !== statusFilter) return false;

            if (speciesFilter === "silver" && !row.species.toLowerCase().includes("silver")) return false;
            if (speciesFilter === "golden" && !row.species.toLowerCase().includes("golden")) return false;

            if (trunkSizeFilter !== "all" && row.trunk_size_inch !== Number(trunkSizeFilter)) return false;
            if (potSizeFilter !== "all" && row.pot_size_inch !== Number(potSizeFilter)) return false;

            return true;
        }).sort((a, b) => {
            // Sort: Species -> Trunk Size -> Pot Size -> Zone
            if (a.species !== b.species) return a.species.localeCompare(b.species);

            const sizeA = a.trunk_size_inch || 0;
            const sizeB = b.trunk_size_inch || 0;
            if (sizeA !== sizeB) return sizeA - sizeB;

            const potA = a.pot_size_inch || 0;
            const potB = b.pot_size_inch || 0;
            if (potA !== potB) return potA - potB;

            return a.zone_name.localeCompare(b.zone_name);
        });
    }, [stockRows, statusFilter, speciesFilter, trunkSizeFilter, potSizeFilter]);

    // 4. Calculate KPIs from filteredRows
    const kpis = useMemo(() => {
        const totalTrees = filteredRows.reduce((sum, r) => sum + r.remaining_trees, 0);
        const totalValue = filteredRows.reduce((sum, r) => sum + r.estimated_value, 0);
        const totalZones = new Set(filteredRows.map((r) => r.zone_id)).size;

        return { totalTrees, totalValue, totalZones };
    }, [filteredRows]);

    // ฟอร์แมตเงินบาท
    const toBaht = (val) =>
        `฿${val.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })}`;

    // ฟังก์ชัน Export CSV
    const handleExportCSV = () => {
        // 1. เตรียม Header (มี BOM \uFEFF เพื่อรองรับภาษาไทยใน Excel)
        const headers = [
            "Zone Name",
            "Location",
            "Species",
            "Size",
            "Planned Count",
            "Remaining Count",
            "Unit Price",
            "Total Value",
            "Status",
        ];

        // 2. แปลงข้อมูล filteredRows เป็น CSV string
        const csvContent = [
            headers.join(","), // หัวตาราง
            ...filteredRows.map((row) => {
                const status = getStockStatus(row.remaining_trees, row.planned_trees);
                return [
                    `"${row.zone_name}"`,
                    `"${row.location}"`,
                    `"${row.species}"`,
                    `"${row.size_label}"`,
                    row.planned_trees,
                    row.remaining_trees,
                    row.avg_price,
                    row.estimated_value,
                    `"${getStockStatusLabel(status)}"`,
                ].join(",")
            }),
        ].join("\n");

        // 3. สร้าง Blob และลิงก์ดาวน์โหลด
        const blob = new Blob(["\uFEFF" + csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stock_zones_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                กำลังโหลดข้อมูลรายงาน...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-12 text-red-500 bg-red-50 rounded-2xl border border-red-100">
                <AlertCircle className="w-6 h-6 mr-2" />
                เกิดข้อผิดพลาด: {error}
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ... existing KPI cards ... */}
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-center gap-4 shadow-sm">
                    <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                        <Trees className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-slate-500">
                            จำนวนต้นไม้ (คงเหลือ)
                        </div>
                        <div className="text-2xl font-semibold text-slate-900">
                            {kpis.totalTrees.toLocaleString()} ต้น
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-center gap-4 shadow-sm">
                    <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                        <Sprout className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-slate-500">
                            มูลค่ารวม (ประมาณการ)
                        </div>
                        <div className="text-2xl font-semibold text-emerald-600">
                            {toBaht(kpis.totalValue)}
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-center gap-4 shadow-sm">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-slate-500">
                            จำนวนแปลงปลูก
                        </div>
                        <div className="text-2xl font-semibold text-slate-900">
                            {kpis.totalZones} โซน
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert Panel */}
            <LowStockAlertPanel />

            {/* Filter & Export Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                    แสดง {filteredRows.length.toLocaleString()} แถว จากทั้งหมด{" "}
                    {stockRows.length.toLocaleString()} แถว
                </p>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Filter Buttons */}
                    <div className="flex bg-slate-100 p-1 rounded-full">
                        {[
                            { id: 'all', label: 'ทั้งหมด' },
                            { id: 'ready', label: 'พร้อมขาย' },
                            { id: 'low', label: 'ใกล้หมด' },
                            { id: 'empty', label: 'หมดโซน' },
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setStatusFilter(opt.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${statusFilter === opt.id
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Filter ชนิดต้นไม้ */}
                    <div className="flex items-center gap-2">
                        <select
                            value={speciesFilter}
                            onChange={(e) => setSpeciesFilter(e.target.value)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="all">ทุกสายพันธุ์</option>
                            <option value="silver">Silver Oak</option>
                            <option value="golden">Golden Oak</option>
                        </select>
                    </div>

                    {/* Filter ขนาดลำต้น */}
                    <div className="flex items-center gap-2">
                        <select
                            value={trunkSizeFilter}
                            onChange={(e) => setTrunkSizeFilter(e.target.value)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="all">ทุกขนาดลำต้น</option>
                            {Array.from({ length: 18 }, (_, i) => i + 3).map((size) => (
                                <option key={size} value={size}>{size}"</option>
                            ))}
                        </select>
                    </div>

                    {/* Filter ขนาดกระถาง */}
                    <div className="flex items-center gap-2">
                        <select
                            value={potSizeFilter}
                            onChange={(e) => setPotSizeFilter(e.target.value)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="all">ทุกขนาดกระถาง</option>
                            {Array.from({ length: 15 }, (_, i) => i + 6).map((size) => (
                                <option key={size} value={size}>{size}"</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-medium text-slate-500">
                            <th className="px-4 py-3 whitespace-nowrap">Zone Name</th>
                            <th className="px-4 py-3 whitespace-nowrap">Location</th>
                            <th className="px-4 py-3 whitespace-nowrap">Species</th>
                            <th className="px-4 py-3 whitespace-nowrap text-center">Size</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">
                                Planned
                            </th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">
                                Remaining
                            </th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">Price</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">Value</th>
                            <th className="px-4 py-3 whitespace-nowrap text-center">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRows.map((row) => {
                            const status = getStockStatus(row.remaining_trees, row.planned_trees);
                            return (
                                <tr
                                    key={row.stock_item_id}
                                    className="hover:bg-emerald-50/40 transition-colors"
                                >
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        {row.zone_name}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{row.location}</td>
                                    <td className="px-4 py-3 text-slate-700">{row.species}</td>
                                    <td className="px-4 py-3 text-center text-slate-500">
                                        {row.size_label}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-500">
                                        {row.planned_trees}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                        {row.remaining_trees}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-500">
                                        {toBaht(row.avg_price)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                                        {toBaht(row.estimated_value)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusClassName(status)}`}
                                        >
                                            {getStockStatusLabel(status)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}

                        {filteredRows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-8 text-center text-slate-400 text-sm"
                                >
                                    ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockZonesReport;
