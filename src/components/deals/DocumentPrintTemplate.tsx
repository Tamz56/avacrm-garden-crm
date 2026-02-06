import React, { useEffect } from 'react';
import type { DocumentPayload, DocType } from '../../types/dealDocuments';

// Re-export for backwards compatibility
export type { DocumentPayload };

type Props = {
    payload?: DocumentPayload;
    doc?: { payload?: DocumentPayload; status?: 'draft' | 'issued' | 'cancelled' };
    status?: 'draft' | 'issued' | 'cancelled';
};

const DOC_TITLES: Record<DocType, { th: string; en: string }> = {
    QT: { th: 'ใบเสนอราคา', en: 'QUOTATION' },
    INV: { th: 'ใบแจ้งหนี้', en: 'INVOICE' },
    DEP: { th: 'ใบมัดจำ', en: 'DEPOSIT RECEIPT' },
    RCPT: { th: 'ใบเสร็จรับเงิน', en: 'RECEIPT' },
};

const DOC_COPY_LABEL: Record<string, { th: string; en: string }> = {
    original: { th: 'ต้นฉบับ', en: 'ORIGINAL' },
    copy: { th: 'สำเนา', en: 'COPY' },
};

// --- QT Defaults (Farm Standard) ---
const DEFAULT_QT_BANK_INFO =
    `บัญชี ห้างหุ้นส่วนจำกัด เอวาฟาร์ม 888
ธนาคารกสิกรไทย เลขที่บัญชี 356658521`;

const DEFAULT_QT_TERMS =
    `- กำหนดชำระเงินมัดจำ 50% หลังจากได้รับใบสั่งซื้อ (PO)
- กำหนดชำระเงินส่วนที่เหลือเมื่อส่งมอบสินค้า/บริการตามรายการ`;

// --- Authorized Signers (Only 2) ---
const AUTH_SIGNER_LABEL: Record<string, string> = {
    apirak: 'นายอภิรักษ์ ประเภโส',
    yongyuth: 'นายยงยุทธ รวยลาภ',
};

const resolveSignerName = (v?: string | null) => {
    if (!v) return '';
    const key = String(v).trim();
    return AUTH_SIGNER_LABEL[key] ?? key;
};

// ✅ Helper for DD/MM/YYYY
const formatDMY = (iso?: string) => {
    if (!iso) return '-';
    // Fallback if not ISO
    if (!iso.includes('-')) return iso;

    // Check if it's full ISO string (T-sep)
    const datePart = iso.split('T')[0];
    const [y, m, d] = datePart.split('-');

    if (!y || !m || !d) return iso;

    // Convert to Thai month name if preferred, or just DD/MM/YYYY
    // User requested "03/02/2026"
    return `${d}/${m}/${y}`;
};

// Dynamic signature labels based on doc_type
const getSignatureLabels = (t?: DocType) => {
    const left =
        t === 'QT' || t === 'INV'
            ? 'ผู้สั่งซื้อ / ลูกค้า'
            : t === 'DEP' || t === 'RCPT'
                ? 'ผู้ชำระเงิน'
                : 'ผู้เกี่ยวข้อง';

    const RIGHT_MAP: Partial<Record<DocType, string>> = {
        QT: 'ผู้เสนอราคา / ผู้มีอำนาจลงนาม',
        INV: 'ผู้วางบิล / ผู้มีอำนาจลงนาม',
        DEP: 'ผู้รับมัดจำ / ผู้มีอำนาจลงนาม',
        RCPT: 'ผู้รับเงิน / ผู้มีอำนาจลงนาม',
    };

    const right = RIGHT_MAP[t as DocType] ?? 'ผู้มีอำนาจลงนาม';
    return { left, right };
};


