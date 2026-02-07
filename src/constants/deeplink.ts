export const HL = {
    READY_FROM_TAG: "ready_from_tag",
    RESERVED_FROM_TAG: "reserved_from_tag",

    LIFECYCLE_IN_ZONE: "lifecycle_in_zone",
    LIFECYCLE_RESERVED: "lifecycle_reserved",
    LIFECYCLE_DIG_ORDERED: "lifecycle_dig_ordered",
    LIFECYCLE_DUG: "lifecycle_dug",
    LIFECYCLE_TAGGED: "lifecycle_tagged",
    LIFECYCLE_UNTAGGED: "lifecycle_untagged",
} as const;

export type HighlightKey = (typeof HL)[keyof typeof HL];

export const HIGHLIGHT_TARGETS: Record<HighlightKey, { id: string; tab: "overview" }> = {
    [HL.READY_FROM_TAG]: { id: "card-ready-from-tag", tab: "overview" },
    [HL.RESERVED_FROM_TAG]: { id: "card-reserved-from-tag", tab: "overview" },

    [HL.LIFECYCLE_IN_ZONE]: { id: "card-lifecycle-in-zone", tab: "overview" },
    [HL.LIFECYCLE_RESERVED]: { id: "card-lifecycle-reserved", tab: "overview" },
    [HL.LIFECYCLE_DIG_ORDERED]: { id: "card-lifecycle-dig-ordered", tab: "overview" },
    [HL.LIFECYCLE_DUG]: { id: "card-lifecycle-dug", tab: "overview" },
    [HL.LIFECYCLE_TAGGED]: { id: "card-lifecycle-tagged", tab: "overview" },
    [HL.LIFECYCLE_UNTAGGED]: { id: "card-lifecycle-untagged", tab: "overview" },
};

export function normalizeHighlightKey(params: URLSearchParams): HighlightKey | null {
    const hl = params.get("hl");
    if (hl && Object.values(HL).includes(hl as HighlightKey)) return hl as HighlightKey;

    // legacy alias
    const focus = params.get("focus");
    if (focus === "ready_usage" || focus === "ready_from_tag") return HL.READY_FROM_TAG;

    const legacyHl1 = params.get("hl");
    if (legacyHl1 === "1") return HL.READY_FROM_TAG;

    return null;
}

export function buildZoneUrl(zoneId: string, opts?: { hl?: HighlightKey }) {
    const p = new URLSearchParams();
    p.set("page", "zones");
    p.set("zone_id", zoneId);
    if (opts?.hl) p.set("hl", opts.hl);
    return `/?${p.toString()}`;
}
