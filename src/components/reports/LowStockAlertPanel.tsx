import React from 'react';
import { AlertTriangle, Droplets } from 'lucide-react';
import {
    getStockStatusClassName,
    getStockStatusLabel,
} from '../../utils/stockStatus';
import { useLowStockZones } from '../../hooks/useLowStockZones';

export function LowStockAlertPanel() {
    const { lowZones, totalLow, totalEmpty, isLoading } = useLowStockZones();

    if (isLoading) {
        return (
            <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
                กำลังโหลดข้อมูลสต็อกที่ใกล้หมด...
            </div>
        );
    }

    // If no critical zones, don't show the panel
    if (lowZones.length === 0) return null;

    return (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    <span>โซนที่ควรตรวจเช็คสต็อก</span>
                </div>
                <div className="flex gap-3 text-xs text-amber-900">
                    <span>ใกล้หมด: {totalLow} โซน</span>
                    <span>หมดโซน: {totalEmpty} โซน</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {lowZones.slice(0, 6).map((z) => (
                    <div
                        key={z.zone_id + z.size_label}
                        className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1.5 text-xs shadow-sm"
                    >
                        <Droplets className="h-3 w-3 text-amber-500" />
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                                {z.zone_name} • {z.size_label}
                            </span>
                            <span className="text-[11px] text-slate-500">
                                เหลือ {z.remaining_trees} ต้น จากแผน {z.planned_trees} ต้น
                            </span>
                        </div>
                        <span
                            className={
                                'ml-2 inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-medium ' +
                                getStockStatusClassName(z.status)
                            }
                        >
                            {getStockStatusLabel(z.status)}
                        </span>
                    </div>
                ))}
            </div>

            {lowZones.length > 6 && (
                <div className="mt-2 text-[11px] text-amber-800">
                    และอีก {lowZones.length - 6} โซน สามารถดูได้ในตารางด้านล่าง
                </div>
            )}
        </div>
    );
}