export const DocumentPrintTemplate: React.FC<Props> = ({ payload: directPayload, doc, status: directStatus }) => {
    const rawPayload = (doc?.payload ?? directPayload) as DocumentPayload | undefined;
    const status = doc?.status ?? directStatus;

    // --- HOISTED FOR HOOKS (Safe Defaults) ---
    useEffect(() => {
        const id = 'sarabun-font-link';
        if (document.getElementById(id)) return;

        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href =
            'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap';
        document.head.appendChild(link);
    }, []);

    const items = (rawPayload?.items && Array.isArray(rawPayload.items)) ? rawPayload.items : [];
    const payload = rawPayload || { shipping: {}, discount: {}, toggles: {} } as any;

    const useVat = payload.toggles?.vat_enabled !== false;

    // ✅ Virtual Shipping Row Logic & Subtotal Safeguard (Moved to top level)
    const { rows, itemsSubTotal, grandTotal } = React.useMemo(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const base: any[] = [...items];
        const shippingFee = Number(payload.shipping?.fee ?? 0);
        const shippingNote = payload.shipping?.note;

        // 2. Add Virtual Shipping Row if needed
        const hasShippingItem = base.some((i: any) => i.is_shipping || i.id === 'shipping-fee');
        if (shippingFee > 0 && !hasShippingItem) {
            base.push({
                id: 'shipping-virtual',
                description: 'ค่าขนส่ง',
                subText: shippingNote ? `(${shippingNote})` : undefined,
                quantity: 1,
                unit: 'เที่ยว',
                unitPrice: shippingFee,
                amount: shippingFee,
                // @ts-ignore
                is_shipping: true,
            } as any);
        }

        // 1. Calculate SubTotal from base items ONLY (safeguard - exclude shipping)
        const sub = base
            .filter((it: any) => !(it.is_shipping || it.description === 'ค่าขนส่ง'))
            .reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);

        // 3. Calculate Grand Total
        // gross = sum of all items (inc. shipping)
        const gross = base.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
        const grand = gross - (Number(payload.discount?.amount) || 0);

        return { rows: base, itemsSubTotal: sub, grandTotal: grand };
    }, [items, payload.shipping, payload.discount]);

    // --- EARLY RETURN IF NO DATA ---
    if (!rawPayload) {
        return <div className="p-4 text-red-500">ไม่พบข้อมูลเอกสาร (payload)</div>;
    }

    // --- DERIVED DATA (Guaranteed rawPayload exists) ---
    const doc_type = rawPayload.doc_type;
    const specific = rawPayload.specific ?? {};

    const company = rawPayload.company ?? {
        name: '', address: '', phone: '', tax_id: '', branch: '', logo_url: null
    };

    const customer = rawPayload.customer ?? {
        name: '', address: '', phone: '', tax_id: '', branch: ''
    };

    const totals = rawPayload.totals ?? {
        subTotal: 0, vatBase: 0, vatRate: 7, vatAmount: 0, grandTotal: 0, bahtText: ''
    };

    const { left: leftSigLabel, right: rightSigLabel } = getSignatureLabels(doc_type);

    // Copy/Original Logic
    // @ts-ignore
    const isCopy = rawPayload?.isCopy === true;
    // const copyLabel = isCopy ? DOC_COPY_LABEL.copy : DOC_COPY_LABEL.original;



    const BRAND_BORDER = "border-emerald-800";
    const titles = DOC_TITLES[doc_type] || { th: 'เอกสาร', en: 'DOCUMENT' };

    // Helper to format date
    // const dateStr = formatDMY(payload.doc_no ? payload.doc_date : undefined) || '...................';

    return (
        <div
            id="unified-doc-print"
            className="
                relative bg-white text-slate-900 text-[12px]
                w-[210mm] min-h-[297mm] 
                mx-auto 
                p-[15mm_20mm] 
                shadow-lg 
                print:shadow-none print:w-full print:m-0
                flex flex-col
                print:pb-[12mm]
            "
            style={{ fontFamily: '"Sarabun", sans-serif' }}
        >
            {/* Watermark for Cancelled */}
            {status === 'cancelled' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 rotate-[-45deg] z-50">
                    <span className="text-9xl font-bold border-8 border-red-600 p-10 text-red-600 uppercase">CANCELLED</span>
                </div>
            )}

            {/* ========== CONTENT SECTION (No flex-grow) ========== */}
            <div>

                {/* Header - Company + Document Title */}
                <header className="relative z-10 flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
                    {/* LEFT: Logo + Farm info (STACKED & COMPACT) */}
                    <div className="flex flex-col items-start max-w-[55%]">
                        <img
                            src="/avafarm888-logo.png"
                            alt="AVA FARM 888"
                            className="w-[84px] h-auto"
                        />

                        <div className="mt-2 text-[10.5px] leading-[1.45] text-slate-700">
                            <div className="font-semibold text-slate-900">
                                ห้างหุ้นส่วนจำกัด เอวาฟาร์ม 888 สำนักงานใหญ่
                            </div>
                            <div>
                                888 หมู่ 5 ต. พญาเย็น อ. ปากช่อง จ. นครราชสีมา 30320
                            </div>
                            <div>
                                โทร. 097-7951888 | e-mail: office.avafarm888@gmail.com
                            </div>
                            <div>
                                เลขประจำตัวผู้เสียภาษี 0303563002557
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Doc title box */}
                    <div className="flex flex-col items-end gap-1 max-w-[45%]">
                        {/* Doc title box (Reduced Size & Tight Spacing) */}
                        <div className={`border ${BRAND_BORDER} rounded-[18px] px-8 py-2 text-center`}>
                            <h2 className="text-[22px] font-semibold leading-none text-slate-900">
                                {titles.th}
                            </h2>
                            <div className="mt-1 text-[11px] tracking-[0.22em] text-slate-600 font-semibold uppercase">
                                {titles.en}
                            </div>

                            {/* Original / Copy */}
                            <div className="mt-1 text-[10px] text-slate-500 uppercase">
                                {isCopy ? "สำเนา / COPY" : "ต้นฉบับ / ORIGINAL"}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Customer Info Bar - 3 Columns: Client | Branch | No/Date */}
                <div className="flex justify-between items-start mb-5 text-[11px] border-b border-transparent pb-2">
                    {/* 1. Client Info (Left) */}
                    <div className="flex-1 max-w-[50%] flex gap-2">
                        <span className="font-bold min-w-[50px] text-zinc-500 mt-0.5">
                            ลูกค้า :
                        </span>
                        <div>
                            <p className="font-bold text-[13px] text-slate-900 leading-tight">{customer.name || '-'}</p>
                            <p className="text-zinc-700 whitespace-pre-line leading-tight mt-1">
                                {customer.address || ''}
                            </p>
                            {customer.phone && (
                                <p className="text-zinc-500 mt-1">โทร: {customer.phone}</p>
                            )}
                            {customer.tax_id && (
                                <p className="text-zinc-600 mt-1">
                                    <span className="font-bold">เลขผู้เสียภาษี:</span> {customer.tax_id}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 2. Branch Info (Middle - No border) */}
                    <div className="mx-4">
                        <div className="flex flex-col gap-1 text-slate-700">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={!customer.branch || customer.branch === 'สำนักงานใหญ่'}
                                    readOnly
                                    className="accent-emerald-600 scale-90"
                                />
                                <span>สำนักงานใหญ่</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={!!customer.branch && customer.branch !== 'สำนักงานใหญ่'}
                                    readOnly
                                    className="accent-emerald-600 scale-90"
                                />
                                <span>สาขา ........................</span>
                            </label>
                        </div>
                    </div>

                    {/* 3. No/Date Info (Right - Moved from Header) */}
                    <div className="min-w-[200px] border-l border-slate-300 pl-3 py-1">
                        <div className="grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5 justify-start items-baseline text-left">
                            <span className="font-semibold text-slate-500 tracking-wide">เลขที่ / NO.</span>
                            <span className="font-bold text-slate-900 text-[13px]">
                                {payload.doc_no || "AUTO"}
                            </span>

                            <span className="font-semibold text-slate-500 tracking-wide">วันที่ / DATE</span>
                            <span className="text-slate-900 text-[12px]">{formatDMY(payload.doc_date)}</span>

                            {/* Condition (credit term) placeholder if needed */}
                            <span className="font-semibold text-slate-500 tracking-wide">เงื่อนไข / TERM</span>
                            <span className="text-slate-900 text-[12px] border-b border-slate-300 min-w-[60px] inline-block h-[14px]"></span>
                        </div>
                    </div>
                </div>

                {/* Closing Sentence (Moved Here) */}
                {doc_type === 'QT' && (
                    <div className="text-slate-500 mb-2 italic">
                        เอวาฟาร์ม888 ขอขอบคุณท่านที่ให้ความสนใจในสินค้าและบริการของเรา และมีความยินดีเสนอราคาดังนี้
                    </div>
                )}

                {/* Items Table - Light Green Border Tone */}
                {/* Items Table - Modern Clean Style (No vertical borders) */}
                <table className="w-full text-[11px] table-fixed mb-1">
                    <thead>
                        <tr className="bg-emerald-600 text-white">
                            <th className="px-3 py-2 text-center w-[8%] first:rounded-tl-md">
                                <div className="text-[12px] font-semibold">ลำดับ</div>
                                <div className="text-[11px] opacity-90">No.</div>
                            </th>
                            <th className="px-3 py-2 text-center">
                                <div className="text-[12px] font-semibold">รายการ</div>
                                <div className="text-[11px] opacity-90">Description</div>
                            </th>
                            <th className="px-3 py-2 text-center w-[12%]">
                                <div className="text-[12px] font-semibold">จำนวน</div>
                                <div className="text-[11px] opacity-90">Quantity</div>
                            </th>
                            <th className="px-3 py-2 text-center w-[10%]">
                                <div className="text-[12px] font-semibold">หน่วย</div>
                                <div className="text-[11px] opacity-90">Unit</div>
                            </th>
                            <th className="px-3 py-2 text-center w-[15%]">
                                <div className="text-[12px] font-semibold">ราคาต่อหน่วย</div>
                                <div className="text-[11px] opacity-90">Unit Price</div>
                            </th>
                            <th className="px-3 py-2 text-center w-[15%] last:rounded-tr-md">
                                <div className="text-[12px] font-semibold">จำนวนเงิน</div>
                                <div className="text-[11px] opacity-90">Total</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((item, idx) => {
                            // @ts-ignore
                            // const isShipping = item.is_shipping || item.description === 'ค่าขนส่ง';
                            return (
                                <tr key={idx} className={`h-9 border-b border-emerald-300 last:border-b-0`}>
                                    <td className="p-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                                    <td className="p-2 font-bold text-slate-900 text-left">
                                        <div className="truncate whitespace-nowrap overflow-hidden">
                                            {item.description}
                                        </div>
                                    </td>
                                    <td className="p-2 text-center font-bold text-slate-900">{item.quantity}</td>
                                    <td className="p-2 text-center font-bold text-slate-900">{item.unit}</td>
                                    <td className="p-2 text-right text-slate-900">{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 text-right font-black text-slate-900">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table >

            </div > {/* end content div (was flex-grow) */}

            {/* ========== FOOTER (Sticky Bottom) ========== */}
            <footer className="relative z-10 mt-auto pt-4 avoid-break break-inside-avoid page-break-inside-avoid text-[9px]">
                {/* Remarks (QT/INV etc.) - อยู่บน Payment */}
                {specific?.note && (
                    <div className="border-l-2 border-amber-400 bg-amber-50/40 px-2 py-1.5 mb-3">
                        <span className="font-bold text-amber-700">หมายเหตุ : </span>
                        <span className="text-amber-900">{specific.note}</span>
                    </div>
                )}

                {/* Payment + Terms + Totals (Compact layout) */}
                <div className="grid grid-cols-12 gap-3">
                    {/* Left: Payment Method + Terms */}
                    <div className="col-span-7 space-y-2">
                        {/* Payment Method */}
                        <div className="border border-emerald-200 bg-emerald-50/30 px-2 py-1.5">
                            <div className="font-bold text-emerald-700 underline mb-0.5">
                                ช่องทางการชำระเงิน
                            </div>
                            <div className="text-emerald-900 whitespace-pre-line leading-tight">
                                {String(specific?.bank_info || DEFAULT_QT_BANK_INFO)}
                            </div>
                        </div>

                        {/* Terms */}
                        <div>
                            <div className="font-bold text-slate-600 mb-0.5">
                                **เงื่อนไขการชำระเงิน
                            </div>
                            <div className="text-slate-600 whitespace-pre-line leading-tight">
                                {String(specific?.terms || DEFAULT_QT_TERMS)}
                            </div>

                            {/* QT Valid Until */}
                            {payload.meta?.valid_until && (
                                <div className="mt-1 text-slate-600">
                                    <span className="font-bold">กำหนดยืนราคาถึงวันที่:</span>{' '}
                                    {new Date(payload.meta.valid_until).toLocaleDateString('th-TH')}
                                </div>
                            )}

                            {/* Shipping Info Removed as per user request */}
                            {/* Disclaimer Removed as per user request */}

                        </div>
                    </div>

                    {/* Right: Totals - Compact */}
                    <div className="col-span-5">
                        <div className="border border-slate-200 space-y-0">
                            {/* ✅ Explicitly calculated from items (excluding shipping row) */}
                            <div className="flex justify-between px-2 py-1 border-b border-slate-100">
                                <span className="text-slate-600">ราคารวม</span>
                                <span className="font-bold">{itemsSubTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* Shipping is shown both as a line item (table) and as a breakdown (summary) */}
                            {/* User requested to remove shipping fee from summary since it is in the table */}

                            {payload.discount && payload.discount.amount > 0 && (
                                <div className="flex justify-between px-2 py-1 border-b border-slate-100 text-rose-600">
                                    <span>ส่วนลด</span>
                                    <span className="font-bold">- {payload.discount.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}

                            <div className="flex justify-between px-2 py-1 border-b border-slate-100 font-bold">
                                <span>รวมทั้งสิ้น</span>
                                <span>{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            {useVat && (
                                <>
                                    <div className="flex justify-between px-2 py-1 border-b border-slate-100 text-slate-500">
                                        <span>ภาษีมูลค่าเพิ่ม / VAT {totals.vatRate}%</span>
                                        <span>{totals.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </>
                            )}

                            {/* Grand Total */}
                            <div className="flex justify-between px-2 py-1.5 bg-slate-50 font-black text-[11px]">
                                <span>ยอดสุทธิ / GRAND TOTAL</span>
                                <span className="text-emerald-700">{totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* Baht Text */}
                            <div className="px-2 py-1 text-center text-emerald-700 font-bold border-t border-slate-200">
                                {totals.bahtText}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Signature Area - Compact */}
                <div className="grid grid-cols-2 gap-8 mt-6 px-4 break-inside-avoid page-break-inside-avoid">
                    {/* Left: Customer/Buyer */}
                    <div className="text-center">
                        <p className="text-[11px] text-slate-700 font-semibold mb-2">ลงนามโดยผู้มีอำนาจสั่งซื้อ</p>
                        <div className="h-10 border-b border-slate-300 mb-1"></div>
                        <p className="font-bold text-slate-800 text-[10px]">{leftSigLabel}</p>
                        <p className="text-slate-400">CUSTOMER SIGNATURE</p>
                        <p className="text-slate-400 mt-1">วันที่ ......./......./.......</p>
                    </div>

                    {/* Right: Company/Authorized Signer */}
                    <div className="text-center">
                        <p className="text-[11px] text-slate-700 font-semibold mb-2">ขอแสดงความนับถือ</p>
                        <div className="h-10 border-b border-slate-300 mb-1"></div>
                        {resolveSignerName(specific?.authorized_signer) ? (
                            <>
                                <p className="font-bold text-slate-800 text-[10px]">
                                    {resolveSignerName(specific?.authorized_signer)}
                                </p>
                                <p className="text-slate-400">{rightSigLabel}</p>
                                <p className="text-slate-400">{company.name}</p>
                            </>
                        ) : (
                            <>
                                <p className="font-bold text-slate-800 text-[10px]">{rightSigLabel}</p>
                                <p className="text-slate-400">{company.name}</p>
                            </>
                        )}
                        <p className="text-slate-400">AUTHORIZED SIGNATURE</p>
                        <p className="text-slate-400 mt-1">วันที่ ......./......./.......</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
