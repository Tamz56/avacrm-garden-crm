import { useMyActivitySummary } from "../../hooks/useMyActivitySummary";
import { Activity } from "lucide-react";

const SalesActivityMiniCard: React.FC = () => {
    const { rows, loading } = useMyActivitySummary(7);

    const total = rows.reduce(
        (acc, r) => {
            acc.total_activities += r.total_activities;
            acc.total_calls += r.total_calls;
            acc.total_followups += r.total_followups;
            acc.customers_touched += r.customers_touched;
            return acc;
        },
        {
            total_activities: 0,
            total_calls: 0,
            total_followups: 0,
            customers_touched: 0,
        }
    );

    return (
        <div className="rounded-2xl border border-slate-100 bg-white dark:bg-slate-900/70 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        สรุปกิจกรรม 7 วันล่าสุด
                    </h3>
                </div>
                <span className="text-[11px] text-slate-400">เฉพาะของคุณ</span>
            </div>

            {loading ? (
                <div className="text-xs text-slate-400">กำลังโหลด...</div>
            ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/20">
                        <div className="text-slate-500 mb-1">รวมกิจกรรม</div>
                        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                            {total.total_activities}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-900/20">
                        <div className="text-slate-500 mb-1">โทรคุย (Calls)</div>
                        <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                            {total.total_calls}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/20">
                        <div className="text-slate-500 mb-1">Follow-up</div>
                        <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
                            {total.total_followups}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40">
                        <div className="text-slate-500 mb-1">ลูกค้าที่แตะ</div>
                        <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            {total.customers_touched}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesActivityMiniCard;
