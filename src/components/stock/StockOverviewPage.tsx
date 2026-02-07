import React, { useMemo, useState } from 'react';
import { Boxes, Filter } from 'lucide-react';
import { useStockZoneLifecycle, StockZoneLifecycleFilter } from '../../hooks/useStockZoneLifecycle';
import { useActiveStockPriceMap } from '../../hooks/useActiveStockPriceMap';
import { StockZoneLifecycleGroupedTable } from './StockZoneLifecycleGroupedTable';
import { StockTagGroupDialog } from './StockTagGroupDialog';
import { SetStockPriceDialog } from './SetStockPriceDialog';

type TagFilters = {
    status?: string;
    dig_purpose?: string;
    species_id?: string;
    size_label?: string;
    zone_id?: string;
};

type Props = {
    onOpenTagSearch?: (filters: TagFilters) => void;
    isDarkMode?: boolean;
};

const StockOverviewPage: React.FC<Props> = ({ onOpenTagSearch, isDarkMode = false }) => {
    // --- Filters ---
    const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('all');
    const [selectedZoneId, setSelectedZoneId] = useState<string>('all');
    const [selectedPlotType, setSelectedPlotType] = useState<string>('all');

    // State for Drilldown Dialog
    const [selectedGroup, setSelectedGroup] = useState<ReturnType<typeof useStockZoneLifecycle>["rows"][number] | null>(null);

    // State for Price Dialog
    const [priceDialogGroup, setPriceDialogGroup] = useState<{
        species: { id: string; name_th: string; name_en?: string | null };
        sizeLabel: string;
    } | null>(null);

    // สร้าง filter object สำหรับ hook
    const filter: StockZoneLifecycleFilter = useMemo(() => {
        const f: StockZoneLifecycleFilter = {};
        if (selectedSpeciesId !== 'all') f.speciesId = selectedSpeciesId;
        if (selectedZoneId !== 'all') f.zoneId = selectedZoneId;
        if (selectedPlotType !== 'all') f.plotType = selectedPlotType;
        return f;
    }, [selectedSpeciesId, selectedZoneId, selectedPlotType]);

    // เรียก hook ใหม่
    const { error } = useStockZoneLifecycle(filter);
    const { priceMap, reload: reloadPrices } = useActiveStockPriceMap();

    const { rows: allRows, loading: allLoading } = useStockZoneLifecycle({});

    const speciesOptions = useMemo(() => {
        const map = new Map<string, string>();
        allRows.forEach((r) => {
            if (!r.species_id) return;
            if (!map.has(r.species_id)) {
                map.set(r.species_id, r.species_name_th || r.species_name_en || r.species_id);
            }
        });
        return Array.from(map.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
    }, [allRows]);

    const zoneOptions = useMemo(() => {
        const map = new Map<string, string>();
        allRows.forEach((r) => {
            if (!r.zone_id) return;
            if (!map.has(r.zone_id)) {
                map.set(r.zone_id, r.zone_name || r.zone_id);
            }
        });
        return Array.from(map.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
    }, [allRows]);

    const plotTypeOptions = useMemo(() => {
        const set = new Set<string>();
        allRows.forEach((r) => {
            if (r.plot_type) set.add(r.plot_type);
        });
        return Array.from(set).sort();
    }, [allRows]);

    // Filter rows for table based on state
    const displayRows = useMemo(() => {
        return allRows.filter(r => {
            if (selectedSpeciesId !== 'all' && r.species_id !== selectedSpeciesId) return false;
            if (selectedZoneId !== 'all' && r.zone_id !== selectedZoneId) return false;
            if (selectedPlotType !== 'all' && r.plot_type !== selectedPlotType) return false;
            return true;
        });
    }, [allRows, selectedSpeciesId, selectedZoneId, selectedPlotType]);

    // Calculate KPI based on filtered rows
    const currentKpi = useMemo(() => {
        const totals = {
            total: 0,
            available: 0,
            reserved: 0,
            digOrdered: 0,
            dug: 0,
            shipped: 0,
            planted: 0,
        };
        for (const r of displayRows) {
            totals.total += Number(r.stock_total_qty ?? r.total_qty ?? 0);
            totals.available += Number(r.available_qty ?? 0);
            totals.reserved += Number(r.reserved_qty ?? 0);
            totals.digOrdered += Number(r.dig_ordered_qty ?? 0);
            totals.dug += Number(r.dug_qty ?? 0);
            totals.shipped += Number(r.shipped_qty ?? 0);
            totals.planted += Number(r.planted_qty ?? 0);
        }
        return totals;
    }, [displayRows]);

    // ⭐ KPI มูลค่ารวม
    const valueKpi = useMemo(() => {
        let totalValueAll = 0;
        let totalValueAvailable = 0;

        if (!priceMap) return { totalValueAll, totalValueAvailable };

        for (const r of displayRows) {
            const key = `${r.species_id}__${r.size_label}`;
            const price = priceMap.get(key);
            if (!price) continue;

            const unitPrice = Number(price.base_price || 0);
            totalValueAll += r.total_qty * unitPrice;
            totalValueAvailable += r.available_qty * unitPrice;
        }

        return { totalValueAll, totalValueAvailable };
    }, [displayRows, priceMap]);

    // Theme-aware styles
    const textMain = isDarkMode ? "text-white" : "text-slate-800";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
    const selectClass = isDarkMode
        ? "h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
        : "h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700";

    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <Boxes className={`w-5 h-5 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                    <div>
                        <h1 className={`text-xl font-semibold ${textMain}`}>
                            ภาพรวมสต็อกตามโซน & สถานะ
                        </h1>
                        <p className={`mt-1 text-sm ${textMuted}`}>
                            ดูจำนวนต้นไม้แยกตามแปลงปลูก พันธุ์ ขนาด และสถานะ (พร้อมขาย / จองแล้ว / ใบสั่งขุด / ขุดแล้ว / ส่งออก / ปลูกแล้ว)
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className={`inline-flex items-center gap-1 text-xs ${textMuted}`}>
                        <Filter className="w-3 h-3" />
                        Filter
                    </div>

                    {/* เลือกพันธุ์ */}
                    <select
                        className={selectClass}
                        value={selectedSpeciesId}
                        onChange={(e) => setSelectedSpeciesId(e.target.value)}
                    >
                        <option value="all">พันธุ์ทั้งหมด</option>
                        {speciesOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    {/* เลือกโซน */}
                    <select
                        className={selectClass}
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                    >
                        <option value="all">ทุกโซน</option>
                        {zoneOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    {/* เลือกประเภทแปลง */}
                    <select
                        className={selectClass}
                        value={selectedPlotType}
                        onChange={(e) => setSelectedPlotType(e.target.value)}
                    >
                        <option value="all">ทุกประเภทแปลง</option>
                        {plotTypeOptions.map((pt) => (
                            <option key={pt} value={pt}>
                                {pt}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="mt-4 grid gap-3 md:grid-cols-4">
                <StatCard
                    label="ต้นทั้งหมด"
                    value={currentKpi.total}
                    isDarkMode={isDarkMode}
                />
                <StatCard
                    label="พร้อมขาย"
                    value={currentKpi.available}
                    tone="positive"
                    isDarkMode={isDarkMode}
                />
                <StatCard
                    label="ในใบสั่งขุด"
                    value={currentKpi.digOrdered}
                    tone="warning"
                    isDarkMode={isDarkMode}
                />
                <StatCard
                    label="มูลค่าสต็อกโดยประมาณ"
                    value={valueKpi.totalValueAvailable}
                    suffix="บาท"
                    isDarkMode={isDarkMode}
                />
            </div>

            {allLoading && (
                <div className={`text-sm ${textMuted}`}>กำลังโหลดข้อมูลสต็อก...</div>
            )}
            {error && (
                <div className={`text-sm ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                    โหลดข้อมูลไม่สำเร็จ: {error}
                </div>
            )}

            {!allLoading && !error && (
                <StockZoneLifecycleGroupedTable
                    rows={displayRows}
                    lowStockThreshold={10}
                    priceMap={priceMap}
                    onRowClick={(row) => setSelectedGroup(row)}
                    onEditPrice={(speciesId, sizeLabel) => {
                        // Find species info from rows
                        const row = allRows.find(r => r.species_id === speciesId);
                        if (row) {
                            setPriceDialogGroup({
                                species: {
                                    id: row.species_id,
                                    name_th: row.species_name_th,
                                    name_en: row.species_name_en
                                },
                                sizeLabel: sizeLabel
                            });
                        }
                    }}
                    onOpenTagSearch={onOpenTagSearch}
                    isDarkMode={isDarkMode}
                />
            )}

            <StockTagGroupDialog
                open={!!selectedGroup}
                group={selectedGroup}
                onClose={() => setSelectedGroup(null)}
                isDarkMode={isDarkMode}
            />

            <SetStockPriceDialog
                open={!!priceDialogGroup}
                group={priceDialogGroup}
                currentPrice={priceDialogGroup ? priceMap.get(`${priceDialogGroup.species.id}__${priceDialogGroup.sizeLabel}`) : null}
                onClose={() => setPriceDialogGroup(null)}
                onSaved={() => {
                    reloadPrices();
                }}
            />
        </div>
    );
};

