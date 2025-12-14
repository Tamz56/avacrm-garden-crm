import React from "react";
import { SpeciesStockBlock as SpeciesStockBlockType } from "../../types/stockSpecies";
import { AlertTriangle, Tag, MapPin } from "lucide-react";

type Props = {
    speciesName: string;
    speciesCode: string;
    items: SpeciesStockBlockType[];
    onGoToZone?: (preset: any) => void;
    onGoToTag?: (preset: any) => void;
    isDarkMode?: boolean;
};

export const SpeciesStockBlock: React.FC<Props> = ({ speciesName, speciesCode, items, onGoToZone, onGoToTag, isDarkMode = false }) => {
    const sortedItems = [...items].sort((a, b) => a.size_label.localeCompare(b.size_label, undefined, { numeric: true }));

    const containerClass = isDarkMode
        ? "bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-4 space-y-4"
        : "bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4";
    const headerBorder = isDarkMode ? "border-slate-700" : "border-slate-200";
    const titleColor = isDarkMode ? "text-emerald-400" : "text-emerald-700";
    const countColor = isDarkMode ? "text-slate-500" : "text-slate-400";

    return (
        <div className={containerClass}>
            <div className={`flex items-center justify-between border-b ${headerBorder} pb-2`}>
                <h3 className={`text-lg font-bold ${titleColor}`}>
                    {speciesName}
                    {speciesCode && <span className={`ml-2 text-sm font-normal ${countColor}`}>({speciesCode})</span>}
                </h3>
                <span className={`text-xs ${countColor}`}>{items.length} รายการ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedItems.map((item) => (
                    <StockCard
                        key={`${item.species_id}-${item.size_label}-${item.height_label}-${item.grade_id}`}
                        item={item}
                        speciesName={speciesName}
                        speciesCode={speciesCode}
                        onGoToZone={onGoToZone}
                        onGoToTag={onGoToTag}
                        isDarkMode={isDarkMode}
                    />
                ))}
            </div>
        </div>
    );
};

type CardProps = {
    item: SpeciesStockBlockType;
    speciesName: string;
    speciesCode: string;
    onGoToZone?: (preset: any) => void;
    onGoToTag?: (preset: any) => void;
    isDarkMode?: boolean;
};

const PriceInfo: React.FC<{ row: SpeciesStockBlockType; isDarkMode: boolean }> = ({ row, isDarkMode }) => {
    const boxClass = isDarkMode
        ? "rounded-xl bg-slate-700/50 px-3 py-2 border border-slate-600"
        : "rounded-xl bg-slate-50 px-3 py-2 border border-slate-100";
    const titleClass = isDarkMode ? "text-slate-300" : "text-slate-700";
    const labelClass = isDarkMode ? "text-slate-500" : "text-slate-500";
    const valueClass = isDarkMode ? "text-emerald-400" : "text-emerald-600";

    if (!row.line_count || row.line_count === 0) {
        return (
            <div className={`mt-2 ${boxClass} text-center`}>
                <p className={labelClass}>ยังไม่มีประวัติการขาย</p>
            </div>
        );
    }

    const isPerMeter = row.last_price_type === "per_meter";
    const displayLastPrice = isPerMeter ? row.last_price_per_meter?.toLocaleString() : row.last_price_per_tree?.toLocaleString();
    const min = isPerMeter ? row.min_price_per_meter?.toLocaleString() : row.min_price_per_tree?.toLocaleString();
    const max = isPerMeter ? row.max_price_per_meter?.toLocaleString() : row.max_price_per_tree?.toLocaleString();
    const unit = isPerMeter ? "เมตร" : "ต้น";

    return (
        <div className={`mt-3 ${boxClass}`}>
            <p className={`text-xs font-medium ${titleClass}`}>ข้อมูลราคา (จากดีลที่ผ่านมา)</p>
            <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className={labelClass}>ราคาล่าสุด</span>
                <span className={`font-semibold ${valueClass}`}>{displayLastPrice} บาท/{unit}</span>
            </div>
            <p className={`mt-1 text-[11px] ${labelClass}`}>ช่วงราคาที่เคยขาย: {min}–{max} บาท/{unit}</p>
            <p className={`mt-1 text-[11px] ${labelClass}`}>จาก {row.line_count} รายการดีล / {row.total_qty_sold} ต้น</p>
        </div>
    );
};

