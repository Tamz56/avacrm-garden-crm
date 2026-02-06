import React, { useMemo, useState } from "react";
import { Image, MapPin, Star, ZoomIn } from "lucide-react";
import { useSpecialTrees } from "../hooks/useSpecialTrees";
import { EditTagDialog } from "../components/tags/EditTagDialog";
import { TagStatusBadge } from "../components/tags/TagStatusBadge";

const CATEGORY_LABELS: Record<string, string> = {
    special: "ต้นพิเศษ",
    demo: "ต้นตัวอย่าง / Demo",
    vip: "ต้น VIP",
};

type Props = {
    isDarkMode?: boolean;
};

export const SpecialTreesPage: React.FC<Props> = ({ isDarkMode = false }) => {
    const { rows, loading, error } = useSpecialTrees();

    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const filteredRows = useMemo(() => {
        if (filterCategory === "all") return rows;
        return rows.filter((r) => r.tree_category === filterCategory);
    }, [rows, filterCategory]);

    // Theme-aware styles
    const headerBg = isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
    const bodyBg = isDarkMode ? "bg-black" : "bg-slate-50";
    const cardBg = isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
    const textMutedLight = isDarkMode ? "text-slate-500" : "text-slate-400";
    const selectClass = isDarkMode
        ? "border-slate-600 bg-slate-700 text-white focus:ring-amber-500"
        : "border-slate-200 bg-white text-slate-900 focus:ring-amber-500";
    const imagePlaceholderBg = isDarkMode ? "bg-slate-700" : "bg-slate-100";
    const categoryBadge = isDarkMode
        ? "bg-amber-900/50 border border-amber-700 text-amber-300"
        : "bg-amber-50 text-amber-700";
    const iconBg = isDarkMode ? "bg-amber-900/50" : "bg-amber-100";
    const iconColor = isDarkMode ? "text-amber-400" : "text-amber-500";
    const buttonPrimary = isDarkMode ? "text-cyan-400 hover:underline" : "text-sky-600 hover:underline";
    const buttonSecondary = isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-500 hover:text-slate-800";
    const zoomButtonClass = isDarkMode ? "bg-slate-800/80 text-white" : "bg-white/80 text-slate-700";

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className={`border-b ${headerBg} px-6 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                        <Star className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div>
                        <h1 className={`text-lg font-semibold ${textMain}`}>ต้นพิเศษ (Special Trees)</h1>
                        <p className={`text-xs ${textMuted}`}>
                            รวมต้นตัวอย่าง / ต้นโชว์ / ต้นสำหรับถ่ายรูป และต้นพิเศษที่ใช้ทำคอนเทนต์
                        </p>
                    </div>
                </div>

                {/* Filter Category */}
                <div className="flex items-center gap-2">
                    <span className={`text-xs ${textMuted}`}>ประเภทต้นพิเศษ</span>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className={`border rounded-md px-2 py-1 text-xs focus:ring-2 ${selectClass}`}
                    >
                        <option value="all">ทั้งหมด</option>
                        <option value="special">ต้นพิเศษ</option>
                        <option value="demo">ต้นตัวอย่าง / Demo</option>
                        <option value="vip">ต้น VIP</option>
                    </select>
                </div>
            </div>

            {/* Body */}
            <div className={`flex-1 overflow-auto ${bodyBg} p-4`}>
                {loading && <div className={`text-xs ${textMutedLight}`}>กำลังโหลดข้อมูลต้นพิเศษ...</div>}
                {error && <div className="text-xs text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}</div>}

                {!loading && filteredRows.length === 0 && (
                    <div className={`text-xs ${textMutedLight}`}>ยังไม่มีการตั้งค่าต้นพิเศษในระบบ</div>
                )}

                {/* Cards layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredRows.map((row) => {
                        const categoryLabel = (row.tree_category && CATEGORY_LABELS[row.tree_category]) || "ต้นพิเศษ";

                        const cover = row.primary_image_url || (Array.isArray(row.extra_image_urls) && row.extra_image_urls.length > 0 ? row.extra_image_urls[0] : null);

                        return (
                            <div key={row.id} className={`${cardBg} rounded-xl shadow-sm border overflow-hidden flex flex-col`}>
                                {/* รูปหลัก */}
                                <div className={`relative h-40 ${imagePlaceholderBg} flex items-center justify-center`}>
                                    {cover ? (
                                        <>
                                            <img src={cover} alt={row.display_name || row.tag_code} className="w-full h-full object-cover" />
                                            <button
                                                className={`absolute bottom-2 right-2 ${zoomButtonClass} rounded-full px-2 py-1 text-[10px] flex items-center gap-1 shadow`}
                                                onClick={() => setPreviewImage(cover)}
                                            >
                                                <ZoomIn className="w-3 h-3" /> ดูรูปใหญ่
                                            </button>
                                        </>
                                    ) : (
                                        <div className={`flex flex-col items-center ${textMutedLight} text-xs`}>
                                            <Image className="w-6 h-6 mb-1" /> ไม่มีรูปภาพ
                                        </div>
                                    )}

                                    <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full ${categoryBadge} text-[10px] px-2 py-0.5`}>
                                        <Star className="w-3 h-3" /> {categoryLabel}
                                    </span>
                                </div>

                                {/* ข้อมูล */}
                                <div className="p-3 flex-1 flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-col">
                                            <span className={`text-[11px] font-semibold ${textMain}`}>{row.display_name || row.species_name_th}</span>
                                            <span className={`text-[10px] ${textMuted}`}>{row.species_name_th} • {row.size_label}" • Tag {row.tag_code}</span>
                                        </div>
                                        <TagStatusBadge status={row.status} />
                                    </div>

                                    <div className={`flex items-center gap-1 text-[10px] ${textMutedLight}`}>
                                        <MapPin className="w-3 h-3" />
                                        {row.farm_name} • {row.zone_name}
                                        {row.planting_row != null && <>{" • "}แถว {row.planting_row} ต้นที่ {row.planting_position}</>}
                                    </div>

                                    {row.feature_notes && (
                                        <p className={`mt-1 text-[10px] ${textMuted} line-clamp-3`}>{row.feature_notes}</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="px-3 pb-3 flex items-center justify-between">
                                    <button className={`text-[11px] ${buttonPrimary}`} onClick={() => setSelectedTagId(row.id)}>
                                        แก้ไข Tag / ข้อมูลต้นนี้
                                    </button>

                                    <button
                                        className={`text-[11px] ${buttonSecondary}`}
                                        onClick={() => {
                                            const url = `${window.location.origin}?tag=${row.tag_code}`;
                                            navigator.clipboard.writeText(url).catch(() => { });
                                        }}
                                    >
                                        คัดลอกลิงก์
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Dialog แก้ไข Tag */}
            {selectedTagId && (
                <EditTagDialog tagId={selectedTagId} open={!!selectedTagId} onClose={() => setSelectedTagId(null)} />
            )}

            {/* Preview รูปใหญ่ */}
            {previewImage && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="preview" className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-lg" />
                </div>
            )}
        </div>
    );
};
