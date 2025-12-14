import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient.ts";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { DollarSign, Users, TrendingUp, Layers } from "lucide-react";

const formatBaht = (v) =>
    `฿${(v || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;

const CommissionByRoleDashboard = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("v_commission_by_role_month")
                .select("*")
                .order("month", { ascending: true });

            if (error) {
                console.error("Error loading role commissions", error);
            } else {
                setRows(data || []);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const chartData = useMemo(
        () =>
            rows.map((r) => {
                // Format month label like "มิ.ย. 68" or "Nov 25" depending on locale
                // Using simple YYYY-MM for now as requested or short date
                const date = new Date(r.month);
                const monthLabel = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });

                return {
                    monthLabel,
                    referral: r.referral_total || 0,
                    sales: r.sales_agent_total || 0,
                    leader: r.team_leader_total || 0,
                };
            }),
        [rows]
    );

    const totals = useMemo(
        () =>
            rows.reduce(
                (acc, r) => {
                    acc.referral += r.referral_total || 0;
                    acc.sales += r.sales_agent_total || 0;
                    acc.leader += r.team_leader_total || 0;
                    acc.grand += r.grand_total_with_override || 0;
                    return acc;
                },
                { referral: 0, sales: 0, leader: 0, grand: 0 }
            ),
        [rows]
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">รายงานค่าคอมมิชชั่นตามบทบาท (By Role)</h1>
                <p className="text-sm text-gray-500">
                    เปรียบเทียบยอดค่าคอมฯ ของ Referral / Sales Agent / Team Leader รายเดือน
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-500">Referral รวม</div>
                        <div className="p-1.5 bg-amber-50 rounded-lg">
                            <Users className="w-4 h-4 text-amber-600" />
                        </div>
                    </div>
                    <div className="text-lg font-semibold">{formatBaht(totals.referral)}</div>
                </div>

                <div className="rounded-xl border p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-500">Sales Agent รวม</div>
                        <div className="p-1.5 bg-emerald-50 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                        </div>
                    </div>
                    <div className="text-lg font-semibold">{formatBaht(totals.sales)}</div>
                </div>

                <div className="rounded-xl border p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-500">Team Leader รวม</div>
                        <div className="p-1.5 bg-blue-50 rounded-lg">
                            <Layers className="w-4 h-4 text-blue-600" />
                        </div>
                    </div>
                    <div className="text-lg font-semibold">{formatBaht(totals.leader)}</div>
                </div>

                <div className="rounded-xl border p-4 bg-white shadow-sm ring-1 ring-emerald-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-emerald-700 font-medium">รวมทุกบทบาท</div>
                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                            <DollarSign className="w-4 h-4 text-emerald-700" />
                        </div>
                    </div>
                    <div className="text-lg font-semibold text-emerald-700">{formatBaht(totals.grand)}</div>
                </div>
            </div>

            {/* Stacked bar chart */}
            <div className="rounded-xl border p-6 h-96 bg-white shadow-sm">
                <h3 className="text-sm font-semibold mb-4">แนวโน้มค่าคอมมิชชั่นแยกตามบทบาท</h3>
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        กำลังโหลดข้อมูล...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="monthLabel" />
                            <YAxis />
                            <Tooltip
                                formatter={(value) => formatBaht(Number(value))}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="referral" stackId="a" name="Referral" fill="#f59e0b" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="sales" stackId="a" name="Sales Agent" fill="#10b981" />
                            <Bar dataKey="leader" stackId="a" name="Team Leader" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default CommissionByRoleDashboard;
