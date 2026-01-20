// src/types/stockPicker.ts
// Type definition for Stock Picker view (view_deal_stock_picker - 13 columns)

export type DealStockPickerRow = {
    stock_group_id: string;
    species_name_th: string | null;
    size_label: string | null;
    zone_key: string | null;
    zone_name: string | null;
    qty_total: number | null;
    qty_reserved: number | null;
    qty_available: number | null;
    unit_price: number | null;
    updated_at: string | null;
    plot_key: string | null;
    height_label: string | null;
    pot_size_label: string | null;
};

export type DealStockPickerFilters = {
    species_name_th?: string | null;
    size_label?: string | null;
    zone_key?: string | null;
    plot_key?: string | null;
    height_label?: string | null;
    pot_size_label?: string | null;
};
