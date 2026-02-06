// src/pages/BillingConsolePage.tsx
// Master Billing Console: Registry + Create + Dashboard
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, BarChart3, ReceiptText } from 'lucide-react';
import DocsRegistryTable from '../components/billing/DocsRegistryTable';
import DocCreatePanel from '../components/billing/DocCreatePanel';
import { BillingDashboard } from '../components/billing/BillingDashboard';
import { getQueryParam, setQueryParams } from '../utils/urlState';

type TabId = 'dashboard' | 'registry' | 'create';
const DEFAULT_TAB: TabId = 'dashboard';
const isTab = (v: any): v is TabId =>
    v === 'dashboard' || v === 'registry' || v === 'create';

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'registry', label: 'รายการเอกสาร', icon: ReceiptText },
    { id: 'create', label: 'สร้างเอกสาร', icon: Plus },
];

export default function BillingConsolePage() {
    const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB);

    const applyFromUrl = useCallback(() => {
        const t = getQueryParam("tab");
        setActiveTab(isTab(t) ? t : DEFAULT_TAB);
    }, []);

    useEffect(() => {
        applyFromUrl();
        window.addEventListener("popstate", applyFromUrl);
        return () => window.removeEventListener("popstate", applyFromUrl);
    }, [applyFromUrl]);

    const navigateTab = (tab: TabId) => {
        setActiveTab(tab);

        // pushState เพื่อให้ back/forward ย้อนแท็บได้
        setQueryParams({ page: "billing", tab }, { replace: false });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black">
            {/* Header */}
            <div className="bg-white dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-800 dark:text-white">
                                    ศูนย์เอกสาร
                                </h1>
                                <p className="text-xs text-slate-500 font-medium">
                                    Billing Console
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 -mb-px">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => navigateTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${isActive
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {activeTab === 'dashboard' && (
                    <div className="bg-white dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 min-h-[500px]">
                        <BillingDashboard />
                    </div>
                )}

                {activeTab === 'registry' && (
                    <DocsRegistryTable />
                )}

                {activeTab === 'create' && (
                    <div className="bg-white dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 min-h-[500px]">
                        <DocCreatePanel onSuccess={() => navigateTab('registry')} />
                    </div>
                )}
            </div>
        </div>
    );
}
