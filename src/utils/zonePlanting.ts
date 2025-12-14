// zonePlanting.ts - Helper functions for zone planting calculations

export interface ZoneSummary {
    zoneId: string;
    totalPlanned: number;
    totalRemaining: number;
}

/**
 * สร้าง summary ต่อแปลงจาก stock overview rows
 * คำนวณ planned = available + reserved
 * คำนวณ remaining = available
 */
export function buildZoneSummaryFromStock(rows: any[]): Record<string, ZoneSummary> {
    const map: Record<string, ZoneSummary> = {};

    for (const r of rows) {
        const zoneId = r.zone_id;
        if (!zoneId) continue;

        const planned = (r.quantity_available || 0) + (r.quantity_reserved || 0);
        const remaining = r.quantity_available || 0;

        if (!map[zoneId]) {
            map[zoneId] = {
                zoneId,
                totalPlanned: 0,
                totalRemaining: 0,
            };
        }

        map[zoneId].totalPlanned += planned;
        map[zoneId].totalRemaining += remaining;
    }

    return map;
}
