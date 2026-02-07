
// src/components/zones/tabs/ZoneOverviewTab.tsx
import React from "react";
import { ZoneLocationSection } from "../ZoneLocationSection";
import ZoneTagKpiCards from "../ZoneTagKpiCards";
import { HL, HIGHLIGHT_TARGETS } from "../../../constants/deeplink";

type Props = {
    zoneId: string;
    zone?: any;
    readyStockSummary?: {
        available: number;
        reserved: number;
        digOrdered: number;
        dug: number;
    };
    tagLifeTotals?: { total_tags?: number };
    inventorySummary?: { totalTagged: number; remaining: number };
    plotTotals?: { totalSystem: number; totalTagged?: number; totalRemaining?: number; tagPct?: number; loading?: boolean };
    zoneInvSummary?: { trees_in_plot_now?: number };
    isMapOpen?: boolean;
    setIsMapOpen?: (open: boolean) => void;
    onReload?: () => void;
    avgTreeSize?: {
        value: number | null;           // e.g. 4.8 or null if not computable
        unit: "inch" | "m" | null;      // unit label or null
        sourceCount: number;     // how many tags used
        note?: string;           // optional explanation
    } | null;
    isDarkMode?: boolean;
    highlightKey?: string | null;
};

const toThaiNumber = (value?: number | null) =>
    (value ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

export function ZoneOverviewTab({
    zoneId,
    zone,
    readyStockSummary = { available: 0, reserved: 0, digOrdered: 0, dug: 0 },
    tagLifeTotals,
    inventorySummary = { totalTagged: 0, remaining: 0 },
    plotTotals = { totalSystem: 0 },
    zoneInvSummary,
    isMapOpen = false,
    setIsMapOpen,
    onReload,
    avgTreeSize,
    isDarkMode = false,
    highlightKey,
}: Props) {

    return (
        <div className="mt-4 space-y-4">
            <div className="grid grid-cols-12 gap-4">
                {/* LEFT: Summary (8/12) */}
                <div className="col-span-12 lg:col-span-8 space-y-4">
                    {/* 1) สรุปสถานะต้นไม้ในแปลงนี้ */}
                    <section className={`rounded-2xl border p-4 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>สถานะต้นไม้ในแปลงนี้</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    สรุปจาก Tag Lifecycle (แสดงภาพรวมงานขาย/ขุด/ขนส่ง)
                                </p>
                            </div>
                            <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Tag: <span className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{toThaiNumber(tagLifeTotals?.total_tags ?? 0)}</span>{" "}
                                • ระบบ: <span className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{toThaiNumber(zoneInvSummary?.trees_in_plot_now ?? plotTotals.totalSystem)}</span>
                            </div>
                        </div>

                        {/* กล่องสถานะ */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div
                                id={HIGHLIGHT_TARGETS[HL.LIFECYCLE_IN_ZONE].id}
                                className={`relative rounded-xl border p-3.5 transition-all duration-300 scroll-mt-24 ${isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"} ${highlightKey === HL.LIFECYCLE_IN_ZONE
                                    ? (isDarkMode
                                        ? "ring-2 ring-emerald-500/70 shadow-[0_0_0_6px_rgba(16,185,129,0.1)] animate-pulse [animation-duration:1.6s]"
                                        : "ring-2 ring-emerald-500/70 shadow-[0_0_0_6px_rgba(16,185,129,0.18)] animate-pulse [animation-duration:1.6s]")
                                    : ""
                                    }`}>
                                <div className={`text-sm font-medium ${isDarkMode ? "text-emerald-400" : "text-emerald-900"}`}>อยู่ในแปลง</div>
                                <div className={`mt-0.5 text-2xl font-semibold leading-none ${isDarkMode ? "text-emerald-400" : "text-emerald-900"}`}>
                                    {toThaiNumber(readyStockSummary.available)}
                                </div>
                                <div className={`mt-0.5 text-xs ${isDarkMode ? "text-emerald-400/80" : "text-emerald-700"}`}>สถานะ: in_zone</div>
                                {highlightKey === HL.LIFECYCLE_IN_ZONE && (
                                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg z-10 animate-bounce">
                                        ดูตรงนี้
                                    </div>
                                )}
                            </div>

                            <div
                                id={HIGHLIGHT_TARGETS[HL.LIFECYCLE_RESERVED].id}
                                className={`relative rounded-xl border p-3.5 transition-all duration-300 scroll-mt-24 ${isDarkMode ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-100"} ${highlightKey === HL.LIFECYCLE_RESERVED
                                    ? (isDarkMode
                                        ? "ring-2 ring-amber-500/70 shadow-[0_0_0_6px_rgba(245,158,11,0.1)] animate-pulse [animation-duration:1.6s]"
                                        : "ring-2 ring-amber-500/70 shadow-[0_0_0_6px_rgba(245,158,11,0.18)] animate-pulse [animation-duration:1.6s]")
                                    : ""
                                    }`}>
                                <div className={`text-sm font-medium ${isDarkMode ? "text-amber-400" : "text-amber-900"}`}>จองแล้ว</div>
                                <div className={`mt-0.5 text-2xl font-semibold leading-none ${isDarkMode ? "text-amber-400" : "text-amber-900"}`}>
                                    {toThaiNumber(readyStockSummary.reserved)}
                                </div>
                                <div className={`mt-0.5 text-xs ${isDarkMode ? "text-amber-400/80" : "text-amber-700"}`}>สถานะ: reserved</div>
                                {highlightKey === HL.LIFECYCLE_RESERVED && (
                                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg z-10 animate-bounce">
                                        ดูตรงนี้
                                    </div>
                                )}
                            </div>

                            <div
                                id={HIGHLIGHT_TARGETS[HL.LIFECYCLE_DIG_ORDERED].id}
                                className={`relative rounded-xl border p-3.5 transition-all duration-300 scroll-mt-24 ${isDarkMode ? "bg-orange-500/10 border-orange-500/20" : "bg-orange-50 border-orange-100"} ${highlightKey === HL.LIFECYCLE_DIG_ORDERED
                                    ? (isDarkMode
                                        ? "ring-2 ring-orange-500/70 shadow-[0_0_0_6px_rgba(249,115,22,0.1)] animate-pulse [animation-duration:1.6s]"
                                        : "ring-2 ring-orange-500/70 shadow-[0_0_0_6px_rgba(249,115,22,0.18)] animate-pulse [animation-duration:1.6s]")
                                    : ""
                                    }`}>
                                <div className={`text-sm font-medium ${isDarkMode ? "text-orange-400" : "text-orange-900"}`}>วางแผนขุด/เตรียมขุด</div>
                                <div className={`mt-0.5 text-2xl font-semibold leading-none ${isDarkMode ? "text-orange-400" : "text-orange-900"}`}>
                                    {toThaiNumber(readyStockSummary.digOrdered)}
                                </div>
                                <div className={`mt-0.5 text-xs ${isDarkMode ? "text-orange-400/80" : "text-orange-700"}`}>สถานะ: dig_ordered</div>
                                {highlightKey === HL.LIFECYCLE_DIG_ORDERED && (
                                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg z-10 animate-bounce">
                                        ดูตรงนี้
                                    </div>
                                )}
                            </div>

                            <div
                                id={HIGHLIGHT_TARGETS[HL.LIFECYCLE_DUG].id}
                                className={`relative rounded-xl border p-3.5 transition-all duration-300 scroll-mt-24 ${isDarkMode ? "bg-sky-500/10 border-sky-500/20" : "bg-sky-50 border-sky-100"} ${highlightKey === HL.LIFECYCLE_DUG
                                    ? (isDarkMode
                                        ? "ring-2 ring-sky-500/70 shadow-[0_0_0_6px_rgba(14,165,233,0.1)] animate-pulse [animation-duration:1.6s]"
                                        : "ring-2 ring-sky-500/70 shadow-[0_0_0_6px_rgba(14,165,233,0.18)] animate-pulse [animation-duration:1.6s]")
                                    : ""
                                    }`}>
                                <div className={`text-sm font-medium ${isDarkMode ? "text-sky-400" : "text-sky-900"}`}>ขุดแล้ว/พร้อมขนย้าย</div>
                                <div className={`mt-0.5 text-2xl font-semibold leading-none ${isDarkMode ? "text-sky-400" : "text-sky-900"}`}>
                                    {toThaiNumber(readyStockSummary.dug)}
                                </div>
                                <div className={`mt-0.5 text-xs ${isDarkMode ? "text-sky-400/80" : "text-sky-700"}`}>สถานะ: dug</div>
                                {highlightKey === HL.LIFECYCLE_DUG && (
                                    <div className="absolute -top-2 -right-2 bg-sky-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg z-10 animate-bounce">
                                        ดูตรงนี้
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* แถบสรุป Tag created vs untagged */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className={`rounded-xl border p-3.5 flex items-center justify-between ${isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"}`}>
                                <div className={`text-sm ${isDarkMode ? "text-emerald-400" : "text-emerald-900"}`}>
                                    <span className={`inline-block h-2 w-2 rounded-full mr-2 ${isDarkMode ? "bg-emerald-400" : "bg-emerald-500"}`} />
                                    สร้าง Tag แล้ว
                                </div>
                                <div className={`text-base font-semibold leading-none ${isDarkMode ? "text-emerald-400" : "text-emerald-900"}`}>
                                    {toThaiNumber(plotTotals?.totalTagged ?? inventorySummary.totalTagged)} ต้น
                                </div>
                            </div>

                            <div className={`rounded-xl border p-3.5 flex items-center justify-between ${isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"}`}>
                                <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-700"}`}>
                                    <span className={`inline-block h-2 w-2 rounded-full mr-2 ${isDarkMode ? "bg-slate-500" : "bg-slate-400"}`} />
                                    ยังไม่สร้าง Tag
                                </div>
                                <div className={`text-base font-semibold leading-none ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                                    {toThaiNumber(plotTotals?.totalRemaining ?? inventorySummary.remaining)} ต้น
                                </div>
                            </div>
                        </div>

                        {/* KPI Cards: Remaining/Rai + Tag Progress */}
                        <ZoneTagKpiCards
                            areaRai={zone?.area_rai != null ? Number(zone.area_rai) : null}
                            totalSystem={plotTotals?.totalSystem ?? null}
                            totalTagged={plotTotals?.totalTagged ?? null}
                            totalRemaining={plotTotals?.totalRemaining ?? null}
                            tagPct={plotTotals?.tagPct ?? null}
                            isDarkMode={isDarkMode}
                        />
                    </section>

                    {/* 2) ภาพรวมการไหลของต้นไม้ในแปลง */}
                    <section className={`rounded-2xl border p-4 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                        <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>ภาพรวมการไหลของต้นไม้ในแปลง</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className={`rounded-xl border p-3.5 ${isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50/50 border-emerald-100"}`}>
                                <div className={`text-xs mb-1 ${isDarkMode ? "text-emerald-400/80" : "text-slate-500"}`}>🌱 ปลูกไปแล้ว</div>
                                <div className={`text-2xl font-semibold leading-none ${isDarkMode ? "text-emerald-400" : "text-slate-900"}`}>
                                    {toThaiNumber(zoneInvSummary?.trees_in_plot_now ?? plotTotals.totalSystem)}
                                </div>
                                <div className={`text-xs mt-1 ${isDarkMode ? "text-emerald-400/60" : "text-slate-500"}`}>ตั้งแต่เริ่มแปลง</div>
                            </div>
                            <div className={`rounded-xl border p-3.5 ${isDarkMode ? "bg-orange-500/10 border-orange-500/20" : "bg-orange-50/50 border-orange-100"}`}>
                                <div className={`text-xs mb-1 ${isDarkMode ? "text-orange-400/80" : "text-slate-500"}`}>🚚 เอาออกจากแปลงแล้ว</div>
                                <div className={`text-2xl font-semibold leading-none ${isDarkMode ? "text-orange-400" : "text-slate-900"}`}>
                                    {toThaiNumber(readyStockSummary.digOrdered + readyStockSummary.dug)}
                                </div>
                                <div className={`text-xs mt-1 ${isDarkMode ? "text-orange-400/60" : "text-slate-500"}`}>ขาย / ขุด / ย้าย</div>
                            </div>
                            <div className={`rounded-xl border p-3.5 ${isDarkMode ? "bg-sky-500/10 border-sky-500/20" : "bg-sky-50/50 border-sky-100"}`}>
                                <div className={`text-xs mb-1 ${isDarkMode ? "text-sky-400/80" : "text-slate-500"}`}>🌳 คงเหลือในแปลง</div>
                                <div className={`text-2xl font-semibold leading-none ${isDarkMode ? "text-sky-400" : "text-slate-900"}`}>
                                    {toThaiNumber(readyStockSummary.available)}
                                </div>
                                <div className={`text-xs mt-1 ${isDarkMode ? "text-sky-400/60" : "text-slate-500"}`}>ปัจจุบัน</div>
                            </div>
                            <div className={`rounded-xl border p-3.5 ${isDarkMode ? "bg-violet-500/10 border-violet-500/20" : "bg-violet-50/50 border-violet-100"}`}>
                                <div className={`text-xs mb-1 ${isDarkMode ? "text-violet-400/80" : "text-slate-500"}`}>📏 ขนาดต้นไม้เฉลี่ย</div>
                                {(() => {
                                    const hasAvg = avgTreeSize?.value != null && avgTreeSize.value > 0 && !!avgTreeSize.unit;
                                    return (
                                        <>
                                            <div className={`text-2xl font-semibold leading-none ${hasAvg ? (isDarkMode ? 'text-violet-400' : 'text-slate-900') : (isDarkMode ? 'text-slate-600' : 'text-slate-400')}`}>
                                                {hasAvg
                                                    ? `${avgTreeSize.value.toFixed(1)} ${avgTreeSize.unit === 'm' ? 'ม.' : 'นิ้ว'}`
                                                    : '–'}
                                            </div>
                                            <div className={`text-xs mt-1 ${isDarkMode ? "text-violet-400/60" : "text-slate-500"}`}>
                                                {hasAvg
                                                    ? `เฉลี่ยจากต้นที่มี Tag แล้ว ${toThaiNumber(avgTreeSize?.sourceCount ?? 0)} ต้น`
                                                    : avgTreeSize?.note === 'mixed_units'
                                                        ? 'หลายหน่วย / โปรดแยกชนิด'
                                                        : avgTreeSize?.note === 'no_size_data'
                                                            ? 'ยังไม่มีข้อมูลขนาดใน Tag'
                                                            : 'รอข้อมูลจาก Tag'}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT: Zone info + Location (4/12) */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                    {/* 2) ข้อมูลแปลง */}
                    <section className={`rounded-2xl border p-4 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                        <h3 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>ข้อมูลแปลง</h3>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                            <div className={`${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>สถานที่</div>
                            <div className={`${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>{zone?.farm_name ?? "-"}</div>

                            <div className={`${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>ระบบน้ำ</div>
                            <div className={`${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>{zone?.water_system ?? "-"}</div>

                            <div className={`${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>แหล่งน้ำ</div>
                            <div className={`${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>{zone?.water_source ?? "-"}</div>

                            <div className={`${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>ตรวจล่าสุด</div>
                            <div className={`${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>{zone?.last_inspection_date ? formatDate(zone.last_inspection_date) : "-"}</div>
                        </div>
                    </section>

                    {/* 3) พิกัดแปลง + Map Preview */}
                    <ZoneLocationSection
                        zone={zone}
                        onReload={onReload}
                        isDarkMode={isDarkMode}
                    />
                </div>
            </div>
        </div>
    );
}

export default ZoneOverviewTab;
