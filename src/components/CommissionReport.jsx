// src/components/CommissionReport.jsx

import React, { useMemo } from "react";

/**
 * props:
 *  - deals: array ของ deals ทั้งหมด (อย่างน้อยดีลที่ stage = 'won')
 *  - leaderName: ชื่อหัวหน้าทีม (เช่น "Apirak")
 *  - leaderId: (option) ถ้าคุณอยากใช้ owner_id แทนชื่อ
 *  - monthKey: เดือนที่อยากสรุป เช่น "2025-01" (ถ้าไม่ส่ง จะใช้ทุกดีลใน props)
 */
const CommissionReport = ({ deals = [], leaderName = "หัวหน้าทีม", leaderId = null, monthKey = null }) => {
    // ---- config rate ตามโครงสร้างที่ออกแบบร่วมกัน ----
    const REFERRAL_RATE = 0.05;  // 5% ตัวแทนแนะนำ
    const SALES_RATE = 0.10;     // 10% ตัวแทนขาย / หัวหน้าขายเอง (ฐานต่อดีล)
    const TEAM_TARGET = 500000;  // เป้าหมายยอดรวมทีมต่อเดือน
    const TEAM_RATE = 0.05;      // 5% override จากยอดรวมทีม
    const SOLO_RATE = 0.15;      // 15% ถ้าหัวหน้าทีมขายคนเดียวเกินเป้า

    // filter เฉพาะดีล won + เฉพาะเดือนที่เลือก (ถ้ามี monthKey)
    const wonDeals = useMemo(() => {
        return deals.filter((d) => {
            if (!d || d.stage !== "won") return false;

            if (!monthKey) return true;

            const closing = d.closing_date ? new Date(d.closing_date) : null;
            if (!closing) return false;

            const mk = `${closing.getFullYear()}-${String(
                closing.getMonth() + 1
            ).padStart(2, "0")}`;

            return mk === monthKey;
        });
    }, [deals, monthKey]);

    // ------- คำนวณค่าคอมรายดีล + ยอดรวมทีม/หัวหน้า --------
    const {
        dealRows,
        teamRevenue,
        leaderSoloRevenue,
        overrideMode,
        overrideRate,
        overrideCommission,
    } = useMemo(() => {
        if (!wonDeals.length) {
            return {
                dealRows: [],
                teamRevenue: 0,
                leaderSoloRevenue: 0,
                overrideMode: "None",
                overrideRate: 0,
                overrideCommission: 0,
            };
        }

        let teamRevenue = 0;
        let leaderSoloRevenue = 0;
        let hasOtherSales = false;

        const rows = wonDeals.map((deal) => {
            const amount = Number(deal.total_amount || deal.amount || 0);

            // ตัวแทนแนะนำ
            const hasReferral = !!deal.referral_agent_name;
            const referralCommission = hasReferral ? amount * REFERRAL_RATE : 0;

            // คนปิดดีล (sales agent)
            const hasSalesAgent = !!deal.sales_agent_name;
            const salesCommission = hasSalesAgent ? amount * SALES_RATE : 0;

            // สะสมยอดรวมทีม
            teamRevenue += amount;

            // ตรวจว่า deal นี้ถือว่าเป็นยอดของหัวหน้าทีมหรือเปล่า
            const isLeaderDeal =
                leaderId
                    ? deal.owner_id === leaderId
                    : deal.sales_agent_name === leaderName;

            if (isLeaderDeal) {
                leaderSoloRevenue += amount;
            } else {
                hasOtherSales = true;
            }

            return {
                id: deal.id,
                dealCode: deal.deal_code,
                amount,
                referralAgent: deal.referral_agent_name || "",
                referralCommission,
                salesAgent: deal.sales_agent_name || "",
                salesCommission,
            };
        });

        // ---- ตัดสินโหมด override สำหรับหัวหน้าทีม ----
        let overrideMode = "None";
        let overrideRate = 0;

        if (teamRevenue >= TEAM_TARGET) {
            // ถ้า leader เป็นคนขายทั้งหมด (ไม่มียอดจากคนอื่น)
            if (!hasOtherSales && leaderSoloRevenue === teamRevenue) {
                overrideMode = "Solo 15%";
                overrideRate = SOLO_RATE;
            } else {
                overrideMode = "Team 5%";
                overrideRate = TEAM_RATE;
            }
        }

        const overrideCommission = teamRevenue * overrideRate;

        return {
            dealRows: rows,
            teamRevenue,
            leaderSoloRevenue,
            overrideMode,
            overrideRate,
            overrideCommission,
        };
    }, [wonDeals, leaderId, leaderName]);

    const formatBaht = (val) =>
        `฿${(val || 0).toLocaleString("th-TH", {
            maximumFractionDigits: 0,
        })}`;

    const formatPercent = (val) =>
        `${(val * 100 || 0).toLocaleString("th-TH", {
            maximumFractionDigits: 1,
        })}%`;

    // ---- UI ----
    return (
        <div className="space-y-6">
            {/* Summary box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">ยอดขายรวมทีมในช่วงที่เลือก</div>
                    <div className="text-2xl font-semibold text-slate-900">{formatBaht(teamRevenue)}</div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">
                        ยอดขายที่ {leaderName} ขายเอง
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                        {formatBaht(leaderSoloRevenue)}
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">
                        ค่าคอมมิชชั่นหัวหน้าทีมจากยอดรวมทีม
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                        {formatBaht(overrideCommission)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        โหมด: {overrideMode} ({formatPercent(overrideRate)})
                    </div>
                </div>
            </div>

            {/* ตารางค่าคอมรายดีล */}
            <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-900">
                        ค่าคอมมิชชั่นรายดีล
                    </h2>
                    <span className="text-xs text-slate-500">
                        แยกค่าคอมของผู้แนะนำและผู้ปิดดีล
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="text-left text-slate-500 border-b">
                                <th className="py-2 pr-4">รหัสดีล</th>
                                <th className="py-2 pr-4">มูลค่าดีล</th>
                                <th className="py-2 pr-4">ตัวแทนแนะนำ</th>
                                <th className="py-2 pr-4">ค่าคอมแนะนำ (5%)</th>
                                <th className="py-2 pr-4">ผู้ปิดดีล</th>
                                <th className="py-2 pr-4">ค่าคอมผู้ปิดดีล (10%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dealRows.map((row) => (
                                <tr key={row.id || row.dealCode} className="border-b last:border-b-0">
                                    <td className="py-2 pr-4">{row.dealCode}</td>
                                    <td className="py-2 pr-4">{formatBaht(row.amount)}</td>
                                    <td className="py-2 pr-4">{row.referralAgent || "-"}</td>
                                    <td className="py-2 pr-4">
                                        {row.referralAgent ? formatBaht(row.referralCommission) : "-"}
                                    </td>
                                    <td className="py-2 pr-4">{row.salesAgent || "-"}</td>
                                    <td className="py-2 pr-4">
                                        {row.salesAgent ? formatBaht(row.salesCommission) : "-"}
                                    </td>
                                </tr>
                            ))}

                            {dealRows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-3 text-center text-slate-400">
                                        ยังไม่มีดีล Won ในช่วงเวลานี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* สรุปเฉพาะหัวหน้าทีม (สามารถย้ายไปใช้ในหน้า Sales Profile – Apirak ได้) */}
            <div className="bg-white border rounded-xl p-4">
                <h2 className="text-sm font-semibold text-slate-900 mb-2">
                    สรุปค่าคอมมิชชั่นหัวหน้าทีม – {leaderName}
                </h2>
                <ul className="text-xs text-slate-600 space-y-1">
                    <li>ยอดขายรวมทีมในช่วงที่เลือก: {formatBaht(teamRevenue)}</li>
                    <li>ยอดขายที่หัวหน้าทีมขายเอง: {formatBaht(leaderSoloRevenue)}</li>
                    <li>
                        โหมดการจ่ายค่าคอมหัวหน้าทีม: <span className="font-medium">{overrideMode}</span>
                    </li>
                    <li>อัตราค่าคอม override: {formatPercent(overrideRate)}</li>
                    <li>ค่าคอม override ที่ได้รับ: {formatBaht(overrideCommission)}</li>
                </ul>
            </div>
        </div>
    );
};

export default CommissionReport;
