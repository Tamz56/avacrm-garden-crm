import React from "react";
import { StockLifecycleSummary, StockFilterState } from "../../types/stockLifecycle";

type Props = {
    summary: StockLifecycleSummary;
    filter: StockFilterState;
    onChangeFilter: (next: StockFilterState) => void;
};

type CardConfig = {
    key: keyof StockLifecycleSummary;
    label: string;
    description?: string;
};

const CARD_CONFIGS: CardConfig[] = [
    { key: "totalTrees", label: "ต้นทั้งหมด" },
    { key: "available", label: "พร้อมขาย (Available)" },
    { key: "reserved", label: "จองแล้ว (Reserved)" },
    { key: "digOrdered", label: "ในใบสั่งขุด (Dig Ordered)" },
    { key: "dug", label: "ขุดแล้ว (Dug)" },
    { key: "shipped", label: "ส่งออกแล้ว (Shipped)" },
    { key: "planted", label: "ปลูกแล้ว (Planted)" },
];

export const StockSummaryCards: React.FC<Props> = ({
    summary,
    filter,
    onChangeFilter,
}) => {
    const handleClickStatus = (statusKey: keyof StockLifecycleSummary) => {
        // map key → lifecycleStatus filter
        let status: StockFilterState["lifecycleStatus"] = "all";

        switch (statusKey) {
            case "available":
                status = "available";
                break;
            case "reserved":
                status = "reserved";
                break;
            case "digOrdered":
                status = "dig_ordered";
                break;
            case "dug":
                status = "dug";
                break;
            case "shipped":
                status = "shipped";
                break;
            case "planted":
                status = "planted";
                break;
            default:
                status = "all";
        }

        onChangeFilter({
            ...filter,
            lifecycleStatus: status,
        });
    };

    return (
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {CARD_CONFIGS.map((card) => {
                const value = summary[card.key] ?? 0;
                const isActive =
                    card.key !== "totalTrees" &&
                    filter.lifecycleStatus !== "all" &&
                    filter.lifecycleStatus === mapKeyToStatus(card.key);

                return (
                    <button
                        key={card.key}
                        type="button"
                        className={[
                            "flex flex-col items-start rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition",
                            "hover:border-emerald-400 hover:shadow",
                            isActive ? "border-emerald-500 bg-emerald-50" : "",
                        ].join(" ")}
                        onClick={() => handleClickStatus(card.key)}
                    >
                        <div className="text-xs text-slate-500">{card.label}</div>
                        <div className="mt-1 text-2xl font-semibold text-slate-900">
                            {value?.toLocaleString("th-TH")}
                        </div>
                        {card.key === "totalTrees" && summary.totalValue != null && (
                            <div className="mt-1 text-xs text-slate-500">
                                มูลค่าพร้อมขายโดยประมาณ{" "}
                                <span className="font-medium text-emerald-700">
                                    {summary.totalValue.toLocaleString("th-TH")} บาท
                                </span>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

function mapKeyToStatus(
    key: keyof StockLifecycleSummary
): StockFilterState["lifecycleStatus"] {
    switch (key) {
        case "available":
            return "available";
        case "reserved":
            return "reserved";
        case "digOrdered":
            return "dig_ordered";
        case "dug":
            return "dug";
        case "shipped":
            return "shipped";
        case "planted":
            return "planted";
        default:
            return "all";
    }
}
