```
// src/components/customers/deals/DealDocumentsPanel.tsx
import React, { useState, useRef, useEffect } from "react";
import { FileText, Plus, Loader2, Ban, Eye, AlertCircle, X, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { useDealDocuments, DOC_TYPES, DealDocument, DocType } from "../../../hooks/useDealDocuments";
import { useDealDocumentTamper } from "../../../hooks/useDealDocumentTamper";
import { useMyRole } from "../../../hooks/useMyRole";
import { DocumentPrintTemplate } from "../../deals/DocumentPrintTemplate";
import { TamperBadge } from "../../docs/TamperBadge";
import { MarkTamperedModal } from "../../docs/MarkTamperedModal";
import { UnmarkTamperedModal } from "../../docs/UnmarkTamperedModal";
import type { DocumentPayload } from "../../../types/dealDocuments";
import { bahtText } from "../../../lib/bahtText";
import { isDocCancelled } from "../../../lib/docStatus";
import DocumentAuditStrip from "../../docs/DocumentAuditStrip";
import { supabase } from "../../../supabaseClient";

// === QT TYPES & DEFAULTS ===
type AuthorizedSigner = 'apirak' | 'yongyuth';

const QT_DEFAULT_BANK_INFO =
    'ห้างหุ้นส่วนจำกัด เอวาฟาร์ม 888\nธนาคารกสิกรไทย เลขที่บัญชี 356658521';

const QT_DEFAULT_TERMS =
    '- กำหนดชำระเงินมัดจำ 50% หลังจากได้รับใบสั่งซื้อ\n' +
    '- กำหนดชำระเงินส่วนที่เหลือเมื่อส่งสินค้าตามรายการ';

const QT_DEFAULT_NOTE =
    'หมายเหตุ : ราคาดังกล่าว รวมปลูก วัสดุปลูกไม้ค้ำยัน และการรับประกัน';

const AUTHORIZED_SIGNERS: { value: AuthorizedSigner; label: string }[] = [
    { value: 'apirak', label: 'นายอภิรักษ์ ประเภโส' },
    { value: 'yongyuth', label: 'นายยงยุทธ รวยลาภ' },
];

const SIGNER_NAME_TH: Record<AuthorizedSigner, string> = {
    apirak: 'นายอภิรักษ์ ประเภโส',
    yongyuth: 'นายยงยุทธ รวยลาภ',
};

type DealDocumentsPanelProps = {
    dealId: string;
    customerId?: string | null;  // ✅ NEW: For prefilling customer from DB
    summary: {
        totalAmount: number;
        paidAmount: number;
        outstandingAmount: number;
    };
    items: Array<{
        id: string;
        description: string;
        subText?: string;
        quantity: number;
        unitPrice: number;
        amount: number;
    }>;
    customerInfo: {
        name: string;
        phone?: string;
        address?: string;
        tax_id?: string;
        branch?: string;
    };
    onDocumentCreated?: (doc: DealDocument) => void;
};

// === QT DRAFT STATE TYPE ===
type QTDraft = {
    doc_no: string;
    doc_date: string;
    customer_name: string;
    customer_address: string;
    customer_phone: string;
    customer_tax_id: string;
    is_head_office: boolean;
    branch_no: string;
    note: string;
    bank_info: string;
    payment_terms: string;
    authorized_signer: AuthorizedSigner;
};

type DocLine = {

    id: string;
    included: boolean;
    description: string;
    subText?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    unit: string;
    max_qty: number;
};

type ValidationIssue = {
    code: "QT_SHIPPING_REQUIRED" | "DISCOUNT_EXCEEDS_SUBTOTAL";
    message: string;
    section: "items" | "pricing" | "extra";
    field?: "shipping_fee" | "discount_amount";
};

function Section({
    title,
    hint,
    open,
    onToggle,
    children,
}: {
    title: string;
    hint?: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <button
                type="button"
                onClick={onToggle}
                className="w-full px-5 py-4 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <div className="text-left">
                    <div className="text-sm font-black text-slate-800 dark:text-slate-200">{title}</div>
                    {hint && <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{hint}</div>}
                </div>
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-500 shadow-sm">
                    <span className="text-xl font-bold leading-none">{open ? "−" : "+"}</span>
                </div>
            </button>
            {open && <div className="p-5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                {children}
            </div>}
        </div>
    );
}

const DealDocumentsPanel: React.FC<DealDocumentsPanelProps> = ({
    dealId,
    customerId,  // ✅ NEW: For prefilling customer from DB
    summary,
    items,
    customerInfo,
    onDocumentCreated,
}) => {
    const {
        data: documents,
        loading,
        error,
        generating,
        createDocument,
        voidDocument,
        refetch,
    } = useDealDocuments(dealId);

    // Tamper tracking hooks
    const { role } = useMyRole();
    const isAdmin = role === 'admin';
    const canCancel = ['admin', 'owner'].includes(role ?? '');  // ✅ UX: Only admin/owner can cancel
    const { loading: tamperLoading, markTampered, unmarkTampered } = useDealDocumentTamper();

    // Tamper modal state
    const [showMarkTamperedModal, setShowMarkTamperedModal] = useState<DealDocument | null>(null);
    const [showUnmarkTamperedModal, setShowUnmarkTamperedModal] = useState<DealDocument | null>(null);

    const [selectedDocType, setSelectedDocType] = useState<DocType>("QT");
    const isPaymentDoc = selectedDocType === 'DEP' || selectedDocType === 'RCPT';
    const [showPreview, setShowPreview] = useState<DealDocument | null>(null);
    const [showInputModal, setShowInputModal] = useState(false);
    const [showVoidModal, setShowVoidModal] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState("");
    const [voidLoading, setVoidLoading] = useState(false);  // ✅ UX: Prevent double-submit

    const [vatEnabled, setVatEnabled] = useState(true);
    const [docLines, setDocLines] = useState<DocLine[]>([]);
    const [showItemsRef, setShowItemsRef] = useState(true); // For DEP/RCPT

    // Specific inputs
    const [specificInputs, setSpecificInputs] = useState({
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        deposit_amount: Math.round(summary.totalAmount * 0.3),
        paid_amount: summary.outstandingAmount,
        payment_method: "โอนเงินผ่านธนาคาร",
        payment_ref: "",
        terms: "",
    });

    const [shipping, setShipping] = useState<{
        fee: number;
        vehicle: 'pickup' | 'truck6' | 'truck10' | 'other';
        note: string;
    }>({
        fee: 0,
        vehicle: 'pickup',
        note: "",
    });

    const [discountData, setDiscountData] = useState({
        amount: 0,
        reason: "",
    });

    // ✅ Refs for auto-scroll + state for submit attempt
    const shippingFeeRef = useRef<HTMLInputElement | null>(null);
    const discountAmountRef = useRef<HTMLInputElement | null>(null);
    const scrolledOnceRef = useRef(false); // E2: Prevent scroll spam
    const [submitAttempted, setSubmitAttempted] = useState(false);

    // ✅ E5: Normalize to safe number (prevent NaN)
    const toNumber = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const [validUntil, setValidUntil] = useState(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );

    const [openSections, setOpenSections] = useState({
        items: true,
        pricing: true,
        extra: false,
        customer: true,   // ✅ NEW: Customer Details section
        qtOptions: true,  // ✅ NEW: QT Options section
    });

    // ✅ QT DRAFT STATE (editable customer + QT-specific fields)
    const [qtDraft, setQtDraft] = useState<QTDraft>({
        doc_no: '',
        doc_date: new Date().toISOString().split('T')[0],
        customer_name: customerInfo.name || '',
        customer_address: customerInfo.address || '',
        customer_phone: customerInfo.phone || '',
        customer_tax_id: customerInfo.tax_id || '',
        is_head_office: !customerInfo.branch || customerInfo.branch === 'สำนักงานใหญ่',
        branch_no: customerInfo.branch && customerInfo.branch !== 'สำนักงานใหญ่' ? customerInfo.branch : '',
        note: QT_DEFAULT_NOTE,
        bank_info: QT_DEFAULT_BANK_INFO,
        payment_terms: QT_DEFAULT_TERMS,
        authorized_signer: 'apirak',
    });
    const [prefillLoading, setPrefillLoading] = useState(false);

    const handleOpenGenerate = async () => {
        setShowInputModal(true);
        setPrefillLoading(true);

        // Auto-toggle logic based on DocType
        if (selectedDocType === 'DEP' || selectedDocType === 'RCPT') {
            setOpenSections(prev => ({ ...prev, items: false, pricing: false, extra: true, customer: false, qtOptions: false }));
        } else {
            setOpenSections(prev => ({ ...prev, items: true, pricing: true, extra: false, customer: true, qtOptions: true }));
        }

        setSpecificInputs(prev => ({
            ...prev,
            paid_amount: summary.outstandingAmount,
            deposit_amount: Math.round(summary.totalAmount * 0.3),
        }));

        // Preload items from deal
        const lines = (items || []).map(li => ({
            id: li.id,
            included: true,
            description: li.description,
            subText: li.subText,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            amount: li.amount,
            unit: "ต้น", // Default unit
            max_qty: li.quantity,
        }));
        setDocLines(lines);

        // ✅ PREFILL QT DRAFT (from props + async from customers table)
        const today = new Date().toISOString().split('T')[0];

        let nextDraft: QTDraft = {
            doc_no: '',
            doc_date: today,
            customer_name: customerInfo.name || '',
            customer_address: customerInfo.address || '',
            customer_phone: customerInfo.phone || '',
            customer_tax_id: customerInfo.tax_id || '',
            is_head_office: !customerInfo.branch || customerInfo.branch === 'สำนักงานใหญ่',
            branch_no: customerInfo.branch && customerInfo.branch !== 'สำนักงานใหญ่' ? customerInfo.branch : '',
            note: QT_DEFAULT_NOTE,
            bank_info: QT_DEFAULT_BANK_INFO,
            payment_terms: QT_DEFAULT_TERMS,
            authorized_signer: 'apirak',
        };

        try {
            // If we have customerId, fetch full customer details from DB
            if (customerId) {
                const { data: c, error } = await supabase
                    .from('customers')
                    .select('name, address, phone, tax_id, is_head_office, branch_no')
                    .eq('id', customerId)
                    .maybeSingle();

                if (!error && c) {
                    nextDraft = {
                        ...nextDraft,
                        customer_name: nextDraft.customer_name || c.name || '',
                        customer_address: c.address || '',
                        customer_phone: c.phone || '',
                        customer_tax_id: c.tax_id || '',
                        is_head_office: c.is_head_office ?? true,
                        branch_no: c.branch_no || '',
                    };
                }
            }
        } finally {
            setQtDraft(nextDraft);
            setPrefillLoading(false);
        }
    };

    // ✅ UNIFIED computeTotals - Single Source of Truth with typed issues
    const computeTotals = () => {
        const selectedLines = docLines.filter(l => l.included);

        const itemsTotal = isPaymentDoc
            ? (selectedDocType === 'DEP' ? (specificInputs.deposit_amount || 0) : (specificInputs.paid_amount || 0))
            : selectedLines.reduce((sum, l) => sum + (Number(l.quantity || 0) * Number(l.unitPrice || 0)), 0);

        const shippingFee = isPaymentDoc ? 0 : toNumber(shipping.fee);
        const discountAmount = isPaymentDoc ? 0 : toNumber(discountData.amount);

        const subTotal = itemsTotal + shippingFee;
        const grandTotal = Math.max(0, subTotal - discountAmount);

        const vatRate = vatEnabled ? 7 : 0;
        const vatBase = vatEnabled ? grandTotal / 1.07 : grandTotal;
        const vatAmount = vatEnabled ? grandTotal - vatBase : 0;

        // ✅ Validations (collect issues with metadata)
        const issues: ValidationIssue[] = [];

        if (!isPaymentDoc && selectedDocType === 'QT' && shippingFee <= 0) {
            issues.push({
                code: "QT_SHIPPING_REQUIRED",
                message: "ใบเสนอราคา (QT) ต้องระบุค่าขนส่ง",
                section: "pricing",
                field: "shipping_fee",
            });
        }

        if (!isPaymentDoc && discountAmount > subTotal) {
            issues.push({
                code: "DISCOUNT_EXCEEDS_SUBTOTAL",
                message: "ส่วนลดไม่สามารถมากกว่ายอดรวม (ต้นไม้ + ขนส่ง)",
                section: "pricing",
                field: "discount_amount",
            });
        }

        const canSubmit = issues.length === 0;

        return {
            selectedLines,
            itemsTotal,
            shippingFee,
            discountAmount,
            subTotal,
            grandTotal,
            vatRate,
            vatBase,
            vatAmount,
            issues,
            canSubmit,
        };
    };

    // Footer uses computeTotals directly
    const totals = computeTotals();
    const footerGrandTotal = totals.grandTotal;
    const canSubmit = totals.canSubmit;
    const issues = totals.issues;

    // ✅ E3: First issue for footer display
    const firstIssue = issues[0];
    const footerErrorText = !canSubmit && firstIssue ? firstIssue.message : null;

    // ✅ E1: Auto-reset submitAttempted when issues are cleared
    useEffect(() => {
        if (!showInputModal) return;
        if (!submitAttempted) return;
        if ((issues?.length ?? 0) === 0) {
            setSubmitAttempted(false);
        }
    }, [showInputModal, submitAttempted, issues?.length]);

    const handleGenerate = async () => {
        try {
            setSubmitAttempted(true);
            scrolledOnceRef.current = false; // E2: Reset scroll lock each submit

            const t = computeTotals();

            if (t.issues.length > 0) {
                // Auto-open section with error
                const first = t.issues[0];
                setOpenSections(prev => ({ ...prev, [first.section]: true }));

                // E2: Auto-scroll only once per submit attempt
                if (!scrolledOnceRef.current) {
                    scrolledOnceRef.current = true;
                    setTimeout(() => {
                        if (first.field === "shipping_fee") shippingFeeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        if (first.field === "discount_amount") discountAmountRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 50);
                }

                return; // ❗ ไม่ throw/alert — ใช้ inline + footer error แทน (UX นุ่มกว่า)
            }

            const payload: DocumentPayload = {
                doc_no: selectedDocType === 'QT' ? (qtDraft.doc_no.trim() || "AUTO") : "AUTO",
                doc_date: selectedDocType === 'QT' ? qtDraft.doc_date : new Date().toISOString().split('T')[0],
                doc_type: selectedDocType,
                company: {
                    name: "ห้างหุ้นส่วนจำกัด เอวาฟาร์ม 888",
                    address: "ปากช่อง นครราชสีมา",
                    phone: "081-888-8888",
                    tax_id: "0123456789012",
                    branch: "สำนักงานใหญ่",
                },
                // ✅ Use qtDraft for QT, otherwise use props
                customer: selectedDocType === 'QT' ? {
                    name: qtDraft.customer_name || customerInfo.name,
                    address: qtDraft.customer_address || "-",
                    phone: qtDraft.customer_phone || "-",
                    tax_id: qtDraft.customer_tax_id || undefined,
                    branch: qtDraft.is_head_office ? 'สำนักงานใหญ่' : qtDraft.branch_no || undefined,
                } : {
                    name: customerInfo.name,
                    address: customerInfo.address || "-",
                    phone: customerInfo.phone || "-",
                    tax_id: customerInfo.tax_id,
                    branch: customerInfo.branch,
                },
                // ✅ QT/INV uses selectedLines, DEP/RCPT uses single payment item
                items: isPaymentDoc
                    ? [{
                        id: selectedDocType.toLowerCase(),
                        description: selectedDocType === 'DEP'
                            ? 'ชำระเงินมัดจำค่าต้นไม้'
                            : 'ชำระค่าต้นไม้ (งวดสุดท้าย/ยอดคงเหลือ)',
                        quantity: 1,
                        unit: "งวด",
                        unitPrice: t.grandTotal,
                        amount: t.grandTotal,
                    }]
                    : [
                        ...t.selectedLines.map(l => ({
                            id: l.id,
                            description: l.description,
                            subText: l.subText,
                            quantity: l.quantity,
                            unit: l.unit,
                            unitPrice: l.unitPrice,
                            amount: l.quantity * l.unitPrice,
                        })),
                        // ✅ Add Shipping as Line Item
                        ...(t.shippingFee > 0 ? [{
                            id: 'shipping-fee',
                            description: `ค่าขนส่ง ${ shipping.note ? `(${shipping.note})` : '' } `.trim(),
                            quantity: 1,
                            unit: shipping.vehicle === 'pickup' ? 'เที่ยว (กระบะ)' :
                                shipping.vehicle === 'truck6' ? 'เที่ยว (6 ล้อ)' :
                                    shipping.vehicle === 'truck10' ? 'เที่ยว (10 ล้อ)' : 'เที่ยว',
                            unitPrice: t.shippingFee,
                            amount: t.shippingFee,
                            is_shipping: true, // ✅ Flag for DB
                        }] : [])
                    ],
                shipping: isPaymentDoc ? undefined : { ...shipping, fee: 0 }, // ✅ Clear legacy fee (moved to items)
                discount: isPaymentDoc ? undefined : { ...discountData, amount: t.discountAmount },
                meta: {
                    valid_until: selectedDocType === 'QT' ? validUntil : undefined,
                },
                totals: {
                    subTotal: t.itemsTotal,      // "รวมรายการต้นไม้"
                    discount: t.discountAmount,
                    vatBase: t.vatBase,
                    vatRate: t.vatRate,
                    vatAmount: t.vatAmount,
                    grandTotal: t.grandTotal,
                    bahtText: bahtText(t.grandTotal),
                },
                specific: {
                    due_date: selectedDocType === 'INV' ? specificInputs.due_date : undefined,
                    payment_method: isPaymentDoc ? specificInputs.payment_method : undefined,
                    payment_ref: isPaymentDoc ? specificInputs.payment_ref : undefined,
                    // ✅ QT uses qtDraft fields
                    terms: selectedDocType === 'QT' ? qtDraft.payment_terms : specificInputs.terms,
                    bank_info: selectedDocType === 'QT' ? qtDraft.bank_info : undefined,
                    note: selectedDocType === 'QT' ? qtDraft.note : undefined,
                    authorized_signer: selectedDocType === 'QT' ? SIGNER_NAME_TH[qtDraft.authorized_signer] : undefined,
                    disclaimer: "เอกสารนี้สร้างโดยระบบอัตโนมัติ ไม่ต้องมีลายเซ็นกรณีส่งทางอิเล็กทรอนิกส์",
                },
                toggles: { vat_enabled: vatEnabled },
            };


            // ✅ DEP/RCPT reference_items uses ALL docLines (not just selected)
            if (isPaymentDoc && showItemsRef) {
                payload.reference_items = docLines.map(l => ({
                    description: l.description,
                    quantity: l.quantity,
                    unit: l.unit,
                    unitPrice: l.unitPrice,
                    amount: l.quantity * l.unitPrice,
                }));
            }

            // ✅ Single createDocument call
            const doc = await createDocument(selectedDocType, payload, vatEnabled);
            if (doc) {
                setShowInputModal(false);
                setSubmitAttempted(false); // Reset on success
                alert(`สร้างเอกสาร ${ doc.doc_no } สำเร็จ!`);
                onDocumentCreated?.(doc); // ✅ Trigger callback if provided
            }
        } catch (e: any) {
            alert(e?.message || "เกิดข้อผิดพลาด");
        }
    };

    const handleVoid = async () => {
        if (!showVoidModal || !voidReason.trim() || voidLoading) return;

        setVoidLoading(true);  // ✅ UX: Disable button during processing
        try {
            const success = await voidDocument(showVoidModal, voidReason);
            if (success) {
                setShowVoidModal(null);
                setVoidReason("");
                // ✅ UX: Gentle success feedback instead of alert
            }
        } catch (e: any) {
            const msg = e?.message || e?.error_description || e?.details || '';
            if (msg.toLowerCase().includes('forbidden') || msg.includes('403')) {
                alert('คุณไม่มีสิทธิ์ยกเลิกเอกสาร');
                setShowVoidModal(null);
                setVoidReason("");
                return;
            }
            console.error('Void error:', e);
            alert('ยกเลิกเอกสารไม่สำเร็จ: ' + (msg || 'Unknown error'));
        } finally {
            setVoidLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        // User requested DD/MM/YYYY
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${ day } /${month}/${ year } `;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 dark:bg-slate-800 dark:border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center dark:bg-indigo-500/10">
                        <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                            เอกสารการเงิน
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                            Financial Documents
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedDocType}
                        onChange={(e) => setSelectedDocType(e.target.value as DocType)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                    >
                        {Object.entries(DOC_TYPES).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleOpenGenerate}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        สร้างเอกสาร
                    </button>
                </div>
            </div>

            {/* Documents List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        กำลังโหลด...
                    </div>
                ) : documents.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="text-slate-300 mb-2">📄</div>
                        <div className="text-xs text-slate-400 font-medium">ยังไม่มีเอกสาร</div>
                    </div>
                ) : (
                    documents.map((doc) => {
                        // Adjustment #3: Cancelled status helper
                        const isCancelled = isDocCancelled(doc.status);
                        // Adjustment #2: Separate block levels
                        const isHardBlocked = doc.tampered_at != null;
                        const isSoftBlocked = doc.checksum_status === 'mismatch';

                        return (
                            <div
                                key={doc.id}
                                className={`flex items - center justify - between p - 3 rounded - xl border transition - all ${
    isCancelled
        ? 'bg-slate-50 border-slate-100 opacity-60 grayscale dark:bg-slate-900 dark:border-slate-800'
        : isHardBlocked
            ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
            : isSoftBlocked
                ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
                : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md dark:bg-slate-800 dark:border-slate-700'
} `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h - 10 w - 10 rounded - lg flex items - center justify - center text - [10px] font - black tracking - tighter ${
    doc.doc_type === "DEP" ? "bg-amber-100 text-amber-700" :
        doc.doc_type === "RCPT" ? "bg-emerald-100 text-emerald-700" :
            doc.doc_type === "INV" ? "bg-blue-100 text-blue-700" :
                "bg-indigo-100 text-indigo-700"
} `}>
                                        {doc.doc_type}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text - sm font - bold ${ isCancelled ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200' } `}>
                                                {doc.doc_no}
                                            </span>
                                            {isCancelled && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-bold uppercase">ยกเลิก</span>
                                            )}
                                            {/* TamperBadge: show integrity status */}
                                            <TamperBadge checksumStatus={doc.checksum_status} tamperedAt={doc.tampered_at} />
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium bg-slate-50 inline-block px-1.5 py-0.5 rounded mt-0.5 dark:bg-slate-700">
                                            {formatDate(doc.created_at)} • ฿{(doc.payload as any)?.totals?.grandTotal?.toLocaleString() || '0'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* View preview - always allowed */}
                                    <button
                                        onClick={() => setShowPreview(doc)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                        title="ดูรายละเอียด"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>

                                    {/* Admin-only: Mark Tampered (if not cancelled and not already tampered) */}
                                    {isAdmin && !isCancelled && !isHardBlocked && (
                                        <button
                                            onClick={() => setShowMarkTamperedModal(doc)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Mark as Tampered"
                                        >
                                            <ShieldAlert className="h-4 w-4" />
                                        </button>
                                    )}

                                    {/* Admin-only: Unmark Tampered (if marked) */}
                                    {isAdmin && !isCancelled && isHardBlocked && (
                                        <button
                                            onClick={() => setShowUnmarkTamperedModal(doc)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                            title="Unmark Tampered"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                        </button>
                                    )}

                                    {/* Cancel button - hide if tampered OR not admin/owner */}
                                    {canCancel && !isCancelled && !isHardBlocked && (
                                        <button
                                            onClick={() => setShowVoidModal(doc.id)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="ยกเลิกเอกสาร"
                                        >
                                            <Ban className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Modal */}
            {showInputModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden dark:bg-slate-800 animate-in fade-in zoom-in duration-200">
                        {/* Fixed Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
                            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Plus className="h-5 w-5 text-indigo-500" />
                                สร้าง {DOC_TYPES[selectedDocType].label}
                            </h3>
                            <button onClick={() => setShowInputModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/10">
                            {/* Section 1: Items Selector */}
                            <Section
                                title="รายการต้นไม้จากดีล"
                                hint={isPaymentDoc ? "รายการสำหรับอ้างอิงในเอกสาร" : "เลือกและระบุจำนวนเพื่อออกเอกสาร"}
                                open={openSections.items}
                                onToggle={() => setOpenSections(s => ({ ...s, items: !s.items }))}
                            >
                                {!isPaymentDoc ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายการที่เลือก ({docLines.filter(l => l.included).length})</div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setDocLines(ls => ls.map(x => ({ ...x, included: true })))}
                                                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                                >
                                                    เลือกทั้งหมด
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDocLines(ls => ls.map(x => ({ ...x, included: false })))}
                                                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                                >
                                                    ไม่เลือกทั้งหมด
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                                            {docLines.map((line) => (
                                                <div key={line.id} className={`p - 4 flex items - start gap - 4 border - b border - slate - 50 dark: border - slate - 800 last: border - b - 0 transition - opacity ${ !line.included ? 'opacity-40' : '' } `}>
                                                    <div className="pt-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={line.included}
                                                            onChange={(e) => setDocLines(ls => ls.map(x => x.id === line.id ? { ...x, included: e.target.checked } : x))}
                                                            className="w-5 h-5 rounded-lg border-2 border-indigo-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </div>

                                                    <div className="flex-1 space-y-3">
                                                        <input
                                                            value={line.description}
                                                            onChange={(e) => setDocLines(ls => ls.map(x => x.id === line.id ? { ...x, description: e.target.value } : x))}
                                                            disabled={!line.included}
                                                            className="w-full font-bold text-sm border-2 border-slate-100 dark:border-slate-800 rounded-xl px-4 h-10 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800"
                                                            placeholder="ชื่อรายการ"
                                                        />

                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">จำนวน</label>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={line.max_qty}
                                                                    value={line.quantity}
                                                                    disabled={!line.included}
                                                                    onChange={(e) => {
                                                                        const v = Math.min(line.max_qty, Math.max(0, Number(e.target.value)));
                                                                        setDocLines(ls => ls.map(x => x.id === line.id ? { ...x, quantity: v } : x));
                                                                    }}
                                                                    className="w-full h-10 px-3 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all dark:bg-slate-800"
                                                                />
                                                                <span className="text-[9px] text-slate-400 mt-1 block font-medium">สูงสุด {line.max_qty}</span>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">หน่วย</label>
                                                                <input
                                                                    value={line.unit}
                                                                    disabled={!line.included}
                                                                    onChange={(e) => setDocLines(ls => ls.map(x => x.id === line.id ? { ...x, unit: e.target.value } : x))}
                                                                    className="w-full h-10 px-3 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all dark:bg-slate-800"
                                                                    placeholder="ต้น/ชุด"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block text-right">ราคา (ล็อก)</label>
                                                                <div className="w-full h-10 px-3 border-2 border-slate-50 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-800 rounded-xl text-sm flex items-center justify-end font-black text-slate-700 dark:text-slate-300">
                                                                    ฿{line.unitPrice.toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-4 bg-amber-50/50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-900/50">
                                            <input
                                                id="show-ref-items"
                                                type="checkbox"
                                                checked={showItemsRef}
                                                onChange={(e) => setShowItemsRef(e.target.checked)}
                                                className="w-5 h-5 rounded-lg border-2 border-amber-200 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                            />
                                            <label htmlFor="show-ref-items" className="text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer select-none">
                                                แสดงรายการต้นไม้จากดีลเพื่อการอ้างอิง (Reference Only)
                                            </label>
                                        </div>
                                        {showItemsRef && (
                                            <div className="space-y-2 opacity-60 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {docLines.map((line) => (
                                                    <div key={line.id} className="flex justify-between items-center text-xs p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300">{line.description}</span>
                                                        <span className="font-medium text-slate-500">{line.quantity} {line.unit} × ฿{line.unitPrice.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Section>

                            {/* Section 1.5: Customer Details (QT Only) */}
                            {selectedDocType === 'QT' && (
                                <Section
                                    title="ข้อมูลลูกค้า"
                                    hint="ระบุข้อมูลลูกค้าสำหรับใบเสนอราคา"
                                    open={openSections.customer}
                                    onToggle={() => setOpenSections(s => ({ ...s, customer: !s.customer }))}
                                >
                                    {prefillLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            กำลังโหลดข้อมูลลูกค้า...
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ชื่อลูกค้า</label>
                                                <input
                                                    type="text"
                                                    value={qtDraft.customer_name}
                                                    onChange={e => setQtDraft(d => ({ ...d, customer_name: e.target.value }))}
                                                    className="w-full h-11 px-3 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="ชื่อบุคคลหรือบริษัท"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">เบอร์โทร</label>
                                                <input
                                                    type="text"
                                                    value={qtDraft.customer_phone}
                                                    onChange={e => setQtDraft(d => ({ ...d, customer_phone: e.target.value }))}
                                                    className="w-full h-11 px-3 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="081-xxx-xxxx"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ที่อยู่</label>
                                                <textarea
                                                    value={qtDraft.customer_address}
                                                    onChange={e => setQtDraft(d => ({ ...d, customer_address: e.target.value }))}
                                                    rows={2}
                                                    className="w-full px-3 py-2 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all resize-none"
                                                    placeholder="ที่อยู่สำหรับออกใบเสนอราคา"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">เลขประจำตัวผู้เสียภาษี</label>
                                                <input
                                                    type="text"
                                                    value={qtDraft.customer_tax_id}
                                                    onChange={e => setQtDraft(d => ({ ...d, customer_tax_id: e.target.value }))}
                                                    className="w-full h-11 px-3 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="13 หลัก (ถ้ามี)"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">สาขา</label>
                                                <div className="flex gap-2 items-center h-11">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="branch_type"
                                                            checked={qtDraft.is_head_office}
                                                            onChange={() => setQtDraft(d => ({ ...d, is_head_office: true, branch_no: '' }))}
                                                            className="w-4 h-4 text-indigo-600 border-2 border-slate-300 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-sm font-medium">สำนักงานใหญ่</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="branch_type"
                                                            checked={!qtDraft.is_head_office}
                                                            onChange={() => setQtDraft(d => ({ ...d, is_head_office: false }))}
                                                            className="w-4 h-4 text-indigo-600 border-2 border-slate-300 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-sm font-medium">สาขา</span>
                                                    </label>
                                                    {!qtDraft.is_head_office && (
                                                        <input
                                                            type="text"
                                                            value={qtDraft.branch_no}
                                                            onChange={e => setQtDraft(d => ({ ...d, branch_no: e.target.value }))}
                                                            className="flex-1 h-9 px-3 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-sm focus:border-indigo-500 outline-none transition-all"
                                                            placeholder="เลขที่สาขา"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Section>
                            )}

                            {/* Section 1.75: QT Options (QT Only) */}
                            {selectedDocType === 'QT' && (
                                <Section
                                    title="ตัวเลือกใบเสนอราคา"
                                    hint="หมายเหตุ, เงื่อนไข, ธนาคาร, และผู้ลงนาม"
                                    open={openSections.qtOptions}
                                    onToggle={() => setOpenSections(s => ({ ...s, qtOptions: !s.qtOptions }))}
                                >
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">เลขที่เอกสาร</label>
                                                <input
                                                    type="text"
                                                    value={qtDraft.doc_no}
                                                    onChange={e => setQtDraft(d => ({ ...d, doc_no: e.target.value }))}
                                                    className="w-full h-11 px-3 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="AUTO (ระบบสร้างให้อัตโนมัติ)"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">วันที่เอกสาร (DD/MM/YYYY)</label>
                                                <input
                                                    type="date"
                                                    value={qtDraft.doc_date}
                                                    onChange={e => setQtDraft(d => ({ ...d, doc_date: e.target.value }))}
                                                    className="w-full h-11 px-3 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">หมายเหตุใบเสนอราคา</label>
                                            <textarea
                                                value={qtDraft.note}
                                                onChange={e => setQtDraft(d => ({ ...d, note: e.target.value }))}
                                                rows={2}
                                                className="w-full px-3 py-2 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all resize-none"
                                                placeholder="หมายเหตุที่จะแสดงในใบเสนอราคา"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">เงื่อนไขการชำระเงิน</label>
                                            <textarea
                                                value={qtDraft.payment_terms}
                                                onChange={e => setQtDraft(d => ({ ...d, payment_terms: e.target.value }))}
                                                rows={3}
                                                className="w-full px-3 py-2 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all resize-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ข้อมูลธนาคาร</label>
                                            <textarea
                                                value={qtDraft.bank_info}
                                                onChange={e => setQtDraft(d => ({ ...d, bank_info: e.target.value }))}
                                                rows={2}
                                                className="w-full px-3 py-2 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all resize-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ผู้มีอำนาจลงนาม</label>
                                            <select
                                                value={qtDraft.authorized_signer}
                                                onChange={e => setQtDraft(d => ({ ...d, authorized_signer: e.target.value as AuthorizedSigner }))}
                                                className="w-full h-11 px-3 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                            >
                                                {AUTHORIZED_SIGNERS.map(s => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </Section>
                            )}

                            {/* Section 2: Pricing (Only for QT/INV) */}
                            {!isPaymentDoc && (

                                <Section
                                    title="ขนส่ง & ส่วนลด"
                                    hint="ระบุค่าบริการขนส่งและส่วนลดโปรโมชั่น"
                                    open={openSections.pricing}
                                    onToggle={() => setOpenSections(s => ({ ...s, pricing: !s.pricing }))}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">ข้อมูลการขนส่ง</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ประเภทรถ</label>
                                                    <select
                                                        value={shipping.vehicle}
                                                        onChange={(e) => setShipping({ ...shipping, vehicle: e.target.value as any })}
                                                        className="w-full h-11 px-3 border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                    >
                                                        <option value="pickup">รถกระบะ</option>
                                                        <option value="truck6">รถ 6 ล้อ</option>
                                                        <option value="truck10">รถ 10 ล้อ</option>
                                                        <option value="other">อื่นๆ</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ค่าขนส่ง (บาท)</label>
                                                    <input
                                                        ref={shippingFeeRef}
                                                        type="number"
                                                        value={shipping.fee}
                                                        onChange={(e) => setShipping({ ...shipping, fee: Number(e.target.value) })}
                                                        className={`w - full h - 11 px - 3 border - 2 rounded - xl text - sm focus: border - indigo - 500 outline - none transition - all dark: bg - slate - 800 ${
    submitAttempted && issues.some(i => i.field === "shipping_fee")
        ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-900/10'
        : selectedDocType === 'QT' && shipping.fee <= 0
            ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10'
            : 'border-slate-100 dark:border-slate-700'
} `}
                                                    />
                                                    {submitAttempted && issues.some(i => i.field === "shipping_fee") && (
                                                        <div className="mt-1 text-[11px] font-bold text-amber-700">
                                                            {issues.find(i => i.field === "shipping_fee")?.message}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">หมายเหตุขนส่ง</label>
                                                <input
                                                    value={shipping.note}
                                                    onChange={(e) => setShipping({ ...shipping, note: e.target.value })}
                                                    className="w-full h-11 px-3 border-2 border-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="เช่น รวมขึ้นยก"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">ส่วนลด</div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">จำนวนส่วนลด (บาท)</label>
                                                <input
                                                    ref={discountAmountRef}
                                                    type="number"
                                                    value={discountData.amount}
                                                    onChange={(e) => setDiscountData({ ...discountData, amount: Number(e.target.value) })}
                                                    className={`w - full h - 11 px - 3 border - 2 rounded - xl text - sm focus: border - indigo - 500 outline - none transition - all dark: bg - slate - 800 ${
    submitAttempted && issues.some(i => i.field === "discount_amount")
        ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-900/10'
        : 'border-slate-100 dark:border-slate-700'
} `}
                                                />
                                                {submitAttempted && issues.some(i => i.field === "discount_amount") && (
                                                    <div className="mt-1 text-[11px] font-bold text-amber-700">
                                                        {issues.find(i => i.field === "discount_amount")?.message}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">เหตุผลส่วนลด</label>
                                                <input
                                                    value={discountData.reason}
                                                    onChange={(e) => setDiscountData({ ...discountData, reason: e.target.value })}
                                                    className="w-full h-11 px-3 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                    placeholder="ระบุเหตุผล"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Section>
                            )}

                            {/* Section 3: Extra Info / Payment Info */}
                            <Section
                                title={isPaymentDoc ? "ข้อมูลการชำระเงิน" : "หมายเหตุ & ข้อมูลเพิ่มเติม"}
                                hint="วันครบกำหนด, ช่องทางการเงิน และ VAT"
                                open={openSections.extra}
                                onToggle={() => setOpenSections(s => ({ ...s, extra: !s.extra }))}
                            >
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedDocType === 'INV' && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">วันครบกำหนดชำระ</label>
                                                <input
                                                    type="date"
                                                    value={specificInputs.due_date}
                                                    onChange={(e) => setSpecificInputs({ ...specificInputs, due_date: e.target.value })}
                                                    className="w-full h-11 px-4 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        )}
                                        {selectedDocType === 'QT' && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">กำหนดยืนราคาถึงวันที่</label>
                                                <input
                                                    type="date"
                                                    value={validUntil}
                                                    onChange={(e) => setValidUntil(e.target.value)}
                                                    className="w-full h-11 px-4 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        )}
                                        {isPaymentDoc && (
                                            <div className="space-y-4 col-span-2">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{selectedDocType === 'DEP' ? 'ยอดเงินมัดจำ' : 'ยอดชำระ'}</label>
                                                        <input
                                                            type="number"
                                                            value={selectedDocType === 'DEP' ? specificInputs.deposit_amount : specificInputs.paid_amount}
                                                            onChange={(e) => setSpecificInputs({ ...specificInputs, [selectedDocType === 'DEP' ? 'deposit_amount' : 'paid_amount']: Number(e.target.value) })}
                                                            className="w-full h-11 px-4 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ช่องทาง</label>
                                                        <select
                                                            value={specificInputs.payment_method}
                                                            onChange={(e) => setSpecificInputs({ ...specificInputs, payment_method: e.target.value })}
                                                            className="w-full h-11 px-4 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                        >
                                                            <option>โอนเงินผ่านธนาคาร</option>
                                                            <option>เงินสด</option>
                                                            <option>เช็ค</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">อ้างอิง (เช่น สลิป)</label>
                                                    <input
                                                        type="text"
                                                        value={specificInputs.payment_ref}
                                                        onChange={(e) => setSpecificInputs({ ...specificInputs, payment_ref: e.target.value })}
                                                        className="w-full h-11 px-4 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all"
                                                        placeholder="ระบุเลขอ้างอิง"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">หมายเหตุเพิ่มเติม</label>
                                        <textarea
                                            value={specificInputs.terms}
                                            onChange={(e) => setSpecificInputs({ ...specificInputs, terms: e.target.value })}
                                            className="w-full h-20 px-4 py-3 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-800 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all resize-none"
                                            placeholder="เงื่อนไข หรือ หมายเหตุท้ายเอกสาร"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
                                        <input
                                            id="vat-toggle"
                                            type="checkbox"
                                            checked={vatEnabled}
                                            onChange={(e) => setVatEnabled(e.target.checked)}
                                            className="w-5 h-5 rounded-lg border-2 border-indigo-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <label htmlFor="vat-toggle" className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                                            คิดภาษีมูลค่าเพิ่ม (VAT 7%)
                                        </label>
                                    </div>
                                </div>
                            </Section>
                        </div>

                        {/* Sticky Footer */}
                        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 p-6 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)] z-10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-indigo-600">
                                        <Download className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">ยอดสุทธิ (Grand Total)</div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-slate-900 dark:text-white">฿{footerGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <span className={`text - [10px] px - 2 py - 0.5 rounded - full font - black uppercase tracking - tighter ${ vatEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500' } `}>
                                                {vatEnabled ? 'VAT 7% Incl.' : 'No VAT'}
                                            </span>
                                            {/* ✅ Warning badge for issue count */}
                                            {issues.length > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter bg-amber-100 text-amber-700">
                                                    แก้ไขข้อมูล ({issues.length})
                                                </span>
                                            )}
                                        </div>
                                        {/* ✅ E3: Validation warning message */}
                                        {footerErrorText && (
                                            <div className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {footerErrorText}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                    <div className="flex items-center gap-3 w-full">
                                        <button
                                            onClick={() => setShowInputModal(false)}
                                            className="flex-1 md:flex-none px-8 py-3.5 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={handleGenerate}
                                            disabled={generating || !canSubmit}
                                            title={!canSubmit ? issues.map(i => i.message).join(" • ") : undefined}
                                            className={`flex - 1 md: flex - none px - 10 py - 3.5 rounded - 2xl text - sm font - black shadow - lg transition - all flex items - center justify - center gap - 2 ${
    generating || !canSubmit
        ? 'bg-slate-300 text-slate-600 cursor-not-allowed shadow-none'
        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
} `}
                                        >
                                            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                            ยืนยันการสร้าง
                                        </button>
                                    </div>
                                    {/* ✅ E4: Mobile-friendly disabled reason */}
                                    {!canSubmit && (
                                        <div className="text-[11px] font-bold text-slate-500 text-right">
                                            กรุณาแก้ไข: {issues.map(i => i.message).join(" • ")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-[70] flex flex-col bg-slate-900/90 backdrop-blur-md overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowPreview(null)} className="p-2 hover:bg-slate-100 rounded-full dark:hover:bg-slate-700 dark:text-white">
                                <X className="h-6 w-6" />
                            </button>
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-white leading-tight">{showPreview.doc_no}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preview Mode</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                            >
                                <Eye className="h-4 w-4" /> พรีวิวพิมพ์
                            </button>
                            {/* Download: disabled if hard blocked (tampered) */}
                            <button
                                disabled={showPreview.tampered_at != null}
                                title={showPreview.tampered_at ? 'Cannot download tampered document' : 'ดาวน์โหลด PDF'}
                                className={`flex items - center gap - 2 px - 4 py - 2 rounded - xl text - sm font - bold shadow - lg transition - all ${
    showPreview.tampered_at
        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
} `}
                            >
                                <Download className="h-4 w-4" /> ดาวน์โหลด PDF
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4 md:p-12">
                        {/* Audit strip (outside A4 print body) */}
                        <DocumentAuditStrip doc={showPreview ?? {}} />

                        <DocumentPrintTemplate
                            payload={showPreview.payload as DocumentPayload}
                            status={showPreview.status}
                        />
                    </div>
                </div>
            )}

            {/* Void Modal */}
            {showVoidModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden dark:bg-slate-800">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-red-500/10">
                                <Ban className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">ยกเลิกเอกสาร?</h3>
                            <p className="text-sm text-slate-500 mb-6">คุณกำลังจะเปลี่ยนสถานะเอกสารเป็น VOID ซึ่งไม่สามารถแก้ไขกลับได้ กรุณาระบุเหตุผล</p>
                            <input
                                type="text"
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                placeholder="ระบุเหตุผลที่ยกเลิก..."
                                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-red-500 outline-none transition-all mb-6 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setShowVoidModal(null)} disabled={voidLoading} className="flex-1 py-3 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">ไม่ใช่</button>
                                <button onClick={handleVoid} disabled={!voidReason.trim() || voidLoading} className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {voidLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {voidLoading ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Mark Tampered Modal */}
            {showMarkTamperedModal && (
                <MarkTamperedModal
                    docNo={showMarkTamperedModal.doc_no}
                    loading={tamperLoading}
                    onConfirm={async (reason) => {
                        const success = await markTampered(showMarkTamperedModal.id, reason);
                        if (success) {
                            setShowMarkTamperedModal(null);
                            await refetch();
                        }
                    }}
                    onClose={() => setShowMarkTamperedModal(null)}
                />
            )}

            {/* Unmark Tampered Modal */}
            {showUnmarkTamperedModal && (
                <UnmarkTamperedModal
                    docNo={showUnmarkTamperedModal.doc_no}
                    loading={tamperLoading}
                    onConfirm={async (reason) => {
                        const success = await unmarkTampered(showUnmarkTamperedModal.id, reason);
                        if (success) {
                            setShowUnmarkTamperedModal(null);
                            await refetch();
                        }
                    }}
                    onClose={() => setShowUnmarkTamperedModal(null)}
                />
            )}
        </div>
    );
};

export default DealDocumentsPanel;
