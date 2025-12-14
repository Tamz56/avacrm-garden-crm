import React from 'react';
import { useStockProducts, StockProduct } from '../../hooks/useStockProducts';
import { Package2, Loader2 } from 'lucide-react';

interface ProductSelectProps {
    value: string | null;                  // product_id ที่เลือกอยู่
    onChange: (productId: string | null, product?: StockProduct) => void; // Modified to pass product object back
    label?: string;
    required?: boolean;
    disabled?: boolean;
}

const ProductSelect: React.FC<ProductSelectProps> = ({
    value,
    onChange,
    label = 'เลือกชนิดต้นไม้ / ขนาด',
    required = true,
    disabled = false,
}) => {
    const { products, loading, error } = useStockProducts();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value || null;
        const selectedProduct = products.find(p => p.id === v);
        onChange(v, selectedProduct);
    };

    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                {/* <Package2 className="w-3 h-3 text-emerald-600" /> */}
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>

            <select
                value={value ?? ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={loading || !!error || disabled}
            >
                {loading && <option>กำลังโหลดรายการสินค้า...</option>}
                {error && <option>โหลดข้อมูลผิดพลาด: {error}</option>}
                {!loading && !error && (
                    <>
                        <option value="">-- เลือกชนิดต้นไม้ / ขนาด --</option>
                        {products.map((p: StockProduct) => {
                            const name =
                                p.display_name_th ||
                                p.display_name_en ||
                                p.code;

                            return (
                                <option key={p.id} value={p.id}>
                                    {name} • {p.size_label}
                                </option>
                            );
                        })}
                    </>
                )}
            </select>

            {loading && (
                <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    กำลังโหลดรายการสินค้า...
                </div>
            )}
        </div>
    );
};

export default ProductSelect;