const StockCard: React.FC<CardProps> = ({ item, speciesName, speciesCode, onGoToZone, onGoToTag, isDarkMode = false }) => {
    const isLowStock = item.available_qty > 0 && item.available_qty < 50;
    const isUntagged = item.untagged_qty > 0;

    const handleViewZones = () => { if (onGoToZone) { onGoToZone({ speciesId: item.species_id, sizeLabel: item.size_label, heightLabel: item.height_label, gradeId: item.grade_id, zoneIds: item.zone_ids }); } };
    const handleGoToTag = () => { if (onGoToTag) { onGoToTag({ species_id: item.species_id, size_label: item.size_label }); } };

    const cardClass = isDarkMode
        ? "bg-slate-800 rounded-lg border border-slate-700 shadow-lg hover:border-slate-600"
        : "bg-white rounded-lg border border-slate-200 shadow-sm hover:border-slate-300";
    const headerBg = isDarkMode ? "bg-slate-700/30 border-slate-700" : "bg-slate-50 border-slate-100";
    const titleClass = isDarkMode ? "text-white" : "text-slate-900";
    const subtitleClass = isDarkMode ? "text-slate-500" : "text-slate-400";
    const detailClass = isDarkMode ? "text-slate-400" : "text-slate-500";
    const badgeSold = isDarkMode
        ? "bg-emerald-900/50 border border-emerald-700 text-emerald-300"
        : "bg-emerald-50 border border-emerald-200 text-emerald-700";
    const badgeNoHistory = isDarkMode ? "bg-slate-700 text-slate-500" : "bg-slate-100 text-slate-500";
    const statLabel = isDarkMode ? "text-slate-500" : "text-slate-500";
    const statBorder = isDarkMode ? "border-slate-700" : "border-slate-100";
    const emeraldValue = isDarkMode ? "text-emerald-400" : "text-emerald-600";
    const amberValue = isDarkMode ? "text-amber-400" : "text-amber-600";
    const statValue = isDarkMode ? "text-slate-300" : "text-slate-700";
    const actionBg = isDarkMode ? "bg-slate-700/30 border-slate-700" : "bg-slate-50 border-slate-100";
    const zoneBtn = isDarkMode
        ? "text-slate-300 bg-slate-700 border-slate-600 hover:bg-slate-600 hover:text-white"
        : "text-slate-700 bg-white border-slate-200 hover:bg-slate-50";
    const tagBtn = isDarkMode
        ? "text-cyan-300 bg-cyan-900/50 border-cyan-700 hover:bg-cyan-900"
        : "text-cyan-700 bg-cyan-50 border-cyan-200 hover:bg-cyan-100";
    const lowStockBadge = isDarkMode
        ? "text-rose-300 bg-rose-900/50 border-rose-700"
        : "text-rose-600 bg-rose-50 border-rose-200";

    return (
        <div className={`${cardClass} transition-colors flex flex-col h-full`}>
            <div className={`p-4 border-b ${headerBg}`}>
                <h3 className={`text-sm font-semibold ${titleClass}`}>
                    {speciesName} <span className={`text-[11px] font-normal ${subtitleClass}`}>({item.species_name_en || speciesCode})</span>
                </h3>
                <p className={`mt-1 text-xs ${detailClass}`}>
                    ขนาด {item.size_label}"{item.height_label ? ` · สูงประมาณ ${item.height_label} ม.` : ""}{item.grade_name_th ? ` · เกรด ${item.grade_name_th}` : ""}
                </p>
                <div className="mt-2">
                    {item.line_count && item.line_count > 0 ? (
                        <span className={`inline-flex items-center gap-1 rounded-full ${badgeSold} px-2 py-0.5 text-[11px] font-medium`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isDarkMode ? "bg-emerald-400" : "bg-emerald-500"}`} />
                            มีประวัติขายแล้ว {item.line_count} รายการ
                        </span>
                    ) : (
                        <span className={`inline-flex items-center gap-1 rounded-full ${badgeNoHistory} px-2 py-0.5 text-[11px]`}>
                            ยังไม่มีประวัติการขาย
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {isLowStock && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${lowStockBadge} border px-2 py-1 rounded-full`}>
                            <AlertTriangle className="w-3 h-3" /> ใกล้หมด
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 flex-1">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className={`text-[11px] ${statLabel}`}>พร้อมขาย</p>
                        <p className={`text-base font-semibold ${emeraldValue} tabular-nums`}>{item.available_qty?.toLocaleString("th-TH") ?? 0} ต้น</p>
                    </div>
                    <div>
                        <p className={`text-[11px] ${statLabel}`}>ยังไม่ Tag</p>
                        <p className={`text-sm font-medium ${amberValue} tabular-nums`}>{item.untagged_qty?.toLocaleString("th-TH") ?? 0} ต้น</p>
                    </div>
                </div>

                <div className={`mt-3 pt-3 border-t ${statBorder} grid grid-cols-3 gap-x-2 gap-y-1 text-[11px] ${statLabel}`}>
                    <div>รวม: <span className={`font-medium ${statValue} tabular-nums`}>{item.total_qty?.toLocaleString("th-TH") ?? 0}</span></div>
                    <div>จองแล้ว: <span className="tabular-nums">{item.reserved_qty?.toLocaleString("th-TH") ?? 0}</span></div>
                    <div>ใบสั่งขุด: <span className="tabular-nums">{item.dig_ordered_qty?.toLocaleString("th-TH") ?? 0}</span></div>
                    <div>ขุดแล้ว: <span className="tabular-nums">{item.dug_qty?.toLocaleString("th-TH") ?? 0}</span></div>
                    <div>ส่งออก: <span className="tabular-nums">{item.shipped_qty?.toLocaleString("th-TH") ?? 0}</span></div>
                    <div>ปลูกแล้ว: <span className="tabular-nums">{item.planted_qty?.toLocaleString("th-TH") ?? 0}</span></div>
                </div>
            </div>

            <div className="px-4 pb-2"><PriceInfo row={item} isDarkMode={isDarkMode} /></div>

            <div className={`p-3 ${actionBg} border-t grid grid-cols-2 gap-2`}>
                <button onClick={handleViewZones} className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium ${zoneBtn} border rounded-lg transition-colors`}>
                    <MapPin className="w-3.5 h-3.5" /> ดูโซน
                </button>
                <button onClick={handleGoToTag} className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium ${tagBtn} border rounded-lg transition-colors`}>
                    <Tag className="w-3.5 h-3.5" /> ไปหน้า Tag
                </button>
            </div>
        </div>
    );
};
