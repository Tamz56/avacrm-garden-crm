import React, { useMemo } from "react";
import { StockZoneLifecycleRow } from "../../hooks/useStockZoneLifecycle";
import { ActiveStockPrice } from "../../hooks/useActiveStockPriceMap";

type TagFilterParams = {
    status?: string;
    digPurpose?: string;
    speciesId?: string;
    sizeLabel?: string;
    zoneId?: string;
};

type Props = {
    rows: StockZoneLifecycleRow[];
    lowStockThreshold?: number;
    onRowClick?: (row: StockZoneLifecycleRow) => void;
    priceMap?: Map<string, ActiveStockPrice>;
    onEditPrice?: (speciesId: string, sizeLabel: string) => void;
    onOpenTagSearch?: (filters: TagFilterParams) => void;
    isDarkMode?: boolean;
};

type SizeGroup = {
    sizeLabel: string;
    total: {
        stock_total_qty: number;
        tagged_qty: number;
        untagged_qty: number;
        total_qty: number;
        available_qty: number;
        reserved_qty: number;
        dig_ordered_qty: number;
        dug_qty: number;
        shipped_qty: number;
        planted_qty: number;
    };
    zoneRows: StockZoneLifecycleRow[];
};

type SpeciesGroup = {
    species_id: string;
    species_name_th: string;
    species_name_en: string;
    groupsBySize: SizeGroup[];
};

