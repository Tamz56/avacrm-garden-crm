import React from "react";
import { Search, Filter, X } from "lucide-react";

type Props = {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    selectedPlotType: string;
    setSelectedPlotType: (val: string) => void;
    plotTypes: any[];
    mismatchFilter: string;
    setMismatchFilter: (val: string) => void;
    mismatchSummary: Record<string, number>;
    loading?: boolean;
};

const MISMATCH_STATUS_OPTIONS = [
    { value: "all", label: "ทั้งหมด" },
    { value: "ยังไม่สำรวจ", label: "ยังไม่สำรวจ" },
    { value: "ยังไม่ปลูก/บันทึก", label: "ยังไม่ปลูก/บันทึก" },
    { value: "ตรงตามระบบ", label: "ตรงตามระบบ" },
    { value: "คลาดเคลื่อนเล็กน้อย", label: "คลาดเคลื่อนเล็กน้อย" },
    { value: "คลาดเคลื่อนปานกลาง", label: "คลาดเคลื่อนปานกลาง" },
    { value: "คลาดเคลื่อนมาก", label: "คลาดเคลื่อนมาก" },
];

export const ZoneFilterBar: React.FC<Props> = ({
    searchQuery,
    setSearchQuery,
    selectedPlotType,
    setSelectedPlotType,
    plotTypes,
    mismatchFilter,
    setMismatchFilter,
    mismatchSummary,
    loading,
}) => {
    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm">
            {/* Top Row: Search & Plot Type */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Search Input */}
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2.5 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:border-emerald-500 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="ค้นหาชื่อแปลง, สถานที่..."
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Plot Type Filter */}
                <div className="flex items-center gap-2 md:w-auto">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={selectedPlotType}
                        onChange={(e) => setSelectedPlotType(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 md:w-48"
                    >
                        <option value="ALL">ทุกประเภทแปลง</option>
                        {plotTypes.map((pt) => (
                            <option key={pt.id} value={pt.code}>
                                {pt.name_th} ({pt.code})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Bottom Row: Mismatch Status Chips */}
            <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-white/10 pt-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        สถานะความคลาดเคลื่อน
                    </span>
                    {mismatchFilter !== "all" && (
                        <button
                            onClick={() => setMismatchFilter("all")}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                            ล้างตัวกรอง
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {MISMATCH_STATUS_OPTIONS.map((option) => {
                        const isActive = mismatchFilter === option.value;
                        const count =
                            option.value === "all"
                                ? Object.values(mismatchSummary).reduce((a, b) => a + b, 0)
                                : mismatchSummary[option.value] || 0;

                        // Skip showing chips with 0 count if not active and not "all"
                        if (option.value !== "all" && count === 0 && !isActive) return null;

                        return (
                            <button
                                key={option.value}
                                onClick={() => setMismatchFilter(option.value)}
                                className={`group inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${isActive
                                    ? "bg-emerald-500 text-white shadow-sm"
                                    : "bg-slate-50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-slate-200"
                                    }`}
                            >
                                <span>{option.label}</span>
                                <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive
                                        ? "bg-emerald-500/30 text-white"
                                        : "bg-slate-200 dark:bg-white/20 text-slate-600 dark:text-slate-300 group-hover:bg-slate-300 dark:group-hover:bg-white/30"
                                        }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
