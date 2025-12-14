// รวมแผน = คงเหลือ + จอง
export const getPlannedQty = (row) =>
    (row.quantity_available || 0) + (row.quantity_reserved || 0);

export const getRemainingQty = (row) => row.quantity_available || 0;

export const getRowValue = (row) =>
    (row.base_price || 0) * getRemainingQty(row);

// KPI ด้านบน
export const getTotalRemaining = (rows) =>
    rows.reduce((sum, r) => sum + getRemainingQty(r), 0);

export const getTotalValue = (rows) =>
    rows.reduce((sum, r) => sum + getRowValue(r), 0);

export const getZoneCount = (rows) =>
    new Set(rows.map((r) => r.zone_id)).size;

// โซนที่ใกล้หมด (ไว้ใช้ในแถบเหลือง)
export const getLowStockItems = (rows) => {
    return rows
        .filter((r) => {
            const planned = getPlannedQty(r);
            const remaining = getRemainingQty(r);
            if (planned === 0) return false;
            const ratio = remaining / planned;

            // เกณฑ์คร่าว ๆ: เหลือต่ำกว่า 40% หรือ เหลือน้อยกว่า 10 ต้น
            return remaining > 0 && (ratio <= 0.4 || remaining <= 10);
        })
        .slice(0, 5); // แสดงแค่ 5 การ์ดแรกพอ
};
