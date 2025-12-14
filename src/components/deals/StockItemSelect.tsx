import React from "react";
import { Leaf } from "lucide-react";
import {
    useDealStockPickerOptions,
    DealStockPickerOption,
    makeDealStockOptionLabel,
} from "../../hooks/useDealStockPickerOptions";

export type StockItemOption = {
    id: string; // composite key: zone_id-species_id-size_label-grade_id
    label: string;
    speciesId: string;
    speciesName: string;
    speciesCode: string | null;
    sizeLabel: string | null;
    heightLabel: string | null;
    gradeId: string | null;
    gradeName: string | null;
    zoneId: string;
    zoneName: string;
    farmName: string;
    quantityAvailable: number;
    basePrice: number | null;
};

interface StockItemSelectProps {
    value: string | null;
    onChange: (option: StockItemOption | null) => void;
    disabled?: boolean;
}

function makeCompositeKey(o: DealStockPickerOption): string {
    return `${o.zone_id}-${o.species_id}-${o.size_label ?? ""}-${o.grade_id ?? ""}`;
}

function mapToStockItemOption(o: DealStockPickerOption): StockItemOption {
    return {
        id: makeCompositeKey(o),
        label: makeDealStockOptionLabel(o),
        speciesId: o.species_id,
        speciesName: o.species_name_th ?? o.species_name_en ?? o.species_code ?? "ไม่ทราบพันธุ์",
        speciesCode: o.species_code,
        sizeLabel: o.size_label,
        heightLabel: o.height_label,
        gradeId: o.grade_id,
        gradeName: o.grade_name,
        zoneId: o.zone_id,
        zoneName: o.zone_name,
        farmName: o.farm_name,
        quantityAvailable: o.available_qty ?? 0,
        basePrice: o.unit_price ?? null,
    };
}

const StockItemSelect: React.FC<StockItemSelectProps> = ({
    value,
    onChange,
    disabled = false,
}) => {
    const { options: rawOptions, loading, error } = useDealStockPickerOptions();

    // Map to StockItemOption format for backward compatibility
    const options: StockItemOption[] = rawOptions.map(mapToStockItemOption);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value || null;
        const opt = options.find((o) => o.id === id) || null;
        onChange(opt);
    };

    return (
        <div className="space-y-1 text-sm">
            <label className="flex items-center gap-2 text-slate-700">
                <Leaf className="w-4 h-4 text-emerald-500" />
                <span>เลือกต้นไม้จากสต็อก</span>
            </label>
            <select
                value={value ?? ""}
                onChange={handleChange}
                disabled={disabled || loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
                <option value="">
                    {loading ? "กำลังโหลดข้อมูลสต็อก..." : "— เลือกต้นไม้ / ขนาด / โซน —"}
                </option>
                {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && (
                <div className="text-xs text-rose-600 flex items-center gap-1">
                    {error}
                </div>
            )}
        </div>
    );
};

export default StockItemSelect;

