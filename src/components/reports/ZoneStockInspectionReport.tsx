import React from "react";
import { useZoneStockVsInspectionSummary } from "../../hooks/useZoneStockVsInspectionSummary";

const ZoneStockInspectionReport: React.FC = () => {
    const { rows, loading, error, reload } = useZoneStockVsInspectionSummary();

    const getStatus = (row: any) => {
        const diff = row.diff_qty_total ?? 0;
        const system = row.system_qty_total ?? 0;

        if (system === 0 && diff === 0) return { label: "ไม่มีข้อมูล", color: "text-gray-500" };

        const ratio = Math.abs(diff) / Math.max(system, 1);

        if (diff === 0) return { label: "ตรงกัน", color: "text-emerald-700" };
        if (ratio <= 0.05) return { label: "คลาดเคลื่อนเล็กน้อย", color: "text-amber-600" };
        return { label: "คลาดเคลื่อนมาก", color: "text-red-600" };
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    รายงานความคลาดเคลื่อนต้นไม้ในแปลง (สต็อกระบบ vs ผลสำรวจ)
                </h2>
                <button
                    onClick={reload}
                    className="px-3 py-1.5 rounded border text-xs bg-white hover:bg-gray-50"
                >
                    รีโหลดข้อมูล
                </button>
            </div>

            {loading && <div className="text-sm text-gray-500">กำลังโหลดข้อมูล...</div>}
            {error && (
                <div className="text-sm text-red-600">
                    ไม่สามารถโหลดข้อมูลได้: {error}
                </div>
            )}

            {!loading && !error && rows.length === 0 && (
                <div className="text-sm text-gray-500">
                    ยังไม่มีข้อมูลในรายงาน (อาจยังไม่มีการสำรวจหรือยังไม่มีต้นไม้ในแปลง)
                </div>
            )}

            {rows.length > 0 && (
                <div className="overflow-x-auto border rounded">
                    <table className="min-w-full text-xs">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold">ฟาร์ม</th>
                                <th className="px-3 py-2 text-left font-semibold">แปลง</th>
                                <th className="px-3 py-2 text-right font-semibold">
                                    ตามระบบ (ต้น)
                                </th>
                                <th className="px-3 py-2 text-right font-semibold">
                                    จากสำรวจ (ต้น)
                                </th>
                                <th className="px-3 py-2 text-right font-semibold">ส่วนต่างรวม</th>
                                <th className="px-3 py-2 text-right font-semibold">
                                    คลาดเคลื่อนสูงสุด / ขนาด
                                </th>
                                <th className="px-3 py-2 text-left font-semibold">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => {
                                const status = getStatus(r);
                                const diff = r.diff_qty_total ?? 0;

                                const diffClass =
                                    diff === 0
                                        ? "text-gray-700"
                                        : diff > 0
                                            ? "text-emerald-700"
                                            : "text-red-600";

                                return (
                                    <tr key={r.zone_id} className="border-t">
                                        <td className="px-3 py-1">
                                            {r.farm_name || "-"}
                                        </td>
                                        <td className="px-3 py-1">
                                            {r.zone_name || r.zone_id}
                                        </td>
                                        <td className="px-3 py-1 text-right">
                                            {(r.system_qty_total ?? 0).toLocaleString()}
                                        </td>
                                        <td className="px-3 py-1 text-right">
                                            {(r.inspected_qty_total ?? 0).toLocaleString()}
                                        </td>
                                        <td className={`px-3 py-1 text-right ${diffClass}`}>
                                            {diff.toLocaleString()}
                                        </td>
                                        <td className="px-3 py-1 text-right">
                                            {(r.max_abs_diff ?? 0).toLocaleString()}
                                        </td>
                                        <td className={`px-3 py-1 ${status.color}`}>
                                            {status.label}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ZoneStockInspectionReport;
