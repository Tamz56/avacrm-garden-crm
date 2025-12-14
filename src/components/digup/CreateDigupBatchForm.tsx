import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Loader2 } from "lucide-react";

type CreateDigupBatchFormProps = {
    plantingPlotTreeId: string;
    onSuccess: (newBatch: any) => void;
    onCancel: () => void;
};

const CreateDigupBatchForm: React.FC<CreateDigupBatchFormProps> = ({
    plantingPlotTreeId,
    onSuccess,
    onCancel,
}) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [plotTreeData, setPlotTreeData] = useState<any>(null);

    // Form state
    const [qty, setQty] = useState<number>(0);
    const [requestDate, setRequestDate] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [note, setNote] = useState<string>("");

    // Fetch planting plot tree details
    useEffect(() => {
        const fetchDetails = async () => {
            setFetching(true);
            const { data, error } = await supabase
                .from("planting_plot_trees")
                .select(`
          id,
          plot_id,
          species_id,
          size_label,
          planted_count,
          moved_to_stock_count,
          stock_species ( name )
        `)
                .eq("id", plantingPlotTreeId)
                .single();

            if (error) {
                console.error("Error fetching plot tree details:", error);
                setError("ไม่สามารถโหลดข้อมูลต้นไม้ได้");
            } else {
                setPlotTreeData(data);
                // Default quantity suggestion (optional)
                // setQty(data.planted_count - data.moved_to_stock_count);
            }
            setFetching(false);
        };

        if (plantingPlotTreeId) {
            fetchDetails();
        }
    }, [plantingPlotTreeId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!plotTreeData) return;

        setLoading(true);
        setError(null);

        try {
            if (qty <= 0) {
                throw new Error("กรุณาระบุจำนวนที่ถูกต้อง");
            }

            const remaining = plotTreeData.planted_count - plotTreeData.moved_to_stock_count;
            if (qty > remaining) {
                // Optional: Allow over-digging? Usually no.
                // throw new Error(`จำนวนที่ระบุ (${qty}) มากกว่าจำนวนคงเหลือในแปลง (${remaining})`);
            }

            const { data, error } = await supabase
                .from("digup_batches")
                .insert([
                    {
                        zone_id: plotTreeData.plot_id,
                        species_id: plotTreeData.species_id,
                        size_label: plotTreeData.size_label,
                        planting_plot_tree_id: plantingPlotTreeId, // Link to the specific plot tree group
                        quantity: qty,
                        requested_date: requestDate,
                        note: note,
                        status: "planned", // Default status
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            if (onSuccess) {
                onSuccess(data);
            }
        } catch (err: any) {
            console.error("Error create digup batch:", err);
            setError(err.message ?? "ไม่สามารถบันทึกคำสั่งขุดล้อมได้");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!plotTreeData) {
        return <div className="text-red-500 p-4">ไม่พบข้อมูลต้นไม้</div>;
    }

    const remaining = plotTreeData.planted_count - plotTreeData.moved_to_stock_count;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="text-sm font-medium text-slate-700">
                    {plotTreeData.stock_species?.name} ({plotTreeData.size_label})
                </div>
                <div className="text-xs text-slate-500">
                    คงเหลือในแปลง: {remaining.toLocaleString()} ต้น
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">จำนวนที่จะขุดล้อม (ต้น)</label>
                <input
                    type="number"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    min={1}
                    max={remaining} // Optional constraint
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">วันที่ต้องการขุด</label>
                <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">บันทึกเพิ่มเติม</label>
                <textarea
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="เช่น ขุดล้อมเพื่อส่งลูกค้า A..."
                />
            </div>

            {error && (
                <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                    {error}
                </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                    type="button"
                    className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                    onClick={onCancel}
                    disabled={loading}
                >
                    ยกเลิก
                </button>

                <button
                    type="submit"
                    className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                    disabled={loading || qty <= 0}
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    บันทึกคำสั่ง
                </button>
            </div>
        </form>
    );
};

export default CreateDigupBatchForm;
