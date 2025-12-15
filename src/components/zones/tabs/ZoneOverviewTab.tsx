// src/components/zones/tabs/ZoneOverviewTab.tsx
import React from "react";

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
    plotTotals?: { totalSystem: number; totalTagged?: number; totalRemaining?: number; loading?: boolean };
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

const toGoogleEmbedUrl = (url?: string | null, lat?: number | null, lng?: number | null) => {
    if (lat && lng) {
        return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    }
    if (!url) return "";
    return url.includes("output=embed") ? url : `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
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
}: Props) {
    const [localMapOpen, setLocalMapOpen] = React.useState(false);
    const mapOpen = isMapOpen ?? localMapOpen;
    const toggleMap = setIsMapOpen ?? setLocalMapOpen;

    // Fallback location values: prefer new zone_* fields, fallback to legacy fields
    const mapUrl = zone?.zone_map_url ?? zone?.map_url ?? null;
    const lat = zone?.zone_lat ?? zone?.lat ?? null;
    const lng = zone?.zone_lng ?? zone?.lng ?? null;

    return (
        <div className="mt-4 space-y-4">
            <div className="grid grid-cols-12 gap-4">
                {/* LEFT: Summary (8/12) */}
                <div className="col-span-12 lg:col-span-8 space-y-4">
                    {/* 1) สรุปสถานะต้นไม้ในแปลงนี้ */}
                    <section className="rounded-2xl border bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">สถานะต้นไม้ในแปลงนี้</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    สรุปจาก Tag Lifecycle (แสดงภาพรวมงานขาย/ขุด/ขนส่ง)
                                </p>
                            </div>
                            <div className="text-xs text-slate-500">
                                Tag: <span className="font-medium text-slate-700">{toThaiNumber(tagLifeTotals?.total_tags ?? 0)}</span>{" "}
                                • ระบบ: <span className="font-medium text-slate-700">{toThaiNumber(zoneInvSummary?.trees_in_plot_now ?? plotTotals.totalSystem)}</span>
                            </div>
                        </div>

                        {/* กล่องสถานะ */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-xl border bg-emerald-50 p-3.5">
                                <div className="text-sm font-medium text-emerald-900">อยู่ในแปลง</div>
                                <div className="mt-0.5 text-2xl font-semibold leading-none text-emerald-900">
                                    {toThaiNumber(readyStockSummary.available)}
                                </div>
                                <div className="mt-0.5 text-xs text-emerald-700">สถานะ: in_zone</div>
                            </div>

                            <div className="rounded-xl border bg-amber-50 p-3.5">
                                <div className="text-sm font-medium text-amber-900">จองแล้ว</div>
                                <div className="mt-0.5 text-2xl font-semibold leading-none text-amber-900">
                                    {toThaiNumber(readyStockSummary.reserved)}
                                </div>
                                <div className="mt-0.5 text-xs text-amber-700">สถานะ: reserved</div>
                            </div>

                            <div className="rounded-xl border bg-orange-50 p-3.5">
                                <div className="text-sm font-medium text-orange-900">วางแผนขุด/เตรียมขุด</div>
                                <div className="mt-0.5 text-2xl font-semibold leading-none text-orange-900">
                                    {toThaiNumber(readyStockSummary.digOrdered)}
                                </div>
                                <div className="mt-0.5 text-xs text-orange-700">สถานะ: dig_ordered</div>
                            </div>

                            <div className="rounded-xl border bg-sky-50 p-3.5">
                                <div className="text-sm font-medium text-sky-900">ขุดแล้ว/พร้อมขนย้าย</div>
                                <div className="mt-0.5 text-2xl font-semibold leading-none text-sky-900">
                                    {toThaiNumber(readyStockSummary.dug)}
                                </div>
                                <div className="mt-0.5 text-xs text-sky-700">สถานะ: dug</div>
                            </div>
                        </div>

                        {/* แถบสรุป Tag created vs untagged */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-xl border bg-emerald-50 p-3.5 flex items-center justify-between">
                                <div className="text-sm text-emerald-900">
                                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                                    สร้าง Tag แล้ว
                                </div>
                                <div className="text-base font-semibold leading-none text-emerald-900">
                                    {toThaiNumber(inventorySummary.totalTagged)} ต้น
                                </div>
                            </div>

                            <div className="rounded-xl border bg-slate-50 p-3.5 flex items-center justify-between">
                                <div className="text-sm text-slate-700">
                                    <span className="inline-block h-2 w-2 rounded-full bg-slate-400 mr-2" />
                                    ยังไม่สร้าง Tag
                                </div>
                                <div className="text-base font-semibold leading-none text-slate-900">
                                    {toThaiNumber(inventorySummary.remaining)} ต้น
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2) ภาพรวมการไหลของต้นไม้ในแปลง */}
                    <section className="rounded-2xl border bg-white p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">ภาพรวมการไหลของต้นไม้ในแปลง</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="rounded-xl border bg-emerald-50/50 p-3.5">
                                <div className="text-xs text-slate-500 mb-1">🌱 ปลูกไปแล้ว</div>
                                <div className="text-2xl font-semibold leading-none text-slate-900">
                                    {toThaiNumber(zoneInvSummary?.trees_in_plot_now ?? plotTotals.totalSystem)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">ตั้งแต่เริ่มแปลง</div>
                            </div>
                            <div className="rounded-xl border bg-orange-50/50 p-3.5">
                                <div className="text-xs text-slate-500 mb-1">🚚 เอาออกจากแปลงแล้ว</div>
                                <div className="text-2xl font-semibold leading-none text-slate-900">
                                    {toThaiNumber(readyStockSummary.digOrdered + readyStockSummary.dug)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">ขาย / ขุด / ย้าย</div>
                            </div>
                            <div className="rounded-xl border bg-sky-50/50 p-3.5">
                                <div className="text-xs text-slate-500 mb-1">🌳 คงเหลือในแปลง</div>
                                <div className="text-2xl font-semibold leading-none text-slate-900">
                                    {toThaiNumber(readyStockSummary.available)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">ปัจจุบัน</div>
                            </div>
                            <div className="rounded-xl border bg-violet-50/50 p-3.5">
                                <div className="text-xs text-slate-500 mb-1">📏 ขนาดต้นไม้เฉลี่ย</div>
                                {(() => {
                                    const hasAvg = avgTreeSize?.value != null && avgTreeSize.value > 0 && !!avgTreeSize.unit;
                                    return (
                                        <>
                                            <div className={`text-2xl font-semibold leading-none ${hasAvg ? 'text-slate-900' : 'text-slate-400'}`}>
                                                {hasAvg
                                                    ? `${avgTreeSize.value.toFixed(1)} ${avgTreeSize.unit === 'm' ? 'ม.' : 'นิ้ว'}`
                                                    : '–'}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
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
                    <section className="rounded-2xl border bg-white p-4">
                        <h3 className="text-base font-semibold text-slate-900">ข้อมูลแปลง</h3>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                            <div className="text-slate-500">สถานที่</div>
                            <div className="text-slate-900">{zone?.farm_name ?? "-"}</div>

                            <div className="text-slate-500">ระบบน้ำ</div>
                            <div className="text-slate-900">{zone?.water_system ?? "-"}</div>

                            <div className="text-slate-500">แหล่งน้ำ</div>
                            <div className="text-slate-900">{zone?.water_source ?? "-"}</div>

                            <div className="text-slate-500">ตรวจล่าสุด</div>
                            <div className="text-slate-900">{zone?.last_inspection_date ? formatDate(zone.last_inspection_date) : "-"}</div>
                        </div>
                    </section>

                    {/* 3) พิกัดแปลง + Map Preview */}
                    <section className="rounded-2xl border bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">พิกัดแปลง (Zone Location)</h3>
                                <p className="text-xs text-slate-500 mt-1">แสดงแผนที่แบบ Preview และสามารถขยายได้</p>
                            </div>

                            <button
                                onClick={() => toggleMap(true)}
                                className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                            >
                                ขยายแผนที่
                            </button>
                        </div>

                        {/* MAP PREVIEW */}
                        <div className="mt-3 overflow-hidden rounded-2xl border bg-slate-50">
                            <div className="h-[200px] w-full lg:h-[216px]">
                                <iframe
                                    title="Zone Map Preview"
                                    src={toGoogleEmbedUrl(mapUrl, lat, lng)}
                                    className="h-full w-full"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        </div>

                        {/* Lat/Lng + Open Button */}
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                            <span>
                                Lat: {lat ?? "-"} · Lng: {lng ?? "-"}
                            </span>
                            <a
                                className="text-sky-600 hover:underline"
                                href={mapUrl ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                            >
                                เปิดใน Google Maps
                            </a>
                        </div>
                    </section>
                </div>
            </div>

            {/* MAP MODAL (ขยายแผนที่) */}
            {mapOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
                    <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="font-semibold text-slate-900">แผนที่แปลง (Expanded View)</div>
                            <button onClick={() => toggleMap(false)} className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">
                                ปิด
                            </button>
                        </div>
                        <div className="h-[70vh] bg-slate-50">
                            <iframe
                                title="Zone Map Expanded"
                                src={toGoogleEmbedUrl(mapUrl, lat, lng)}
                                className="h-full w-full"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ZoneOverviewTab;
