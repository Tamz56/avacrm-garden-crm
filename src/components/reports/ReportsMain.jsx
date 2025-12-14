// src/components/reports/ReportsMain.jsx
import React, { useState } from "react";
import StockZonesReport from "./StockZonesReport.jsx";
import SalesReport from "./SalesReport.jsx";
import CommissionLedger from "./CommissionLedger.jsx";
import TeamCommission from "./TeamCommission.jsx";
import CommissionDashboard from "./CommissionDashboard.jsx";

const ReportsMain = () => {
    const [activeTab, setActiveTab] = useState("stock");

    return (
        <div className="px-8 py-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                    รายงาน
                </h1>
                <p className="text-sm text-slate-500 mb-6">
                    สรุปข้อมูลสต็อกต้นไม้ แปลงปลูก และรายงานอื่น ๆ ในระบบ AvaCRM
                </p>

                {/* Tabs */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-4 border-b border-slate-200 w-full overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTab("stock")}
                            className={`px-3 pb-2 text-sm -mb-px border-b-2 transition-colors whitespace-nowrap ${activeTab === "stock"
                                ? "border-emerald-500 text-emerald-600 font-medium"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Stock & Zones
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("sales")}
                            className={`px-3 pb-2 text-sm -mb-px border-b-2 transition-colors whitespace-nowrap ${activeTab === "sales"
                                ? "border-emerald-500 text-emerald-600 font-medium"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Sales Report
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("commission_dashboard")}
                            className={`px-3 pb-2 text-sm -mb-px border-b-2 transition-colors whitespace-nowrap ${activeTab === "commission_dashboard"
                                ? "border-emerald-500 text-emerald-600 font-medium"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Commission Dashboard
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("commission")}
                            className={`px-3 pb-2 text-sm -mb-px border-b-2 transition-colors whitespace-nowrap ${activeTab === "commission"
                                ? "border-emerald-500 text-emerald-600 font-medium"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Commission Ledger
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("team_commission")}
                            className={`px-3 pb-2 text-sm -mb-px border-b-2 transition-colors whitespace-nowrap ${activeTab === "team_commission"
                                ? "border-emerald-500 text-emerald-600 font-medium"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Team Commission
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="mt-6">
                    {activeTab === "stock" && <StockZonesReport />}

                    {activeTab === "sales" && (
                        <div className="mt-2">
                            <SalesReport />
                        </div>
                    )}

                    {activeTab === "commission_dashboard" && (
                        <div className="mt-2">
                            <CommissionDashboard />
                        </div>
                    )}

                    {activeTab === "commission" && (
                        <div className="mt-2">
                            <CommissionLedger />
                        </div>
                    )}

                    {activeTab === "team_commission" && (
                        <div className="mt-2">
                            <TeamCommission />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsMain;
