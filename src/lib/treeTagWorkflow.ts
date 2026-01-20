// Tree Tag Workflow Utility
// Defines valid statuses and transitions for the dig/root prune workflow

export type TreeTagStatus =
    | "in_zone"
    | "available"
    | "planned_for_dig"
    | "selected_for_dig"
    | "root_prune_1"
    | "root_prune_2"
    | "root_prune_3"
    | "root_prune_4"
    | "ready_to_lift"
    | "dug"
    | "dug_hold"
    | "in_stock"
    | "shipped"
    | "planted"
    | "rehab"
    | "dead";

export const STATUS_LABEL_TH: Record<TreeTagStatus, string> = {
    in_zone: "อยู่ในแปลง",
    available: "พร้อมขาย (ในแปลง)",
    planned_for_dig: "วางแผนจะขุด",
    selected_for_dig: "เลือกไว้จะขุด",
    root_prune_1: "ตัดราก 1",
    root_prune_2: "ตัดราก 2",
    root_prune_3: "ตัดราก 3",
    root_prune_4: "ตัดราก 4",
    ready_to_lift: "พร้อมยก",
    dug: "ขุดแล้ว",
    dug_hold: "พักในแปลง (หลังขุด)",
    in_stock: "เข้าสต็อก",
    shipped: "จัดส่งแล้ว",
    planted: "ปลูกแล้ว",
    rehab: "พักฟื้น",
    dead: "ตาย",
};

export type NextAction = { toStatus: TreeTagStatus; label: string };

export function getNextAction(status: TreeTagStatus): NextAction | null {
    switch (status) {
        case "selected_for_dig":
            return { toStatus: "root_prune_1", label: "ทำตัดราก 1" };
        case "root_prune_1":
            return { toStatus: "root_prune_2", label: "ทำตัดราก 2" };
        case "root_prune_2":
            return { toStatus: "root_prune_3", label: "ทำตัดราก 3" };
        case "root_prune_3":
            return { toStatus: "root_prune_4", label: "ทำตัดราก 4" };
        case "root_prune_4":
            return { toStatus: "ready_to_lift", label: "ตั้งเป็นพร้อมยก" };
        case "ready_to_lift":
            return { toStatus: "dug", label: "ตั้งเป็นขุดแล้ว" };
        case "dug":
            // post-dug disposition: ให้เลือกใน UI เป็นปุ่มย่อย
            return null;
        case "dug_hold":
            return null;
        case "in_stock":
            return null;
        default:
            return null;
    }
}

export const POST_DUG_ACTIONS: NextAction[] = [
    { toStatus: "dug_hold", label: "พักในแปลง" },
    { toStatus: "in_stock", label: "เข้า Stock" },
    { toStatus: "shipped", label: "ส่งลูกค้า" },
    { toStatus: "planted", label: "ปลูกแล้ว" },
];
