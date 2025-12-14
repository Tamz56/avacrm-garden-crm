import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useZoneTreeStockVsInspection } from "../../hooks/useZoneTreeStockVsInspection";

const mismatchLabelMap: Record<string, string> = {
    none: "ตรงตามระบบ",
    low: "คลาดเคลื่อนเล็กน้อย",
    medium: "คลาดเคลื่อนปานกลาง",
    high: "คลาดเคลื่อนมาก",
};

const mismatchColorMap: Record<string, string> = {
    none: "bg-emerald-50 text-emerald-700 border-emerald-200",
    low: "bg-yellow-50 text-yellow-700 border-yellow-200",
    medium: "bg-orange-50 text-orange-700 border-orange-200",
    high: "bg-red-50 text-red-700 border-red-200",
};

type ZoneMismatchDetailTableProps = {
    zoneId: string;
    speciesOptions: { id: string; name: string }[];
};

export const ZoneMismatchDetailTable: React.FC<ZoneMismatchDetailTableProps> = ({
    zoneId,
    speciesOptions,
}) => {
    const { rows, loading, error } = useZoneTreeStockVsInspection(zoneId);

    const toThai = (val?: number | null) =>
        (val ?? 0).toLocaleString("th-TH", {
            maximumFractionDigits: 0,
        });

    const getSpeciesName = (id: string) => {
        const found = speciesOptions.find((s) => s.id === id);
        return found ? found.name : "-";
    };

    return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                        รายละเอียดความคลาดเคลื่อนในแปลงนี้
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        แสดงเปรียบเทียบจำนวนตามระบบกับผลการสำรวจ แยกตามชนิดและขนาดต้นไม้
                    </p>
                </div>
            </div>

            {loading && (
                <div className="py-6 text-center text-sm text-slate-500">
                    กำลังโหลดข้อมูล...
                </div>
            )}

            {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    ไม่สามารถโหลดข้อมูลได้: {error}
                </div>
            )}

            {!loading && !error && rows.length === 0 && (
                <div className="py-6 text-center text-sm text-slate-500">
                    ยังไม่มีข้อมูลเปรียบเทียบระบบกับการสำรวจ
                </div>
            )}

            {!loading && !error && rows.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-600">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                                <th className="px-3 py-2">ชนิด / พันธุ์ไม้</th>
                                <th className="px-3 py-2">ขนาด</th>
                                <th className="px-3 py-2 text-right">จำนวนในระบบ (ต้น)</th>
                                <th className="px-3 py-2 text-right">จำนวนสำรวจ (ต้น)</th>
                                <th className="px-3 py-2 text-right">ส่วนต่าง (ต้น)</th>
                                <th className="px-3 py-2">ทิศทาง</th>
                                <th className="px-3 py-2">ระดับความคลาดเคลื่อน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const speciesName = row.species_name_th || getSpeciesName(row.species_id);
                                const sizeLabel = row.size_label || "-";
                                const systemQty = row.system_qty || 0;
                                const inspectionQty = row.inspected_qty || 0;
                                const diff = row.diff_qty || 0;

                                const directionText =
                                    diff > 0
                                        ? "สำรวจมากกว่าระบบ (เกิน)"
                                        : diff < 0
                                            ? "ระบบมากกว่าสำรวจ (ขาด)"
                                            : "ตรงตามระบบ";

                                const mismatchLevel: string =
                                    diff === 0
                                        ? "none"
                                        : Math.abs(diff) <= 10 // Simple logic, can be improved
                                            ? "low"
                                            : Math.abs(diff) <= 100
                                                ? "medium"
                                                : "high";

                                const badgeLabel =
                                    mismatchLabelMap[mismatchLevel] ||
                                    mismatchLabelMap["low"];
                                const badgeClass =
                                    mismatchColorMap[mismatchLevel] ||
                                    mismatchColorMap["low"];

                                return (
                                    <tr
                                        key={idx}
                                        className="border-b border-slate-50 text-[13px] last:border-0"
                                    >
                                        <td className="px-3 py-2 text-slate-800">
                                            {speciesName}
                                        </td>
                                        <td className="px-3 py-2">{sizeLabel}</td>
                                        <td className="px-3 py-2 text-right">
                                            {toThai(systemQty)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {toThai(inspectionQty)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <span
                                                className={
                                                    diff === 0
                                                        ? "text-emerald-600"
                                                        : diff > 0
                                                            ? "text-orange-600"
                                                            : "text-red-600"
                                                }
                                            >
                                                {diff > 0 ? "+" : ""}
                                                {toThai(diff)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">
                                            {directionText}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span
                                                className={
                                                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium " +
                                                    badgeClass
                                                }
                                            >
                                                {mismatchLevel === "none" ? (
                                                    <CheckCircle2 className="h-3 w-3" />
                                                ) : (
                                                    <AlertTriangle className="h-3 w-3" />
                                                )}
                                                {badgeLabel}
                                            </span>
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
