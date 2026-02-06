import React, { useMemo } from "react";

type DocAudit = {
    status?: string | null;

    voided_at?: string | null;
    voided_by?: string | null;
    void_reason?: string | null;
    voided_by_name?: string | null;  // from view join

    tampered_at?: string | null;
    tampered_by?: string | null;
    tampered_reason?: string | null;
    tampered_by_name?: string | null;  // from view join

    checksum_status?: string | null;
};

function fmtThaiDateTime(iso?: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function shortId(id?: string | null) {
    if (!id) return "-";
    return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export default function DocumentAuditStrip({ doc }: { doc: DocAudit }) {
    const isCancelled = doc?.status === "cancelled";
    const isTamperedMarked = !!doc?.tampered_at;
    const isMismatch = doc?.checksum_status === "mismatch";

    const cancelledMeta = useMemo(() => {
        if (!isCancelled) return null;
        return {
            at: fmtThaiDateTime(doc?.voided_at),
            by: doc?.voided_by_name || shortId(doc?.voided_by),  // prefer name if available
            reason: (doc?.void_reason || "").trim() || "-",
        };
    }, [isCancelled, doc?.voided_at, doc?.voided_by, doc?.voided_by_name, doc?.void_reason]);

    const tamperedMeta = useMemo(() => {
        if (!isTamperedMarked) return null;
        return {
            at: fmtThaiDateTime(doc?.tampered_at),
            by: doc?.tampered_by_name || shortId(doc?.tampered_by),  // prefer name if available
            reason: (doc?.tampered_reason || "").trim() || "-",
        };
    }, [isTamperedMarked, doc?.tampered_at, doc?.tampered_by, doc?.tampered_by_name, doc?.tampered_reason]);

    if (!isCancelled && !isTamperedMarked && !isMismatch) return null;

    return (
        <div className="mb-3 space-y-2">
            {isCancelled && cancelledMeta && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-red-700">ยกเลิกเอกสารแล้ว</div>
                        <div className="text-xs text-red-700/80">{cancelledMeta.at}</div>
                    </div>
                    <div className="mt-1 text-xs text-red-700/80">
                        <div>โดย: {cancelledMeta.by}</div>
                        <div>เหตุผล: {cancelledMeta.reason}</div>
                    </div>
                </div>
            )}

            {isTamperedMarked && tamperedMeta && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-amber-800">Tampered (Marked)</div>
                        <div className="text-xs text-amber-800/80">{tamperedMeta.at}</div>
                    </div>
                    <div className="mt-1 text-xs text-amber-800/80">
                        <div>โดย: {tamperedMeta.by}</div>
                        <div>เหตุผล: {tamperedMeta.reason}</div>
                    </div>
                </div>
            )}

            {isMismatch && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="text-sm font-semibold text-amber-800">Checksum mismatch</div>
                    <div className="mt-1 text-xs text-amber-800/80">
                        ระบบตรวจพบ checksum ไม่ตรงกับข้อมูลที่ seal ไว้ (เอกสารอาจถูกแก้ไข/ผิดปกติ)
                    </div>
                </div>
            )}
        </div>
    );
}
