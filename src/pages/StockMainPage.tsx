import React, { useState } from "react";
import StockOverviewPage from "../components/stock/StockOverviewPage";
import TagListPage from "../components/tags/TagListPage";
import StockMonthlyReportPage from "./StockMonthlyReportPage";
import { SpecialTreesPage } from "./SpecialTreesPage";
import { SpeciesDatabasePage } from "../components/stock/SpeciesDatabasePage";
import { SpeciesStockOverviewPage } from "../components/stock/SpeciesStockOverviewPage";
import StockGroupsPage from "../components/stock/StockGroupsPage";
import CreateTaskModal from "../components/tasks/CreateTaskModal";
import { ListTodo } from "lucide-react";

type TagFilters = {
    status?: string;
    dig_purpose?: string;
    species_id?: string;
    size_label?: string;
    zone_id?: string;
    id?: string;
    initialTab?: string;
};

type Props = {
    onNavigateToZones?: (preset: any) => void;
    initialTagFilters?: TagFilters | null;
    isDarkMode?: boolean;
};

// เรียง union ให้ตรงกับลำดับแท็บ (ไม่บังคับ แต่ทำให้อ่านง่าย)
type StockTabKey =
    | "lifecycle"
    | "monthly_report"
    | "species_overview"
    | "tags"
    | "special_trees"
    | "species_db"
    | "stock_groups";

