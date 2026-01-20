// src/components/customers/deals/DealDocumentsPanel.tsx
import React, { useState } from "react";
import { FileText, Plus, Loader2, Trash2, Eye, AlertCircle } from "lucide-react";
import { useDealDocuments, DOC_TYPES, DealDocument } from "../../../hooks/useDealDocuments";
import { useDealPaymentSummary } from "../../../hooks/useDealPaymentSummary";

type DealDocumentsPanelProps = {
    dealId: string;
    dealInfo?: {
        title?: string;
        customer_name?: string;
        site_address?: string;
    };
};

const DealDocumentsPanel: React.FC<DealDocumentsPanelProps> = ({
    dealId,
    dealInfo,
}) => {
    const {
        data: documents,
        loading,
        error,
        generating,
        createDocument,
        deleteDocument,
    } = useDealDocuments(dealId);

    const { data: paymentSummary } = useDealPaymentSummary(dealId);

    const [selectedDocType, setSelectedDocType] = useState<"DEP" | "RCPT" | "INV" | "GR">("DEP");
    const [showPreview, setShowPreview] = useState<DealDocument | null>(null);

    const handleGenerate = async () => {
        // Build payload snapshot for the document
        const payload = {
            deal_id: dealId,
            generated_at: new Date().toISOString(),
            deal_info: dealInfo || {},
            payment_summary: paymentSummary || {},
        };

        const doc = await createDocument(selectedDocType, payload);
        if (doc) {
            alert(`สร้างเอกสาร ${doc.doc_no} สำเร็จ!`);
        }
    };

    const handleDelete = async (doc: DealDocument) => {
        const confirmed = window.confirm(`ยืนยันลบเอกสาร ${doc.doc_no}?`);
        if (!confirmed) return;
        await deleteDocument(doc.id);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-900">
                            เอกสารดีล
                        </div>
                        <div className="text-xs text-slate-500">
                            DEP / RCPT / INV / GR
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Form */}
            <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <label className="text-[11px] font-medium text-indigo-700 mb-1 block">
                            ประเภทเอกสาร
                        </label>
                        <select
                            value={selectedDocType}
                            onChange={(e) => setSelectedDocType(e.target.value as any)}
                            disabled={generating}
                            className="w-full text-sm border border-indigo-200 rounded-md px-3 py-1.5 bg-white"
                        >
                            {Object.entries(DOC_TYPES).map(([key, val]) => (
                                <option key={key} value={key}>
                                    {val.label} ({key})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังสร้าง...
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                สร้างเอกสาร
                            </>
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-indigo-500 mt-2">
                    เลขเอกสารจะสร้างอัตโนมัติ รูปแบบ: TMP-{"{"}{selectedDocType}{"}"}-YYYYMMDD-XXXX
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                    <span>{error.message || "เกิดข้อผิดพลาด"}</span>
                </div>
            )}

            {/* Documents List */}
            <div>
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-slate-500 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        กำลังโหลดเอกสาร...
                    </div>
                ) : documents.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                        ยังไม่มีเอกสารสำหรับดีลนี้
                    </div>
                ) : (
                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${doc.doc_type === "DEP" ? "bg-amber-100 text-amber-700" :
                                        doc.doc_type === "RCPT" ? "bg-emerald-100 text-emerald-700" :
                                            doc.doc_type === "INV" ? "bg-blue-100 text-blue-700" :
                                                "bg-purple-100 text-purple-700"
                                        }`}>
                                        {doc.doc_type}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">
                                            {doc.doc_no}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            {DOC_TYPES[doc.doc_type]?.label} • {formatDate(doc.created_at)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(doc)}
                                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                        title="พรีวิว"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(doc)}
                                        className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600"
                                        title="ลบ"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Modal (placeholder - PDF rendering will be in separate Sprint) */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900">
                                พรีวิวเอกสาร: {showPreview.doc_no}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowPreview(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[60vh]">
                            <div className="text-xs text-slate-600 mb-2">
                                ประเภท: {DOC_TYPES[showPreview.doc_type]?.label}
                            </div>
                            <div className="text-xs text-slate-600 mb-4">
                                สร้างเมื่อ: {formatDate(showPreview.created_at)}
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="text-xs font-medium text-slate-500 mb-2">Payload:</div>
                                <pre className="text-[10px] text-slate-700 overflow-auto">
                                    {JSON.stringify(showPreview.payload, null, 2)}
                                </pre>
                            </div>
                            <p className="text-xs text-slate-400 mt-4 text-center">
                                PDF Rendering พร้อมใน Phase ถัดไป
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DealDocumentsPanel;
