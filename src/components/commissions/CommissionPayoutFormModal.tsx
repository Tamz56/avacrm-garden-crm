import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import type { DealCommissionRow } from "../../types/commission";

interface CommissionPayoutFormModalProps {
    commission: DealCommissionRow;
    onClose: () => void;
    onSuccess?: () => void;
}

export const CommissionPayoutFormModal: React.FC<
    CommissionPayoutFormModalProps
> = ({ commission, onClose, onSuccess }) => {
    const [amount, setAmount] = useState<number>(
        commission.remaining_amount > 0 ? commission.remaining_amount : commission.commission_amount
    );
    const [method, setMethod] = useState<"transfer" | "cash" | "salary" | "other">(
        "transfer"
    );
    const [note, setNote] = useState("");
    const [payDate, setPayDate] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.from("commission_payouts").insert({
            deal_commission_id: commission.deal_commission_id,
            amount,
            method,
            note,
            pay_date: payDate,
        });

        setLoading(false);

        if (error) {
            console.error("insert commission_payout error", error);
            setError(error.message);
            return;
        }

        if (onSuccess) onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
                <h2 className="mb-3 text-base font-semibold">
                    จ่ายค่าคอมฯ ให้ {commission.profile_name}
                </h2>

                <div className="mb-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                    <div>บทบาท: {commission.role}</div>
                    <div>ยอดคอมฯ ทั้งหมด: {commission.commission_amount.toLocaleString()} บาท</div>
                    <div>จ่ายแล้ว: {commission.paid_amount.toLocaleString()} บาท</div>
                    <div>คงเหลือ: {commission.remaining_amount.toLocaleString()} บาท</div>
                    <div>สถานะปัจจุบัน: {commission.status}</div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                    <div>
                        <label className="block text-xs text-slate-600">
                            วันที่จ่าย
                        </label>
                        <input
                            type="date"
                            value={payDate}
                            onChange={(e) => setPayDate(e.target.value)}
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-600">
                            จำนวนเงิน (บาท)
                        </label>
                        <input
                            type="number"
                            min={0}
                            step={100}
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        />
                        <p className="mt-1 text-[11px] text-slate-500">
                            แนะนำให้ใส่ไม่เกินยอดคงเหลือ {commission.remaining_amount.toLocaleString()} บาท
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-600">
                            วิธีจ่าย
                        </label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value as any)}
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        >
                            <option value="transfer">โอน</option>
                            <option value="cash">เงินสด</option>
                            <option value="salary">รวมกับเงินเดือน</option>
                            <option value="other">อื่น ๆ</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-600">
                            หมายเหตุ
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            rows={2}
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-rose-600">{error}</p>
                    )}

                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded border border-slate-200 px-3 py-1 text-xs"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                        >
                            {loading ? "กำลังบันทึก…" : "บันทึกการจ่าย"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
