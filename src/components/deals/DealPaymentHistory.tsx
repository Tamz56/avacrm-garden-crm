import React, { useState, useRef, useEffect } from "react";
import { DealPayment } from "../../types/types";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

type DealPaymentHistoryProps = {
    payments: DealPayment[];
    onEditPayment?: (payment: DealPayment) => void;
    onDeletePayment?: (payment: DealPayment) => void;
};

const formatDate = (iso?: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
};

const formatMoney = (value: number) =>
    (value ?? 0).toLocaleString("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

const ActionMenu = ({
    payment,
    onEdit,
    onDelete,
}: {
    payment: DealPayment;
    onEdit?: (p: DealPayment) => void;
    onDelete?: (p: DealPayment) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 z-10 overflow-hidden">
                    <button
                        onClick={() => {
                            onEdit?.(payment);
                            setIsOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-200"
                    >
                        <Pencil className="w-3 h-3" /> แก้ไข
                    </button>
                    <button
                        onClick={() => {
                            onDelete?.(payment);
                            setIsOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                        <Trash2 className="w-3 h-3" /> ลบ
                    </button>
                </div>
            )}
        </div>
    );
};

const DealPaymentHistory: React.FC<DealPaymentHistoryProps> = ({
    payments,
    onEditPayment,
    onDeletePayment,
}) => {
    const hasData = payments && payments.length > 0;

    return (
        <div
            className="p-6 rounded-2xl border shadow-sm
      bg-white border-gray-200
      dark:bg-slate-800 dark:border-slate-700"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                    <span>📜</span> ประวัติการชำระเงิน
                </h3>
                {hasData && (
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                        ทั้งหมด {payments.length} รายการ
                    </span>
                )}
            </div>

            {!hasData ? (
                <p className="text-sm text-gray-400 dark:text-slate-500">
                    ยังไม่มีการบันทึกการชำระเงินสำหรับดีลนี้
                </p>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700/60">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700/60 text-gray-500 dark:text-slate-300">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-xs">วันที่ชำระ</th>
                                <th className="px-4 py-2 text-left font-medium text-xs">ประเภท</th>
                                <th className="px-4 py-2 text-left font-medium text-xs">ช่องทาง</th>
                                <th className="px-4 py-2 text-right font-medium text-xs">จำนวนเงิน</th>
                                <th className="px-4 py-2 text-left font-medium text-xs">หมายเหตุ</th>
                                <th className="px-4 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {payments.map((p) => {
                                const isDeposit = p.paymentType === "deposit";

                                return (
                                    <tr
                                        key={p.id}
                                        className="bg-white dark:bg-slate-800/60 hover:bg-gray-50/80 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <td className="px-4 py-2 text-xs text-gray-700 dark:text-slate-200 whitespace-nowrap">
                                            {formatDate(p.paymentDate)}
                                        </td>
                                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                                            <span
                                                className={
                                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold " +
                                                    (isDeposit
                                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                                                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300")
                                                }
                                            >
                                                {isDeposit ? "มัดจำ" : "ชำระปกติ"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                            {p.method || "-"}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-right font-mono text-gray-800 dark:text-slate-100">
                                            {formatMoney(p.amount)}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-500 dark:text-slate-400">
                                            {p.note || "-"}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <ActionMenu
                                                payment={p}
                                                onEdit={onEditPayment}
                                                onDelete={onDeletePayment}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DealPaymentHistory;
