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

export function useDealStockPickerOptions() {
    const [options, setOptions] = useState<DealStockPickerOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            // ใช้ select('*') เพื่อกันปัญหา column ไม่ตรงกับ view
            const { data, error } = await supabase
                .from("view_deal_stock_picker")
                .select("*")
                .order("species_name_th", { ascending: true })
                .order("size_label", { ascending: true })
                .order("zone_name", { ascending: true });

            if (cancelled) return;

            if (error) {
                console.error("view_deal_stock_picker error:", error);
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
    }, []);

    return { options, loading, error };
}

/**
 * Helper function สำหรับสร้าง label ใน dropdown
 */
export function makeDealStockOptionLabel(o: DealStockPickerOption): string {
    const species =
        o.species_name_th ??
        o.species_name_en ??
        o.species_code ??
        "ไม่ทราบพันธุ์";

    const grade = o.grade_name ?? o.grade_code ?? "-";

    const available = o.available_qty ?? Number(o.qty_available ?? 0);

    const pricePart =
        o.unit_price != null
            ? ` ~${o.unit_price.toLocaleString("th-TH")}฿/ต้น`
            : "";

    return `${species} : ขนาด ${o.size_label ?? "-"}" : เกรด ${grade} : โซน ${o.zone_name ?? o.zone_key ?? "-"} : พร้อมขาย ${available} ต้น${pricePart}`;
}
