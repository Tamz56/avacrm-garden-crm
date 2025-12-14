export type ZoneTypeKey = "production" | "trial" | "nursery" | "untyped";

export type ZoneTypeSummary = {
    key: ZoneTypeKey;
    label: string;
    zoneCount: number;      // จำนวนแปลง
    areaRai: number;        // พื้นที่รวม (ไร่)
    plannedTrees: number;   // จำนวนต้นตามแผน
};
