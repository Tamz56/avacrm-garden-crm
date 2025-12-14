import React, { useState } from "react";
import { BadgeDollarSign } from "lucide-react";
import type { CommissionDetailRow } from "../types/commission";
import CommissionPayoutModal from "./CommissionPayoutModal";

interface CommissionDetailTableProps {
    rows: CommissionDetailRow[];
    isLoading?: boolean;
    currentProfileId: string;
    onRefetch?: () => void; // ให้ parent ใช้ trigger reload จาก RPC get_commission_v4
}

const CommissionDetailTable: React.FC<CommissionDetailTableProps> = ({
    rows,
    isLoading = false,
    currentProfileId,
    onRefetch,
}) => {
    const [selected, setSelected] = useState<CommissionDetailRow | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const openPayout = (row: CommissionDetailRow) => {
        setSelected(row);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelected(null);
    };

    const handleSuccess = () => {
        if (onRefetch) onRefetch();
    };

    return (
        <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                                ดีล
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                                มูลค่าดีล
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                                ค่าคอมฯ รวม
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                                ชำระสะสม
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                                คงเหลือ
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                                สถานะ
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                                การจ่าย
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-6 text-center text-xs text-gray-500"
                                >
                                    กำลังโหลดข้อมูล...
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-6 text-center text-xs text-gray-500"
                                >
                                    ยังไม่มีข้อมูลค่าคอมมิชชั่นในเดือนนี้
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const fullyPaid = row.remaining_amount <= 0;
                                return (
                                    <tr key={row.deal_commission_id}>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">
                                                {row.deal_title}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                บทบาท: {row.role}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {row.deal_amount.toLocaleString(undefined, {
                                                maximumFractionDigits: 0,
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {row.commission_amount.toLocaleString(undefined, {
                                                maximumFractionDigits: 0,
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {row.total_paid.toLocaleString(undefined, {
                                                maximumFractionDigits: 0,
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span
                                                className={
                                                    row.remaining_amount > 0
                                                        ? "font-semibold text-emerald-700"
                                                        : "text-gray-700"
                                                }
                                            >
                                                {row.remaining_amount.toLocaleString(undefined, {
                                                    maximumFractionDigits: 0,
                                                })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {fullyPaid ? (
                                                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                                    จ่ายครบแล้ว
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                                    ค้างจ่าย
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {fullyPaid ? (
                                                <span className="text-xs text-gray-400">
                                                    -
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => openPayout(row)}
                                                    className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                                >
                                                    <BadgeDollarSign className="mr-1 h-3 w-3" />
                                                    จ่ายคอมฯ
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal จ่ายคอมฯ */}
            <CommissionPayoutModal
                open={modalOpen}
                onClose={closeModal}
                commission={selected}
                currentProfileId={currentProfileId}
                onSuccess={handleSuccess}
            />
        </>
    );
};

export default CommissionDetailTable;
