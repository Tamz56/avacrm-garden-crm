import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import { useStockOverview } from "../hooks/useStockOverview";
import { useSpeciesOptions } from "../hooks/useSpeciesOptions";
import { useZoneOptions } from "../hooks/useZoneOptions";
import {
  getPlannedQty,
  getRemainingQty,
  getRowValue,
  getTotalRemaining,
  getTotalValue,
  getZoneCount,
  getLowStockItems,
} from "../utils/stockHelpers";
import { StockItemModal } from "./stock/StockItemModal";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "ready", label: "พร้อมขาย" },
  { id: "low", label: "ใกล้หมด" },
  { id: "empty", label: "หมดโซน" },
];

// map status code -> label ภาษาไทย
const renderStatusLabel = (status) => {
  switch (status) {
    case "ready":
    case "available":
      return "พร้อมขาย";
    case "low":
      return "ใกล้หมด";
    case "empty":
    case "out":
      return "หมดโซน";
    case "inactive":
      return "ไม่ใช้งาน";
    default:
      return status || "-";
  }
};

const CrmStock = () => {
  const [statusTab, setStatusTab] = useState("all");
  const [speciesId, setSpeciesId] = useState(null);
  const [sizeLabel, setSizeLabel] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [sortBy, setSortBy] = useState("zone_name");
  const [sortDir, setSortDir] = useState("asc");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const { options: speciesOptions } = useSpeciesOptions();
  const { options: zoneOptions } = useZoneOptions(); // ถ้าจะทำ filter โซนเพิ่มภายหลัง

  const { data, total, loading, error, refresh } = useStockOverview({
    speciesId,
    status: statusTab,
    sizeLabel,
    search,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const kpi = useMemo(
    () => ({
      totalRemaining: getTotalRemaining(data),
      totalValue: getTotalValue(data),
      zoneCount: getZoneCount(data),
    }),
    [data]
  );

  const lowStockItems = useMemo(() => getLowStockItems(data), [data]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const handleChangePage = (direction) => {
    setPage((prev) => {
      if (direction === "prev") return Math.max(1, prev - 1);
      if (direction === "next") return Math.min(totalPages, prev + 1);
      return prev;
    });
  };

  const resetFilters = () => {
    setStatusTab("all");
    setSpeciesId(null);
    setSizeLabel(null);
    setSearch("");
    setPage(1);
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
  };

  const handleSaved = () => {
    refresh();
  };

  const sizeOptions = useMemo(() => {
    const labels = Array.from(
      new Set(data.map((r) => r.size_label).filter(Boolean))
    );
    return labels.sort();
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">รายงานสต็อกต้นไม้</h2>
      </div>

      {/* KPI Cards ด้านบน */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            จำนวนต้นไม้ (คงเหลือ)
          </div>
          <div className="text-2xl font-semibold">
            {kpi.totalRemaining.toLocaleString()}{" "}
            <span className="text-sm font-normal text-gray-500">ต้น</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            มูลค่ารวม (ประมาณการ)
          </div>
          <div className="text-2xl font-semibold">
            ฿{kpi.totalValue.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs text-gray-500 mb-1">จำนวนแปลงปลูก</div>
          <div className="text-2xl font-semibold">
            {kpi.zoneCount.toLocaleString()}{" "}
            <span className="text-sm font-normal text-gray-500">โซน</span>
          </div>
        </div>
      </div>

      {/* แถบโซนที่ควรตรวจเช็คสต็อก */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>โซนที่ควรตรวจเช็คสต็อก</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => {
              const planned = getPlannedQty(item);
              const remaining = getRemainingQty(item);
              return (
                <div
                  key={item.stock_item_id}
                  className="px-3 py-1.5 bg-white rounded-full border border-amber-200 text-xs text-amber-800 flex items-center gap-1 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => handleRowClick(item)}
                >
                  <span className="font-medium">
                    {item.farm_name || ""} – {item.zone_name || ""}
                    {item.size_label ? ` • ${item.size_label}` : ""}
                  </span>
                  <span>
                    เหลือ {remaining} ต้น จากแผน {planned} ต้น
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 text-sm">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusTab(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full border text-xs
                ${statusTab === tab.id
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-slate-200"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right-side filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Species */}
          <select
            className="text-xs rounded-full border border-slate-300 px-3 py-1.5 bg-white"
            value={speciesId || ""}
            onChange={(e) => {
              setSpeciesId(e.target.value || null);
              setPage(1);
            }}
          >
            <option value="">ทุกสายพันธุ์</option>
            {speciesOptions.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>

          {/* Size */}
          <select
            className="text-xs rounded-full border border-slate-300 px-3 py-1.5 bg-white"
            value={sizeLabel || ""}
            onChange={(e) => {
              setSizeLabel(e.target.value || null);
              setPage(1);
            }}
          >
            <option value="">ทุกขนาดลำต้น</option>
            {sizeOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="flex items-center rounded-full border border-slate-300 px-2 py-1.5 bg-white">
            <Search className="w-3 h-3 text-gray-400 mr-1" />
            <input
              className="text-xs outline-none bg-transparent"
              placeholder="ค้นหาโซน / ฟาร์ม / สายพันธุ์"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button
            type="button"
            className="inline-flex items-center text-xs px-3 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50"
            onClick={resetFilters}
          >
            <Filter className="w-3 h-3 mr-1" />
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-gray-500">
              <tr>
                <th
                  className="px-3 py-2 text-left cursor-pointer"
                  onClick={() => handleSort("zone_name")}
                >
                  Zone Name
                </th>
                <th className="px-3 py-2 text-left">Location</th>
                <th
                  className="px-3 py-2 text-left cursor-pointer"
                  onClick={() => handleSort("species_name")}
                >
                  Species
                </th>
                <th
                  className="px-3 py-2 text-left cursor-pointer"
                  onClick={() => handleSort("size_label")}
                >
                  Size
                </th>
                <th className="px-3 py-2 text-right">Planned</th>
                <th
                  className="px-3 py-2 text-right cursor-pointer"
                  onClick={() => handleSort("quantity_available")}
                >
                  Remaining
                </th>
                <th
                  className="px-3 py-2 text-right cursor-pointer"
                  onClick={() => handleSort("base_price")}
                >
                  Price
                </th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังโหลดข้อมูล...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-red-500">
                    เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}
                  </td>
                </tr>
              )}

              {!loading && !error && data.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-gray-400">
                    ไม่พบข้อมูลตามตัวกรองที่เลือก
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                data.map((row) => {
                  const planned = getPlannedQty(row);
                  const remaining = getRemainingQty(row);
                  const value = getRowValue(row);

                  return (
                    <tr
                      key={row.stock_item_id}
                      className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(row)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.zone_name || "-"}
                      </td>
                      <td className="px-3 py-2">
                        {row.farm_name || "-"}
                      </td>
                      <td className="px-3 py-2">
                        {row.species_name || "-"}
                      </td>
                      <td className="px-3 py-2">
                        {row.size_label || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {planned.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {remaining.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.base_price != null
                          ? `฿${row.base_price.toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {value > 0 ? `฿${value.toLocaleString()}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${row.status === 'available' || row.status === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            row.status === 'low' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              row.status === 'out' || row.status === 'empty' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                          {renderStatusLabel(row.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 text-xs text-gray-500">
          <div>
            แสดง {data.length} แถว จากทั้งหมด {total.toLocaleString()} แถว
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center px-2 py-1 rounded-lg border border-slate-300 bg-white disabled:opacity-40"
              onClick={() => handleChangePage("prev")}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-3 h-3 mr-1" />
              ก่อนหน้า
            </button>
            <span>
              หน้า {page} / {totalPages}
            </span>
            <button
              className="inline-flex items-center px-2 py-1 rounded-lg border border-slate-300 bg-white disabled:opacity-40"
              onClick={() => handleChangePage("next")}
              disabled={page >= totalPages}
            >
              ถัดไป
              <ChevronRight className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <StockItemModal
        open={modalOpen}
        mode="edit"
        speciesId={selectedItem?.species_id || null}
        initialData={selectedItem}
        onClose={handleCloseModal}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default CrmStock;
