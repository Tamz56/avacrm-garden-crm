// src/components/docs/TamperBadge.tsx
// Badge component for document integrity status display

import React from 'react';

type ChecksumStatus = 'unsealed' | 'verified' | 'mismatch' | null;

type Props = {
    checksumStatus: ChecksumStatus;
    tamperedAt?: string | null;
};

/**
 * Document integrity badge showing tamper/checksum status
 * Priority: Tampered (Marked) > Mismatch (Auto) > Verified > Unsealed
 */
export function TamperBadge({ checksumStatus, tamperedAt }: Props) {
    // Hard block: marked tampered by admin
    if (tamperedAt) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                🚫 Tampered (Marked)
            </span>
        );
    }

    // Soft block: auto-detected checksum mismatch
    if (checksumStatus === 'mismatch') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                ⚠️ Mismatch (Auto)
            </span>
        );
    }

    // Verified: checksum matches
    if (checksumStatus === 'verified') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                ✓ Verified
            </span>
        );
    }

    // Default: unsealed (no checksum yet) or null (fallback mode)
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            Unsealed
        </span>
    );
}
