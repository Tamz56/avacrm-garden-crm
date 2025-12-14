export type StockLifecycleSummary = {
    totalTrees: number;
    available: number;
    reserved: number;
    digOrdered: number;
    dug: number;
    shipped: number;
    planted: number;
    totalValue?: number | null;
};

export type StockFilterState = {
    speciesId?: string | "all";
    zoneId?: string | "all";
    plotType?: string | "all";
    lifecycleStatus?: string | "all"; // available / reserved / dig_ordered / ...
};

export type ZoneStockRow = {
    zoneId: string;
    zoneName: string;
    farmName?: string | null;
    plotTypeName?: string | null;
    sizeLabel?: string | null;
    heightLabel?: string | null;
    availableQty: number;
    reservedQty: number;
    digOrderedQty: number;
    dugQty: number;
    shippedQty: number;
    plantedQty: number;
    untaggedQty: number;
};

export type SpeciesStockBlock = {
    speciesId: string;
    speciesNameTh: string;
    speciesNameEn?: string | null;
    measureByHeight?: boolean; // true = วัดตามความสูง
    totalQty: number;
    availableQty: number;
    reservedQty: number;
    digOrderedQty: number;
    shippedQty: number;
    estimatedValue?: number | null;
    zones: ZoneStockRow[];
};
