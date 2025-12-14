export interface CommissionDetailRow {
    deal_commission_id: string;
    deal_id: string;
    deal_title: string;
    role: string;
    deal_amount: number;
    commission_amount: number;
    paid_in_month: number;
    total_paid: number;
    remaining_amount: number;
    last_pay_date: string | null;
    status: string;
}

export interface DealCommissionRow {
    deal_commission_id: string;
    deal_id: string;
    profile_id: string;
    profile_name: string;
    role: string;
    base_amount: number;
    rate: number;
    commission_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: string;
}

