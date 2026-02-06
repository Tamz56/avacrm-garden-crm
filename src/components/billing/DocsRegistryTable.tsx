// src/components/billing/DocsRegistryTable.tsx
// Registry Table: ตารางเอกสารทั้งหมดสำหรับ Billing Console
import React, { useState } from 'react';
import {
    Eye, DollarSign, Ban, Search, FileText, Loader2,
    CheckCircle2, Clock, AlertCircle, XCircle, ReceiptText
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useDealDocumentsFinancial, DocRow, PaymentState } from '../../hooks/useDealDocumentsFinancial';
import PaymentModal from './PaymentModal';
import VoidDocModal from './VoidDocModal';
import { DocumentPrintTemplate } from '../deals/DocumentPrintTemplate';
import type { DocumentPayload } from '../../types/dealDocuments';

// Badge colors
const DOC_TYPE_COLORS: Record<string, string> = {
    QT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    INV: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DEP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    RCPT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const PAYMENT_STATE_CONFIG: Record<PaymentState, { label: string; color: string; icon: any }> = {
    unpaid: { label: 'ยังไม่ชำระ', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    partial: { label: 'ชำระบางส่วน', color: 'bg-amber-100 text-amber-700', icon: Clock },
    paid: { label: 'ชำระครบ', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    'n/a': { label: '-', color: 'bg-slate-100 text-slate-500', icon: null },
};



type Props = {
    dealId?: string; // Optional: filter by deal
};

export default function DocsRegistryTable({ dealId }: Props) {
    // Filters
    const [search, setSearch] = useState('');
    const [docType, setDocType] = useState('all');
    const [paymentState, setPaymentState] = useState('all');
    const [status, setStatus] = useState('all');
    const [month, setMonth] = useState('');

    // Modals
    const [showPayment, setShowPayment] = useState<DocRow | null>(null);
    const [showVoid, setShowVoid] = useState<DocRow | null>(null);

    // Preview State (On-demand payload)
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{ payload: DocumentPayload; status?: string; doc_no: string; doc_type: string } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const { rows, loading, error, refetch, stats } = useDealDocumentsFinancial({
        dealId,
        q: search,
        docType,
        paymentState,
        status,
        month,
    });

    // Fetch payload on demand
    const openPreview = async (row: DocRow) => {
        setPreviewOpen(true);
        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewDoc(null); // Clear previous

        try {
            const { data, error } = await supabase
                .from('deal_documents')
                .select('payload,status,doc_type,doc_no')
                .eq('id', row.id)
                .single();

            if (error) throw error;

            if (data) {
                setPreviewDoc({
                    payload: data.payload,
                    status: data.status,
                    doc_no: data.doc_no,
                    doc_type: data.doc_type
                });
            }
        } catch (err: any) {
            setPreviewError(err.message || 'Error fetching document content');
        } finally {
            setPreviewLoading(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatCurrency = (val: number) => {
        return `฿${val?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase">เอกสาร</div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.totalDocs}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase">ยอดรวม</div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(stats.totalRevenue)}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase">รับแล้ว</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(stats.totalPaid)}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs font-bold text-slate-400 uppercase">ค้างชำระ</div>
                    <div className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(stats.totalBalance)}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหา เลขเอกสาร / ชื่อลูกค้า..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-sm focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {/* Doc Type */}
                    <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="h-10 px-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-sm"
                    >
                        <option value="all">ประเภท: ทั้งหมด</option>
                        <option value="QT">ใบเสนอราคา (QT)</option>
                        <option value="INV">ใบแจ้งหนี้ (INV)</option>
                        <option value="DEP">ใบมัดจำ (DEP)</option>
                        <option value="RCPT">ใบเสร็จ (RCPT)</option>
                    </select>

                    {/* Payment State */}
                    <select
                        value={paymentState}
                        onChange={(e) => setPaymentState(e.target.value)}
                        className="h-10 px-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-sm"
                    >
                        <option value="all">สถานะชำระ: ทั้งหมด</option>
                        <option value="unpaid">ยังไม่ชำระ</option>
                        <option value="partial">ชำระบางส่วน</option>
                        <option value="paid">ชำระครบ</option>
                    </select>

                    {/* Status */}
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="h-10 px-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-sm"
                    >
                        <option value="all">สถานะ: ทั้งหมด</option>
                        <option value="issued">ออกแล้ว</option>
                        <option value="cancelled">ยกเลิก</option>
                    </select>

                    {/* Month */}
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="h-10 px-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-sm"
                        placeholder="เดือน"
                    />

                    {/* Clear Filters */}
                    {(search || docType !== 'all' || paymentState !== 'all' || status !== 'all' || month) && (
                        <button
                            onClick={() => {
                                setSearch('');
                                setDocType('all');
                                setPaymentState('all');
                                setStatus('all');
                                setMonth('');
                            }}
                            className="h-10 px-3 text-xs font-bold text-slate-500 hover:text-slate-700 underline"
                        >
                            ล้าง
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        กำลังโหลด...
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-16 text-red-500 gap-2">
                        <XCircle className="h-5 w-5" />
                        {error}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <ReceiptText className="h-12 w-12 mb-2 opacity-30" />
                        <span>ไม่พบเอกสาร</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">เลขที่</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">ประเภท</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">ลูกค้า</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">วันที่</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-xs">ยอดรวม</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-xs">รับแล้ว</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-xs">คงเหลือ</th>
                                    <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase text-xs">สถานะ</th>
                                    <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rows.map((row) => {
                                    const isCancelled = row.status === 'cancelled' || row.status === 'voided';
                                    const psConfig = PAYMENT_STATE_CONFIG[row.payment_state];
                                    const PsIcon = psConfig?.icon;

                                    return (
                                        <tr
                                            key={row.id}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isCancelled ? 'opacity-50' : ''}`}
                                        >
                                            {/* Doc No */}
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => openPreview(row)}
                                                    className="font-bold text-indigo-600 hover:underline"
                                                >
                                                    {row.doc_no}
                                                </button>
                                            </td>

                                            {/* Doc Type */}
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-black ${DOC_TYPE_COLORS[row.doc_type]}`}>
                                                    {row.doc_type}
                                                </span>
                                            </td>

                                            {/* Customer */}
                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                                {row.customer_name || '-'}
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-3 text-slate-500 text-xs">
                                                {formatDate(row.doc_date)}
                                            </td>

                                            {/* Grand Total */}
                                            <td className="px-4 py-3 text-right font-bold">
                                                {formatCurrency(row.grand_total)}
                                            </td>

                                            {/* Paid Total */}
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                {formatCurrency(row.paid_total)}
                                            </td>

                                            {/* Balance */}
                                            <td className={`px-4 py-3 text-right font-bold ${row.balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                {formatCurrency(row.balance)}
                                            </td>

                                            {/* Payment State */}
                                            <td className="px-4 py-3 text-center">
                                                {row.payment_state !== 'n/a' && (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${psConfig?.color}`}>
                                                        {PsIcon && <PsIcon className="h-3 w-3" />}
                                                        {psConfig?.label}
                                                    </span>
                                                )}
                                                {isCancelled && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-600 ml-1">
                                                        ยกเลิก
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* View */}
                                                    <button
                                                        onClick={() => openPreview(row)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                        title="ดูเอกสาร"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>

                                                    {/* Add Payment - only for payable docs */}
                                                    {!isCancelled && row.doc_type !== 'QT' && row.balance > 0 && (
                                                        <button
                                                            onClick={() => setShowPayment(row)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                            title="บันทึกรับเงิน"
                                                        >
                                                            <DollarSign className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {/* Void - only for active docs */}
                                                    {!isCancelled && (
                                                        <button
                                                            onClick={() => setShowVoid(row)}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                            title="ยกเลิกเอกสาร"
                                                        >
                                                            <Ban className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPayment && (
                <PaymentModal
                    doc={showPayment}
                    onClose={() => setShowPayment(null)}
                    onSuccess={refetch}
                />
            )}

            {/* Void Modal */}
            {showVoid && (
                <VoidDocModal
                    doc={showVoid}
                    onClose={() => setShowVoid(null)}
                    onSuccess={refetch}
                />
            )}

            {/* Preview Modal - Modified for on-demand fetch */}
            {previewOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden dark:bg-slate-800">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-500" />
                                <span className="font-black text-slate-800 dark:text-white">
                                    {previewDoc ? previewDoc.doc_no : 'กำลังโหลด...'}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setPreviewOpen(false);
                                    setPreviewDoc(null);
                                }}
                                className="text-sm font-bold text-slate-400 hover:text-slate-600 px-3 py-1 rounded-lg hover:bg-slate-100"
                            >
                                ปิด ✕
                            </button>
                        </div>

                        {/* Body - scroll */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900 min-h-[400px]">
                            {previewLoading && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                    <p className="animate-pulse">กำลังโหลดข้อมูลเอกสาร...</p>
                                </div>
                            )}

                            {previewError && !previewLoading && (
                                <div className="h-full flex flex-col items-center justify-center text-red-500 gap-3">
                                    <XCircle className="h-10 w-10" />
                                    <p>{previewError}</p>
                                </div>
                            )}

                            {!previewLoading && !previewError && previewDoc && (
                                <DocumentPrintTemplate
                                    payload={previewDoc.payload}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
