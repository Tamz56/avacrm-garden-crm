// src/components/deals/DealList.tsx
import * as React from "react";

// --- Types ---
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type DealStage = "inquiry" | "quotation" | "payment" | "delivery" | "completed" | "won" | "lost";

export type DealListItemData = {
    id: string;
    title: string;
    customerName: string;
    lastActivityLabel: string;
    amount: number;
    paymentStatus: PaymentStatus;
    shipping?: { shipped: number; total: number } | null;
    stage: DealStage;
};

export type DealListProps = {
    items: DealListItemData[];
    activeId: string | null;
    onSelect: (id: string) => void;
};

// --- Main Component ---
export const DealList: React.FC<DealListProps> = ({ items, activeId, onSelect }) => {
    const [search, setSearch] = React.useState("");

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (item) =>
                item.title.toLowerCase().includes(q) ||
                item.customerName.toLowerCase().includes(q)
        );
    }, [items, search]);

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-slate-900/50">

            {/*  Search Box */}
            <div className="flex-none px-3 pt-3 pb-2">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหาดีล..."
                        className="block w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border-none shadow-sm
              bg-white text-gray-700 placeholder-gray-400
              focus:ring-2 focus:ring-emerald-500/20
              dark:bg-slate-800 dark:text-gray-200 dark:placeholder-slate-500 transition-all"
                    />
                </div>
            </div>

            {/* 📋 List Items Container */}
            <div className="flex-1 px-2 pb-3 overflow-y-auto space-y-2 custom-scrollbar">
                {filtered.length === 0 && (
                    <div className="px-2 py-8 text-center flex flex-col items-center opacity-60">
                        <div className="text-3xl mb-2">🔍</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                            ไม่พบข้อมูล
                        </div>
                    </div>
                )}

                {filtered.map((item) => {
                    const amountLabel = item.amount > 0
                        ? (item.amount >= 100000 ? `${Math.round(item.amount / 1000)}k` : `฿${item.amount.toLocaleString()}`)
                        : "-";

                    const paymentLabel = item.paymentStatus === 'paid' ? 'ชำระแล้ว' : item.paymentStatus === 'partial' ? 'บางส่วน' : 'รอชำระ';

                    return (
                        <DealListItem
                            key={item.id}
                            id={item.id}
                            title={item.title}
                            customerName={item.customerName}
                            amountText={amountLabel}
                            metaText={item.lastActivityLabel}
                            statusLabel={paymentLabel}
                            isActive={item.id === activeId}
                            onClick={() => onSelect(item.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

// --- Single Card Item ---
type DealListItemProps = {
    id: string;
    title: string;
    customerName: string;
    amountText: string;
    metaText?: string;
    statusLabel?: string;
    isActive: boolean;
    onClick?: () => void;
};

const DealListItem: React.FC<DealListItemProps> = ({
    title,
    customerName,
    amountText,
    metaText,
    statusLabel,
    isActive,
    onClick,
}) => {
    return (
        <div
            onClick={onClick}
            className={`
        relative p-4 mb-3 rounded-xl cursor-pointer transition-all duration-300 border-l-[4px] group
        bg-white hover:bg-gray-50
        dark:bg-slate-800 dark:hover:bg-slate-700/80
        ${isActive
                    ? "border-emerald-500 shadow-md shadow-emerald-500/10 dark:bg-slate-800"
                    : "border-transparent hover:border-gray-300 dark:hover:border-slate-600"}
      `}
        >
            {/* glow เบาๆ เฉพาะตอน active */}
            {isActive && (
                <div className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10 pointer-events-none rounded-xl animate-pulse-slow" />
            )}

            <div className="relative z-10">
                {/* Title + Amount */}
                <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate pr-2">
                        {title}
                    </h4>
                    <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {amountText}
                    </span>
                </div>

                {/* Customer + Meta */}
                <div className="flex items-center gap-2 mb-2 text-[11px] text-gray-500 dark:text-slate-400">
                    <span className="truncate max-w-[120px]">👤 {customerName}</span>
                    {metaText && (
                        <>
                            <span className="text-gray-300 dark:text-slate-600">•</span>
                            <span className="truncate">{metaText}</span>
                        </>
                    )}
                </div>

                {/* Status & Shipping mini-info (ตัวอย่างเบาๆ) */}
                <div className="flex items-center justify-between mt-1">
                    {statusLabel && (
                        <span className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
              ${statusLabel === "ชำระแล้ว"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                : statusLabel === "บางส่วน"
                                    ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                                    : "bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400"}
            `}>
                            {statusLabel === "ชำระแล้ว" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            {statusLabel}
                        </span>
                    )}

                    {/* slot ไว้ลงข้อมูลส่งของภายหลัง เช่น 5/20 ส่งแล้ว */}
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
                        <span className="text-gray-400">จัดส่ง</span>
                        <span>0/0</span>
                    </div>
                </div>
            </div>
        </div>
    );
};