export interface DealShippingSummary {
    deal_id: string;
    total_quantity: number;
    shipped_quantity: number;
    remaining_quantity: number;
    is_fully_shipped: boolean;
}
