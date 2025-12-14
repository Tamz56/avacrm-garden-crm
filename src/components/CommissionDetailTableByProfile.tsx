import React from "react";
import { useProfileMonthlyCommissionDetails } from "../hooks/useProfileMonthlyCommissionDetails";

interface CommissionDetailTableByProfileProps {
    profileId: string;
}

const CommissionDetailTableByProfile: React.FC<CommissionDetailTableByProfileProps> = ({
    profileId,
}) => {
    const { rows, loading, error } = useProfileMonthlyCommissionDetails(profileId);

    if (loading) {
        return <div className="text-sm text-slate-500">กำลังโหลดข้อมูล...</div>;
    }

    if (error) {
        return <div className="text-sm text-rose-600">เกิดข้อผิดพลาด: {error}</div>;
    }

    if (rows.length === 0) {
        return (
            <div className="text-sm text-slate-500">
                ยังไม่มีการจ่ายค่าคอมมิชชั่นในเดือนนี้
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                            ดีล
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                            บทบาท
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">
                            ยอดดีล
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">
                            ค่าคอมฯ ทั้งหมด
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">
                            จ่ายในเดือนนี้
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">
                            จ่ายสะสม
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">
                            คงเหลือ
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-slate-500">
                            สถานะ
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-slate-500">
                            วันที่จ่ายล่าสุด
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row) => (
                        <tr key={row.deal_commission_id}>
                            <td className="px-3 py-2 text-sm">{row.deal_title || "ไม่มีชื่อดีล"}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">{row.role}</td>
                            <td className="px-3 py-2 text-right">
                                {row.deal_amount.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                                {row.commission_amount.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-emerald-700">
                                {row.paid_in_month.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                                {row.total_paid.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                                {row.remaining_amount.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-center">
                                <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${row.status === "PAID"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : row.status === "PARTIAL"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-slate-100 text-slate-600"
                                        }`}
                                >
                                    {row.status}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-slate-500">
                                {row.last_pay_date || "-"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CommissionDetailTableByProfile;
