import React, { useState } from "react";
import { RefreshCw, LayoutDashboard, Package } from "lucide-react";
import { ZoneOverviewSection } from "./stock/ZoneOverviewSection";
import { ProductSidebar } from "./stock/ProductSidebar";
import { ProductDetailSection } from "./stock/ProductDetailSection";
import { SizeZoneStockTable } from "./stock/SizeZoneStockTable";
import { StockItemModal } from "./stock/StockItemModal";
import { StockLifecycleOverviewTab } from "./stock/StockLifecycleOverviewTab";

const StockCRMPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"overview" | "management">("overview");
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingItem, setEditingItem] = useState<any>(null); // Should be typed properly
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleAddProduct = () => {
        console.log("Add product clicked");
    };

    const handleAddStock = () => {
        setModalMode("create");
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleEditStock = (item: any) => {
        setModalMode("edit");
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleStockSaved = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="flex flex-col gap-6 h-full overflow-y-auto pb-10">
            {/* Header with Refresh Button */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        สต็อกขาย (Stock CRM)
                        <button
                            onClick={() => setRefreshTrigger(prev => prev + 1)}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="รีเฟรชข้อมูล"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </h1>
                    <p className="text-slate-500 mt-1">
                        จัดการสต็อก ต้นไม้พร้อมขาย และการจอง
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "overview"
                                ? "bg-white text-emerald-700 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        ภาพรวม (Lifecycle)
                    </button>
                    <button
                        onClick={() => setActiveTab("management")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "management"
                                ? "bg-white text-emerald-700 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        <Package className="w-4 h-4" />
                        จัดการสต็อก
                    </button>
                </div>
            </div>

            {activeTab === "overview" ? (
                <StockLifecycleOverviewTab />
            ) : (
                <>
                    {/* SECTION 1 – ภาพรวมสต็อกตามโซน (Old Overview) */}
                    <ZoneOverviewSection />

                    {/* SECTION 2 + 3 – Layout ล่างแบ่ง 2 คอลัมน์ */}
                    <div className="grid grid-cols-1 lg:grid-cols-[320px,minmax(0,1fr)] gap-6 items-start">
                        {/* ซ้าย: รายการต้นไม้ / สินค้า */}
                        <div className="lg:sticky lg:top-0">
                            <ProductSidebar
                                selectedProductId={selectedProductId}
                                onSelectProduct={setSelectedProductId}
                                onAddProduct={handleAddProduct}
                            />
                        </div>

                        {/* ขวา: รายละเอียดสินค้า + ตารางสต็อกแยกตามขนาด/โซน */}
                        <div className="flex flex-col gap-6 min-w-0">
                            <ProductDetailSection productId={selectedProductId} />

                            <SizeZoneStockTable
                                productId={selectedProductId}
                                refreshTrigger={refreshTrigger}
                                onAddStock={handleAddStock}
                                onEdit={handleEditStock}
                            />
                        </div>
                    </div>
                </>
            )}

            <StockItemModal
                open={isModalOpen}
                mode={modalMode}
                speciesId={selectedProductId}
                initialData={editingItem}
                onClose={() => setIsModalOpen(false)}
                onSaved={handleStockSaved}
            />
        </div>
    );
};

export default StockCRMPage;
