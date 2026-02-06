// src/components/billing/DocCreatePanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ArrowLeft, FileText, Calendar } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import DealDocumentsPanel from '../customers/deals/DealDocumentsPanel';
import { useDealPaymentSummary } from '../../hooks/useDealPaymentSummary';

// --- Types ---

type DealSearchResult = {
    id: string;
    title: string | null;
    deal_code: string | null;
    customer_name: string | null;
    total_amount: number | null;
    created_at: string;
    status: string;
};

type GenericItem = {
    id: string;
    description: string;
    subText?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
};

type CustomerInfo = {
    name: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    branch?: string;
};

// --- Deal Picker Component ---

const DealPicker = ({ onSelect }: { onSelect: (deal: DealSearchResult) => void }) => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<DealSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState(false);

    // Initial load (recent deals)
    useEffect(() => {
        searchDeals('');
    }, []);

    const searchDeals = async (term: string) => {
        setLoading(true);
        try {
            let q = supabase
                .from('deals')
                .select('id, title, deal_code, customer_name, total_amount, created_at, status')
                .order('created_at', { ascending: false })
                .limit(20); // Limit results for speed

            if (term.trim()) {
                const t = term.trim();
                // ILIKE search on meaningful fields
                q = q.or(`deal_code.ilike.%${t}%,customer_name.ilike.%${t}%,title.ilike.%${t}%`);
            }

            const { data, error } = await q;
            if (error) throw error;
            setResults(data || []);
        } catch (e) {
            console.error('Error searching deals:', e);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        if (!touched) return;
        const timer = setTimeout(() => {
            searchDeals(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, touched]);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">เลือกดีลเพื่อสร้างเอกสาร</h2>
                <p className="text-sm text-slate-500">ค้นหาจาก ชื่อลูกค้า, รหัสดีล, หรือชื่อโครงการ</p>
            </div>

            {/* Search Box */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setTouched(true);
                    }}
                    placeholder="ค้นหา เช่น 'ต้นไม้', 'D-2026', 'คุณลูกค้า'"
                    className="w-full h-14 pl-12 pr-4 text-lg rounded-2xl border border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:bg-slate-800 dark:border-slate-700"
                    autoFocus
                />
            </div>

            {/* Results List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {results.length === 0 && !loading ? (
                    <div className="p-12 text-center text-slate-400">
                        <p>ไม่พบรายการดีล</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {results.map((deal) => (
                            <button
                                key={deal.id}
                                onClick={() => onSelect(deal)}
                                className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            {deal.deal_code || '(No Code)'}
                                            <span className="font-normal text-slate-500">|</span>
                                            {deal.customer_name || 'ไม่ระบุลูกค้า'}
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                            {deal.title || '-'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-slate-700 dark:text-slate-300">
                                        ฿{deal.total_amount?.toLocaleString() || '0'}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(deal.created_at).toLocaleDateString('th-TH')}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Panel Wrapper ---

export default function DocCreatePanel({ onSuccess }: { onSuccess?: () => void }) {
    const [selectedDeal, setSelectedDeal] = useState<DealSearchResult | null>(null);
    const [dealData, setDealData] = useState<{
        items: GenericItem[];
        customerInfo: CustomerInfo;
        customerId: string | null;
    } | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Payment summary hook
    const { data: paymentSummary } = useDealPaymentSummary(selectedDeal?.id);

    // Fetch deal details when selected
    const fetchDetails = useCallback(async (deal: DealSearchResult) => {
        setLoadingDetails(true);
        try {
            // 1. Fetch Items
            const { data: items, error: itemsError } = await supabase
                .from('deal_items')
                .select('id, description, quantity, unit_price, line_total, trunk_size_inch')
                .eq('deal_id', deal.id);

            if (itemsError) throw itemsError;

            // 2. Fetch Customer Info (if we have customer_name or we can query by deal relation)
            // We'll try to get customer_id from deal first (it wasn't in initial search select)
            const { data: fullDeal, error: dealError } = await supabase
                .from('deals')
                .select('customer_id, customers(name, phone, address, tax_id)')
                .eq('id', deal.id)
                .single();

            if (dealError) throw dealError;

            const cust = (fullDeal as any).customers;

            const customerInfo: CustomerInfo = {
                name: cust?.name || deal.customer_name || "ไม่ระบุชื่อ",
                phone: cust?.phone || "",
                address: cust?.address || "",
                tax_id: cust?.tax_id || "",
                branch: "", // Unavailable in quick fix
            };

            const mappedItems: GenericItem[] = (items || []).map((i: any) => ({
                id: i.id,
                description: i.description || "สินค้า",
                subText: i.trunk_size_inch ? `ขนาด ${i.trunk_size_inch} นิ้ว` : undefined,
                quantity: i.quantity || 0,
                unitPrice: i.unit_price || 0,
                amount: i.line_total || 0,
            }));

            setDealData({
                items: mappedItems,
                customerInfo,
                customerId: fullDeal?.customer_id || null
            });
        } catch (e) {
            console.error('Error loading details:', e);
            alert('ไม่สามารถโหลดข้อมูลดีลได้');
            setSelectedDeal(null); // Reset
        } finally {
            setLoadingDetails(false);
        }
    }, []);

    // Effect to trigger fetch
    useEffect(() => {
        if (selectedDeal) {
            fetchDetails(selectedDeal);
        } else {
            setDealData(null);
        }
    }, [selectedDeal, fetchDetails]);

    // If no deal selected, show picker
    if (!selectedDeal) {
        return (
            <div className="py-12">
                <DealPicker onSelect={setSelectedDeal} />
            </div>
        );
    }

    // Loading Screen
    if (loadingDetails || !dealData) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p>กำลังโหลดข้อมูลดีล {selectedDeal.deal_code}...</p>
            </div>
        );
    }

    // Ready to render Documents Panel
    const summary = {
        totalAmount: selectedDeal.total_amount || 0,
        paidAmount: paymentSummary?.paid_total || 0,
        outstandingAmount: paymentSummary?.outstanding || (selectedDeal.total_amount || 0),
    };

    return (
        <div className="space-y-6">
            {/* Top Bar for Switch Deal */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setSelectedDeal(null)}
                    className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    เปลี่ยนดีล
                </button>
                <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-slate-800 dark:text-white">{selectedDeal.deal_code}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{dealData.customerInfo.name}</span>
                </div>
            </div>

            {/* Reuse existing logic */}
            <DealDocumentsPanel
                dealId={selectedDeal.id}
                customerId={dealData.customerId}
                summary={summary}
                items={dealData.items}
                customerInfo={dealData.customerInfo}
                onDocumentCreated={() => onSuccess?.()}
            />
        </div>
    );
}
