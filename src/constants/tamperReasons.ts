// src/constants/tamperReasons.ts
// Preset tamper reason codes for deal document integrity tracking

export const TAMPER_REASONS = [
    { code: 'CHECKSUM_MISMATCH', label: 'Checksum mismatch (ตรวจพบ checksum ไม่ตรง)' },
    { code: 'PDF_REPLACED', label: 'PDF ถูกเปลี่ยน/อัปโหลดใหม่ผิดปกติ' },
    { code: 'WRONG_CUSTOMER_DATA', label: 'ข้อมูลลูกค้าผิด' },
    { code: 'WRONG_DEAL_LINK', label: 'เอกสารถูกผูกผิดดีล' },
    { code: 'DUPLICATE_DOC', label: 'ออกเอกสารซ้ำ/เลขเอกสารผิดชุด' },
    { code: 'CANCELLED_BY_ADMIN', label: 'ผู้บริหารสั่งยกเลิก' },
    { code: 'SUSPECTED_FRAUD', label: 'สงสัยการปลอมแปลง/ทุจริต' },
    { code: 'OTHER', label: 'อื่นๆ' },
] as const;

export type TamperReasonCode = typeof TAMPER_REASONS[number]['code'];

/**
 * Build formatted tamper reason string: "CODE | note" or just "CODE"
 */
export function buildTamperedReason(code: string, note?: string): string {
    const cleanNote = (note || '').trim();
    return cleanNote ? `${code} | ${cleanNote}` : code;
}
