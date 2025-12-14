/**
 * Utility functions for parsing Google Maps URLs
 */

/**
 * Parse lat/lng from a Google Maps URL
 * Supports patterns like:
 * - .../@lat,lng,...
 * - ?q=lat,lng or ?query=lat,lng
 */
export function parseLatLngFromGoogleMaps(url: string): { lat: number; lng: number } | null {
    if (!url) return null;

    // Pattern 1: .../@lat,lng,...
    const atMatch = url.match(/@(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[3]) };

    // Pattern 2: q=lat,lng or query=lat,lng
    try {
        const u = new URL(url);
        const q = u.searchParams.get("q") || u.searchParams.get("query");
        if (q) {
            const m = q.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
            if (m) return { lat: Number(m[1]), lng: Number(m[3]) };
        }
    } catch {
        // Invalid URL, ignore
    }

    return null;
}

/**
 * Check if a URL looks like a Google Maps URL
 */
export function isGoogleMapsUrl(url: string): boolean {
    if (!url) return false;
    return url.includes("google.com/maps") || url.includes("goo.gl/maps") || url.includes("maps.app.goo.gl");
}

/**
 * Open Google Maps URL in new tab
 */
export function openInGoogleMaps(url: string): void {
    if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
    }
}
