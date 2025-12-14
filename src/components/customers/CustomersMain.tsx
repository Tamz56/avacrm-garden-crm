// src/components/customers/CustomersMain.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Loader2,
    AlertCircle,
    RefreshCcw,
    ChevronRight,
    MapPin,
    Info,
    Plus,
    Phone,
    MessageCircle,
    Search,
    User,
    Calendar,
    Filter,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { CustomerActivityModal, CustomerActivityRow } from "./CustomerActivityModal";

// --- Types ---
type Customer360Row = {
    id: string;
    name: string | null;
    phone: string | null;
    province: string | null;
    line_id: string | null;
    address: string | null;
    note: string | null;
    created_at?: string;

    // New Fields for Filtering
    created_month?: string;
    last_deal_month?: string;

    // 360 Fields
    total_deals: number;
    won_deals: number;
    lost_deals: number;
    open_deals: number;
    total_revenue: number;
    last_deal_activity: string | null;
    customer_stage: "Won Customer" | "Pending Decision" | "Lost / Churn" | "Inquiry / Lead";
    follow_up_status: "Overdue" | "On Track";
};



type NewCustomerForm = {
    name: string;
    phone: string;
    line_id: string;
    province: string;
    address: string;
    note: string;
};

type DealTimelineItem = {
    id: string;
    title: string | null;
    status: string | null;
    stage: string | null;
    total_amount: number | null;
    updated_at: string | null;
};

