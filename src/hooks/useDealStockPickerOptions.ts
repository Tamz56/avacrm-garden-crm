// src/hooks/useDealStockPickerOptions.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type DealStockPickerOption = {
    // NOTE: ทำให้ยืดหยุ่นขึ้น เพราะ view ปัจจุบันอาจไม่ได้มีทุกฟิลด์เก่า
    species_name_th: string | null;
    species_name_en?: string | null;
    species_code?: string | null;

    size_label: string | null;
    height_label?: string | null;

    grade_name?: string | null;
    grade_code?: string | null;

    zone_name: string | null;   // เปลี่ยนเป็น nullable กันพัง
    zone_key?: string | null;

    // ฟิลด์ที่ UI ใช้
    available_qty: number;
    total_qty: number;
    reserved_qty: number;

    unit_price?: number | null;

    // เผื่อมี id ของ stock group
    stock_group_id?: string;
    plot_key?: string | null;

    // เผื่อมีฟิลด์จาก view โดยตรง (ไว้ map)
    qty_available?: number;
    qty_total?: number;
    qty_reserved?: number;
};

/**
 * Hook สำหรับดึงสต็อก โดยกรองตามขนาด (sizeLabel)
 * ถ้าไม่ส่ง sizeLabel จะคืน empty array (บังคับเลือกขนาดก่อน)
 */
export function useDealStockPickerOptions(sizeLabel?: string | null) {
    const [options, setOptions] = useState<DealStockPickerOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            // ถ้าไม่มี sizeLabel ให้คืน empty (บังคับเลือกขนาดก่อน)
            if (!sizeLabel) {
                setOptions([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            // เรียก RPC ที่กรองตาม size แล้ว
            const { data, error } = await supabase.rpc(
                "get_deal_stock_picker_by_size_v1",
                { p_size_label: sizeLabel }
            );

            if (cancelled) return;

            if (error) {
                console.error("get_deal_stock_picker_by_size_v1 error:", error);
                setError(error.message);
                setOptions([]);
            } else {
                const rows = (data ?? []).map((r: any) => ({
                    ...r,
                    // map ชื่อคอลัมน์ใหม่ -> ชื่อเดิมที่ UI ใช้
                    available_qty: Number(r.qty_available ?? 0),
                    total_qty: Number(r.qty_total ?? 0),
                    reserved_qty: Number(r.qty_reserved ?? 0),
                    // กัน zone_name ว่าง
                    zone_name: (r.zone_name ?? r.zone_key ?? "-") as string,
                })) as DealStockPickerOption[];

                setOptions(rows);
            }

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [sizeLabel]);

    return { options, loading, error };
}

/**
 * Helper function สำหรับสร้าง label ใน dropdown (แบบใหม่: ใช้ centralized formatter)
 * SINGLE SOURCE OF TRUTH: ใช้ buildStockDisplayLabel เพื่อกัน (null) ในทุกกรณี
 */
export function makeDealStockOptionLabel(o: DealStockPickerOption): string {
    // Import inline to avoid circular dependency (hook -> lib -> types)
    const clean = (v: string | null | undefined): string => {
        const s = (v ?? "").toString().trim();
        if (!s || s.toLowerCase() === "null") return "";
        return s;
    };

    // Build main label parts
    const species = clean(o.species_name_th) || clean(o.species_name_en) || clean(o.species_code) || "ไม่ทราบพันธุ์";
    const zone = clean(o.zone_name) || clean(o.zone_key);
    const zoneText = zone ? `โซน ${zone}` : "";

    const available = o.available_qty ?? Number(o.qty_available ?? 0);

    const pricePart =
        o.unit_price != null
            ? ` • ~${o.unit_price.toLocaleString("th-TH")}฿/ต้น`
            : "";

    // Format: "Silver Oak • โซน Z-A • พร้อมขาย 9 • ~6,000฿/ต้น"
    const parts = [species, zoneText, `พร้อมขาย ${available} ต้น`].filter(Boolean);
    return parts.join(" • ") + pricePart;
}
