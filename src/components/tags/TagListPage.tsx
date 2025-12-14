import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Tag, Edit2, ExternalLink } from 'lucide-react';
import { useTagSearch, TagSearchFilter, TagSearchRow } from '../../hooks/useTagSearch';
import { useStockZoneLifecycle } from '../../hooks/useStockZoneLifecycle';
import { EditTagDialog } from './EditTagDialog';

import { TagStatus, STATUS_BADGE_LABEL, STATUS_BADGE_COLOR, TagStatusBadge } from './TagStatusBadge';

type TagStatusFilter = "all" | TagStatus;

const TAG_STATUS_OPTIONS: { value: TagStatusFilter; label: string }[] = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "in_zone", label: "อยู่ในแปลง / ยังไม่พร้อมขาย" },
    { value: "available", label: "พร้อมขาย (available)" },
    { value: "reserved", label: "จองแล้ว (reserved)" },
    { value: "dig_ordered", label: "อยู่ในใบสั่งขุด (dig_ordered)" },
    { value: "dug", label: "ขุดแล้ว (dug)" },
    { value: "shipped", label: "ส่งออกแล้ว (shipped)" },
    { value: "planted", label: "ปลูกแล้ว (planted)" },
    { value: "dead", label: "ตาย (dead)" },
    { value: "waste", label: "เสีย / คัดทิ้ง (waste)" },
];

type TagFilters = {
    status?: string;
    dig_purpose?: string;
    species_id?: string;
    size_label?: string;
    zone_id?: string;
};

type Props = {
    initialFilters?: TagFilters | null;
    isDarkMode?: boolean;
};

