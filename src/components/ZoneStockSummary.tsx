import React, { useMemo, useState } from "react";
import { TreePine, MapPin, RefreshCw, AlertCircle } from "lucide-react";
import { useZoneStockSummary } from "../hooks/useZoneStockSummary";
import { getStockStatus, getStockStatusClassName, getStockStatusLabel } from "../utils/stockStatus";
import { ZoneDetailPanel } from "./ZoneDetailPanel";

const ZoneStockSummary: React.FC = () => {
    const { data: rows, loading, error, refetch } = useZoneStockSummary();

    // Unique zones list
    const zones = useMemo(() => {
        const map = new Map<string, string>();
        rows.forEach((r) => {
            map.set(r.zone_id, r.zone_name);
        });
        return Array.from(map.entries())
            .map(([zone_id, zone_name]) => ({
                zone_id,
                zone_name,
            }))
            .sort((a, b) => a.zone_name.localeCompare(b.zone_name));
    }, [rows]);

    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

    // Auto-select first zone if none selected and zones exist
    React.useEffect(() => {
        if (!selectedZoneId && zones.length > 0) {
            setSelectedZoneId(zones[0].zone_id);
        }
    }, [zones, selectedZoneId]);

    const selectedZoneRows = useMemo(
        () => rows.filter((r) => r.zone_id === selectedZoneId),
        [rows, selectedZoneId]
    );

    // Calculate totals for summary cards
    const totalZones = zones.length;
    const totalPlanned = rows.reduce(
        (sum, r) => sum + (r.planned_trees ?? 0),
        0
    );
    const totalRemaining = rows.reduce(
        (sum, r) => sum + (r.remaining_trees ?? 0),
        0
    );

    if (loading) {
        return (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
                กำลังโหลดข้อมูลสต็อกต้นไม้...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>โหลดข้อมูลสต็อกไม่ได้: {error}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        ภาพรวมสต็อกตามโซน
                    </h1>
                    <p className="text-sm text-slate-500">
                        ดูจำนวนต้นไม้ในแต่ละโซน และสถานะพร้อมขาย
                    </p>
                </div>
                <button
                    onClick={refetch}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4" />
                    รีเฟรช
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            จำนวนโซนทั้งหมด
                        </span>
                        <MapPin className="h-5 w-5 text-sky-500" />
                    </div>
                    <div className="mt-2 text-2xl font-semibold">{totalZones}</div>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            ต้นไม้ทั้งหมด (ตามแผน)
                        </span>
                        <TreePine className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                        {totalPlanned.toLocaleString()}
                    </div>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            พร้อมขาย (คงเหลือ)
                        </span>
                        <TreePine className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-emerald-600">
                        {totalRemaining.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Layout: Left Zone List / Right Detail Panel */}
            <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
                {/* Left: Zone List */}
                <div className="rounded-2xl border bg-white shadow-sm">
                    <div className="border-b px-4 py-3 bg-slate-50/50 rounded-t-2xl">
                        <h3 className="text-sm font-semibold text-slate-800">โซนทั้งหมด</h3>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        {zones.map((z) => {
                            const zoneRows = rows.filter((r) => r.zone_id === z.zone_id);
                            const zoneRemaining = zoneRows.reduce((sum, r) => sum + (r.remaining_trees ?? 0), 0);
                            const zonePlanned = zoneRows.reduce((sum, r) => sum + (r.planned_trees ?? 0), 0);

                            const status = getStockStatus(zoneRemaining, zonePlanned);
                            const isActive = selectedZoneId === z.zone_id;

                            return (
                                <button
                                    key={z.zone_id}
                                    onClick={() => setSelectedZoneId(z.zone_id)}
                                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm border-b last:border-b-0 transition-colors ${isActive ? "bg-emerald-50/60" : "hover:bg-slate-50"
                                        }`}
                                >
                                    <div>
                                        <div className={`font-medium ${isActive ? "text-emerald-900" : "text-slate-800"}`}>
                                            {z.zone_name}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            คงเหลือ {zoneRemaining.toLocaleString()} ต้น
                                        </div>
                                    </div>
                                    <span
                                        className={
                                            "ml-2 inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-medium " +
                                            getStockStatusClassName(status)
                                        }
                                    >
                                        {getStockStatusLabel(status)}
                                    </span>
                                </button>
                            );
                        })}

                        {zones.length === 0 && (
                            <div className="px-4 py-8 text-center text-xs text-slate-400">
                                ยังไม่มีโซนในระบบ
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Zone Detail Panel */}
                <ZoneDetailPanel rows={selectedZoneRows} />
            </div>
        </div>
    );
};

export default ZoneStockSummary;
