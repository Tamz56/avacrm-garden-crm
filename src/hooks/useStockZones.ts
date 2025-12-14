import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type StockZone = {
    id: string;
    name: string | null;
    code: string | null;
    farm_name: string | null;
};

export function useStockZones() {
    const [zones, setZones] = useState<StockZone[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let ignore = false;

        const load = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("stock_zones")
                .select("id, name, code, farm_name")
                // .eq("is_active", true) // Assuming is_active column exists, if not remove
                .order("name", { ascending: true });

            if (!ignore) {
                if (error) {
                    console.error(error);
                } else if (data) {
                    setZones(data as StockZone[]);
                }
                setLoading(false);
            }
        };

        load();
        return () => {
            ignore = true;
        };
    }, []);

    return { zones, loading };
}
