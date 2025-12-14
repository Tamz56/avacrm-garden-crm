// src/hooks/useDealStockPickerOptions.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type DealStockPickerOption = {
    species_id: string;
    species_name_th: string | null;
    species_name_en: string | null;
    species_code: string | null;

    size_label: string | null;
    height_label: string | null;
    grade_id: string | null;
    grade_name: string | null;
    grade_code: string | null;

    zone_id: string;
    zone_name: string;
    farm_name: string;

    available_qty: number;
    total_qty: number;
    reserved_qty: number;
    dig_ordered_qty: number;

    unit_price?: number | null;
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
                setOptions((data ?? []) as DealStockPickerOption[]);
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

    const pricePart =
        o.unit_price != null
            ? ` ~${o.unit_price.toLocaleString("th-TH")}฿/ต้น`
            : "";

    return `${species} : ขนาด ${o.size_label ?? "-"}" : เกรด ${grade} : โซน ${o.zone_name} : พร้อมขาย ${o.available_qty} ต้น${pricePart}`;
}
