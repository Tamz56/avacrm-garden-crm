export type ShipmentStatus = 'draft' | 'completed' | 'cancelled';

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
    draft: 'ร่าง',
    completed: 'ส่งครบแล้ว',
    cancelled: 'ยกเลิก',
};

export const SHIPMENT_STATUS_OPTIONS: { id: 'all' | ShipmentStatus; label: string }[] = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'draft', label: 'ร่าง' },
    { id: 'completed', label: 'ส่งครบแล้ว' },
    { id: 'cancelled', label: 'ยกเลิก' },
];
