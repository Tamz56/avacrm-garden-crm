// src/lib/docStatus.ts
// Helper functions for document status checking

export type DocStatus = 'draft' | 'issued' | 'cancelled';

/**
 * Check if a document is cancelled (voided)
 * Use this instead of checking === 'cancelled' directly to ensure consistency
 */
export const isDocCancelled = (status?: string | null): boolean =>
    status === 'cancelled';

/**
 * Check if a document is active (not cancelled)
 */
export const isDocActive = (status?: string | null): boolean =>
    status === 'issued' || status === 'draft';
