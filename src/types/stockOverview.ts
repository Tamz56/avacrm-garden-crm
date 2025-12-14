export interface StockOverviewRow {
    species_id: string;
    species_name_th: string | null;
    species_name_en: string | null;
    species_code: string | null;
    size_label: string | null;
    zone_id: string | null;
    zone_name: string | null;
    zone_code: string | null;

    total_trees: number;
    available_trees: number;
    reserved_trees: number;
    shipped_trees: number;
    other_trees: number;
}
