/**
 * แปลงค่าที่ user พิมพ์ (เช่น "1.5m", "1,5", " 2 ") ให้เป็น
 * string เลขล้วนหน่วยเมตร เช่น "1.5", "2"
 * ถ้าไม่สามารถแปลงได้ / <= 0 ให้คืน null
 */
export function normalizeHeightLabel(input: string): string | null {
    const trimmed = (input ?? "").trim();
    if (!trimmed) return null;

    // เอาเฉพาะเลข จุด คอมมา
    const cleaned = trimmed.replace(/[^0-9.,]/g, "");
    if (!cleaned) return null;

    const normalized = cleaned.replace(",", ".");
    const value = Number(normalized);

    if (!isFinite(value) || value <= 0) return null;

    // ถ้าอยาก fix ทศนิยม 2 ตำแหน่ง: return value.toFixed(2);
    return String(value);
}

/**
 * ใช้ตอนแสดงผลใน UI
 * ถ้า heightLabel มีค่า → แสดง "x ม."
 * ถ้าไม่มี → แสดง "-"
 */
export function formatHeightLabel(heightLabel?: string | null): string {
    if (!heightLabel) return "-";
    return `${heightLabel} ม.`;
}
