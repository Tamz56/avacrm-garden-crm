import { useState } from "react";
import { supabase } from "../supabaseClient";

export function useTransferTreesFromPlotToStock() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transfer = async (params: {
    plotTreeId: string;
    targetZoneId: string;
    quantity: number;
    transferDate?: string; // YYYY-MM-DD
    note?: string;
  }) => {
    setLoading(true);
    setError(null);
    const { plotTreeId, targetZoneId, quantity, transferDate, note } = params;

    const { error } = await supabase.rpc("transfer_trees_from_plot_to_stock", {
      _plot_tree_id: plotTreeId,
      _target_zone_id: targetZoneId,
      _quantity: quantity,
      _transfer_date: transferDate ?? null,
      _note: note ?? null,
    });

    if (error) {
      console.error("transfer_trees_from_plot_to_stock error", error);
      setError(error.message);
      setLoading(false);
      throw error;
    }

    setLoading(false);
  };

  return { transfer, loading, error };
}
