import React from "react";
import { StockSpeciesFilter } from "../../hooks/useStockSpeciesOverview";

type Option = { value: string; label: string };

type Props = {
    filter: StockSpeciesFilter;
    onChangeFilter: (next: StockSpeciesFilter) => void;
    speciesOptions: Option[];
    sizeOptions: Option[];
    heightOptions: Option[];
    gradeOptions: Option[];
    isDarkMode?: boolean;
};

export const SpeciesStockFilterBar: React.FC<Props> = ({
    filter,
    onChangeFilter,
    speciesOptions,
    sizeOptions,
    heightOptions,
    gradeOptions,
    isDarkMode = false,
}) => {
    const handleSelect =
        (field: keyof StockSpeciesFilter) =>
            (e: React.ChangeEvent<HTMLSelectElement>) => {
                onChangeFilter({ ...filter, [field]: e.target.value });
            };

    const toggle = (field: keyof StockSpeciesFilter) => () => {
        onChangeFilter({ ...filter, [field]: !filter[field] });
    };

    // Theme-aware styles
    const containerClass = isDarkMode
        ? "rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
        : "rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm";
    const labelClass = isDarkMode ? "text-slate-400" : "text-slate-500";
    const selectClass = isDarkMode
        ? "rounded-md border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        : "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
    const checkboxClass = isDarkMode
        ? "rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
        : "rounded border-slate-300 bg-white text-emerald-500 focus:ring-emerald-500";
    const toggleLabel = isDarkMode ? "text-slate-300" : "text-slate-700";

    return (
        <div className={`mb-4 ${containerClass}`}>
            <div className="flex flex-wrap items-center gap-3">
                {/* Species */}
                <div className={`flex flex-col text-xs ${labelClass}`}>
                    <span className="mb-1 font-medium">พันธุ์ไม้</span>
                    <select className={`min-w-[180px] ${selectClass}`} value={filter.speciesId ?? "all"} onChange={handleSelect("speciesId")}>
                        <option value="all">พันธุ์ทั้งหมด</option>
                        {speciesOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                </div>

                {/* Size */}
                <div className={`flex flex-col text-xs ${labelClass}`}>
                    <span className="mb-1 font-medium">ขนาด (นิ้ว)</span>
                    <select className={`min-w-[120px] ${selectClass}`} value={filter.sizeLabel ?? "all"} onChange={handleSelect("sizeLabel")}>
                        <option value="all">ทุกขนาด</option>
                        {sizeOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                </div>

                {/* Height */}
                <div className={`flex flex-col text-xs ${labelClass}`}>
                    <span className="mb-1 font-medium">ความสูง</span>
                    <select className={`min-w-[120px] ${selectClass}`} value={filter.heightLabel ?? "all"} onChange={handleSelect("heightLabel")}>
                        <option value="all">ทุกช่วงความสูง</option>
                        {heightOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                </div>

                {/* Grade */}
                <div className={`flex flex-col text-xs ${labelClass}`}>
                    <span className="mb-1 font-medium">เกรด</span>
                    <select className={`min-w-[120px] ${selectClass}`} value={filter.gradeId ?? "all"} onChange={handleSelect("gradeId")}>
                        <option value="all">ทุกเกรด</option>
                        {gradeOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                </div>

                {/* Toggles */}
                <div className="ml-auto flex items-center gap-3 pt-4">
                    <label className={`flex items-center gap-2 text-sm ${toggleLabel} cursor-pointer select-none`}>
                        <input type="checkbox" className={checkboxClass} checked={filter.onlyAvailable || false} onChange={toggle("onlyAvailable")} />
                        แสดงเฉพาะพร้อมขาย
                    </label>

                    <label className={`flex items-center gap-2 text-sm ${toggleLabel} cursor-pointer select-none`}>
                        <input type="checkbox" className={checkboxClass} checked={filter.hideUntaggedOnly || false} onChange={toggle("hideUntaggedOnly")} />
                        ซ่อนชุดที่ยังไม่ Tag ทั้งหมด
                    </label>
                </div>
            </div>
        </div>
    );
};
