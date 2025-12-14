import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { payCommissionApi } from "../lib/commissionApi";
import type { CommissionDetailRow } from "../types/commission";

interface CommissionPayoutModalProps {
    open: boolean;
    onClose: () => void;
    commission: CommissionDetailRow | null;
    currentProfileId: string;
    onSuccess?: () => void; // ให้ parent ใช้ reload ข้อมูลได้
}

const todayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const payMethods = [
    { id: "transfer", label: "โอน" },
    { id: "cash", label: "เงินสด" },
    { id: "other", label: "อื่น ๆ" },
];

const CommissionPayoutModal: React.FC<CommissionPayoutModalProps> = ({
    open,
    onClose,
    commission,
    currentProfileId,
    onSuccess,
}) => {
    const [amount, setAmount] = useState<number>(0);
    const [payDate, setPayDate] = useState<string>(todayStr());
    const [method, setMethod] = useState<string>("transfer");
    const [note, setNote] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const remaining = useMemo(
        () => commission?.remaining_amount ?? 0,
        [commission]
    );

    // reset state ทุกครั้งที่เปิดด้วยแถวใหม่
    useEffect(() => {
        if (open && commission) {
            setAmount(commission.remaining_amount > 0 ? commission.remaining_amount : 0);
            setPayDate(todayStr());
            setMethod("transfer");
            setNote("");
            setError(null);
        }
    }, [open, commission]);

    if (!open || !commission) return null;

    const handleSubmit = async () => {
        setError(null);

        if (!amount || amount <= 0) {
            setError("กรุณากรอกจำนวนเงินที่ต้องการจ่าย");
            return;
        }

        if (remaining > 0 && amount > remaining) {
            setError(`จำนวนเงินห้ามเกินยอดคงเหลือ (${remaining.toLocaleString()} บาท)`);
            return;
        }

        try {
            setIsSubmitting(true);

            await payCommissionApi({
                commissionId: commission.deal_commission_id,
                amount,
                paidAt: payDate,
                method,
                note,
                currentProfileId,
            });

            if (onSuccess) onSuccess();
            onClose();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "เกิดข้อผิดพลาดขณะบันทึกการจ่าย");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">บันทึกการจ่ายค่าคอมมิชชั่น</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* ข้อมูลดีลสั้น ๆ */}
                <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm">
                    <div className="font-medium">{commission.deal_title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span>บทบาท: {commission.role}</span>
                        <span>
                            มูลค่าดีล:{" "}
                            {commission.deal_amount.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                            })}{" "}
                            บาท
                        </span>
                        <span>
                            ค่าคอมฯ รวม:{" "}
                            {commission.commission_amount.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                            })}{" "}
                            บาท
                        </span>
                        <span>
                            ชำระสะสม:{" "}
                            {commission.total_paid.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                            })}{" "}
                            บาท
                        </span>
                        <span className="font-semibold text-emerald-700">
                            คงเหลือ:{" "}
                            {commission.remaining_amount.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                            })}{" "}
                            บาท
                        </span>
                    </div>
                </div>

                {/* ฟอร์มจ่ายเงิน */}
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium">จำนวนเงิน (บาท)</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value || 0))}
                            min={0}
                            step={100}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            แนะนำให้จ่ายไม่เกินยอดคงเหลือ{" "}
                            {remaining.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                            })}{" "}
                            บาท
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="mb-1 block text-sm font-medium">
                                วันที่จ่าย
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="mb-1 block text-sm font-medium">
                                วิธีการจ่าย
                            </label>
                            <select
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                            >
                                {payMethods.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">หมายเหตุ</label>
                        <textarea
                            className="h-20 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="เช่น จ่ายงวดแรก, ปรับยอด, ฯลฯ"
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {isSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        บันทึกการจ่าย
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommissionPayoutModal;
