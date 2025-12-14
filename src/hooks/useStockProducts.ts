import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export type StockProduct = {
    id: string;
    code: string;
    species_id: string;
    size_label: string;
    display_name_th: string | null;
    display_name_en: string | null;
};

type UseStockProductsResult = {
    products: StockProduct[];
    loading: boolean;
    error: string | null;
};

export function useStockProducts(): UseStockProductsResult {
    const [products, setProducts] = useState<StockProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchProducts() {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('stock_products')
                .select('id, code, species_id, size_label, display_name_th, display_name_en')
                .eq('is_active', true)
                .order('display_name_th', { ascending: true })
                .order('size_label', { ascending: true });

            if (cancelled) return;

            if (error) {
                console.error('Failed to load stock products', error);
                setError(error.message || 'โหลดรายการสินค้าไม่สำเร็จ');
                setProducts([]);
            } else {
                setProducts(data as StockProduct[]);
            }

            setLoading(false);
        }

        fetchProducts();

        return () => {
            cancelled = true;
        };
    }, []);

    return { products, loading, error };
}
