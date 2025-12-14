import React from "react";
import { Deal, DealItem, DealShipment, DealPayment } from "../../types/types";
import { DealStatusPipeline } from "./DealStatusPipeline";
import { SoftScannerCard } from "./SoftScannerCard";
import { DealFinanceSummary } from "./DealFinanceSummary";

import DealPaymentHistory from "./DealPaymentHistory";
import { useDealActivities } from "../../hooks/useDealActivities";
import { CustomerActivityModal } from "../customers/CustomerActivityModal";
import { Clock } from "lucide-react";
import { useState } from "react";

// Define local types for props
export type DealItemRow = DealItem & {
    imageUrl?: string;
    subText?: string;
    gradeLabel?: string;
    stockStatus?: string;
};

export type ShippingStep = {
    id: string;
    label: string;
    date?: string;
    state: "pending" | "current" | "done";
    timeLabel?: string;
};

export type DealDetailLayoutProps = {
    deal: Deal;
    summary: {
        totalAmount: number;
        paidAmount: number;
        outstandingAmount: number;
    };
    depositInfo?: {
        required: number;
        paid: number;
        status: "not_required" | "pending" | "partial" | "completed";
    };
    items: DealItemRow[];
    tagProgress: { scanned: number; total: number };
    shippingTimeline: ShippingStep[];
    shipments?: DealShipment[];
    customerInfo: {
        name: string;
        phone?: string;
        address?: string;
    };
    internalNote?: string;
    onRecordPayment?: () => void;
    onOpenScanner?: () => void;
    onEditDeal?: () => void;
    onPrintQuote?: () => void;
    onAddShipment?: () => void;
    onEditShipment?: (shipmentId: string) => void;
    payments?: DealPayment[];
    onEditPayment?: (payment: DealPayment) => void;
    onDeletePayment?: (payment: DealPayment) => void;
};

const getStageStatusText = (stage: string) => {
    const s = stage.toLowerCase();
    if (s === "inquiry" || s === "quotation" || s === "quote") {
        return "กำลังเสนอราคาให้ลูกค้า";
    }
    if (s === "won" || s === "paid" || s === "payment") {
        return "ชำระเงินเรียบร้อย กำลังเตรียมจัดส่ง";
    }
    if (s === "delivery" || s === "shipping") {
        return "อยู่ระหว่างจัดส่งต้นไม้";
    }
    if (s === "completed" || s === "closed" || s === "done") {
        return "ดีลจบแล้ว 🎉";
    }
    return "กำลังดำเนินการ";
};

