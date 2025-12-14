import React from "react";
import { StockFilterState } from "../../types/stockLifecycle";

type Option = { value: string; label: string };

type Props = {
    filter: StockFilterState;
    onChangeFilter: (next: StockFilterState) => void;
    speciesOptions: Option[];
    zoneOptions: Option[];
    plotTypeOptions: Option[];
};

export const StockFilterBar: React.FC<Props> = ({
    filter,
    onChangeFilter,
    speciesOptions,
    zoneOptions,
    plotTypeOptions,
}) => {
    const handleSelect =
        (field: keyof StockFilterState) =>
            (e: React.ChangeEvent<HTMLSelectElement>) => {
                onChangeFilter({
                    ...filter,
                    [field]: e.target.value as any,
                });
            };

    return (
        <div className="mb-4 rounded-xl border bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col text-xs text-slate-500">
                    <span className="mb-1 font-medium">พันธุ์ไม้</span>
                    <select
                        className="min-w-[200px] rounded-md border bg-white px-3 py-1.5 text-sm"
                        value={filter.speciesId ?? "all"}
                        onChange={handleSelect("speciesId")}
                    >
                        <option value="all">พันธุ์ทั้งหมด</option>
                        {speciesOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col text-xs text-slate-500">
                    <span className="mb-1 font-medium">โซน / ฟาร์ม</span>
                    <select
                        className="min-w-[200px] rounded-md border bg-white px-3 py-1.5 text-sm"
                        value={filter.zoneId ?? "all"}
                        onChange={handleSelect("zoneId")}
                    >
                        <option value="all">ทุกโซน</option>
                        {zoneOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col text-xs text-slate-500">
                    <span className="mb-1 font-medium">ประเภทแปลง</span>
                    <select
                        className="min-w-[160px] rounded-md border bg-white px-3 py-1.5 text-sm"
                        value={filter.plotType ?? "all"}
                        onChange={handleSelect("plotType")}
                    >
                        <option value="all">ทุกประเภทแปลง</option>
                        {plotTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Quick filters */}
                <div className="ml-auto flex flex-wrap gap-2 text-xs">
                    <QuickFilterChip
                        label="พร้อมขาย"
                        active={filter.lifecycleStatus === "available"}
                        onClick={() =>
                            onChangeFilter({ ...filter, lifecycleStatus: "available" })
                        }
                    />
                    <QuickFilterChip
                        label="ต้องขุดด่วน"
                        active={filter.lifecycleStatus === "dig_ordered"}
                        onClick={() =>
                            onChangeFilter({ ...filter, lifecycleStatus: "dig_ordered" })
                        }
                    />
                    <QuickFilterChip
                        label="จองแล้ว"
                        active={filter.lifecycleStatus === "reserved"}
                        onClick={() =>
                            onChangeFilter({ ...filter, lifecycleStatus: "reserved" })
                        }
                    />
                    <QuickFilterChip
                        label="ทั้งหมด"
                        active={filter.lifecycleStatus === "all" || !filter.lifecycleStatus}
                        onClick={() =>
                            onChangeFilter({ ...filter, lifecycleStatus: "all" })
                        }
                    />
                </div>
            </div>
        </div>
    );
};

type ChipProps = {
    label: string;
    active?: boolean;
    onClick: () => void;
};

const QuickFilterChip: React.FC<ChipProps> = ({ label, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={[
            "rounded-full border px-3 py-1 text-xs font-medium transition",
            active
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-white text-slate-600 hover:border-emerald-400",
        ].join(" ")}
    >
        {label}
    </button>
);
