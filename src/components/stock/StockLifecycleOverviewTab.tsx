import React, { useState } from "react";
import { StockFilterState } from "../../types/stockLifecycle";
import { StockSummaryCards } from "./StockSummaryCards";
import { StockFilterBar } from "./StockFilterBar";
import { SpeciesStockCard } from "./SpeciesStockCard";
import { useStockLifecycleData } from "../../hooks/useStockLifecycleData";
import { Loader2 } from "lucide-react";

export const StockLifecycleOverviewTab: React.FC = () => {
    const [filter, setFilter] = useState<StockFilterState>({
        speciesId: "all",
        zoneId: "all",
        plotType: "all",
        lifecycleStatus: "all",
    });

    const {
        loading,
        error,
        summary,
        blocks,
        speciesOptions,
        zoneOptions,
        plotTypeOptions,
    } = useStockLifecycleData(filter);

    if (loading && blocks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                กำลังโหลดข้อมูล...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 rounded-xl border border-red-200">
                เกิดข้อผิดพลาด: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Block A: Summary Cards */}
            <StockSummaryCards
                summary={summary}
                filter={filter}
                onChangeFilter={setFilter}
            />

            {/* Block B: Filter Bar */}
            <StockFilterBar
                filter={filter}
                onChangeFilter={setFilter}
                speciesOptions={speciesOptions}
                zoneOptions={zoneOptions}
                plotTypeOptions={plotTypeOptions}
            />

            {/* Block C: Species Blocks */}
            <div>
                {blocks.length === 0 && (
                    <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        ยังไม่มีข้อมูลสต๊อกตามเงื่อนไขที่เลือก
                    </div>
                )}

                {blocks.map((block) => (
                    <SpeciesStockCard key={block.speciesId} block={block} />
                ))}
            </div>
        </div>
    );
};
