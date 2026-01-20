import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Loader2, FileText } from "lucide-react";

type ZoneMasterRow = {
    id: string;
    name: string;
    farm_name: string | null;
    zone_type_name: string | null; // from planting_plot_detail_lookup
    area_rai: number | null;
    area_width_m: number | null;
    area_length_m: number | null;
    planting_rows: number | null;
    water_source: string | null;
    pump_size_hp: number | null;
    total_planted_qty: number | null;
    description: string | null;
};

type Props = { isDarkMode?: boolean };

export const ZoneMasterDataTab: React.FC<Props> = ({ isDarkMode = false }) => {
    const [rows, setRows] = useState<ZoneMasterRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch lookups first
            const { data: lookups } = await supabase
                .from("planting_plot_detail_lookup")
                .select("id, name_th");

            const typeMap = new Map<string, string>();
            lookups?.forEach((l: any) => typeMap.set(l.id, l.name_th));

            const { data, error } = await supabase
                .from("stock_zones")
                .select("*")
                .order("farm_name", { ascending: true })
                .order("name", { ascending: true });

            if (error) throw error;

            const mapped: ZoneMasterRow[] = (data || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                farm_name: r.farm_name,
                zone_type_name: typeMap.get(r.plot_type) || "-",
                area_rai: r.area_rai,
                area_width_m: r.area_width_m,
                area_length_m: r.area_length_m,
                planting_rows: r.planting_rows,
                water_source: r.water_source,
                pump_size_hp: r.pump_size_hp,
                total_planted_qty: r.total_planted_qty,
                description: r.description
            }));

            setRows(mapped);
        } catch (err: any) {
            console.error("load zone master report error", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        ข้อมูลโครงสร้างแปลง (Zone Master Data)
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        สรุปข้อมูลรายละเอียดโครงสร้างพื้นฐานของแต่ละแปลง
                    </p>
                </div>
                <button
                    onClick={load}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50 text-slate-600"
                >
                    รีโหลดข้อมูล
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    กำลังโหลดข้อมูล...
                </div>
            )}

            {error && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                    เกิดข้อผิดพลาด: {error}
                </div>
            )}

            {!loading && !error && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">ชื่อแปลง</th>
                                    <th className="px-4 py-3 text-left font-semibold">สถานที่ (ฟาร์ม)</th>
                                    <th className="px-4 py-3 text-left font-semibold">ประเภท</th>
                                    <th className="px-4 py-3 text-right font-semibold">พื้นที่ (ไร่)</th>
                                    <th className="px-4 py-3 text-center font-semibold">ขนาด (กxย)</th>
                                    <th className="px-4 py-3 text-center font-semibold">จำนวนร่อง</th>
                                    <th className="px-4 py-3 text-left font-semibold">แหล่งน้ำ</th>
                                    <th className="px-4 py-3 text-right font-semibold">ปั๊ม (แรงม้า)</th>
                                    <th className="px-4 py-3 text-right font-semibold">จำนวนต้นรวม</th>
                                    <th className="px-4 py-3 text-left font-semibold">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            {row.name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {row.farm_name || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                                                {row.zone_type_name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {row.area_rai?.toLocaleString() ?? "-"}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600">
                                            {row.area_width_m || "-"} x {row.area_length_m || "-"} ม.
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600">
                                            {row.planting_rows ?? "-"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {row.water_source || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {row.pump_size_hp ?? "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                                            {row.total_planted_qty?.toLocaleString() ?? 0}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                                            {row.description || "-"}
                                        </td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                                            ไม่พบข้อมูลแปลงปลูก
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