const DealDetailLayout: React.FC<DealDetailLayoutProps> = ({
    deal,
    summary,
    depositInfo = { required: 0, paid: 0, status: "not_required" },
    items,
    tagProgress,
    shippingTimeline,
    shipments,
    customerInfo,
    internalNote,
    onRecordPayment,
    onOpenScanner,
    onEditDeal,
    onPrintQuote,
    onAddShipment,
    onEditShipment,
    payments = [],
    onEditPayment,
    onDeletePayment,
}) => {
    const stageLabel = deal.stage === "won" ? "Won" : deal.stage;
    const stageColor =
        deal.stage === "won"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
            : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-600/20 dark:text-slate-300 dark:border-slate-500/30";

    const safeItems = items ?? [];
    const itemsCount = safeItems.length;
    const safeShipping = shippingTimeline ?? [];
    const shippingDone = safeShipping.filter((s) => s.state === "done").length;

    // Activity Hook
    const { rows: activities, loading: actLoading, reload: reloadActivities } = useDealActivities(deal.id);
    const [showActivityModal, setShowActivityModal] = useState(false);

    // Pipeline Steps Configuration
    const PIPELINE_STEPS_CONFIG = [
        { id: "inquiry", label: "Inquiry" },
        { id: "quotation", label: "Quotation" },
        { id: "payment", label: "Payment" },
        { id: "delivery", label: "Delivery" },
        { id: "done", label: "Done" },
    ];

    const stageToIndex: Record<string, number> = {
        inquiry: 0,
        quotation: 1,
        quote: 1,
        won: 2,
        paid: 2,
        payment: 2,
        delivery: 3,
        shipping: 3,
        done: 4,
        completed: 4,
        closed: 4,
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
            {/* ZONE A: HEADER */}
            <header className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                {/* 🔥 Minimal Pipeline ด้านบนสุด */}
                <DealStatusPipeline
                    title="สถานะดีล"
                    rightStatusText={getStageStatusText(deal.stage || "")}
                    steps={PIPELINE_STEPS_CONFIG.map((step, index) => {
                        const currentIndex = stageToIndex[(deal.stage || "").toLowerCase()] ?? 0;
                        const status =
                            index < currentIndex
                                ? "completed"
                                : index === currentIndex
                                    ? "current"
                                    : "waiting";

                        // ตัวอย่าง tooltip text แบบง่าย (คุณจะไปดึงวันที่จริงจาก DB ก็ได้)
                        let tooltip: string = step.label;
                        switch (step.id) {
                            case "inquiry":
                                tooltip = "เริ่มดีล / เก็บข้อมูลลูกค้า";
                                break;
                            case "quotation":
                                tooltip = "ออกใบเสนอราคาให้ลูกค้า";
                                break;
                            case "payment":
                                tooltip =
                                    summary.paidAmount > 0
                                        ? `ชำระแล้ว ฿${summary.paidAmount.toLocaleString()}`
                                        : "รอชำระเงิน";
                                break;
                            case "delivery":
                                tooltip =
                                    shippingTimeline?.some((s) => s.state === "done")
                                        ? "มีการจัดส่งแล้ว"
                                        : "ยังไม่ได้จัดส่ง";
                                break;
                            case "done":
                                tooltip =
                                    (deal.stage || "").toLowerCase() === "completed" ||
                                        (deal.stage || "").toLowerCase() === "closed"
                                        ? "ดีลเสร็จสมบูรณ์"
                                        : "รอปิดดีล";
                                break;
                        }

                        return {
                            ...step,
                            status: status as any,
                            tooltip,
                        };
                    })}
                />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mt-2">
                    {/* Left: Title & ID */}
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {deal.deal_code ? `${deal.quantity}ต้น` : deal.title}
                            </h1>
                            <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${stageColor}`}
                            >
                                {stageLabel}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                            <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-slate-300">
                                #{deal.deal_code || "DEAL-XXXX"}
                            </span>
                            <span>•</span>
                            <span>ลูกค้า {customerInfo.name}</span>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onEditDeal}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border shadow-sm transition-all active:scale-95 flex items-center gap-1.5
                bg-white border-gray-300 text-gray-700 hover:bg-gray-50
                dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            ✏️ แก้ไข
                        </button>
                        <button
                            type="button"
                            onClick={onPrintQuote}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border shadow-sm transition-all active:scale-95 flex items-center gap-1.5
                bg-white border-gray-300 text-gray-700 hover:bg-gray-50
                dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            🖨️ ใบเสนอราคา
                        </button>
                        <button
                            type="button"
                            onClick={onRecordPayment}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg text-white shadow-md transition-all active:scale-95
                bg-emerald-600 hover:bg-emerald-700
                dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        >
                            บันทึกการชำระเงิน
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                    {/* Total */}
                    <div className="p-3 rounded-xl border flex items-center justify-between
            bg-emerald-50/50 border-emerald-100
            dark:bg-emerald-900/10 dark:border-emerald-500/20">
                        <div>
                            <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                มูลค่าดีลสุทธิ
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                                ฿{summary.totalAmount.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            💰
                        </div>
                    </div>

                    {/* Paid */}
                    <div className="p-3 rounded-xl border flex items-center justify-between
            bg-white border-gray-200
            dark:bg-slate-800 dark:border-slate-700">
                        <div>
                            <p className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                                ชำระแล้ว
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                                ฿{summary.paidAmount.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            💳
                        </div>
                    </div>

                    {/* Outstanding */}
                    <div className="p-3 rounded-xl border flex items-center justify-between
            bg-white border-gray-200
            dark:bg-slate-800 dark:border-slate-700">
                        <div>
                            <p className="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                                คงเหลือที่ต้องเก็บ
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                                ฿{summary.outstandingAmount.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
                            ⏳
                        </div>
                    </div>

                </div>
            </header>

            {/* MAIN GRID */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="grid grid-cols-12 gap-8">
                    {/* ZONE B: Paperwork */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        {/* Finance Summary */}
                        <DealFinanceSummary summary={summary} depositInfo={depositInfo} />

                        {/* Payment History */}
                        <DealPaymentHistory
                            payments={payments}
                            onEditPayment={onEditPayment}
                            onDeletePayment={onDeletePayment}
                        />

                        {/* Customer info */}
                        <div className="p-6 rounded-2xl border shadow-sm
              bg-white border-gray-200
              dark:bg-slate-800 dark:border-slate-700">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <span>👤</span> ข้อมูลลูกค้า & การจัดส่ง
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-400">
                                        ชื่อลูกค้า
                                    </label>
                                    <div className="font-medium text-gray-900 dark:text-gray-200">
                                        {customerInfo.name}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-slate-400">
                                        เบอร์โทรศัพท์
                                    </label>
                                    <div className="font-medium text-gray-900 dark:text-gray-200">
                                        {customerInfo.phone || "-"}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-gray-500 dark:text-slate-400">
                                        ที่อยู่จัดส่ง / สถานที่ปลูก
                                    </label>
                                    <div className="font-medium text-gray-900 dark:text-gray-200">
                                        {customerInfo.address || "-"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items table (Breathable Table) */}
                        <div className="rounded-2xl border overflow-hidden shadow-sm
              bg-white border-gray-200
              dark:bg-slate-800 dark:border-slate-700">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 dark:text-white">
                                    รายการสินค้า (Items)
                                </h3>
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                    ทั้งหมด {itemsCount} รายการ
                                </span>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">รายละเอียดสินค้า</th>
                                        <th className="px-6 py-3 font-medium text-center">จำนวน</th>
                                        <th className="px-6 py-3 font-medium text-right">ราคา/หน่วย</th>
                                        <th className="px-6 py-3 font-medium text-right">รวม</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {safeItems.map((item) => {
                                        const total = item.quantity * item.unitPrice;
                                        return (
                                            <tr
                                                key={item.id}
                                                className="group transition-colors border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/50"
                                            >
                                                {/* Product */}
                                                <td className="pl-6 pr-6 py-5">
                                                    <div className="flex items-start gap-4">
                                                        {item.imageUrl ? (
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-slate-600 relative">
                                                                <img
                                                                    src={item.imageUrl}
                                                                    alt={item.description}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                {item.gradeLabel && (
                                                                    <div className="absolute bottom-0 right-0 bg-emerald-500 text-white text-[8px] px-1 font-bold rounded-tl-md">
                                                                        {item.gradeLabel}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-lg overflow-hidden shrink-0">
                                                                🌳
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                                                {item.description}
                                                            </div>
                                                            {item.subText && (
                                                                <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 font-light">
                                                                    {item.subText}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Qty */}
                                                <td className="px-6 py-5 text-center align-middle">
                                                    <span className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                                                        {item.quantity}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 ml-1 font-light">ต้น</span>
                                                </td>

                                                {/* Unit price */}
                                                <td className="px-6 py-5 text-right align-middle">
                                                    <span className="text-sm text-gray-500 dark:text-slate-500 font-light font-mono">
                                                        {item.unitPrice.toLocaleString()}
                                                    </span>
                                                </td>

                                                {/* Total */}
                                                <td className="pl-6 pr-6 py-5 text-right align-middle">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                                                        {total.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Shipments Rows */}
                                    {shipments?.map((s) => {
                                        const cost = s.actual_cost ?? s.estimated_cost ?? 0;
                                        return (
                                            <tr key={s.id} className="group transition-colors border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                                <td className="pl-6 pr-6 py-5">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-lg overflow-hidden shrink-0 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                                                            🚚
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                                                {s.method || "ขนส่ง"}
                                                            </div>
                                                            <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 font-light">
                                                                {s.date ? new Date(s.date).toLocaleDateString('th-TH') : "-"} • {s.distance_km ?? 0} กม.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center align-middle">
                                                    <span className="text-sm text-gray-600 dark:text-slate-400 font-medium">1</span>
                                                    <span className="text-[10px] text-gray-400 ml-1 font-light">เที่ยว</span>
                                                </td>
                                                <td className="px-6 py-5 text-right align-middle">
                                                    <span className="text-sm text-gray-500 dark:text-slate-500 font-light font-mono">
                                                        {cost.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="pl-6 pr-6 py-5 text-right align-middle">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                                                        {cost.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    <tr className="bg-gray-50/50 dark:bg-slate-800/50">
                                        <td colSpan={3} className="px-6 py-4 text-right font-bold text-gray-700 dark:text-slate-300">
                                            ยอดรวมทั้งสิ้น <span className="text-xs font-normal text-gray-400 dark:text-slate-500">(ตามยอดดีลสุทธิ)</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                {summary.totalAmount.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ZONE C: Operations */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        {/* Soft Scanner Card */}
                        <SoftScannerCard
                            scannedCount={tagProgress.scanned}
                            totalCount={tagProgress.total}
                            onOpenScanner={onOpenScanner}
                        />

                        {/* Shipping status */}
                        <div className="p-5 rounded-2xl border shadow-sm
              bg-white border-gray-200
              dark:bg-slate-800 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-gray-800 dark:text-white text-sm">
                                    🚚 สถานะการจัดส่ง ({shippingDone}/{safeShipping.length})
                                </h4>
                                {onAddShipment && (
                                    <button
                                        type="button"
                                        onClick={onAddShipment}
                                        disabled={depositInfo.status !== "completed" && depositInfo.status !== "not_required"}
                                        className={`text-xs px-3 py-1 rounded-full transition-colors ${depositInfo.status === "completed" || depositInfo.status === "not_required"
                                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"
                                            : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700/40 dark:text-slate-500"
                                            }`}
                                        title={
                                            depositInfo.status === "completed" || depositInfo.status === "not_required"
                                                ? "เพิ่มการขนส่ง"
                                                : "ต้องชำระมัดจำครบก่อนจึงจะเพิ่มการขนส่งได้"
                                        }
                                    >
                                        + เพิ่มการขนส่ง
                                    </button>
                                )}
                            </div>

                            <div className="relative pl-4 border-l-2 border-gray-200 dark:border-slate-600 space-y-6">
                                {safeShipping.map((step) => (
                                    <div className="relative" key={step.id}>
                                        <div
                                            className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-800 ${step.state === "done"
                                                ? "bg-emerald-500"
                                                : "bg-gray-300 dark:bg-slate-600"
                                                }`}
                                        />
                                        {step.timeLabel && (
                                            <p className="text-xs text-gray-500 dark:text-slate-500">
                                                {step.timeLabel}
                                            </p>
                                        )}
                                        <p
                                            className={`text-sm ${step.state === "done"
                                                ? "font-medium text-gray-800 dark:text-white"
                                                : "text-gray-400 dark:text-slate-500"
                                                }`}
                                        >
                                            {step.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Internal note */}
                        {internalNote && (
                            <div className="p-5 rounded-2xl border shadow-sm
                bg-yellow-50 border-yellow-100
                dark:bg-yellow-900/10 dark:border-yellow-700/30">
                                <h4 className="font-bold text-yellow-800 dark:text-yellow-500 mb-2 text-sm">
                                    📝 หมายเหตุทีมขาย
                                </h4>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400/80">
                                    {internalNote}
                                </p>
                            </div>
                        )}

                        {/* Activity Timeline */}
                        <div className="p-5 rounded-2xl border shadow-sm bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-500" />
                                    กิจกรรมกับลูกค้าสำหรับดีลนี้
                                </h3>
                                <button
                                    onClick={() => setShowActivityModal(true)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    + บันทึกกิจกรรม
                                </button>
                            </div>

                            <div className="text-sm">
                                {actLoading ? (
                                    <div className="text-slate-400 text-xs">กำลังโหลดกิจกรรม...</div>
                                ) : activities.length === 0 ? (
                                    <div className="text-slate-400 text-xs">ยังไม่มีกิจกรรมสำหรับดีลนี้</div>
                                ) : (
                                    <ul className="space-y-3">
                                        {activities.map((a) => (
                                            <li key={a.id} className="flex gap-3">
                                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div className="font-medium text-slate-700 dark:text-slate-200 text-xs">
                                                            {a.summary}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                            <div className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                                {new Date(a.activity_date).toLocaleString("th-TH", {
                                                                    day: "numeric",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        <span className="capitalize">{a.activity_type}</span> • <span className="capitalize">{a.channel}</span> •{" "}
                                                        {a.customer_name || "ไม่ระบุชื่อลูกค้า"}
                                                    </div>
                                                    {a.note && (
                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                                                            {a.note}
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Activity Modal */}
            <CustomerActivityModal
                open={showActivityModal}
                customerId={deal.customer_id || ""}
                activity={null} // Create mode
                onClose={() => setShowActivityModal(false)}
                onSaved={reloadActivities}
            />
        </div>
    );
};

export default DealDetailLayout;
