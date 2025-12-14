import React, { useState, useMemo } from "react";
import { supabase } from "../../supabaseClient.ts";
import { Download, Calendar } from "lucide-react";
import { useMonthlyPayoutSummary } from "../../hooks/useMonthlyPayoutSummary.ts";

const formatBaht = (v) =>
    `฿${(v || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;

const monthToFirstDay = (monthStr) => `${monthStr}-01`;

const CommissionPayoutReport = () => {
    // Default to current month 'YYYY-MM'
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    });

    const firstDayStr = monthToFirstDay(selectedMonth);

    const {
        data: rows,
        loading,
        error,
        totalDue,
        totalPaid,
        totalRemaining,
        refetch
    } = useMonthlyPayoutSummary(firstDayStr);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [payAmount, setPayAmount] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleOpenModal = (row) => {
        setSelectedRow(row);
        setPayAmount(row.remaining_in_month); // Default to remaining
        setNote("");
        setShowModal(true);
    };

    const handleSavePayment = async () => {
        if (!selectedRow) return;
        setSubmitting(true);

        try {
            const { error } = await supabase.rpc('set_commission_payment', {
                p_profile_id: selectedRow.profile_id,
                p_month: selectedRow.month, // This comes from the view, which is 'YYYY-MM-01'
                p_total_commission: selectedRow.due_in_month,
                p_pay_amount: Number(payAmount),
                p_status: null,
                p_note: note || null,
            });

            if (error) throw error;

            alert("บันทึกการจ่ายเรียบร้อยแล้ว");
            setShowModal(false);
            refetch(); // Reload data via hook
        } catch (err) {
            console.error("Payment error:", err);
            alert(`เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const buildStatus = (row) => {
        if (row.remaining_in_month <= 0) return "Paid";
        if (row.paid_in_month > 0) return "Partial";
        return "Due";
    };

    const handleExportCsv = async () => {
        const monthDate = monthToFirstDay(selectedMonth);

        const { data, error } = await supabase
            .from("v_commission_payout_summary_month")
            .select("month, profile_id, full_name, due_in_month, paid_in_month, remaining_in_month")
            .eq("month", monthDate)
            .order("full_name", { ascending: true });

        if (error) {
            console.error("exportMonthlyPayoutCsv error", error);
            alert("ไม่สามารถดึงข้อมูลสำหรับ Export CSV ได้");
            return;
        }

        const rows = data || [];

        const header = [
            "month",
            "profile_id",
            "sales_name",
            "commission_due",
            "commission_paid",
            "commission_remaining",
            "status",
        ];

        const csvLines = [
            header.join(","), // header row
            ...rows.map((row) => {
                const monthLabel = new Date(row.month).toISOString().slice(0, 7); // '2025-11'
                const status = buildStatus(row);

                return [
                    monthLabel,
                    row.profile_id,
                    (row.full_name ?? "").replace(/,/g, " "), // กัน comma ในชื่อ
                    (row.due_in_month || 0).toFixed(2),
                    (row.paid_in_month || 0).toFixed(2),
                    (row.remaining_in_month || 0).toFixed(2),
                    status,
                ].join(",");
            }),
        ];

        const csvContent = csvLines.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
            "download",
            `payout-summary-${selectedMonth}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">สรุปค่าคอมมิชชั่นสำหรับจ่าย (Payout Report)</h1>
                    <p className="text-sm text-gray-500">
                        จัดการการจ่ายค่าคอมมิชชั่นรายเดือน
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>

                    <button
                        onClick={handleExportCsv}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 bg-white"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border p-4 bg-white shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">ยอดคอมฯ ทั้งหมด (Due)</div>
                    <div className="text-xl font-semibold text-gray-800">{formatBaht(totalDue)}</div>
                </div>
                <div className="rounded-xl border p-4 bg-white shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">จ่ายแล้ว (Paid)</div>
                    <div className="text-xl font-semibold text-emerald-600">{formatBaht(totalPaid)}</div>
                </div>
                <div className="rounded-xl border p-4 bg-white shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">คงเหลือที่ต้องจ่าย (Remaining)</div>
                    <div className="text-xl font-semibold text-amber-600">{formatBaht(totalRemaining)}</div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                    เกิดข้อผิดพลาด: {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">เดือน</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">ชื่อ Sales</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">ยอดคอมฯ (Due)</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">จ่ายแล้ว</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">ค้างจ่าย</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500">สถานะ</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">กำลังโหลดข้อมูล...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">ไม่พบข้อมูลในเดือนนี้</td></tr>
                        ) : (
                            rows.map((r, i) => {
                                const status = r.remaining_in_month <= 0 ? 'Paid' : r.paid_in_month > 0 ? 'Partial' : 'Pending';
                                return (
                                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500">{r.month}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{r.full_name || "Unknown"}</td>
                                        <td className="px-4 py-3 text-right">{formatBaht(r.due_in_month)}</td>
                                        <td className="px-4 py-3 text-right text-emerald-600">{formatBaht(r.paid_in_month)}</td>
                                        <td className="px-4 py-3 text-right text-amber-600 font-medium">{formatBaht(r.remaining_in_month)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {status !== 'Paid' && (
                                                <button
                                                    onClick={() => handleOpenModal(r)}
                                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                                                >
                                                    บันทึกการจ่าย
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

            {/* Payment Modal */}
            {showModal && selectedRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800">บันทึกการจ่ายค่าคอมมิชชั่น</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Sales Name</label>
                                <div className="font-medium">{selectedRow.full_name}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">เดือน</label>
                                    <div>{selectedRow.month}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">ยอดค้างจ่าย</label>
                                    <div className="text-amber-600 font-medium">{formatBaht(selectedRow.remaining_in_month)}</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ระบุยอดจ่าย (บาท)</label>
                                <input
                                    type="number"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ (Optional)</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={2}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    placeholder="เช่น โอนแล้วเมื่อ..."
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSavePayment}
                                disabled={submitting}
                                className="px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                            >
                                {submitting ? "กำลังบันทึก..." : "ยืนยันการจ่าย"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommissionPayoutReport;
