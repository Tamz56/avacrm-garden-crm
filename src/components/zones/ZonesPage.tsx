import React from "react";
import { ZonesOverviewTab } from "./ZonesOverviewTab";
import { ZoneInspectionTab } from "./ZoneInspectionTab";
import { ZoneMasterDataTab } from "./ZoneMasterDataTab";

const ZONE_TABS = [
    { id: "overview", label: "ภาพรวมแปลง" },
    { id: "inspection", label: "การตรวจแปลง & ความคลาดเคลื่อน" },
    { id: "master", label: "ข้อมูลโครงสร้างแปลง" },
];

type Props = {
    initialFilters?: any;
    isDarkMode?: boolean;
};

export const ZonesPage: React.FC<Props> = ({ initialFilters, isDarkMode = false }) => {
    const [activeTab, setActiveTab] = React.useState<"overview" | "inspection" | "master">("overview");

    return (
        <div className={`flex flex-col gap-4 p-6 min-h-screen ${isDarkMode ? "bg-black" : "bg-slate-50"}`}>
            {/* แท็บด้านบน */}
            <div className={`flex gap-2 border-b ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                {ZONE_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id
                            ? isDarkMode
                                ? "bg-slate-800 border border-slate-700 border-b-slate-800 text-emerald-400 -mb-px"
                                : "bg-white border border-slate-200 border-b-white text-emerald-600 -mb-px"
                            : isDarkMode
                                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* เนื้อหาแท็บ */}
            <div className="mt-2">
                {activeTab === "overview" && <ZonesOverviewTab initialFilters={initialFilters} isDarkMode={isDarkMode} />}
                {activeTab === "inspection" && <ZoneInspectionTab isDarkMode={isDarkMode} />}
                {activeTab === "master" && <ZoneMasterDataTab isDarkMode={isDarkMode} />}
            </div>
        </div>
    );
};