type StatCardProps = {
    label: string;
    value: number | null | undefined;
    suffix?: string;
    tone?: "default" | "positive" | "warning";
    isDarkMode?: boolean;
};

const StatCard: React.FC<StatCardProps> = ({ label, value, suffix, tone = "default", isDarkMode = false }) => {
    const display = value != null ? value.toLocaleString("th-TH") : "-";

    const toneClass = isDarkMode
        ? (tone === "positive"
            ? "border-emerald-800 bg-emerald-900/30"
            : tone === "warning"
                ? "border-amber-500/20 bg-amber-500/10"
                : "border-white/10 bg-white/5")
        : (tone === "positive"
            ? "border-emerald-200 bg-emerald-50"
            : tone === "warning"
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-white");

    const textColor = isDarkMode
        ? (tone === "positive"
            ? "text-emerald-400"
            : tone === "warning"
                ? "text-amber-400"
                : "text-white")
        : (tone === "positive"
            ? "text-emerald-700"
            : tone === "warning"
                ? "text-amber-700"
                : "text-slate-900");

    const labelColor = isDarkMode ? "text-slate-400" : "text-slate-500";

    return (
        <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
            <p className={`text-xs ${labelColor}`}>{label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${textColor}`}>
                {display}{suffix ? ` ${suffix}` : ""}
            </p>
        </div>
    );
};

export default StockOverviewPage;
