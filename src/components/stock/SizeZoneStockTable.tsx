import React, { useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Edit2, Plus } from 'lucide-react';
import { useProductSizeZoneStock, ProductSizeZoneRow } from '../../hooks/useProductSizeZoneStock';
import { getStockStatusLabel, getStockStatusClassName, mapDbStatusToStockStatus } from '../../utils/stockStatus';
import { trunkSizeOrder } from '../../constants/treeOptions';

type SortField = 'size' | 'zone' | 'planned' | 'remaining' | 'price';
type SortDirection = 'asc' | 'desc';

interface SizeZoneStockTableProps {
    productId: string | null;
    refreshTrigger: number;
    onAddStock?: () => void;
    onEdit?: (item: ProductSizeZoneRow) => void;
}

export const SizeZoneStockTable: React.FC<SizeZoneStockTableProps> = ({
    productId,
    refreshTrigger,
    onAddStock,
    onEdit
}) => {
    const { data, isLoading, error } = useProductSizeZoneStock(productId, refreshTrigger);
    const [sortField, setSortField] = React.useState<SortField>('size');
    const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedData = useMemo(() => {
        if (!data || !data.rows) return [];
        let filtered = [...data.rows];

        return filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'size':
                    // Sort by trunk size order if available
                    // Priority: trunk_size_inch -> trunkSizeOrder[size_label] -> parseFloat(size_label)
                    const getOrder = (row: ProductSizeZoneRow) => {
                        if (row.trunk_size_inch) return row.trunk_size_inch;
                        const label = row.size_label || "";
                        // Remove " char if present for lookup
                        const lookup = label.replace('"', '');
                        if (trunkSizeOrder[lookup] !== undefined) return trunkSizeOrder[lookup];
                        // Fallback to parsing
                        const parsed = parseFloat(label);
                        return isNaN(parsed) ? 999 : parsed;
                    };

                    comparison = getOrder(a) - getOrder(b);
                    break;
                case 'zone':
                    comparison = a.zone_name.localeCompare(b.zone_name);
                    break;
                case 'planned':
                    comparison = a.planned - b.planned;
                    break;
                case 'remaining':
                    comparison = a.remaining - b.remaining;
                    break;
                case 'price':
                    comparison = (a.base_price || 0) - (b.base_price || 0);
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [data, sortField, sortDirection]);

    // Group by size for display
    const groupedRows = useMemo(() => {
        const groups: { [key: string]: ProductSizeZoneRow[] } = {};
        sortedData.forEach(row => {
            // Use trunk_size_inch for grouping, fallback to size_label if null (for old data)
            const sizeDisplay = row.trunk_size_inch ? `${row.trunk_size_inch}"` : (row.size_label || "-");
            if (!groups[sizeDisplay]) {
                groups[sizeDisplay] = [];
            }
            groups[sizeDisplay].push(row);
        });

        // Sort groups by trunk size (numeric) if possible
        return Object.entries(groups).sort((a, b) => {
            const getGroupOrder = (key: string) => {
                const lookup = key.replace('"', '');
                if (trunkSizeOrder[lookup] !== undefined) return trunkSizeOrder[lookup];
                const parsed = parseFloat(key);
                return isNaN(parsed) ? 999 : parsed;
            };
            return getGroupOrder(a[0]) - getGroupOrder(b[0]);
        });
    }, [sortedData]);

    if (isLoading) return <div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;
    if (error) return <div className="p-8 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>;
    if (!productId) return <div className="p-8 text-center text-slate-400">กรุณาเลือกสินค้าเพื่อดูสต็อก</div>;

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-slate-400 opacity-50" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="w-4 h-4 text-emerald-600" />
            : <ArrowDown className="w-4 h-4 text-emerald-600" />;
    };

    return (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">รายการสต็อกตามขนาดและโซน</h3>
                {onAddStock && (
                    <button
                        onClick={onAddStock}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มรายการ
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th
                                className="cursor-pointer py-3 px-4 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                onClick={() => handleSort('size')}
                            >
                                <div className="flex items-center gap-2">
                                    ขนาด
                                    <SortIcon field="size" />
                                </div>
                            </th>
                            <th
                                className="cursor-pointer py-3 px-4 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                onClick={() => handleSort('zone')}
                            >
                                <div className="flex items-center gap-2">
                                    โซน
                                    <SortIcon field="zone" />
                                </div>
                            </th>
                            <th
                                className="cursor-pointer py-3 px-4 text-right text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                onClick={() => handleSort('planned')}
                            >
                                <div className="flex items-center justify-end gap-2">
                                    แผน (ต้น)
                                    <SortIcon field="planned" />
                                </div>
                            </th>
                            <th
                                className="cursor-pointer py-3 px-4 text-right text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                onClick={() => handleSort('remaining')}
                            >
                                <div className="flex items-center justify-end gap-2">
                                    คงเหลือ (ต้น)
                                    <SortIcon field="remaining" />
                                </div>
                            </th>
                            <th
                                className="cursor-pointer py-3 px-4 text-right text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                onClick={() => handleSort('price')}
                            >
                                <div className="flex items-center justify-end gap-2">
                                    ราคา (บาท)
                                    <SortIcon field="price" />
                                </div>
                            </th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-slate-600">
                                สถานะ
                            </th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-slate-600">
                                จัดการ
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {groupedRows.map(([size, items]) => (
                            items.map((row, idx) => {
                                // Calculate status using mapDbStatusToStockStatus
                                const status = mapDbStatusToStockStatus(
                                    row.status,
                                    row.remaining,
                                    row.planned
                                );

                                return (
                                    <tr key={row.id} className="hover:bg-slate-50/50">
                                        {idx === 0 && (
                                            <td
                                                rowSpan={items.length}
                                                className="py-3 px-4 align-top font-medium text-slate-900 border-r border-slate-100 bg-slate-50/30"
                                            >
                                                {size}
                                            </td>
                                        )}
                                        <td className="py-3 px-4 text-slate-600">
                                            {row.zone_name}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-600">{row.planned.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-right text-emerald-600 font-medium">{row.remaining.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-right text-slate-600">
                                            {row.base_price?.toLocaleString() ?? "-"}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStockStatusClassName(status)}`}>
                                                {getStockStatusLabel(status)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                onClick={() => onEdit && onEdit(row)}
                                                className="rounded-full p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                                title="แก้ไข"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ))}
                        {groupedRows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                    ยังไม่มีรายการสต็อก
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
