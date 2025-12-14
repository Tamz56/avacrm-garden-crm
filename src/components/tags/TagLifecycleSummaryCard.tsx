// src/components/tags/TagLifecycleSummaryCard.tsx
import React from "react";
import { Loader2, Sprout, AlertTriangle, CheckCircle2 } from "lucide-react";

export type TagLifecycleTotals = {
    zone_id: string;
    total_tags: number;
    in_zone_qty: number;
    available_qty: number;
    reserved_qty: number;
    dig_ordered_qty: number;
    dug_qty: number;
    shipped_qty: number;
    planted_qty: number;
    cancelled_qty: number;
    selected_for_dig_qty?: number;
    root_prune_qty?: number;
    ready_to_lift_qty?: number;
    rehab_qty?: number;
    dead_qty?: number;
    // Summary fields
    total_trees?: number;
    species_count?: number;
    survey_total?: number;
    ready_to_sell_count?: number;
    reserved_count?: number;
    last_inspection_date?: string;
};

type Props = {
    zoneId?: string | null;
    speciesId?: string | null;
    /** External data passed from parent (preferred) */
    data?: TagLifecycleTotals | null;
    /** Alias for data (backwards compat) */
    totals?: TagLifecycleTotals | null;
    loading?: boolean;
    className?: string;
    isDarkMode?: boolean;
};

/** Safe number formatter - never crashes on undefined */
const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const fmt = (v: unknown) => n(v).toLocaleString("th-TH");

const TagLifecycleSummaryCard: React.FC<Props> = ({
    zoneId = null,
    data,
    totals,
    loading = false,
    className = "",
    isDarkMode = false,
}) => {
    // Use external data if provided, otherwise null
    const t = data ?? totals ?? null;

    // Dark mode styles
    const cardBg = isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white";
    const textMain = isDarkMode ? "text-slate-100" : "text-slate-900";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";

    if (loading) {
        return (
            <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-600"} ${className}`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลดข้อมูลสถานะต้นไม้...
            </div>
        );
    }

    // If no data, show empty state
    if (!t) {
        return (
            <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500"} ${className}`}>
                ยังไม่มีข้อมูลสถานะต้นไม้
            </div>
        );
    }

    const totalTags = n(t.total_tags);
    const inZone = n(t.in_zone_qty ?? t.available_qty);
    const reserved = n(t.reserved_qty ?? t.reserved_count);
    const digOrdered = n(t.dig_ordered_qty);
    const dug = n(t.dug_qty);
    const shipped = n(t.shipped_qty);
    const planted = n(t.planted_qty);
    const cancelled = n(t.cancelled_qty);

    return (
        <div className={`rounded-2xl border p-4 shadow-sm ${cardBg} ${className}`}>
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <div className={`text-xs font-medium uppercase ${textMuted}`}>
                        สถานะต้นไม้{zoneId ? "ในแปลงนี้" : "ทั้งหมด"}
                    </div>
                    <div className={`text-xl font-semibold ${textMain}`}>
                        {fmt(totalTags)} ต้น
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <StatusPill label="อยู่ในแปลง" value={inZone} color="emerald" isDarkMode={isDarkMode} />
                <StatusPill label="จองแล้ว" value={reserved} color="amber" isDarkMode={isDarkMode} />
                <StatusPill label="ในใบสั่งขุด" value={digOrdered} color="orange" isDarkMode={isDarkMode} />
                <StatusPill label="ขุดแล้ว" value={dug} color="blue" isDarkMode={isDarkMode} />
                <StatusPill label="ขนส่งแล้ว" value={shipped} color="purple" isDarkMode={isDarkMode} />
                <StatusPill label="ปลูกแล้ว" value={planted} color="green" isDarkMode={isDarkMode} />
                {cancelled > 0 && (
                    <StatusPill label="ยกเลิก" value={cancelled} color="red" isDarkMode={isDarkMode} />
                )}
            </div>
        </div>
    );
};

type PillProps = {
    label: string;
    value: number;
    color: "emerald" | "amber" | "orange" | "blue" | "purple" | "green" | "red" | "slate";
    isDarkMode?: boolean;
};

const colorMapLight: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    orange: "border-orange-200 bg-orange-50",
    blue: "border-blue-200 bg-blue-50",
    purple: "border-purple-200 bg-purple-50",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    slate: "border-slate-200 bg-slate-50",
};

const colorMapDark: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/15",
    amber: "border-amber-500/30 bg-amber-500/15",
    orange: "border-orange-500/30 bg-orange-500/15",
    blue: "border-blue-500/30 bg-blue-500/15",
    purple: "border-purple-500/30 bg-purple-500/15",
    green: "border-green-500/30 bg-green-500/15",
    red: "border-red-500/30 bg-red-500/15",
    slate: "border-slate-600 bg-slate-700",
};

const StatusPill: React.FC<PillProps> = ({ label, value, color, isDarkMode = false }) => (
    <div className={`flex flex-col rounded-xl border px-3 py-2 ${isDarkMode ? colorMapDark[color] : colorMapLight[color]}`}>
        <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
        <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            {fmt(value)} ต้น
        </span>
    </div>
);

export default TagLifecycleSummaryCard;