const TagListPage: React.FC<Props> = ({ initialFilters, isDarkMode = false }) => {

    // Filters State
    const searchParams = new URLSearchParams(window.location.search);
    const [tagCode, setTagCode] = useState('');
    const [selectedSpeciesId, setSelectedSpeciesId] = useState(initialFilters?.species_id || searchParams.get('species_id') || 'all');
    const [selectedZoneId, setSelectedZoneId] = useState(initialFilters?.zone_id || searchParams.get('zone_id') || 'all');
    const [selectedStatus, setSelectedStatus] = useState<TagStatusFilter>((initialFilters?.status as TagStatusFilter) || (searchParams.get('status') as TagStatusFilter) || 'all');
    const [selectedDigPurpose, setSelectedDigPurpose] = useState(initialFilters?.dig_purpose || searchParams.get('dig_purpose') || 'all');
    const [selectedGrade, setSelectedGrade] = useState('all');
    const [selectedSize, setSelectedSize] = useState(initialFilters?.size_label || searchParams.get('size_label') || 'all');

    React.useEffect(() => {
        if (initialFilters) {
            if (initialFilters.species_id) setSelectedSpeciesId(initialFilters.species_id);
            if (initialFilters.zone_id) setSelectedZoneId(initialFilters.zone_id);
            if (initialFilters.status) setSelectedStatus(initialFilters.status as TagStatusFilter);
            if (initialFilters.dig_purpose) setSelectedDigPurpose(initialFilters.dig_purpose);
            if (initialFilters.size_label) setSelectedSize(initialFilters.size_label);
        }
    }, [initialFilters]);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const filter: TagSearchFilter = useMemo(() => ({
        tagCode: tagCode || undefined,
        speciesId: selectedSpeciesId !== 'all' ? selectedSpeciesId : undefined,
        zoneId: selectedZoneId !== 'all' ? selectedZoneId : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        digPurpose: selectedDigPurpose !== 'all' ? selectedDigPurpose : undefined,
        grade: selectedGrade !== 'all' ? selectedGrade : undefined,
        sizeLabel: selectedSize !== 'all' ? selectedSize : undefined,
    }), [tagCode, selectedSpeciesId, selectedZoneId, selectedStatus, selectedDigPurpose, selectedGrade, selectedSize]);

    const { rows, loading, error, totalCount, reload } = useTagSearch(filter, page, pageSize);

    const [editingTag, setEditingTag] = useState<TagSearchRow | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    function openEdit(tag: TagSearchRow) {
        setEditingTag(tag);
        setEditOpen(true);
    }

    function handleSaved() {
        if (reload) { reload(); } else { window.location.reload(); }
    }

    const { rows: allStockRows } = useStockZoneLifecycle({});

    const speciesOptions = useMemo(() => {
        const map = new Map<string, string>();
        allStockRows.forEach((r) => { if (!r.species_id) return; if (!map.has(r.species_id)) { map.set(r.species_id, r.species_name_th || r.species_name_en || r.species_id); } });
        return Array.from(map.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
    }, [allStockRows]);

    const zoneOptions = useMemo(() => {
        const map = new Map<string, string>();
        allStockRows.forEach((r) => { if (!r.zone_id) return; if (!map.has(r.zone_id)) { map.set(r.zone_id, r.zone_name || r.zone_id); } });
        return Array.from(map.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
    }, [allStockRows]);

    const sizeOptions = useMemo(() => {
        const set = new Set<string>();
        allStockRows.forEach((r) => { if (r.size_label) set.add(r.size_label); });
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [allStockRows]);

    const gradeOptions = ['A', 'B', 'C', 'Reject'];
    const totalPages = Math.ceil(totalCount / pageSize);

    // Theme-aware styles
    const pageBg = isDarkMode ? "bg-slate-900" : "bg-slate-50";
    const cardBg = isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
    const textMutedLight = isDarkMode ? "text-slate-500" : "text-slate-400";
    const inputClass = isDarkMode
        ? "border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:ring-cyan-500 focus:border-cyan-500"
        : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-emerald-500 focus:border-emerald-500";
    const selectClass = isDarkMode
        ? "border-slate-600 bg-slate-700 text-white focus:ring-cyan-500"
        : "border-slate-200 bg-white text-slate-900 focus:ring-emerald-500";
    const theadBg = isDarkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200";
    const theadText = isDarkMode ? "text-slate-400" : "text-slate-600";
    const tbodyDivide = isDarkMode ? "divide-slate-700" : "divide-slate-100";
    const rowHover = isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50";
    const cyanAccent = isDarkMode ? "text-cyan-400" : "text-cyan-600";
    const amberAccent = isDarkMode ? "text-amber-400" : "text-amber-600";
    const paginationBorder = isDarkMode ? "border-slate-700" : "border-slate-200";
    const paginationBg = isDarkMode ? "bg-slate-800/50" : "bg-slate-50";
    const buttonHover = isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100";

    const getGradeBadge = (grade: string | null) => {
        if (!grade) return <span className={`text-xs ${textMutedLight}`}>-</span>;
        const gradeClasses: Record<string, string> = {
            A: isDarkMode ? "bg-emerald-900/50 text-emerald-300 border-emerald-700" : "bg-emerald-50 text-emerald-700 border-emerald-200",
            B: isDarkMode ? "bg-blue-900/50 text-blue-300 border-blue-700" : "bg-blue-50 text-blue-700 border-blue-200",
            Reject: isDarkMode ? "bg-red-900/50 text-red-300 border-red-700" : "bg-red-50 text-red-700 border-red-200",
        };
        const cls = gradeClasses[grade] || (isDarkMode ? "bg-slate-700 text-slate-400 border-slate-600" : "bg-slate-50 text-slate-500 border-slate-200");
        return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{grade}</span>;
    };

    return (
        <div className={`p-4 md:p-6 space-y-4 ${pageBg} min-h-screen`}>
            {/* Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <Tag className={`w-6 h-6 ${cyanAccent}`} />
                    <div>
                        <h1 className={`text-xl font-bold ${textMain}`}>ค้นหา Tag (รายต้น)</h1>
                        <p className={`text-sm ${textMuted}`}>จัดการและตรวจสอบสถานะต้นไม้รายต้น</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={`${cardBg} p-4 rounded-xl shadow-sm border space-y-3`}>
                <div className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"} mb-2`}>
                    <Filter className="w-4 h-4" /> ตัวกรองข้อมูล
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    <div className="relative">
                        <Search className={`absolute left-2.5 top-2.5 w-4 h-4 ${textMutedLight}`} />
                        <input
                            type="text" placeholder="ค้นหารหัส Tag..."
                            className={`w-full h-9 pl-9 pr-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                            value={tagCode}
                            onChange={(e) => { setTagCode(e.target.value); setPage(1); }}
                        />
                    </div>
                    <select className={`h-9 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 ${selectClass}`} value={selectedSpeciesId} onChange={(e) => { setSelectedSpeciesId(e.target.value); setPage(1); }}>
                        <option value="all">พันธุ์ทั้งหมด</option>
                        {speciesOptions.map((opt) => (<option key={opt.id} value={opt.id}>{opt.label}</option>))}
                    </select>
                    <select className={`h-9 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 ${selectClass}`} value={selectedSize} onChange={(e) => { setSelectedSize(e.target.value); setPage(1); }}>
                        <option value="all">ทุกขนาด</option>
                        {sizeOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                    <select className={`h-9 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 ${selectClass}`} value={selectedZoneId} onChange={(e) => { setSelectedZoneId(e.target.value); setPage(1); }}>
                        <option value="all">ทุกโซน</option>
                        {zoneOptions.map((opt) => (<option key={opt.id} value={opt.id}>{opt.label}</option>))}
                    </select>
                    <select className={`h-9 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 ${selectClass}`} value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value as TagStatusFilter); setPage(1); }}>
                        {TAG_STATUS_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                    <select className={`h-9 rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 ${selectClass}`} value={selectedDigPurpose} onChange={(e) => { setSelectedDigPurpose(e.target.value); setPage(1); }}>
                        <option value="all">ทุกวัตถุประสงค์</option>
                        <option value="to_panel">เข้าแผงไม้</option>
                        <option value="to_customer">ออเดอร์ลูกค้า</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className={`${cardBg} rounded-xl shadow-sm border overflow-hidden`}>
                {loading && <div className={`p-8 text-center ${textMutedLight}`}>กำลังโหลดข้อมูล...</div>}
                {!loading && error && <div className="p-8 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>}
                {!loading && !error && rows.length === 0 && <div className={`p-8 text-center ${textMutedLight}`}>ไม่พบข้อมูลตามเงื่อนไข</div>}

                {!loading && !error && rows.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className={`${theadBg} ${theadText} font-medium border-b`}>
                                <tr>
                                    <th className="px-4 py-3">Tag Code</th>
                                    <th className="px-4 py-3">พันธุ์ / ขนาด</th>
                                    <th className="px-4 py-3">เกรด</th>
                                    <th className="px-4 py-3">สถานะ</th>
                                    <th className="px-4 py-3">โซน / ตำแหน่ง</th>
                                    <th className="px-4 py-3">ดีล / ใบสั่งขุด</th>
                                    <th className="px-4 py-3">หมายเหตุ</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${tbodyDivide}`}>
                                {rows.map((row) => (
                                    <tr key={row.id} className={`${rowHover} transition-colors`}>
                                        <td className={`px-4 py-3 font-mono font-medium ${cyanAccent}`}>{row.tag_code}</td>
                                        <td className="px-4 py-3">
                                            <div className={`font-medium ${textMain}`}>{row.species_name_th}</div>
                                            <div className={`text-xs ${textMutedLight}`}>{row.size_label}</div>
                                        </td>
                                        <td className="px-4 py-3">{getGradeBadge(row.grade)}</td>
                                        <td className="px-4 py-3"><TagStatusBadge status={row.status} /></td>
                                        <td className="px-4 py-3">
                                            <div className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{row.farm_name} / {row.zone_name}</div>
                                            {(row.planting_row || row.planting_position) && (
                                                <div className={`text-xs ${textMutedLight}`}>
                                                    {row.planting_row ? `แถว ${row.planting_row}` : ''}{row.planting_position ? ` ต้นที่ ${row.planting_position}` : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.deal_code && <div className={`flex items-center gap-1 text-xs ${cyanAccent}`}><ExternalLink className="w-3 h-3" />{row.deal_code}</div>}
                                            {row.dig_order_code && <div className={`flex items-center gap-1 text-xs ${amberAccent}`}><ExternalLink className="w-3 h-3" />{row.dig_order_code}</div>}
                                            {!row.deal_code && !row.dig_order_code && <span className={`text-xs ${textMutedLight}`}>-</span>}
                                        </td>
                                        <td className={`px-4 py-3 ${textMuted} max-w-[150px] truncate`} title={row.note || ''}>{row.note || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button className={`p-1 ${textMutedLight} ${isDarkMode ? "hover:text-cyan-400" : "hover:text-emerald-600"} transition-colors`} onClick={() => openEdit(row)} title="แก้ไข Tag">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && !error && totalCount > 0 && (
                    <div className={`px-4 py-3 border-t ${paginationBorder} flex items-center justify-between ${paginationBg}`}>
                        <div className={`text-xs ${textMutedLight} flex items-center gap-2`}>
                            <span>แสดง</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                className={`rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 ${selectClass}`}
                            >
                                <option value={20}>20 แถว</option>
                                <option value={50}>50 แถว</option>
                                <option value={100}>100 แถว</option>
                            </select>
                            <span>{((page - 1) * pageSize) + 1} ถึง {Math.min(page * pageSize, totalCount)} จาก {totalCount} รายการ</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className={`p-1 rounded ${buttonHover} disabled:opacity-50 disabled:cursor-not-allowed ${textMuted}`} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className={`text-xs font-medium ${textMuted}`}>หน้า {page} / {totalPages}</span>
                            <button className={`p-1 rounded ${buttonHover} disabled:opacity-50 disabled:cursor-not-allowed ${textMuted}`} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <EditTagDialog open={editOpen} tag={editingTag} onClose={() => setEditOpen(false)} onSaved={handleSaved} />
        </div>
    );
};

export default TagListPage;
