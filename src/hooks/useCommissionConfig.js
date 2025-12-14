import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient.ts";

export const useCommissionConfig = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch from the view which returns the latest active config
            const { data, error } = await supabase
                .from("v_commission_config_single")
                .select("*")
                .single();

            if (error) {
                throw error;
            }

            setConfig(data);
        } catch (err) {
            console.error("Error fetching commission config:", err);
            setError(err);
            // Fallback defaults if fetch fails (e.g. table doesn't exist yet)
            setConfig({
                id: "demo-id",
                referral_rate: 0.05,
                sales_rate: 0.1,
                team_target: 500000,
                team_rate: 0.05,
                solo_rate: 0.15,
                is_fallback: true, // Marker to know this is not from DB
            });
        } finally {
            setLoading(false);
        }
    }, []);

    const saveConfig = async (newConfig) => {
        setLoading(true);
        setError(null);
        try {
            // Use RPC to atomically deactivate old config and insert new one
            const { data, error } = await supabase.rpc("set_commission_config", {
                p_referral_rate: newConfig.referral_rate,
                p_sales_rate: newConfig.sales_rate,
                p_team_target: newConfig.team_target,
                p_team_rate: newConfig.team_rate,
                p_solo_rate: newConfig.solo_rate,
            });

            if (error) throw error;

            setConfig(data);
            return { success: true, data };
        } catch (err) {
            console.error("Error saving commission config:", err);
            setError(err);
            return { success: false, error: err };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    return {
        config,
        loading,
        error,
        reload: fetchConfig,
        saveConfig,
    };
};
