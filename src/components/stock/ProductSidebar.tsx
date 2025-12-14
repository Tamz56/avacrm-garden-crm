import React, { useState } from "react";
import { useStockProducts } from "../../hooks/useStockProducts";
import { Plus, Search } from "lucide-react";

interface ProductSidebarProps {
    selectedProductId: string | null;
    onSelectProduct: (id: string) => void;
    onAddProduct?: () => void;
}

export const ProductSidebar: React.FC<ProductSidebarProps> = ({
    selectedProductId,
    onSelectProduct,
    onAddProduct
}) => {
    const { products, loading, error } = useStockProducts();
    const [search, setSearch] = useState("");

    if (loading) return <div className="p-4 text-center text-sm text-slate-400">กำลังโหลดรายการต้นไม้...</div>;
    if (error) return <div className="p-4 text-center text-sm text-red-500">โหลดข้อมูลต้นไม้ไม่สำเร็จ</div>;

    const filteredProducts = products.filter(p => {
        const name = p.display_name_th || p.display_name_en || p.code;
        return name.toLowerCase().includes(search.toLowerCase()) ||
            p.code.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <section className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-900">ต้นไม้ / สินค้า</h3>
                {onAddProduct && (
                    <button
                        onClick={onAddProduct}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-emerald-700 transition"
                    >
                        <Plus className="w-3 h-3" />
                        เพิ่มต้นไม้
                    </button>
                )}
            </div>

            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
                        placeholder="ค้นหาชื่อ / รหัสสินค้า..."
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredProducts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                        ไม่พบข้อมูล
                    </div>
                ) : (
                    filteredProducts.map((p) => {
                        const isActive = p.id === selectedProductId;
                        const name = p.display_name_th || p.display_name_en || p.code;
                        const shortName = (p.display_name_th || p.display_name_en || p.code).substring(0, 2).toUpperCase();

                        return (
                            <button
                                key={p.id}
                                onClick={() => onSelectProduct(p.id)}
                                className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition
                                    ${isActive
                                        ? "bg-emerald-50 border border-emerald-100 shadow-sm"
                                        : "hover:bg-slate-50 border border-transparent"}`}
                            >
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold
                                    ${isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                                    {shortName}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className={`font-medium truncate ${isActive ? "text-emerald-900" : "text-slate-900"}`}>
                                        {name}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">
                                        {p.code} · {p.size_label || "-"}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </section>
    );
};
