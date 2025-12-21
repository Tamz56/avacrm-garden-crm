import * as React from "react";
import { supabase } from "../supabaseClient";

export function useMyRole() {
    const [role, setRole] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);

            try {
                const { data: userData } = await supabase.auth.getUser();
                const userId = userData?.user?.id;

                if (!userId) {
                    setRole(null);
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", userId)
                    .maybeSingle();

                if (!alive) return;

                if (error) {
                    console.error("useMyRole error", error);
                    setRole(null);
                } else {
                    setRole(data?.role ?? null);
                }
            } catch (e) {
                console.error("useMyRole exception", e);
                setRole(null);
            }

            setLoading(false);
        })();

        return () => {
            alive = false;
        };
    }, []);

    const canEditPlan = role === "admin" || role === "manager";

    return { role, canEditPlan, loading };
}
