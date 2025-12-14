import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { Option } from "./useSpeciesOptions";

export function useZoneOptions() {
    const [options, setOptions] = useState<Option[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            const { data, error } = await supabase
                .from("stock_zones")
                .select("id, name")
                .order("name", { ascending: true });

            if (!cancelled) {
                if (!error && data) {
                    setOptions(
                        data.map((row: any) => ({
                            id: row.id,
                            name: row.name,
                        }))
                    );
                }
                setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return { options, loading };
}
