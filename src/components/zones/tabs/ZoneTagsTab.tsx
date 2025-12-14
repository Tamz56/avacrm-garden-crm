// src/components/zones/tabs/ZoneTagsTab.tsx
import React from "react";
import TagLifecycleSummaryCard from "../../tags/TagLifecycleSummaryCard";
import { ZoneTreeTagsTable } from "../ZoneTreeTagsTable";

type Props = {
    zoneId: string;
    zone?: any;
    tagLifeTotals?: { total_tags?: number };
    plotTotals?: { totalSystem: number; totalTagged?: number; totalRemaining?: number; loading?: boolean };
    inventorySummary?: { totalTagged: number; remaining: number };
    onReload?: () => void;
};

const toThaiNumber = (value?: number | null) =>
    (value ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });

export function ZoneTagsTab({
    zoneId,
    zone,
    tagLifeTotals,
    plotTotals = { totalSystem: 0 },
    inventorySummary = { totalTagged: 0, remaining: 0 },
    onReload,
}: Props) {
    return (
        <div className="space-y-6">
            {/* SECTION 1: สถานะต้นไม้ในแปลงนี้ */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                        สถานะต้นไม้ในแปลงนี้
                    </h3>
                    <span className="text-xs text-slate-500">
                        Tag: {toThaiNumber(tagLifeTotals?.total_tags ?? 0)} ต้น • ระบบ: {toThaiNumber(plotTotals.totalSystem)} ต้น
                    </span>
                </div>

                {/* Tag Lifecycle Summary */}
                <TagLifecycleSummaryCard zoneId={zoneId} />

                {/* แถว Tag / ยังไม่ Tag */}
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs text-slate-700">สร้าง Tag แล้ว</span>
                        </div>
                        <span className="font-semibold text-emerald-700">
                            {toThaiNumber(inventorySummary.totalTagged)} ต้น
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                            <span className="text-xs text-slate-700">ยังไม่สร้าง Tag</span>
                        </div>
                        <span className="font-semibold text-slate-700">
                            {toThaiNumber(inventorySummary.remaining)} ต้น
                        </span>
                    </div>
                </div>
            </section>

            {/* SECTION 2: รายการ Tag ในแปลง */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    รายการ Tag ในแปลง
                </h3>
                <ZoneTreeTagsTable
                    zoneId={zoneId}
                    onTagsChanged={onReload}
                />
            </section>
        </div>
    );
}

export default ZoneTagsTab;
