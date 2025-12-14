import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { Search, Truck, Filter, Calendar } from "lucide-react";
import {
    ShipmentStatus,
    SHIPMENT_STATUS_LABELS,
    SHIPMENT_STATUS_OPTIONS,
} from "../../types/shipment";
import { useLogisticsKpis } from "../../hooks/useLogisticsKpis";

type ShipmentRow = {
    id: string;
    ship_date: string | null;
    deal_id: string | null;
    deal_title: string | null;
    customer_name: string | null;
    transporter_name: string | null;
    tracking_code: string | null;
    distance_km: number | null;
    estimated_price: number | null;
    final_price: number | null;
    note: string | null;
    vehicle_type_id: string | null;
    vehicle_code: string | null;
    vehicle_name: string | null;
    created_at: string;
    status: ShipmentStatus | null;
};

const renderStatusBadge = (status: ShipmentStatus | null) => {
    const s = status || "draft";

    const base =
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border";

    if (s === "completed") {
        return (
            <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>
                {SHIPMENT_STATUS_LABELS.completed}
            </span>
        );
    }

    if (s === "cancelled") {
        return (
            <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}>
                {SHIPMENT_STATUS_LABELS.cancelled}
            </span>
        );
    }

    // draft
    return (
        <span className={`${base} bg-slate-50 text-slate-600 border-slate-200`}>
            {SHIPMENT_STATUS_LABELS.draft}
        </span>
    );
};

interface ShipmentsPageProps {
    isDarkMode?: boolean;
    onDataChanged?: () => void;
}