const StockMainPage: React.FC<Props> = ({ onNavigateToZones, initialTagFilters, isDarkMode = false }) => {
    const [activeTab, setActiveTab] = useState<StockTabKey>("lifecycle");
    const [tagInitialFilters, setTagInitialFilters] = useState<TagFilters | null>(
        initialTagFilters || null
    );
    const [showTaskModal, setShowTaskModal] = useState(false);

    // Update internal state if prop changes (e.g. from App.js navigation)
    React.useEffect(() => {
        if (initialTagFilters) {
            setTagInitialFilters(initialTagFilters);
            setActiveTab("tags");
        }
    }, [initialTagFilters]);

    const handleOpenTagSearch = (filters: TagFilters) => {
        setTagInitialFilters(filters);
        setActiveTab("tags");
    };

    const handleGoToTag = (preset: TagFilters) => {
        setTagInitialFilters(preset);
        setActiveTab("tags");
    };

    // Theme-aware styles
    const containerBg = isDarkMode ? "bg-black" : "bg-slate-50";
    const tabBarBg = isDarkMode ? "bg-black border-white/10" : "bg-white border-slate-200";
    const contentBg = isDarkMode ? "bg-black" : "bg-slate-50";



    return (
        <div className={`h-full flex flex-col ${containerBg}`}>
            {/* Tabs & Shortcuts */}
            <div className={`px-6 pt-4 flex items-center justify-between border-b ${tabBarBg}`}>
                <div className="flex gap-2 overflow-x-auto">
                    {/* Shortcuts (Quick Filters) */}
                    <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-slate-700 mr-2">
                        <button
                            onClick={() => handleGoToTag({ status: 'ready_for_sale' })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100/50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-md text-sm font-medium transition-colors"
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            พร้อมขาย
                        </button>
                        <button
                            onClick={() => handleGoToTag({ status: 'reserved' })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/50 dark:bg-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 rounded-md text-sm font-medium transition-colors"
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            จองแล้ว
                        </button>
                    </div>

                    <button
                        onClick={() => setShowTaskModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-md text-sm font-medium transition-colors mr-2 border border-indigo-100 dark:border-indigo-500/30"
                    >
                        <ListTodo className="w-4 h-4" />
                        เพิ่มงาน (Stock)
                    </button>

                    {/* 1. ภาพรวมสต็อก (Lifecycle) */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("lifecycle")}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "lifecycle"
                            ? (isDarkMode ? "border-emerald-400 text-emerald-400 bg-white/10" : "border-emerald-500 text-emerald-700 bg-emerald-50")
                            : (isDarkMode ? "border-transparent text-slate-400 hover:text-white hover:bg-white/5" : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50")
                            }`}
                    >
                        ภาพรวมสต็อก (Lifecycle)
                    </button>

                    {/* 2. รายงานประจำเดือน */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("monthly_report")}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "monthly_report"
                            ? (isDarkMode ? "border-cyan-400 text-cyan-400 bg-white/10" : "border-sky-500 text-sky-700 bg-sky-50")
                            : (isDarkMode ? "border-transparent text-slate-400 hover:text-white hover:bg-white/5" : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50")
                            }`}
                    >
                        รายงานประจำเดือน
                    </button>

                    {/* 3. ภาพรวมสต็อก (พันธุ์/ขนาด) */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("species_overview")}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "species_overview"
                            ? (isDarkMode ? "border-emerald-400 text-emerald-400 bg-white/10" : "border-emerald-500 text-emerald-700 bg-emerald-50")
                            : (isDarkMode ? "border-transparent text-slate-400 hover:text-white hover:bg-white/5" : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50")
                            }`}
                    >
                        ภาพรวมสต็อก (พันธุ์/ขนาด)
                    </button>

                    {/* 4. ค้นหา Tag (รายต้น) */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("tags")}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "tags"
                            ? (isDarkMode ? "border-violet-400 text-violet-400 bg-white/10" : "border-violet-500 text-violet-700 bg-violet-50")
                            : (isDarkMode ? "border-transparent text-slate-400 hover:text-white hover:bg-white/5" : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50")
                            }`}
                    >
                        ค้นหา Tag (รายต้น)
                    </button>

                    {/* 5. ต้นพิเศษ */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("special_trees")}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "special_trees"
                            ? (isDarkMode ? "border-amber-400 text-amber-400 bg-white/10" : "border-amber-500 text-amber-700 bg-amber-50")
                            : (isDarkMode ? "border-transparent text-slate-400 hover:text-white hover:bg-white/5" : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50")
                            }`}
                    >
                        ต้นพิเศษ
                    </button>

                    {/* 6. กลุ่มสต๊อก (Stock Groups) */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("stock_groups")}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "stock_groups"
                            ? (isDarkMode ? "border-blue-400 text-blue-400 bg-white/10" : "border-blue-500 text-blue-700 bg-blue-50")
                            : (isDarkMode ? "border-transparent text-slate-400 hover:text-white hover:bg-white/5" : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50")
                            }`}
                    >
                        กลุ่มสต๊อก
                    </button>

                    {/* 7. ฐานข้อมูลต้นไม้ */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("species_db")}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "species_db"
                            ? (isDarkMode ? "border-emerald-400 text-emerald-400 bg-white/10" : "border-emerald-500 text-emerald-700 bg-emerald-50")
                            : (isDarkMode ? "border-transparent text-slate-400 hover:text-white hover:bg-white/5" : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50")
                            }`}
                    >
                        ฐานข้อมูลต้นไม้
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-auto ${contentBg} p-6`}>
                {activeTab === "lifecycle" && (
                    <StockOverviewPage onOpenTagSearch={handleOpenTagSearch} isDarkMode={isDarkMode} />
                )}

                {activeTab === "monthly_report" && <StockMonthlyReportPage isDarkMode={isDarkMode} />}

                {activeTab === "species_overview" && (
                    <SpeciesStockOverviewPage
                        onGoToZone={onNavigateToZones}
                        onGoToTag={handleGoToTag}
                        isDarkMode={isDarkMode}
                    />
                )}

                {activeTab === "tags" && <TagListPage initialFilters={tagInitialFilters} isDarkMode={isDarkMode} />}

                {activeTab === "special_trees" && <SpecialTreesPage isDarkMode={isDarkMode} />}

                {activeTab === "stock_groups" && <StockGroupsPage />}

                {activeTab === "species_db" && <SpeciesDatabasePage isDarkMode={isDarkMode} />}
            </div>

            <CreateTaskModal
                open={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                initialContextType="stock"
                initialContextId={null}
                initialContextLabel="Stock Management"
            />
        </div >
    );
};

export default StockMainPage;
