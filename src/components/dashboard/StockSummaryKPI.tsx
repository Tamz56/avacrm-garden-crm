import React from 'react';
import { useLowStockZones } from '../../hooks/useLowStockZones';

export function StockSummaryKPI() {
    const { totalLow, totalEmpty, isLoading } = useLowStockZones();

    if (isLoading) return null;

    return (
        <div className="mt-2 flex gap-3 text-xs text-slate-600">
            <span>โซนใกล้หมด: <span className="font-semibold text-amber-700">{totalLow}</span></span>
            <span>โซนหมดสต็อก: <span className="font-semibold text-rose-700">{totalEmpty}</span></span>
        </div>
    );
}