function gradeStyle(gradeCode: string | null | undefined, isDarkMode: boolean) {
    const styles = {
        premium: isDarkMode
            ? { label: "พรีเมียม", className: "bg-purple-900/50 text-purple-300 border-purple-700" }
            : { label: "พรีเมียม", className: "bg-purple-50 text-purple-700 border-purple-200" },
        standard: isDarkMode
            ? { label: "ทั่วไป", className: "bg-emerald-900/50 text-emerald-300 border-emerald-700" }
            : { label: "ทั่วไป", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        fence: isDarkMode
            ? { label: "ปลูกแนวรั้ว", className: "bg-sky-900/50 text-sky-300 border-sky-700" }
            : { label: "ปลูกแนวรั้ว", className: "bg-sky-50 text-sky-700 border-sky-200" },
        forest: isDarkMode
            ? { label: "ปลูกป่า", className: "bg-lime-900/50 text-lime-300 border-lime-700" }
            : { label: "ปลูกป่า", className: "bg-lime-50 text-lime-700 border-lime-200" },
    };

    if (gradeCode && gradeCode in styles) {
        return styles[gradeCode as keyof typeof styles];
    }
    return isDarkMode
        ? { label: gradeCode || "-", className: "bg-slate-700 text-slate-400 border-slate-600" }
        : { label: gradeCode || "-", className: "bg-slate-50 text-slate-500 border-slate-200" };
}

export const StockZoneLifecycleGroupedTable: React.FC<Props> = ({
    rows,
    lowStockThreshold = 10,
    onRowClick,
    priceMap,
    onEditPrice,
    onOpenTagSearch,
    isDarkMode = false,
}) => {
    const grouped = useMemo(() => {
        const speciesMap = new Map<string, SpeciesGroup>();

        for (const r of rows) {
            if (!speciesMap.has(r.species_id)) {
                speciesMap.set(r.species_id, {
                    species_id: r.species_id,
                    species_name_th: r.species_name_th || "",
                    species_name_en: r.species_name_en || "",
                    groupsBySize: [],
                });
            }
            const sg = speciesMap.get(r.species_id)!;
            let sizeGroup = sg.groupsBySize.find((g) => g.sizeLabel === r.size_label);
            if (!sizeGroup) {
                sizeGroup = {
                    sizeLabel: r.size_label,
                    total: {
                        stock_total_qty: 0, tagged_qty: 0, untagged_qty: 0, total_qty: 0,
                        available_qty: 0, reserved_qty: 0, dig_ordered_qty: 0, dug_qty: 0,
                        shipped_qty: 0, planted_qty: 0,
                    },
                    zoneRows: [],
                };
                sg.groupsBySize.push(sizeGroup);
            }

            sizeGroup.total.stock_total_qty += Number(r.stock_total_qty ?? r.inventory_qty ?? 0);
            sizeGroup.total.tagged_qty += Number(r.tagged_qty ?? 0);
            sizeGroup.total.untagged_qty += Number(r.untagged_qty ?? 0);
            sizeGroup.total.total_qty += Number(r.stock_total_qty ?? r.total_qty ?? 0);
            sizeGroup.total.available_qty += Number(r.available_qty ?? 0);
            sizeGroup.total.reserved_qty += Number(r.reserved_qty ?? 0);
            sizeGroup.total.dig_ordered_qty += Number(r.dig_ordered_qty ?? 0);
            sizeGroup.total.dug_qty += Number(r.dug_qty ?? 0);
            sizeGroup.total.shipped_qty += Number(r.shipped_qty ?? 0);
            sizeGroup.total.planted_qty += Number(r.planted_qty ?? 0);

            sizeGroup.zoneRows.push(r);
        }

        for (const sp of speciesMap.values()) {
            sp.groupsBySize.sort((a, b) => a.sizeLabel.localeCompare(b.sizeLabel, undefined, { numeric: true, sensitivity: "base" }));
        }

        return Array.from(speciesMap.values()).sort((a, b) => {
            const getPriority = (name: string) => {
                const upper = name.toUpperCase();
                if (upper.includes("SILVER")) return 1;
                if (upper.includes("GOLDEN")) return 2;
                if (!name || name.trim() === "") return 99;
                return 3;
            };
            const pa = getPriority(a.species_name_th || a.species_name_en);
            const pb = getPriority(b.species_name_th || b.species_name_en);
            if (pa !== pb) return pa - pb;
            return (a.species_name_th || "").localeCompare(b.species_name_th || "", "th");
        });
    }, [rows]);

    // Theme-aware styles
    const containerClass = isDarkMode
        ? "rounded-xl border border-slate-700 bg-slate-800 shadow-lg overflow-hidden"
        : "rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden";
    const theadClass = isDarkMode
        ? "bg-slate-700/50 border-b border-slate-600"
        : "bg-slate-50 border-b border-slate-200";
    const thClass = isDarkMode ? "text-slate-400" : "text-slate-600";
    const tbodyDivide = isDarkMode ? "divide-y divide-slate-700" : "divide-y divide-slate-100";
    const speciesHeaderBg = isDarkMode ? "bg-slate-700/30" : "bg-slate-50";
    const speciesHeaderText = isDarkMode ? "text-emerald-400" : "text-emerald-700";
    const sizeRowBg = isDarkMode ? "bg-slate-800 hover:bg-slate-700/50" : "bg-white hover:bg-slate-50";
    const textWhite = isDarkMode ? "text-white" : "text-slate-900";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
    const textMutedLight = isDarkMode ? "text-slate-500" : "text-slate-400";
    const emeraldText = isDarkMode ? "text-emerald-400" : "text-emerald-600";
    const cyanText = isDarkMode ? "text-cyan-400" : "text-cyan-600";
    const amberText = isDarkMode ? "text-amber-400" : "text-amber-600";
    const zoneRowHover = isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50";

    const getBadgeClass = (type: "red" | "orange" | "amber") => {
        const classes = {
            red: isDarkMode
                ? "bg-red-900/50 border border-red-700 text-red-300"
                : "bg-red-50 border border-red-200 text-red-700",
            orange: isDarkMode
                ? "bg-orange-900/50 border border-orange-700 text-orange-300"
                : "bg-orange-50 border border-orange-200 text-orange-700",
            amber: isDarkMode
                ? "bg-amber-900/50 border border-amber-700 text-amber-300"
                : "bg-amber-50 border border-amber-200 text-amber-700",
        };
        return classes[type];
    };

    return (
        <div className={containerClass}>
            <table className="min-w-full text-xs">
                <thead className={theadClass}>
                    <tr>
                        <th className={`px-3 py-2 text-left font-medium ${thClass}`}>พันธุ์</th>
                        <th className={`px-3 py-2 text-left font-medium ${thClass}`}>ขนาด</th>
                        <th className={`px-3 py-2 text-left font-medium ${thClass}`}>ความสูง</th>
                        <th className={`px-3 py-2 text-left font-medium ${thClass}`}>เกรด</th>
                        <th className={`px-3 py-2 text-left font-medium ${thClass}`}>โซน</th>
                        <th className={`px-3 py-2 text-right font-medium ${thClass}`}>Stock ทั้งหมด</th>
                        <th className={`px-3 py-2 text-right font-medium ${thClass}`}>มี Tag</th>
                        <th className={`px-3 py-2 text-right font-medium ${thClass}`}>พร้อมขาย</th>
                        <th className={`px-3 py-2 text-right font-medium ${thClass}`}>จองแล้ว</th>
                        <th className={`px-3 py-2 text-right font-medium ${thClass}`}>ใบสั่งขุด</th>
                        <th className={`px-3 py-2 text-right font-medium ${thClass}`}>ขุดแล้ว</th>
                        <th className={`px-3 py-2 text-right font-medium ${thClass}`}>ส่งออก</th>
                        <th className={`px-3 py-2 text-right font-medium ${thClass}`}>ปลูกแล้ว</th>
                        <th className={`px-3 py-2 text-right font-medium ${thClass}`}>ยังไม่ Tag</th>
                        <th className={`px-3 py-2 text-left font-medium ${thClass}`}>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody className={tbodyDivide}>
                    {grouped.map((species) => (
                        <React.Fragment key={species.species_id}>
                            <tr className={speciesHeaderBg}>
                                <td className={`px-3 py-2 font-semibold ${speciesHeaderText}`} colSpan={14}>
                                    {species.species_name_th || species.species_name_en || "ไม่ระบุพันธุ์"}
                                    {species.species_name_en && species.species_name_th ? ` (${species.species_name_en})` : ""}
                                </td>
                            </tr>

                            {species.groupsBySize.map((g) => {
                                const priceKey = `${species.species_id}__${g.sizeLabel}`;
                                const price = priceMap?.get(priceKey);

                                let statusBadge = null;
                                if (g.total.available_qty === 0 && g.total.total_qty > 0) {
                                    statusBadge = (
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBadgeClass("red")}`}>
                                            ไม่มีต้นพร้อมขาย
                                        </span>
                                    );
                                } else if (g.total.dig_ordered_qty > 0 && g.total.dug_qty === 0) {
                                    statusBadge = (
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBadgeClass("orange")}`}>
                                            มีใบสั่งขุดรอดำเนินการ
                                        </span>
                                    );
                                } else if (g.total.untagged_qty > 0) {
                                    statusBadge = (
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBadgeClass("amber")}`}>
                                            ควรทำ Tag เพิ่ม
                                        </span>
                                    );
                                }

                                const unitPrice = price ? Number(price.base_price || 0) : 0;
                                const valueAvailable = unitPrice * g.total.available_qty;

                                return (
                                    <React.Fragment key={`${species.species_id}-${g.sizeLabel}`}>
                                        <tr className={`${sizeRowBg} transition-colors`}>
                                            <td className="px-3 py-2"></td>
                                            <td className={`px-3 py-2 font-medium ${textWhite} align-top`}>{g.sizeLabel}"</td>
                                            <td className={`px-3 py-2 ${textMutedLight} align-top`}>-</td>
                                            <td className={`px-3 py-2 ${textMuted} align-top`}>{price?.grade || "-"}</td>
                                            <td className={`px-3 py-2 ${textMutedLight} italic align-top`}>รวม {g.zoneRows.length} โซน</td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${textWhite} font-medium`}>
                                                {g.total.stock_total_qty?.toLocaleString("th-TH") ?? "-"}
                                            </td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${cyanText} font-medium`}>
                                                {g.total.tagged_qty > 0 ? g.total.tagged_qty.toLocaleString("th-TH") : "-"}
                                            </td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${emeraldText} font-medium`}>
                                                {g.total.available_qty?.toLocaleString("th-TH") ?? "-"}
                                                {valueAvailable > 0 && (
                                                    <div className={`text-[10px] ${textMutedLight} font-normal`}>
                                                        {valueAvailable.toLocaleString()} ฿
                                                    </div>
                                                )}
                                            </td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${amberText}`}>
                                                {g.total.reserved_qty > 0 ? g.total.reserved_qty.toLocaleString("th-TH") : "-"}
                                            </td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${textMuted}`}>
                                                {g.total.dig_ordered_qty > 0 ? g.total.dig_ordered_qty.toLocaleString("th-TH") : "-"}
                                            </td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${textMuted}`}>
                                                {g.total.dug_qty > 0 ? g.total.dug_qty.toLocaleString("th-TH") : "-"}
                                            </td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${textMuted}`}>
                                                {g.total.shipped_qty > 0 ? g.total.shipped_qty.toLocaleString("th-TH") : "-"}
                                            </td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${textMuted}`}>
                                                {g.total.planted_qty > 0 ? g.total.planted_qty.toLocaleString("th-TH") : "-"}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {g.total.untagged_qty > 0 ? (
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBadgeClass("amber")}`}>
                                                        ยังไม่ Tag {g.total.untagged_qty.toLocaleString("th-TH")}
                                                    </span>
                                                ) : (
                                                    <span className={textMutedLight}>-</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {statusBadge}
                                                <button
                                                    className={`ml-2 text-[10px] ${textMutedLight} hover:${isDarkMode ? "text-slate-300" : "text-slate-700"} underline`}
                                                    onClick={(e) => { e.stopPropagation(); onEditPrice?.(species.species_id, g.sizeLabel); }}
                                                >
                                                    {price ? "แก้ไขราคา" : "ตั้งราคา"}
                                                </button>
                                            </td>
                                        </tr>

                                        {g.zoneRows.map((r, idx) => {
                                            const prefix = idx === g.zoneRows.length - 1 ? "└─" : "├─";
                                            // Note: grade_code/height_label removed from size-level view
                                            // Use drill-down view (view_tree_tag_lifecycle_breakdown) for grade details
                                            const gradeStyleObj = gradeStyle(null, isDarkMode);

                                            return (
                                                <tr
                                                    key={`${r.zone_id}-${r.species_id}-${r.size_label}`}
                                                    className={`${zoneRowHover} cursor-pointer ${textMuted} transition-colors`}
                                                    onClick={() => onRowClick?.(r)}
                                                >
                                                    <td className="px-3 py-1"></td>
                                                    <td className="px-3 py-1"></td>
                                                    <td className="px-3 py-1 text-xs">-</td>
                                                    <td className="px-3 py-1">
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${gradeStyleObj.className}`}>
                                                            {gradeStyleObj.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-1 text-xs">
                                                        <span className={textMutedLight + " mr-1"}>{prefix}</span>
                                                        {r.farm_name} / {r.zone_name}
                                                    </td>
                                                    <td className="px-3 py-1 text-right tabular-nums text-xs">
                                                        {(r.stock_total_qty ?? r.total_qty)?.toLocaleString("th-TH") ?? "-"}
                                                    </td>
                                                    <td className={`px-3 py-1 text-right tabular-nums text-xs ${isDarkMode ? "text-cyan-400/70" : "text-cyan-600/70"}`}>
                                                        {r.tagged_qty > 0 ? r.tagged_qty.toLocaleString("th-TH") : "-"}
                                                    </td>
                                                    <td className={`px-3 py-1 text-right tabular-nums text-xs ${isDarkMode ? "text-emerald-400/70" : "text-emerald-600/70"}`}>
                                                        {r.available_qty > 0 ? r.available_qty.toLocaleString("th-TH") : "-"}
                                                    </td>
                                                    <td className={`px-3 py-1 text-right tabular-nums text-xs ${isDarkMode ? "text-amber-400/70" : "text-amber-600/70"}`}>
                                                        {r.reserved_qty > 0 ? r.reserved_qty.toLocaleString("th-TH") : "-"}
                                                    </td>
                                                    <td className="px-3 py-1 text-right tabular-nums text-xs">
                                                        {r.dig_ordered_qty > 0 ? r.dig_ordered_qty.toLocaleString("th-TH") : "-"}
                                                    </td>
                                                    <td className="px-3 py-1 text-right tabular-nums text-xs">
                                                        {r.dug_qty > 0 ? r.dug_qty.toLocaleString("th-TH") : "-"}
                                                    </td>
                                                    <td className="px-3 py-1 text-right tabular-nums text-xs">
                                                        {r.shipped_qty > 0 ? r.shipped_qty.toLocaleString("th-TH") : "-"}
                                                    </td>
                                                    <td className="px-3 py-1 text-right tabular-nums text-xs">
                                                        {r.planted_qty > 0 ? r.planted_qty.toLocaleString("th-TH") : "-"}
                                                    </td>
                                                    <td className="px-3 py-1 text-right tabular-nums text-xs">
                                                        {r.untagged_qty > 0 ? r.untagged_qty.toLocaleString("th-TH") : "-"}
                                                    </td>
                                                    <td className="px-3 py-1"></td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    ))}

                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={15} className={`px-3 py-12 text-center ${textMutedLight}`}>
                                ยังไม่มีข้อมูลสต็อกในเงื่อนไขนี้
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
