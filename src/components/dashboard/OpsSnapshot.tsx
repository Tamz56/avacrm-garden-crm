
import React, { useState } from 'react';
import {
    Layers,
    ChevronUp,
    ChevronDown
} from "lucide-react";

interface OpsSnapshotProps {
    stats: {
        untagged_qty?: number;
        untagged_zone_count?: number;
        active_dig_orders_count?: number;
        inspection_overdue_count?: number;
    };
    alerts?: {
        type: string;
        message: string;
        severity: 'low' | 'medium' | 'high';
    }[];
    loading?: boolean;
}

export default function OpsSnapshot({ stats, alerts = [], loading = false }: OpsSnapshotProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-full animate-pulse">
                <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
                <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-200 rounded" />
                    <div className="h-4 w-2/3 bg-slate-200 rounded" />
                </div>
            </div>
        );
    }

    const alertCount = alerts.filter(a => a.severity !== 'low').length;

    // Derived summary text
    const summaryText = [
        stats.untagged_qty ? `${stats.untagged_qty.toLocaleString()} untagged` : null,
        stats.active_dig_orders_count ? `${stats.active_dig_orders_count} digging` : null,
        alertCount ? `${alertCount} alerts` : null
    ].filter(Boolean).join(' • ') || "All systems nominal";

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300">
            {/* Header - Always visible */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4"
            >
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-semibold text-slate-900">Ops Snapshot</div>
                        <div className="text-xs text-slate-500">{summaryText}</div>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
            </button>

            {/* Content - Collapsible */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Metrics Column */}
                        <div className="space-y-2">
                            <div className="rounded-xl border bg-slate-50 p-3 flex justify-between items-center">
                                <span className="text-sm text-slate-600">Untagged Trees</span>
                                <div className="text-right">
                                    <span className="text-sm font-bold tabular-nums text-slate-900 block">
                                        {stats.untagged_qty?.toLocaleString() ?? 0}
                                    </span>
                                </div>
                            </div>
                            <div className="rounded-xl border bg-slate-50 p-3 flex justify-between items-center">
                                <span className="text-sm text-slate-600">Active Dig Orders</span>
                                <span className="text-sm font-bold tabular-nums text-slate-900">
                                    {stats.active_dig_orders_count ?? 0}
                                </span>
                            </div>
                            <div className="rounded-xl border bg-slate-50 p-3 flex justify-between items-center">
                                <span className="text-sm text-slate-600">Inspection Overdue</span>
                                <span className={`text - sm font - bold tabular - nums ${stats.inspection_overdue_count ? 'text-rose-600' : 'text-slate-900'} `}>
                                    {stats.inspection_overdue_count ?? 0}
                                </span>
                            </div>
                        </div>

                        {/* Alerts Column */}
                        <div className="rounded-xl border bg-white p-3">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Alerts</div>
                            {alerts.length === 0 ? (
                                <div className="text-sm text-slate-400 italic">No active alerts</div>
                            ) : (
                                <ul className="space-y-2">
                                    {alerts.slice(0, 3).map((alert, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                            <span className="mt-0.5 shrink-0">
                                                {alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟠' : '🔵'}
                                            </span>
                                            <span className="leading-snug">{alert.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