// --- VIP Tier Helper ---
function getTier(total: number) {
    if (total >= 1_000_000)
        return {
            label: "VIP Platinum",
            color:
                "text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/50",
        };
    if (total >= 300_000)
        return {
            label: "VIP Gold",
            color:
                "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50",
        };
    if (total >= 100_000)
        return {
            label: "Silver",
            color:
                "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        };
    return {
        label: "Normal",
        color:
            "text-slate-500 bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
    };
}

// --- Follow Up Helper ---
function getFollowUp(status: Customer360Row["follow_up_status"]) {
    if (status === "Overdue") {
        return {
            label: "ควรติดตามด่วน",
            color: "bg-red-500/10 text-red-300 border-red-500/40",
        };
    }
    return {
        label: "ปกติ",
        color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
    };
}



// --- Create Modal ---
const NewCustomerModal = ({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: () => void;
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<NewCustomerForm>({
        name: "",
        phone: "",
        line_id: "",
        province: "",
        address: "",
        note: "",
    });

    const handleChange = (field: keyof NewCustomerForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!form.name.trim()) throw new Error("กรุณากรอกชื่อลูกค้า");

            const { error: insertError } = await supabase.from("customers").insert({
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                line_id: form.line_id.trim() || null,
                province: form.province.trim() || null,
                address: form.address.trim() || null,
                note: form.note.trim() || null,
            });

            if (insertError) throw insertError;

            onCreated();
            onClose();
        } catch (err: any) {
            console.error("สร้างลูกค้าใหม่ผิดพลาด", err);
            setError(err.message || "ไม่สามารถบันทึกลูกค้าใหม่ได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        เพิ่มลูกค้าใหม่
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                        ✕
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl text-sm border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                ชื่อลูกค้า <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                placeholder="เช่น คุณสมชาย ใจดี"
                                value={form.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                เบอร์โทรศัพท์
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                placeholder="081-234-5678"
                                value={form.phone}
                                onChange={(e) => handleChange("phone", e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                Line ID
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                value={form.line_id}
                                onChange={(e) => handleChange("line_id", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                จังหวัด
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                value={form.province}
                                onChange={(e) => handleChange("province", e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            ที่อยู่
                        </label>
                        <textarea
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all min-h-[60px]"
                            value={form.address}
                            onChange={(e) => handleChange("address", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            หมายเหตุ
                        </label>
                        <textarea
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all min-h-[60px]"
                            value={form.note}
                            onChange={(e) => handleChange("note", e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />} บันทึก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// -------------------- Main Component --------------------

const CustomersMain: React.FC = () => {
    // State
    const [customers, setCustomers] = useState<Customer360Row[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer360Row | null>(null);
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);



    // Activity state
    const [activities, setActivities] = useState<CustomerActivityRow[]>([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [activityError, setActivityError] = useState<string | null>(null);
    const [activityModalOpen, setActivityModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<CustomerActivityRow | null>(null);

    // Filters State
    type TabStage = "All" | "Inquiry / Lead" | "Pending Decision" | "Won Customer" | "Lost / Churn";
    type MonthFilter = "all" | "this-month" | "last-month";

    const [activeTab, setActiveTab] = useState<TabStage>("All");
    const [monthFilter, setMonthFilter] = useState<MonthFilter>("all");

    // Helper Dates
    const now = useMemo(() => new Date(), []);
    const thisMonthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
    const nextMonthStart = useMemo(
        () => new Date(now.getFullYear(), now.getMonth() + 1, 1),
        [now]
    );
    const lastMonthStart = useMemo(
        () => new Date(now.getFullYear(), now.getMonth() - 1, 1),
        [now]
    );
    const lastMonthEnd = thisMonthStart;

    // 1. Fetch from View
    const loadCustomers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from("view_customer_360")
                .select("*")
                .order("total_revenue", { ascending: false });

            if (search.trim()) {
                const keyword = `%${search.trim()}%`;
                query = query.or(
                    `name.ilike.${keyword},phone.ilike.${keyword},province.ilike.${keyword},customer_code.ilike.${keyword}`
                );
            }

            const { data, error } = await query;
            if (error) throw error;
            setCustomers((data || []) as Customer360Row[]);
        } catch (err: any) {
            console.error("Load customers failed", err);
            setError(err.message || "โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    // Auto-select first
    useEffect(() => {
        if (customers.length > 0 && !selectedCustomer) setSelectedCustomer(customers[0]);
    }, [customers, selectedCustomer]);

    // โหลด activities ของลูกค้ารายที่เลือก
    const loadActivities = useCallback(async (customerId?: string) => {
        if (!customerId) return;
        setActivitiesLoading(true);
        setActivityError(null);
        try {
            const { data, error } = await supabase
                .from("view_customer_activities")
                .select("*")
                .eq("customer_id", customerId)
                .order("activity_date", { ascending: false })
                .limit(10);

            if (error) throw error;
            setActivities((data || []) as CustomerActivityRow[]);
        } catch (err: any) {
            console.error("Load customer activities error:", err);
            setActivityError(err.message || "โหลดกิจกรรมลูกค้าไม่สำเร็จ");
        } finally {
            setActivitiesLoading(false);
        }
    }, []);

    // Load timeline when selected customer changes
    useEffect(() => {
        if (selectedCustomer) {
            loadActivities(selectedCustomer.id);
        }
    }, [selectedCustomer, loadActivities]);



    // 2. Filter Logic
    const filteredCustomers = useMemo(() => {
        return customers.filter((c) => {
            // Stage Filter
            const matchStage = activeTab === "All" || c.customer_stage === activeTab;
            if (!matchStage) return false;

            // Month Filter
            if (monthFilter === "all") return true;

            const createdDate = c.created_month ? new Date(c.created_month) : null;
            const activityDate = c.last_deal_month ? new Date(c.last_deal_month) : null;

            const matchesRange = (date: Date | null, start: Date, end: Date) => {
                if (!date) return false;
                return date >= start && date < end;
            };

            if (monthFilter === "this-month") {
                return (
                    matchesRange(createdDate, thisMonthStart, nextMonthStart) ||
                    matchesRange(activityDate, thisMonthStart, nextMonthStart)
                );
            }

            if (monthFilter === "last-month") {
                return (
                    matchesRange(createdDate, lastMonthStart, lastMonthEnd) ||
                    matchesRange(activityDate, lastMonthStart, lastMonthEnd)
                );
            }

            return true;
        });
    }, [
        customers,
        activeTab,
        monthFilter,
        thisMonthStart,
        nextMonthStart,
        lastMonthStart,
        lastMonthEnd,
    ]);

    const handleCustomerCreated = () => {
        loadCustomers();
    };

    // Helper for formatting
    const formatMoney = (val: number) =>
        val.toLocaleString("th-TH", { minimumFractionDigits: 0 });

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return "-";
            return d.toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return "-";
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors text-slate-900 dark:text-slate-100">
            {/* ---------- Sidebar ---------- */}
            <aside className="w-full max-w-sm flex flex-col h-[calc(100vh-64px)] border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 backdrop-blur-xl">
                {/* Header & Search */}
                <div className="border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between px-4 py-3">
                        <h1 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            ลูกค้า{" "}
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                                {filteredCustomers.length}
                            </span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowNewCustomerModal(true)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                <Plus className="w-3 h-3" /> ใหม่
                            </button>
                            <button
                                onClick={loadCustomers}
                                disabled={loading}
                                className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                            >
                                <RefreshCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="px-4 pb-3">
                        <div className="relative group">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400"
                                placeholder="ค้นหา..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Month Filter */}
                    <div className="px-4 pb-3 flex gap-2">
                        {(["all", "this-month", "last-month"] as MonthFilter[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMonthFilter(m)}
                                className={`text-[11px] px-3 py-1 rounded-full border transition-all ${monthFilter === m
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20"
                                    : "bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 hover:text-emerald-500"
                                    }`}
                            >
                                {m === "all"
                                    ? "ทุกเดือน"
                                    : m === "this-month"
                                        ? "เดือนนี้"
                                        : "เดือนที่แล้ว"}
                            </button>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex overflow-x-auto px-4 gap-4 custom-scrollbar pb-2 border-b border-slate-100 dark:border-slate-800/50">
                        {(
                            [
                                "All",
                                "Inquiry / Lead",
                                "Pending Decision",
                                "Won Customer",
                                "Lost / Churn",
                            ] as TabStage[]
                        ).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab
                                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    }`}
                            >
                                {tab === "All" ? "ทั้งหมด" : tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                        </div>
                    ) : error ? (
                        <div className="p-4 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 m-4 rounded-xl border border-red-100 dark:border-red-900/50">
                            {error}
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            ไม่พบข้อมูลลูกค้าในมุมมองนี้
                        </div>
                    ) : (
                        filteredCustomers.map((c) => {
                            const isActive = selectedCustomer?.id === c.id;
                            const isOverdue = c.follow_up_status === "Overdue";
                            const tier = getTier(c.total_revenue);

                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCustomer(c)}
                                    className={`w-full text-left px-4 py-3 border-l-[3px] flex flex-col gap-1.5 transition-all ${isActive
                                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-500"
                                        : "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent"
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div
                                            className={`font-medium text-sm truncate ${isActive
                                                ? "text-emerald-700 dark:text-emerald-400"
                                                : "text-slate-900 dark:text-slate-200"
                                                }`}
                                        >
                                            {c.name || "ไม่ระบุชื่อ"}
                                        </div>
                                        {/* Status Dot with Glow */}
                                        <div
                                            className={`w-2.5 h-2.5 rounded-full mt-1 transition-all ${isOverdue
                                                ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                                : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                                                }`}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            <span>{c.phone || "-"}</span>
                                        </div>
                                        {c.total_revenue > 0 && (
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                ฿{formatMoney(c.total_revenue)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${tier.color}`}
                                        >
                                            {tier.label}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[100px]">
                                            • {c.customer_stage}
                                        </span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* ---------- Details (Glassmorphism Styled) ---------- */}
            <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] relative">
                {/* Background Decor */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl" />
                    <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
                </div>

                {!selectedCustomer ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 relative z-10">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <User className="w-10 h-10" />
                        </div>
                        <p className="text-sm">เลือกลูกค้าเพื่อดูรายละเอียดแบบ 360°</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto px-8 py-8 space-y-6 relative z-10">
                        {/* 360 Card (Hero) */}
                        <div className="rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-xl dark:shadow-[0_0_40px_rgba(0,0,0,0.2)] p-8">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                                <div className="flex items-center gap-6">
                                    <div
                                        className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold border-2 shadow-lg ${getTier(
                                            selectedCustomer.total_revenue
                                        ).color
                                            .replace("text-", "border-")
                                            .replace(
                                                "bg-",
                                                "bg-white/90 dark:bg-slate-800 text-"
                                            )}`}
                                    >
                                        {selectedCustomer.name?.charAt(0) || <User />}
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white drop-shadow-sm">
                                            {selectedCustomer.name}
                                        </h1>
                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                            <span
                                                className={`text-xs px-2.5 py-1 rounded-full font-semibold border shadow-sm ${getTier(
                                                    selectedCustomer.total_revenue
                                                ).color}`}
                                            >
                                                {getTier(selectedCustomer.total_revenue).label}
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-700">
                                                |
                                            </span>
                                            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />{" "}
                                                {selectedCustomer.province || "ไม่ระบุจังหวัด"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left md:text-right bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 backdrop-blur-sm">
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold mb-1">
                                        ยอดซื้อสะสม
                                    </div>
                                    <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                                        ฿{formatMoney(selectedCustomer.total_revenue)}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 rounded-2xl bg-white/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        ทั้งหมด
                                    </div>
                                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                        {selectedCustomer.total_deals} ดีล
                                    </div>
                                </div>
                                <div className="text-center p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                                        สำเร็จ (Won)
                                    </div>
                                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                                        {selectedCustomer.won_deals}
                                    </div>
                                </div>
                                <div className="text-center p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 shadow-sm">
                                    <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                                        กำลังดำเนินการ
                                    </div>
                                    <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                                        {selectedCustomer.open_deals}
                                    </div>
                                </div>
                                <div className="text-center p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col items-center justify-center">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        สถานะ
                                    </div>
                                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        {selectedCustomer.customer_stage}
                                    </div>
                                </div>
                            </div>

                            {/* Insight Row */}
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>
                                        ดีลล่าสุด:{" "}
                                        {selectedCustomer.last_deal_activity
                                            ? formatDate(selectedCustomer.last_deal_activity)
                                            : "ยังไม่มีประวัติ"}
                                    </span>
                                </div>
                                <span className="text-slate-500/40">|</span>
                                <div
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] ${getFollowUp(
                                        selectedCustomer.follow_up_status
                                    ).color}`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    <span>
                                        Follow-up:{" "}
                                        {getFollowUp(selectedCustomer.follow_up_status).label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm p-6 space-y-4">
                                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    ข้อมูลติดต่อ
                                </h3>
                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">
                                            เบอร์โทรศัพท์
                                        </span>
                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                            {selectedCustomer.phone || "-"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">
                                            Line ID
                                        </span>
                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                            {selectedCustomer.line_id || "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm p-6 space-y-4">
                                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    ที่อยู่ & หมายเหตุ
                                </h3>
                                <div className="space-y-4 pt-2 text-sm">
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                                            ที่อยู่
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700/30 min-h-[50px]">
                                            {selectedCustomer.address || "-"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                                            หมายเหตุ
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-600 dark:text-slate-400 italic border border-slate-100 dark:border-slate-700/30">
                                            {selectedCustomer.note || "-"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* กิจกรรมล่าสุดของลูกค้า */}
                        <div className="rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 shadow-sm p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    กิจกรรมล่าสุดของลูกค้า
                                </h3>
                                <button
                                    onClick={() => {
                                        setEditingActivity(null);
                                        setActivityModalOpen(true);
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/30"
                                >
                                    + บันทึกกิจกรรม
                                </button>
                            </div>

                            {activitiesLoading ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    กำลังโหลดกิจกรรม...
                                </div>
                            ) : activityError ? (
                                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                                    {activityError}
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    ยังไม่มีการบันทึกกิจกรรมสำหรับลูกค้ารายนี้
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activities.map((a) => (
                                        <div
                                            key={a.id}
                                            className="flex items-start justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-xs"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                                                        {a.summary}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 text-[10px]">
                                                        {a.activity_type}
                                                    </span>
                                                    {a.channel && (
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px]">
                                                            {a.channel}
                                                        </span>
                                                    )}
                                                </div>
                                                {a.note && (
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-300">
                                                        {a.note}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-slate-400">
                                                    {new Date(a.activity_date).toLocaleString("th-TH", {
                                                        dateStyle: "medium",
                                                        timeStyle: "short",
                                                    })}
                                                    {a.deal_code && (
                                                        <span className="ml-2 text-slate-400">
                                                            • ดีล {a.deal_code}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setEditingActivity(a);
                                                    setActivityModalOpen(true);
                                                }}
                                                className="text-[10px] text-slate-400 hover:text-emerald-500"
                                            >
                                                แก้ไข
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {showNewCustomerModal && (
                <NewCustomerModal
                    onClose={() => setShowNewCustomerModal(false)}
                    onCreated={handleCustomerCreated}
                />
            )}

            {activityModalOpen && selectedCustomer && (
                <CustomerActivityModal
                    open={activityModalOpen}
                    customerId={selectedCustomer.id}
                    activity={editingActivity}
                    onClose={() => setActivityModalOpen(false)}
                    onSaved={() => {
                        if (selectedCustomer) {
                            loadActivities(selectedCustomer.id);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default CustomersMain;
