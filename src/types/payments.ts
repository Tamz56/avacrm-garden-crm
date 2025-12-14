export type DealPaymentSummary = {
    deal_id: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    is_fully_paid: boolean;
};
