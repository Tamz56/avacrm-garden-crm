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

        // Specific removal of the Supabase storage key to ensure no residue
        localStorage.removeItem("avafarm888-auth");

        // Redirect to home/login. Since we are in a simple state-based router, 
        // a page reload is the safest way to reset all React states.
        window.location.href = "/";
    }
}
