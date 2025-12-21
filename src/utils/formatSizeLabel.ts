// src/utils/formatSizeLabel.ts
// Utility to format size_label for display
// DB stores digits-only (e.g. "5"), this formats for display (e.g. "5 นิ้ว")

/**
 * Format size_label for display
 * @param sizeLabel - Raw size label from DB (digits only, e.g. "5")
 * @param suffix - Suffix to append (default: " นิ้ว")
 * @returns Formatted string (e.g. "5 นิ้ว")
 */
export function formatSizeLabel(sizeLabel: string | null | undefined, suffix: string = " นิ้ว"): string {
    if (!sizeLabel || sizeLabel.trim() === "") {
        return "-";
    }
    // If already has non-digit characters (legacy data), just return as-is
    if (/[^0-9.]/.test(sizeLabel)) {
        return sizeLabel;
    }
    return `${sizeLabel}${suffix}`;
}

/**
 * Format size_label for display with "inch" suffix (English)
 */
export function formatSizeLabelEn(sizeLabel: string | null | undefined): string {
    return formatSizeLabel(sizeLabel, '"');
}

/**
 * Normalize size_label input - remove non-digit characters
 * Use this when saving to DB
 */
export function normalizeSizeLabel(input: string | null | undefined): string {
    if (!input) return "";
    return input.replace(/[^0-9.]/g, "");
}
