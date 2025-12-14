import React, { useMemo, useState } from "react";
import { useStockSpeciesOverview, StockSpeciesFilter } from "../../hooks/useStockSpeciesOverview";
import { SpeciesStockFilterBar } from "./SpeciesStockFilterBar";
import { SpeciesStockSummaryCards } from "./SpeciesStockSummaryCards";
import { SpeciesStockBlock } from "./SpeciesStockBlock";
import { SpeciesStockBlock as SpeciesStockBlockType } from "../../types/stockSpecies";

type Props = {
    onGoToZone?: (preset: any) => void;
    onGoToTag?: (preset: any) => void;
    isDarkMode?: boolean;
};

export const SpeciesStockOverviewPage: React.FC<Props> = ({ onGoToZone, onGoToTag, isDarkMode = false }) => {
    const [filter, setFilter] = useState<StockSpeciesFilter>({
        speciesId: "all",
        sizeLabel: "all",
        heightLabel: "all",
        gradeId: "all",
        onlyAvailable: false,
        hideUntaggedOnly: false,
    });

    const { rows, allRows, loading, error } = useStockSpeciesOverview(filter);

    // Derive options from allRows (to keep options available even when filtered)
    const { speciesOptions, sizeOptions, heightOptions, gradeOptions } = useMemo(() => {
        const speciesMap = new Map<string, string>();
        const sizeSet = new Set<string>();
        const heightSet = new Set<string>();
        const gradeMap = new Map<string, string>();

        allRows.forEach((r) => {
            speciesMap.set(r.species_id, r.species_name_th);
            sizeSet.add(r.size_label);
            if (r.height_label) heightSet.add(r.height_label);
            if (r.grade_id && r.grade_name_th) gradeMap.set(r.grade_id, r.grade_name_th);
        });

        return {
            speciesOptions: Array.from(speciesMap.entries())
                .map(([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label, "th")),
            sizeOptions: Array.from(sizeSet)
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                .map((v) => ({ value: v, label: v })),
            heightOptions: Array.from(heightSet)
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                .map((v) => ({ value: v, label: v })),
            gradeOptions: Array.from(gradeMap.entries())
                .map(([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label, "th")),
        };
    }, [allRows]);

    // Calculate Summary
    const summary = useMemo(() => {
        return rows.reduce(
            (acc, r) => ({
                total: acc.total + (r.total_qty || 0),
                available: acc.available + (r.available_qty || 0),
                reserved: acc.reserved + (r.reserved_qty || 0),
                digOrdered: acc.digOrdered + (r.dig_ordered_qty || 0),
                dug: acc.dug + (r.dug_qty || 0),
                shipped: acc.shipped + (r.shipped_qty || 0),
                planted: acc.planted + (r.planted_qty || 0),
                untagged: acc.untagged + (r.untagged_qty || 0),
            }),
            { total: 0, available: 0, reserved: 0, digOrdered: 0, dug: 0, shipped: 0, planted: 0, untagged: 0 }
        );
    }, [rows]);

    // Group by Species
    const grouped = useMemo(() => {
        const groups = new Map<string, { info: SpeciesStockBlockType; items: SpeciesStockBlockType[] }>();

        rows.forEach((r) => {
            if (!groups.has(r.species_id)) {
                groups.set(r.species_id, { info: r, items: [] });
            }
            groups.get(r.species_id)!.items.push(r);
        });

        return Array.from(groups.values()).sort((a, b) =>
            a.info.species_name_th.localeCompare(b.info.species_name_th, "th")
        );
    }, [rows]);

    // Theme-aware styles
    const textMuted = isDarkMode ? "text-slate-500" : "text-slate-500";
    const emptyBorder = isDarkMode ? "border-slate-600" : "border-slate-200";

    if (loading && allRows.length === 0) {
        return <div className={`p-8 text-center ${textMuted}`}>กำลังโหลดข้อมูล...</div>;
    }

    if (error) {
        return <div className={`p-8 text-center ${isDarkMode ? "text-red-400" : "text-red-600"}`}>เกิดข้อผิดพลาด: {error.message}</div>;
    }

    return (
        <div className="space-y-6 pb-20">
            <SpeciesStockFilterBar
                filter={filter}
                onChangeFilter={setFilter}
                speciesOptions={speciesOptions}
                sizeOptions={sizeOptions}
                heightOptions={heightOptions}
                gradeOptions={gradeOptions}
                isDarkMode={isDarkMode}
            />

            <SpeciesStockSummaryCards summary={summary} isDarkMode={isDarkMode} />

            <div className="space-y-8">
                {grouped.map((group) => (
                    <SpeciesStockBlock
                        key={group.info.species_id}
                        speciesName={group.info.species_name_th}
                        speciesCode={group.info.species_code}
                        items={group.items}
                        onGoToZone={onGoToZone}
                        onGoToTag={onGoToTag}
                        isDarkMode={isDarkMode}
                    />
                ))}

                {grouped.length === 0 && (
                    <div className={`rounded-xl border border-dashed ${emptyBorder} p-12 text-center ${textMuted}`}>
                        ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                    </div>
                )}
            </div>
        </div>
    );
};
