// src/lib/stockPickerFormat.ts
// Centralized formatters for Stock Picker UI - hide null/empty values cleanly
// SINGLE SOURCE OF TRUTH: All stock label/description building MUST use these functions

import type { DealStockPickerRow } from "../types/stockPicker";

// Generic nullable string type
export type Maybe = string | null | undefined;

/**
 * Clean a single value - removes null/undefined/empty/"null" strings
 */
export function clean(v: Maybe): string {
    const s = (v ?? "").toString().trim();
    if (!s) return "";
    if (s.toLowerCase() === "null") return "";
    return s;
}

/**
 * SINGLE SOURCE OF TRUTH: Build stock display label from array of parts
 * Cleans all null/undefined/""/"null" and joins with " · "
 * Usage: buildStockDisplayLabel([species, size, zone, plot, height, pot])
 */
export function buildStockDisplayLabel(parts: Maybe[]): string {
    return parts.map(clean).filter(Boolean).join(" · ");
}

function hasText(v: unknown): v is string {
    return typeof v === "string" && v.trim().length > 0 && v.toLowerCase() !== "null";
}

/**
 * Generate a clean label for stock picker row
 * Hides null/empty fields - no more "(null)" in UI
 */
export function stockPickerLabel(row: DealStockPickerRow): string {
    const parts: string[] = [];

    if (hasText(row.species_name_th)) parts.push(row.species_name_th);
    if (hasText(row.size_label)) parts.push(row.size_label);
    if (hasText(row.zone_key)) parts.push(`โซน ${row.zone_key}`);
    if (hasText(row.plot_key)) parts.push(`แปลง ${row.plot_key}`);
    if (hasText(row.height_label)) parts.push(`สูง ${row.height_label}`);
    if (hasText(row.pot_size_label)) parts.push(`กระถาง ${row.pot_size_label}`);

    return parts.join(" · ");
}

/**
 * Generate availability + price metadata text
 */
export function stockPickerMeta(row: DealStockPickerRow): string {
    const avail = Number(row.qty_available ?? 0);
    const price = row.unit_price == null ? null : Number(row.unit_price);
    const meta: string[] = [];
    meta.push(`เหลือ ${avail}`);
    if (Number.isFinite(price) && price !== null) {
        meta.push(`${price.toLocaleString("th-TH")} บาท`);
    }
    return meta.join(" · ");
}

/**
 * Safe display value - returns "-" for null/empty, otherwise the value
 */
export function displayValue(v: string | null | undefined, fallback = "-"): string {
    return hasText(v) ? v : fallback;
}

/**
 * Get zone display text - prefer zone_name, fallback to zone_key with prefix
 */
export function zoneDisplayText(row: DealStockPickerRow): string {
    if (hasText(row.zone_name)) return row.zone_name;
    if (hasText(row.zone_key)) return `โซน ${row.zone_key}`;
    return "-";
}
