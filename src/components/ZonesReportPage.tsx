import React, { useMemo, useState } from "react";
import { Loader2, MapPin, Trees, ArrowUpRight } from "lucide-react";
import { useZonesPlantingReport } from "../hooks/useZonesPlantingReport";
import { usePlantingPlotTrees, PlantingPlotTree } from "../hooks/usePlantingPlotTrees";
import MoveTreesToStockModal from "./plots/MoveTreesToStockModal";

const ZonesReportPage: React.FC = () => {
    const { zones, zoneSummaries, loading, error, refetch: refetchZones } = useZonesPlantingReport();
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

    const activeZoneId =
        selectedZoneId || (zones.length > 0 ? zones[0].id : null);

    const activeZone = useMemo(
        () => zones.find((z) => z.id === activeZoneId) || null,
        [zones, activeZoneId]
    );

    // ดึงรายการต้นไม้ในแปลง (จาก planting_plot_trees)
    const {
        data: plotTrees,
        loading: treesLoading,
        error: treesError,
        refetch: refetchTrees
    } = usePlantingPlotTrees(activeZoneId || undefined);

    // Modal state
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [selectedTreeToMove, setSelectedTreeToMove] = useState<PlantingPlotTree | null>(null);

    const handleOpenMoveModal = (tree: PlantingPlotTree) => {
        setSelectedTreeToMove(tree);
        setMoveModalOpen(true);
    };

    const handleMoveSuccess = () => {
        refetchTrees();
        refetchZones();
    };

    // KPI ด้านบน
    const totalTreesAllZones = useMemo(
        () =>
            Object.values(zoneSummaries).reduce(
                (sum, z) => sum + (z.totalPlanned || 0),
                0
            ),
        [zoneSummaries]
    );

    const zoneCount = zones.length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        รายงานแปลงปลูก (Zones Report)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        สรุปข้อมูลแปลงปลูก และจำนวนต้นไม้ทุกชนิดในแต่ละแปลง
                    </p>
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">จำนวนแปลงทั้งหมด</div>
                        <div className="text-2xl font-semibold text-slate-900">
                            {zoneCount.toLocaleString("th-TH")}{" "}
                            <span className="text-sm font-normal text-slate-500">แปลง</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-sky-600" />
                    </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">
                            จำนวนต้นไม้ตามแผน (ทุกแปลง)
                        </div>
                        <div className="text-2xl font-semibold text-slate-900">
                            {totalTreesAllZones.toLocaleString("th-TH")}{" "}
                            <span className="text-sm font-normal text-slate-500">ต้น</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Trees className="w-5 h-5 text-emerald-600" />
                    </div>
                </div>

                {activeZone && (
                    <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <div className="text-xs text-slate-500 mb-1">
                            ต้นไม้ทั้งหมดในแปลงที่เลือก
                        </div>
                        <div className="text-2xl font-semibold text-slate-900">
                            {(
                                zoneSummaries[activeZone.id]?.totalPlanned || 0
                            ).toLocaleString("th-TH")}{" "}
                            <span className="text-sm font-normal text-slate-500">ต้น</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Layout 2 ส่วน: ตารางแปลง + รายละเอียดแปลง */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* ตารางรายชื่อแปลง (ซ้าย) */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                            รายการแปลงปลูก
                        </span>
                        <span className="text-xs text-slate-500">
                            {zones.length} แปลง
                        </span>
                    </div>

                    {loading && (
                        <div className="py-6 text-center text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                            กำลังโหลดข้อมูลแปลง...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="py-6 text-center text-rose-500 text-sm">{error}</div>
                    )}

                    {!loading && !error && (
                        <div className="max-h-[420px] overflow-y-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">ชื่อแปลง</th>
                                        <th className="px-3 py-2 text-left font-medium">สถานที่</th>
                                        <th className="px-3 py-2 text-right font-medium">ตามแผน</th>
                                        <th className="px-3 py-2 text-right font-medium">คงเหลือ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zones.map((z) => {
                                        const summary = zoneSummaries[z.id] || {
                                            totalPlanned: 0,
                                            totalRemaining: 0,
                                        };
                                        const isActive = z.id === activeZoneId;
                                        return (
                                            <tr
                                                key={z.id}
                                                onClick={() => setSelectedZoneId(z.id)}
                                                className={`border-t border-slate-100 cursor-pointer transition-colors ${isActive
                                                    ? "bg-emerald-50/60"
                                                    : "hover:bg-slate-50"
                                                    }`}
                                            >
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-sm text-slate-800">
                                                        {z.name || "-"}
                                                    </div>
                                                    {z.description && (
                                                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                                            {z.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-slate-600">
                                                    {z.farm_name || "-"}
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-700">
                                                    {summary.totalPlanned.toLocaleString("th-TH")}
                                                </td>
                                                <td className="px-3 py-2 text-right text-emerald-600 font-medium">
                                                    {summary.totalRemaining.toLocaleString("th-TH")}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* รายละเอียดแปลง + ตารางต้นไม้ในแปลง (ขวา) */}
                <div className="space-y-3">
                    {/* ข้อมูลแปลง */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        {activeZone ? (
                            <>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-xs text-slate-500">แปลงที่เลือก</div>
                                        <div className="text-base font-semibold text-slate-900">
                                            {activeZone.name}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        พื้นที่{" "}
                                        {activeZone.area_rai != null
                                            ? `${activeZone.area_rai} ไร่`
                                            : "-"}
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 text-xs text-slate-600">
                                    <div className="space-y-1">
                                        <div>
                                            <span className="text-slate-500">สถานที่:</span>{" "}
                                            {activeZone.farm_name || "-"}
                                        </div>
                                        <div>
                                            <span className="text-slate-500">ขนาดแปลง:</span>{" "}
                                            {activeZone.area_width_m && activeZone.area_length_m
                                                ? `${activeZone.area_width_m} × ${activeZone.area_length_m} ม.`
                                                : "-"}
                                        </div>
                                        <div>
                                            <span className="text-slate-500">จำนวนแถวปลูก:</span>{" "}
                                            {activeZone.planting_rows != null
                                                ? `${activeZone.planting_rows} แถว`
                                                : "-"}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div>
                                            <span className="text-slate-500">ระบบน้ำ:</span> ปั๊ม{" "}
                                            {activeZone.pump_size_hp != null
                                                ? `${activeZone.pump_size_hp} แรงม้า`
                                                : "-"}
                                        </div>
                                        <div>
                                            <span className="text-slate-500">แหล่งน้ำ:</span>{" "}
                                            {activeZone.water_source || "-"}
                                        </div>
                                        <div>
                                            <span className="text-slate-500">ตรวจล่าสุด:</span>{" "}
                                            {activeZone.inspection_date
                                                ? new Date(activeZone.inspection_date).toLocaleDateString("th-TH")
                                                : "ยังไม่เคยบันทึก"}
                                        </div>
                                    </div>
                                </div>

                                {activeZone.inspection_notes && (
                                    <div className="mt-3 text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2">
                                        <div className="font-medium mb-1 text-slate-600">
                                            บันทึกงานแปลงล่าสุด
                                        </div>
                                        <div className="italic">{activeZone.inspection_notes}</div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-sm text-slate-500 text-center py-4">
                                กรุณาเลือกแปลงจากตารางด้านซ้าย
                            </div>
                        )}
                    </div>

                    {/* ตารางต้นไม้ในแปลง */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">
                                รายการต้นไม้ในแปลง
                            </span>
                            {activeZone && (
                                <span className="text-xs text-slate-500">
                                    ทั้งหมด {plotTrees.length} รายการ
                                </span>
                            )}
                        </div>

                        {treesLoading && (
                            <div className="py-6 text-center text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                                กำลังโหลดรายการต้นไม้...
                            </div>
                        )}

                        {!treesLoading && treesError && (
                            <div className="py-6 text-center text-rose-500 text-sm">
                                {treesError}
                            </div>
                        )}

                        {!treesLoading && !treesError && (
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">ชนิดต้นไม้</th>
                                            <th className="px-3 py-2 text-left font-medium">ขนาด</th>
                                            <th className="px-3 py-2 text-right font-medium">ปลูก</th>
                                            <th className="px-3 py-2 text-right font-medium">ล้อมแล้ว</th>
                                            <th className="px-3 py-2 text-right font-medium">คงเหลือ</th>
                                            <th className="px-3 py-2 text-center font-medium">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {plotTrees.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="py-6 text-center text-slate-400 text-sm"
                                                >
                                                    ยังไม่มีข้อมูลต้นไม้ในแปลงนี้
                                                </td>
                                            </tr>
                                        )}
                                        {plotTrees.map((row) => {
                                            return (
                                                <tr
                                                    key={row.id}
                                                    className="border-t border-slate-100 hover:bg-slate-50"
                                                >
                                                    <td className="px-3 py-2 text-slate-800">
                                                        {row.species_name_th || row.species_name_en || "-"}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-700">
                                                        {row.size_label || "-"}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-slate-700">
                                                        {row.planted_count.toLocaleString("th-TH")}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-slate-500">
                                                        {row.moved_to_stock_count.toLocaleString("th-TH")}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-emerald-600 font-medium">
                                                        {row.remaining_in_plot.toLocaleString("th-TH")}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        {row.remaining_in_plot > 0 && (
                                                            <button
                                                                onClick={() => handleOpenMoveModal(row)}
                                                                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                <ArrowUpRight className="h-3 w-3" />
                                                                ล้อมเข้าสต็อก
                                                            </button>
                                                        )}
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
            </div>

            {/* Move Modal */}
            {selectedTreeToMove && activeZone && (
                <MoveTreesToStockModal
                    isOpen={moveModalOpen}
                    onClose={() => setMoveModalOpen(false)}
                    plotTreeId={selectedTreeToMove.id}
                    plotName={activeZone.name}
                    speciesName={selectedTreeToMove.species_name_th || selectedTreeToMove.species_name_en || "-"}
                    sizeLabel={selectedTreeToMove.size_label}
                    remainingInPlot={selectedTreeToMove.remaining_in_plot}
                    availableToOrder={selectedTreeToMove.remaining_in_plot}
                    onSuccess={handleMoveSuccess}
                />
            )}
        </div>
    );
};

export default ZonesReportPage;
