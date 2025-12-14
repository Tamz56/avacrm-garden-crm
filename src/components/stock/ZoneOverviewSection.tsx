import React, { useMemo } from "react";
import { useZoneStockSummary } from "../../hooks/useZoneStockSummary";
import { getStockStatus, getStockStatusClassName, getStockStatusLabel } from "../../utils/stockStatus";
import { MapPin, Package, Trees, Truck } from "lucide-react";

export const ZoneOverviewSection: React.FC = () => {
    const { data, loading, error } = useZoneStockSummary();

    // Aggregate data by zone
    const zoneSummary = useMemo(() => {
        const map = new Map<string, {
            zone_id: string;
            zone_name: string;
            planned_trees: number;
            remaining_trees: number;
            reserved_trees: number;
            shipped_trees: number; // Placeholder
        }>();

        data.forEach(item => {
            if (!map.has(item.zone_id)) {
                map.set(item.zone_id, {
                    zone_id: item.zone_id,
                    zone_name: item.zone_name,
                    planned_trees: 0,
                    remaining_trees: 0,
                    reserved_trees: 0,
                    shipped_trees: 0
                });
            }
            const z = map.get(item.zone_id)!;
            z.planned_trees += item.planned_trees;
            z.remaining_trees += item.remaining_trees;
            z.reserved_trees += item.reserved_trees;
            // z.shipped_trees += item.shipped_trees; // If available
        });

        return Array.from(map.values()).sort((a, b) => a.zone_name.localeCompare(b.zone_name));
    }, [data]);

    const totalZones = zoneSummary.length;
    const totalTrees = zoneSummary.reduce((sum, z) => sum + z.planned_trees, 0);
    const totalAvailable = zoneSummary.reduce((sum, z) => sum + z.remaining_trees, 0);
    const totalReserved = zoneSummary.reduce((sum, z) => sum + z.reserved_trees, 0);
    const totalShipped = zoneSummary.reduce((sum, z) => sum + z.shipped_trees, 0);

    if (loading) return <div className="p-6 text-center text-slate-400">กำลังโหลดข้อมูลภาพรวมสต็อก...</div>;
    if (error) return <div className="p-6 text-center text-red-500">ไม่สามารถโหลดข้อมูลสต็อกได้: {error}</div>;

    return (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">ภาพรวมสต็อกตามโซน</h2>
                    <p className="text-sm text-slate-500">
                        ดูจำนวนต้นไม้ในแต่ละโซน และสถานะพร้อมขาย / จองแล้ว / ส่งแล้ว
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">โซนทั้งหมด</p>
                            <p className="text-xl font-bold text-slate-900">{totalZones}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Trees className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">ต้นไม้ทั้งหมด</p>
                            <p className="text-xl font-bold text-slate-900">{totalTrees.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">จองแล้ว</p>
                            <p className="text-xl font-bold text-slate-900">{totalReserved.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                            <Truck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500">ส่งแล้ว</p>
                            <p className="text-xl font-bold text-slate-900">{totalShipped.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Zone Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                        <tr>
                            <th className="px-4 py-3 text-left">โซน</th>
                            <th className="px-4 py-3 text-right">รายการสต็อก</th>
                            <th className="px-4 py-3 text-right">ต้นทั้งหมด</th>
                            <th className="px-4 py-3 text-right text-emerald-600">พร้อมขาย</th>
                            <th className="px-4 py-3 text-right text-amber-600">จองแล้ว</th>
                            <th className="px-4 py-3 text-right text-purple-600">ส่งแล้ว</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {zoneSummary.map((zone) => {
                            // Count unique stock items in this zone
                            const stockItemCount = data.filter(d => d.zone_id === zone.zone_id).length;

                            return (
                                <tr key={zone.zone_id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-900">{zone.zone_name}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{stockItemCount}</td>
                                    <td className="px-4 py-3 text-right text-slate-900">{zone.planned_trees.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{zone.remaining_trees.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-amber-600">{zone.reserved_trees.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-purple-600">{zone.shipped_trees.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