const ShipmentsPage: React.FC<ShipmentsPageProps> = ({ onDataChanged }) => {
    const [rows, setRows] = useState<ShipmentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [vehicleFilter, setVehicleFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | ShipmentStatus>("all");
    const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "all">(
        "30d"
    );

    // Calculate date range for KPI hook
    const { dateFrom, dateTo } = useMemo(() => {
        const today = new Date();
        let from = new Date(today);
        let to = new Date(today);
        to.setDate(to.getDate() + 1); // Include today

        if (dateRange === "today") {
            // from is already today
        } else if (dateRange === "7d") {
            from.setDate(from.getDate() - 7);
        } else if (dateRange === "30d") {
            from.setDate(from.getDate() - 30);
        } else {
            // all: set a far past date
            from = new Date('2000-01-01');
        }

        return {
            dateFrom: from.toISOString().slice(0, 10),
            dateTo: to.toISOString().slice(0, 10),
        };
    }, [dateRange]);

    const { kpis, loading: kpiLoading } = useLogisticsKpis(dateFrom, dateTo);

    const formatBaht = (val?: number | null) =>
        `฿${(val || 0).toLocaleString(undefined, {
            maximumFractionDigits: 0,
        })}`;

    const formatNumber = (val?: number | null) =>
        (val || 0).toLocaleString(undefined, {
            maximumFractionDigits: 0,
        });


    useEffect(() => {
        const fetchShipments = async () => {
            setLoading(true);
            setError(null);

            let query = supabase
                .from("view_shipments_with_deal")
                .select("*")
                .order("ship_date", { ascending: false })
                .order("created_at", { ascending: false });

            // filter ตามช่วงวันแบบง่าย ๆ (ใช้ created_at หรือ ship_date ก็ได้)
            if (dateRange !== 'all') {
                query = query.gte("ship_date", dateFrom).lt("ship_date", dateTo);
            }

            if (vehicleFilter !== "all") {
                query = query.eq("vehicle_code", vehicleFilter);
            }

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            if (search.trim()) {
                const q = search.trim();
                query = query.or(
                    `deal_title.ilike.%${q}%,customer_name.ilike.%${q}%,transporter_name.ilike.%${q}%`
                );
            }

            const { data, error } = await query;

            if (error) {
                console.error("fetchShipments error:", error);
                setError(error.message);
            } else {
                setRows((data || []) as ShipmentRow[]);
            }

            setLoading(false);
        };

        fetchShipments();
    }, [search, vehicleFilter, statusFilter, dateRange, dateFrom, dateTo]);

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-semibold text-slate-900">
                            การขนส่ง (Shipments)
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500">
                            สรุปรายการขนส่งจากดีลทั้งหมด ตามประเภทรถ ระยะทาง และค่าขนส่ง
                        </p>
                    </div>
                </div>

                {/* Status Filter Buttons */}
                <div className="hidden md:flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    {SHIPMENT_STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setStatusFilter(opt.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === opt.id
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile Status Filter */}
            <div className="md:hidden mb-4 overflow-x-auto pb-2">
                <div className="flex gap-2">
                    {SHIPMENT_STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setStatusFilter(opt.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap border transition-colors ${statusFilter === opt.id
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-600 border-slate-200"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* Search */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหา: ดีล ลูกค้า ผู้ขนส่ง..."
                        className="w-full text-sm outline-none bg-transparent"
                    />
                </div>

                {/* Date range */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs md:text-sm">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <select
                        value={dateRange}
                        onChange={(e) =>
                            setDateRange(e.target.value as "today" | "7d" | "30d" | "all")
                        }
                        className="bg-transparent outline-none w-full"
                    >
                        <option value="today">วันนี้</option>
                        <option value="7d">7 วันที่ผ่านมา</option>
                        <option value="30d">30 วันที่ผ่านมา</option>
                        <option value="all">ทั้งหมด</option>
                    </select>
                </div>

                {/* Vehicle filter */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs md:text-sm">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={vehicleFilter}
                        onChange={(e) => setVehicleFilter(e.target.value)}
                        className="bg-transparent outline-none w-full"
                    >
                        <option value="all">ประเภทรถ: ทั้งหมด</option>
                        <option value="pickup">กระบะ</option>
                        <option value="truck6">6 ล้อ</option>
                        <option value="truck10_crane">10 ล้อมีเครน</option>
                    </select>
                </div>
            </div>

            {/* Summary cards */}
            <div className="space-y-4 mb-6">
                {/* แถวบน: ตัวเลขหลัก */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-gray-200 bg-white">
                        <div className="text-xs text-gray-500">จำนวน Shipment (Completed)</div>
                        <div className="mt-1 text-2xl font-semibold">
                            {kpiLoading ? '...' : formatNumber(kpis?.total_shipments)}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 bg-white">
                        <div className="text-xs text-gray-500">ระยะทางรวมโดยประมาณ</div>
                        <div className="mt-1 text-2xl font-semibold">
                            {kpiLoading ? '...' : `${formatNumber(kpis?.total_distance_km)} กม.`}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200 bg-white">
                        <div className="text-xs text-gray-500">ค่าขนส่งรวม</div>
                        <div className="mt-1 text-2xl font-semibold">
                            {kpiLoading ? '...' : formatBaht(kpis?.total_cost)}
                        </div>
                    </div>
                </div>

                {/* แถวล่าง: KPI เชิงประสิทธิภาพ */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50">
                        <div className="text-xs text-indigo-700">ค่าเฉลี่ยต่อเที่ยว</div>
                        <div className="mt-1 text-xl font-semibold text-indigo-900">
                            {kpiLoading ? '...' : formatBaht(kpis?.avg_cost_per_shipment)}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50">
                        <div className="text-xs text-emerald-700">ค่าเฉลี่ยต่อ กม.</div>
                        <div className="mt-1 text-xl font-semibold text-emerald-900">
                            {kpiLoading ? '...' : `${formatBaht(kpis?.avg_cost_per_km)} / กม.`}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-amber-100 bg-amber-50">
                        <div className="text-xs text-amber-700">ค่าเฉลี่ยต่อต้น</div>
                        <div className="mt-1 text-xl font-semibold text-amber-900">
                            {kpiLoading ? '...' : `${formatBaht(kpis?.avg_cost_per_tree)} / ต้น`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {loading ? (
                    <div className="p-6 text-sm text-slate-500">กำลังโหลดข้อมูล...</div>
                ) : error ? (
                    <div className="p-6 text-sm text-red-500">
                        โหลดข้อมูลไม่สำเร็จ: {error}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">
                        ยังไม่มีข้อมูลการขนส่งในช่วงเวลาที่เลือก
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs text-slate-500">
                                    <th className="py-2 px-3 text-left">วันที่</th>
                                    <th className="py-2 px-3 text-left">ดีล / ลูกค้า</th>
                                    <th className="py-2 px-3 text-left">ผู้ขนส่ง</th>
                                    <th className="py-2 px-3 text-left">ประเภทรถ</th>
                                    <th className="py-2 px-3 text-right">ระยะทาง (กม.)</th>
                                    <th className="py-2 px-3 text-right">ค่าขนส่ง (ประมาณ)</th>
                                    <th className="py-2 px-3 text-right">ค่าขนส่ง (จริง)</th>
                                    <th className="py-2 px-3 text-left">หมายเหตุ</th>
                                    <th className="py-2 pl-3 font-medium">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="border-b border-slate-100 last:border-0"
                                    >
                                        <td className="py-2 px-3 whitespace-nowrap">
                                            {r.ship_date
                                                ? new Date(r.ship_date).toLocaleDateString("th-TH")
                                                : "-"}
                                        </td>
                                        <td className="py-2 px-3">
                                            <div className="font-medium text-slate-800">
                                                {r.deal_title || "-"}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {r.customer_name || ""}
                                            </div>
                                        </td>
                                        <td className="py-2 px-3 text-slate-700">
                                            {r.transporter_name || "-"}
                                        </td>
                                        <td className="py-2 px-3 text-slate-700">
                                            {r.vehicle_name || "-"}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-700">
                                            {r.distance_km != null
                                                ? r.distance_km.toLocaleString(undefined, {
                                                    maximumFractionDigits: 1,
                                                })
                                                : "-"}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-500">
                                            {r.estimated_price != null
                                                ? "฿" +
                                                r.estimated_price.toLocaleString(undefined, {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 0,
                                                })
                                                : "-"}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-900 font-medium">
                                            {r.final_price != null
                                                ? "฿" +
                                                r.final_price.toLocaleString(undefined, {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 0,
                                                })
                                                : "-"}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600">
                                            {r.note || "-"}
                                        </td>
                                        <td className="py-2 pl-3">
                                            {renderStatusBadge(r.status)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShipmentsPage;
