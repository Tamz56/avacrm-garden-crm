// src/authUtils.ts
import { supabase } from "./supabaseClient";
import { clearAccessToken } from "./authToken";

/**
 * Handle user logout:
 * 1. Sign out from Supabase (server-side)
 * 2. Clear local token cache
 * 3. Remove persist session from localStorage
 * 4. Hard redirect to / to ensure all states are reset
 */
export async function logout() {
    try {
        await supabase.auth.signOut();
    } catch (err) {
        console.error("Logout error:", err);
    } finally {
        // Always clear local state even if server signOut fails
        clearAccessToken();

        // Specific removal of multiple potential Supabase storage keys
        localStorage.removeItem("avafarm888-auth");
        localStorage.removeItem("supabase.auth.token");

        // Redirect to home/login and hard reset state
        window.location.assign("/");
    }
}
