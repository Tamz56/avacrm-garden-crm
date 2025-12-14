export type StockStatus = 'ready' | 'low' | 'empty' | 'planned_only';

export interface StockStatusConfig {
    lowThreshold: number; // เหลือ <= เท่านี้ถือว่า low
}

const DEFAULT_CONFIG: StockStatusConfig = {
    lowThreshold: 10,
};

export function getStockStatus(
    remaining: number,
    planned: number,
    config: StockStatusConfig = DEFAULT_CONFIG
): StockStatus {
    if (remaining > config.lowThreshold) return 'ready';
    if (remaining > 0) return 'low';
    if (remaining === 0 && planned > 0) return 'planned_only';
    return 'empty';
}

/**
 * ถ้ามี status จาก DB (เช่น 'available', 'low', 'reserved')
 * สามารถใช้เป็น override ได้
 */
export function mapDbStatusToStockStatus(
    dbStatus: string | null | undefined,
    remaining: number,
    planned: number,
    config: StockStatusConfig = DEFAULT_CONFIG
): StockStatus {
    // คำนวณจากจำนวนเป็นหลัก
    const baseStatus = getStockStatus(remaining, planned, config);

    if (!dbStatus) return baseStatus;

    switch (dbStatus) {
        case 'low':
            // ถ้า DB บอก low ให้ถือว่า low เสมอ (manual flag)
            return 'low';
        case 'available':
            // ถ้า available แต่จำนวนเข้าข่าย low/empty ให้ตามจำนวนจริง
            return baseStatus;
        default:
            return baseStatus;
    }
}

export function getStockStatusLabel(status: StockStatus): string {
    switch (status) {
        case 'ready':
            return 'พร้อมขาย';
        case 'low':
            return 'ใกล้หมด';
        case 'planned_only':
            return 'มีแผนปลูก';
        case 'empty':
        default:
            return 'หมดโซน';
    }
}

export function getStockStatusClassName(status: StockStatus): string {
    switch (status) {
        case 'ready':
            return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        case 'low':
            return 'bg-amber-50 text-amber-700 border border-amber-200';
        case 'planned_only':
            return 'bg-sky-50 text-sky-700 border border-sky-200';
        case 'empty':
        default:
            return 'bg-rose-50 text-rose-700 border border-rose-200';
    }
}
