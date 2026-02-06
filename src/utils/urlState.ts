export function getQueryParam(key: string): string | null {
    return new URLSearchParams(window.location.search).get(key);
}

export function setQueryParam(
    key: string,
    value: string,
    opts?: { replace?: boolean }
) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);

    if (opts?.replace) {
        window.history.replaceState({}, "", url.toString());
    } else {
        window.history.pushState({}, "", url.toString());
    }
}

export function setQueryParams(
    params: Record<string, string>,
    opts?: { replace?: boolean }
) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    if (opts?.replace) {
        window.history.replaceState({}, "", url.toString());
    } else {
        window.history.pushState({}, "", url.toString());
    }
}
