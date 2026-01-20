export type Deal = {
    id: string;
    title: string | null;
    customer_name: string | null;
    customer_id?: string;
    total_amount: number | null;
    stage: string | null;
    status: string | null;
    closing_date: string | null;
    created_at: string | null;
    deal_code?: string | null;
    note_customer?: string | null;
    payment_status?: "pending" | "partial" | "paid" | "cancelled";
    paid_at?: string | null;
    deposit_amount?: number | null;
    quantity?: number;
};

export type DealItem = {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total_price?: number;
    imageUrl?: string | null;
    subText?: string;
    gradeLabel?: string;
    stockStatus?: string;
    stock_item_id?: string;
    stock_group_id?: string;
    trunk_size_inch?: number;
    price_per_tree?: number;
    height_m?: number;
    price_per_meter?: number;
    price_type?: string;
    tree_name?: string;
    // Preorder fields
    source_type?: 'from_stock' | 'preorder_from_zone' | 'needs_confirm';
    preorder_zone_id?: string;
    preorder_plot_id?: string;
    species_id?: string;
    size_label?: string;
    lead_time_days?: number;
    expected_ready_date?: string;
    unit_price_estimate?: number;
    preorder_notes?: string;
    dig_plan_id?: string;
};

export type DealShipment = {
    id: string;
    date?: string;
    ship_date?: string;
    carrier?: string;
    transporter_name?: string;
    method?: string;
    vehicle_code?: string;
    distance_km?: number;
    estimated_cost?: number;
    estimated_price?: number;
    actual_cost?: number;
    final_price?: number;
    status?: string;
};

export type DealPayment = {
    id: string;
    dealId: string;
    dealCode?: string | null;
    amount: number;
    paymentType: "deposit" | "final";
    method: string | null;
    paymentDate: string;
    note?: string | null;
    createdAt: string;
};
