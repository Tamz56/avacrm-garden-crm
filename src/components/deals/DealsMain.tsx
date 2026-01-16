// src/components/deals/DealsMain.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCcw,
  ChevronRight,
  MapPin,
  Info,
  Plus,
  DollarSign,
  Calendar,
  TreePine,
  CheckCircle,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import DealCommissionPanel from "./DealCommissionPanel";
import StockItemSelect, {
  StockItemOption,
} from "./StockItemSelect";
import DealStockSummaryCard, { DealStockAllocation } from "../DealStockSummaryCard";
import DealReservedTagsPanel from "../customers/deals/DealReservedTagsPanel";
import DealDigOrdersCard from "../customers/deals/DealDigOrdersCard";
import DealShipmentsCard, { DealShipment } from "./DealShipmentsCard";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { DealPaymentModal, PaymentFormValues } from "./DealPaymentModal";
import { EditDealModal } from "./EditDealModal";
import { Pencil } from "lucide-react";
import DealFormBody, { DealItem, TeamShare } from "./DealFormBody";
import NewShipmentModal from "./NewShipmentModal";
import type { DealShippingSummary } from "../../types/dealShipping";
import DealDetailLayout from "./DealDetailLayout";
import { DealList, DealListItemData } from "./DealList";
import { QuotePrintView } from "./QuotePrintView";
import { TagSelectionModal } from "./TagSelectionModal";
import { useDealPaymentSummary } from "../../hooks/useDealPaymentSummary";
import { useDealPayments } from "../../hooks/useDealPayments";
import DealStockReservationsPanel from "../customers/deals/DealStockReservationsPanel";
import DealDocumentsPanel from "../customers/deals/DealDocumentsPanel";

// รูปแบบข้อมูลดีลแบบง่าย ๆ (ใช้แค่ฟิลด์ที่เอามาแสดง)
type Deal = {
  id: string;
  title: string | null;
  customer_name: string | null;
  total_amount: number | null;
  stage: string | null;
  status: string | null;
  closing_date: string | null;
  created_at: string | null;
  deal_code?: string | null;
  note_customer?: string | null;
  payment_status?: "pending" | "partial" | "paid" | "cancelled";
  paid_at?: string | null;
  deposit_amount?: number | null;
};

type DealWithShipping = Deal & {
  shippingSummary?: DealShippingSummary;
};

type DealStockSummaryRow = {
  deal_id: string;
  deal_code: string | null;
  deal_title: string | null;
  deal_item_id: string;
  deal_quantity: number | null;
  stock_item_id: string;
  size_label: string | null;
  zone_name: string | null;
  stock_quantity_available: number | null;
  total_moved_for_deal: number | null;
};

const toThaiBaht = (val: number | null | undefined) =>
  val == null
    ? "-"
    : `฿${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

// -------------------- Modal สร้างดีลใหม่ --------------------

const NewDealModal = ({ onClose, onCreated }: { onClose: () => void, onCreated: (deal: any) => void }) => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesPeople, setSalesPeople] = useState<any[]>([]);

  // State for DealFormBody
  const [dealData, setDealData] = useState({
    name: "",
    customer_id: null,
    amount: 0,
    deposit_amount: 0,
    shipping_cost: 0,
    expected_close_date: null,
    note: "",
  });

  const [items, setItems] = useState<DealItem[]>([]);

  const [teamShare, setTeamShare] = useState<TeamShare>({
    referral_id: null,
    sales_agent_id: null,
    team_leader_id: null,
  });

  const [error, setError] = useState<string | null>(null);

  // Load options
  useEffect(() => {
    const fetchOptions = async () => {
      const [custRes, profilesRes] = await Promise.all([
        supabase.from("customers").select("id, name"),
        supabase.from("profiles").select("id, full_name"),
      ]);

      if (!custRes.error) setCustomers(custRes.data || []);
      if (!profilesRes.error) setSalesPeople(profilesRes.data || []);
    };

    fetchOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!dealData.customer_id) throw new Error("กรุณาเลือกลูกค้า");
      if (!dealData.amount) throw new Error("กรุณากรอกมูลค่าดีล");
      if (items.length === 0) throw new Error("กรุณาเพิ่มรายการต้นไม้อย่างน้อย 1 รายการ");

      // 1) Prepare basic values
      const total = Number(dealData.amount || 0);
      const deposit = Number(dealData.deposit_amount || 0);
      const remaining = total - deposit;

      const customer = customers.find((c) => c.id === dealData.customer_id);
      const customerName = customer?.name ?? null;

      const ownerId =
        teamShare.sales_agent_id ||
        teamShare.team_leader_id ||
        teamShare.referral_id ||
        null;

      // 2) Insert Deal
      const { data: deal, error: dealError } = await supabase
        .from("deals")
        .insert({
          title: dealData.name || "ดีลใหม่ (ยังไม่ตั้งชื่อ)",
          customer_id: dealData.customer_id,
          customer_name: customerName,

          total_amount: total,
          amount: total,
          grand_total: total,

          deposit_amount: deposit,
          shipping_cost: Number(dealData.shipping_cost || 0),
          remaining_amount: remaining,

          closing_date: dealData.expected_close_date || null,
          note_customer: dealData.note || null,

          referral_sales_id: teamShare.referral_id || null,
          closing_sales_id: teamShare.sales_agent_id || null,
          team_leader_id: teamShare.team_leader_id || null,
          owner_id: ownerId,

          stage: 'inquiry',
          status: 'draft',
        })
        .select("*")
        .single();

      if (dealError) {
        console.error("Error creating deal", dealError);
        throw dealError;
      }

      // 3) Insert Deal Items
      if (deal?.id && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          deal_id: deal.id,
          stock_item_id: item.stock_item_id || null,
          description: item.description || item.tree_name || "ไม่ระบุ",
          quantity: item.quantity,
          unit_price: item.price_per_tree,
          trunk_size_inch: item.trunk_size_inch || null,
          line_total: item.quantity * item.price_per_tree,
          unit: "ต้น",
          // New fields for Price per Meter
          price_type: item.price_type || 'per_tree',
          height_m: item.height_m || null,
          price_per_meter: item.price_per_meter || null,
        }));

        const { error: itemError } = await supabase.from("deal_items").insert(itemsToInsert);

        if (itemError) {
          console.error("Error creating deal_items", itemError);
          // Don't throw, just log
        }
      }

      // 4) Recalculate Commissions
      if (deal?.id) {
        const { error: rpcError } = await supabase.rpc(
          "recalc_deal_commissions",
          { p_deal_id: deal.id }
        );
        if (rpcError) {
          console.warn("recalc_deal_commissions error", rpcError);
        }
      }

      // 5) Notify parent
      if (onCreated) onCreated(deal);

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดในการสร้างดีลใหม่");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">สร้างดีลใหม่</h2>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 px-4 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          <DealFormBody
            mode="create"
            dealData={dealData}
            setDealData={setDealData}
            items={items}
            setItems={setItems}
            teamShare={teamShare}
            setTeamShare={setTeamShare}
            customerOptions={customers}
            salesOptions={salesPeople}
          />

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึกดีลใหม่
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DealsMainProps {
  isDarkMode?: boolean;
  onDataChanged?: () => void;
}

const DealsMain: React.FC<DealsMainProps> = ({ onDataChanged }) => {
  const [deals, setDeals] = useState<DealWithShipping[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewDealModal, setShowNewDealModal] = useState(false);

  // State for DealStockSummaryCard & DealShipmentsCard
  const [allocations, setAllocations] = useState<DealStockAllocation[]>([]);
  const [shipments, setShipments] = useState<DealShipment[]>([]);
  const [dealItems, setDealItems] = useState<DealItem[]>([]);

  // Use the hook for payment summary
  const { data: paymentSummary, refetch: refetchPaymentSummary } = useDealPaymentSummary(selectedDealId);
  const { payments, refetch: refetchPayments } = useDealPayments(selectedDealId || undefined);
  const [loadingStockData, setLoadingStockData] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any | null>(null); // TODO: Use DealPayment type
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewShipmentModal, setShowNewShipmentModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [reservedTagsCount, setReservedTagsCount] = useState(0);
  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1) Load deals
      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select(
          `
          id,
          title,
          customer_name,
          total_amount,
          stage,
          status,
          closing_date,
          created_at,
          deal_code,
          note_customer,
          payment_status,
          payment_status,
          paid_at,
          deposit_amount
        `
        )
        .order("created_at", { ascending: false });

      if (dealsError) throw dealsError;

      const baseDeals = (dealsData || []) as Deal[];

      // 2) Fetch shipping summary
      const dealIds = baseDeals.map((d) => d.id);
      let shippingByDealId = new Map<string, DealShippingSummary>();

      if (dealIds.length > 0) {
        const { data: shippingData, error: shipError } = await supabase
          .from('view_deal_shipping_summary')
          .select('*')
          .in('deal_id', dealIds);

        if (shipError) {
          console.error("fetch shipping summary error", shipError);
        } else {
          (shippingData as DealShippingSummary[]).forEach((s) => {
            shippingByDealId.set(s.deal_id, s);
          });
        }
      }

      // 3) Merge data
      const dealsWithShipping: DealWithShipping[] = baseDeals.map((d) => ({
        ...d,
        shippingSummary: shippingByDealId.get(d.id),
      }));

      setDeals(dealsWithShipping);
    } catch (err: any) {
      console.error("โหลดดีลจาก Supabase ผิดพลาด", err);
      setError(err.message ?? "ไม่สามารถโหลดข้อมูลดีลได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Load allocations and shipments when deal changes
  const loadStockData = useCallback(async () => {
    if (!selectedDealId) {
      setAllocations([]);
      setShipments([]);
      return;
    }

    setLoadingStockData(true);

    // 1. Fetch Allocations (RPC)
    const { data: allocData, error: allocError } = await supabase.rpc(
      "get_deal_stock_allocation",
      { p_deal_id: selectedDealId }
    );

    if (allocError) {
      console.error("get_deal_stock_allocation error", allocError);
    } else {
      // Map RPC result to DealStockAllocation interface
      // RPC returns: deal_id, deal_item_id, stock_item_id, ordered_quantity, shipped_quantity, remaining_quantity, stock_item_code, stock_item_size, stock_item_zone, zone_id
      const mapped: DealStockAllocation[] = (allocData || []).map((item: any) => ({
        deal_id: item.deal_id,
        deal_item_id: item.deal_item_id,
        stock_item_id: item.stock_item_id,
        ordered_quantity: item.ordered_quantity,
        shipped_quantity: item.shipped_quantity,
        remaining_quantity: item.remaining_quantity,
        stock_item_code: item.stock_item_code,
        stock_item_size: item.stock_item_size,
        stock_item_zone: item.stock_item_zone,
        zone_id: item.zone_id,
        label: `${item.stock_item_size || "?"} - ${item.stock_item_zone || "?"} (${item.stock_item_code || ""})`
      }));
      setAllocations(mapped);
    }

    // 2. Fetch Shipments
    const { data: shipData, error: shipError } = await supabase
      .from("deal_shipments")
      .select("*")
      .eq("deal_id", selectedDealId)
      .order("ship_date", { ascending: true });

    if (shipError) {
      console.error("fetch shipments error", shipError);
      // If table doesn't exist yet, this will error. We handle gracefully.
      setShipments([]);
    } else {
      setShipments((shipData || []) as DealShipment[]);
    }

    // 3. Fetch Deal Items with Stock Details
    const { data: itemsData, error: itemsError } = await supabase
      .from("deal_items")
      .select("*, stock_items(grade, size_label)")
      .eq("deal_id", selectedDealId);

    if (itemsError) {
      console.error("fetch deal items error", itemsError);
      setDealItems([]);
    } else {
      // Map to DealItem
      const mappedItems: DealItem[] = (itemsData || []).map((i: any) => ({
        id: i.id,
        stock_item_id: i.stock_item_id,
        description: i.description,
        quantity: i.quantity,
        price_per_tree: i.unit_price,
        trunk_size_inch: i.trunk_size_inch,
        total_price: i.line_total,
        imageUrl: null,
        gradeLabel: i.stock_items?.grade || null
      }));
      setDealItems(mappedItems);
    }

    // 5. Fetch Reserved Tags Count
    const { data: tagsData, error: tagsError } = await supabase.rpc(
      "get_deal_reserved_tags",
      { p_deal_id: selectedDealId }
    );
    if (tagsError) {
      console.error("get_deal_reserved_tags error", tagsError);
    } else {
      setReservedTagsCount((tagsData || []).length);
    }

    setLoadingStockData(false);
  }, [selectedDealId, deals]); // Depend on deals instead of selectedDeal

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  // เซ็ตดีลตัวแรกให้ถูกเลือกอัตโนมัติ
  useEffect(() => {
    if (deals.length && !selectedDealId) {
      setSelectedDealId(deals[0].id);
    }
  }, [deals, selectedDealId]);

  // filter ตาม search
  const filteredDeals = useMemo(() => {
    if (!searchTerm.trim()) return deals;
    const term = searchTerm.toLowerCase();
    return deals.filter((d) => {
      const text =
        `${d.title ?? ""} ${d.customer_name ?? ""} ${d.stage ?? ""
          }`.toLowerCase();
      return text.includes(term);
    });
  }, [deals, searchTerm]);

  const selectedDeal =
    filteredDeals.find((d) => d.id === selectedDealId) ||
    filteredDeals[0] ||
    null;

  const [showCommissionPanel, setShowCommissionPanel] = useState(false);
  const [closingDeal, setClosingDeal] = useState(false);

  const handleNewDealCreated = (newDeal: any) => {
    loadDeals();
    if (newDeal) setSelectedDealId(newDeal.id);
    onDataChanged?.(); // Trigger dashboard reload
  };

  const handleCloseDealAndUpdateStock = async (dealId: string) => {
    if (!window.confirm("ยืนยันการปิดดีลและหักสต็อก?\n\nการกระทำนี้จะ:\n- เปลี่ยนสถานะดีลเป็น Won\n- หักจำนวนสต็อกตามรายการในดีล\n- บันทึก stock movements")) {
      return;
    }

    try {
      setClosingDeal(true);

      // เรียก RPC ปิดดีล + หักสต็อก
      const { data, error } = await supabase.rpc(
        "close_deal_and_update_stock",
        { p_deal_id: dealId }
      );

      if (error) {
        console.error("close_deal_and_update_stock error", error);
        alert("ปิดดีลและปรับสต็อกไม่สำเร็จ: " + error.message);
        return;
      }

      if (data && data.ok === false) {
        console.warn("close_deal stock validation", data);
        const msg =
          data.message ||
          (data.errors && data.errors.join(" ; ")) ||
          "มีปัญหาในการตัดสต็อก";
        alert(msg);
      } else {
        alert("✅ ปิดดีลและปรับสต็อกเรียบร้อยแล้ว 🌱");
        // Refresh list ดีล
        await loadDeals();
        onDataChanged?.(); // Trigger dashboard reload
      }
    } catch (err: any) {
      console.error(err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setClosingDeal(false);
    }
  }


  const handleConfirmTags = async (selectedTags: any[]) => {
    if (!selectedDealId) return;
    try {
      // Loop assign tags
      for (const tag of selectedTags) {
        const { error } = await supabase.rpc("assign_tag_to_deal", {
          p_deal_id: selectedDealId,
          p_tag_code: tag.tag_code,
        });
        if (error) throw error;
      }
      alert(`ผูก Tag ${selectedTags.length} รายการเรียบร้อยแล้ว ✅`);
      loadStockData(); // Refresh counts
    } catch (err: any) {
      console.error("Error assigning tags", err);
      alert("เกิดข้อผิดพลาดในการผูก Tag: " + err.message);
    }
  };

  const handleSubmitPayment = async (values: PaymentFormValues) => {
    if (!selectedDealId) return;
    try {
      let data, error;

      if (editingPayment) {
        // UPDATE existing payment
        ({ data, error } = await supabase.rpc("update_deal_payment", {
          p_payment_id: editingPayment.id,
          p_amount: values.amount,
          p_payment_type: values.payment_type,
          p_method: values.method,
          p_payment_date: values.payment_date,
          p_note: values.note,
        }));
      } else {
        // CREATE new payment
        ({ data, error } = await supabase.rpc("record_deal_payment", {
          p_deal_id: selectedDealId,
          p_amount: values.amount,
          p_payment_type: values.payment_type,
          p_method: values.method,
          p_payment_date: values.payment_date,
          p_note: values.note,
        }));
      }

      if (error) throw error;

      // Success
      alert(editingPayment ? "แก้ไขการชำระเงินเรียบร้อยแล้ว ✅" : "บันทึกการชำระเงินเรียบร้อยแล้ว ✅");
      setShowPaymentModal(false);
      setEditingPayment(null);
      refetchPaymentSummary(); // Refresh summary
      refetchPayments(); // Refresh history
      loadDeals(); // Refresh list status
      onDataChanged?.(); // Trigger dashboard reload
    } catch (err: any) {
      console.error("Error recording payment", err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setShowPaymentModal(true);
  };

  const handleDeletePayment = async (payment: any) => {
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบการชำระเงินจำนวน ${payment.amount.toLocaleString()} บาท ใช่ไหม?`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc("delete_deal_payment", {
        p_payment_id: payment.id,
      });

      if (error) throw error;

      alert("ลบรายการชำระเงินเรียบร้อยแล้ว 🗑️");
      refetchPaymentSummary();
      refetchPayments();
      loadDeals();
    } catch (err: any) {
      console.error("Error deleting payment", err);
      alert("เกิดข้อผิดพลาดในการลบ: " + err.message);
    }
  };



  const listItems: DealListItemData[] = useMemo(
    () =>
      deals.map((d) => ({
        id: d.id,
        title: d.title || d.deal_code || "(ไม่มีชื่อดีล)",
        customerName: d.customer_name || "-",
        lastActivityLabel: d.created_at
          ? new Date(d.created_at).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
          })
          : "–",
        amount: d.total_amount ?? 0,
        paymentStatus: (d.payment_status || "unpaid") as any,
        shipping: d.shippingSummary
          ? {
            shipped: d.shippingSummary.shipped_quantity,
            total: d.shippingSummary.total_quantity,
          }
          : null,
        stage: (d.stage || "inquiry") as any,
      })),
    [deals]
  );

  const activeDeal =
    listItems.find((x) => x.id === selectedDealId) || listItems[0];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* COLUMN LEFT: DEAL LIST */}
      <aside className="w-[320px] shrink-0 border-r border-gray-200 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-950/40 flex flex-col min-h-0">
        {/* Header with New Deal Button */}
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h1 className="font-semibold text-slate-900 dark:text-slate-100">ออเดอร์ / ดีล</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewDealModal(true)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              ดีลใหม่
            </button>
            <button
              onClick={loadDeals}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300 transition-colors"
              disabled={loading}
            >
              <RefreshCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* List Container */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              กำลังโหลดดีล...
            </div>
          ) : (
            <DealList
              items={listItems}
              activeId={selectedDealId}
              onSelect={setSelectedDealId}
            />
          )}
        </div>
      </aside>

      {/* COLUMN RIGHT: DEAL DETAIL */}
      <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 relative">
        {!selectedDeal ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            เลือกดีลจากด้านซ้ายมือเพื่อดูรายละเอียด
          </div>
        ) : (
          <DealDetailLayout
            deal={{
              ...selectedDeal,
              quantity: dealItems.reduce((sum, i) => sum + (i.quantity || 0), 0)
            }}
            summary={{
              totalAmount: paymentSummary?.net_total ?? (selectedDeal.total_amount || 0),
              paidAmount: paymentSummary?.paid_total ?? 0,
              outstandingAmount: paymentSummary?.outstanding ?? (selectedDeal.total_amount || 0),
            }}
            depositInfo={{
              required: paymentSummary?.deposit_required_amount ?? selectedDeal.deposit_amount ?? 0,
              paid: paymentSummary?.deposit_paid ?? 0,
              status: paymentSummary?.deposit_status ?? ((selectedDeal.deposit_amount ?? 0) > 0 ? "pending" : "not_required"),
            }}
            items={dealItems.map(item => ({
              id: item.id || Math.random().toString(),
              description: item.description || "สินค้า",
              subText: item.trunk_size_inch ? `ขนาด ${item.trunk_size_inch} นิ้ว` : undefined,
              quantity: item.quantity || 0,
              unitPrice: item.price_per_tree || 0,
              imageUrl: null,
              gradeLabel: item.gradeLabel
            }))}
            tagProgress={{ scanned: reservedTagsCount, total: dealItems.reduce((sum, i) => sum + (i.quantity || 0), 0) }}
            shippingTimeline={[
              { id: "s1", label: "สร้างดีลแล้ว", timeLabel: selectedDeal.created_at ? new Date(selectedDeal.created_at).toLocaleDateString('th-TH') : "-", state: "done" },
              // Dynamic timeline based on shipments
              ...(shipments.length > 0 ? [{ id: "s2", label: "มีการสร้างรายการขนส่ง", state: "done" } as const] : []),
              ...(shipments.some(s => s.status === 'completed') ? [{ id: "s3", label: "จัดส่งเรียบร้อย", state: "done" } as const] : []),
              // Default pending step if not done
              ...(!shipments.some(s => s.status === 'completed') ? [{ id: "s_pending", label: "รอการจัดส่ง", state: "pending" } as const] : [])
            ]}
            shipments={shipments.map(s => ({
              id: s.id,
              date: s.ship_date,
              carrier: s.transporter_name || undefined,
              method: s.vehicle_code || "ขนส่ง",
              distance_km: s.distance_km || 0,
              estimated_cost: s.estimated_price || 0,
              actual_cost: s.final_price || 0,
              status: s.status || "draft"
            }))}
            internalNote={selectedDeal.note_customer || "ลูกค้าขอดูรูปต้นก่อนส่งวันที่ 12 นี้"}
            customerInfo={{
              name: selectedDeal.customer_name || "ไม่ระบุชื่อ",
              phone: "081-111-1111", // Mock
              address: "123 หมู่ 4 ต.ปากช่อง อ.ปากช่อง จ.นครราชสีมา", // Mock
            }}
            onPrintQuote={() => {
              // Trigger print
              window.print();
            }}
            onRecordPayment={() => {
              setShowPaymentModal(true);
            }}
            onOpenScanner={() => {
              setShowTagModal(true);
            }}
            onEditDeal={() => setShowEditModal(true)}
            onAddShipment={() => setShowNewShipmentModal(true)}
            onEditShipment={(id) => console.log("Edit shipment", id)}
            payments={payments}
            onEditPayment={handleEditPayment}
            onDeletePayment={handleDeletePayment}
            renderAdditionalPanels={() => (
              <>
                <DealStockReservationsPanel dealId={selectedDealId!} />
                <DealDocumentsPanel
                  dealId={selectedDealId!}
                  dealInfo={{
                    title: selectedDeal.title ?? undefined,
                    customer_name: selectedDeal.customer_name ?? undefined,
                  }}
                />
              </>
            )}
          />
        )}
      </div>

      {showCommissionPanel && selectedDealId && (
        <DealCommissionPanel
          dealId={selectedDealId}
          dealAmount={selectedDeal?.total_amount}
          onClose={() => setShowCommissionPanel(false)}
        />
      )}

      {
        showNewDealModal && (
          <NewDealModal
            onClose={() => setShowNewDealModal(false)}
            onCreated={handleNewDealCreated}
          />
        )
      }

      {showPaymentModal && selectedDealId && (
        <DealPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setEditingPayment(null);
          }}
          onSubmit={handleSubmitPayment}
          dealTitle={selectedDeal?.title || ""}
          mode={editingPayment ? "edit" : "create"}
          defaultValues={editingPayment ? {
            amount: editingPayment.amount,
            paymentType: editingPayment.paymentType,
            method: editingPayment.method,
            paymentDate: editingPayment.paymentDate,
            note: editingPayment.note
          } : undefined}
        />
      )}

      {showEditModal && selectedDeal && (
        <EditDealModal
          deal={selectedDeal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadDeals();
            // Optional: refresh other data if needed
          }}
        />
      )}

      {showNewShipmentModal && selectedDeal && (
        <NewShipmentModal
          dealId={selectedDeal.id}
          defaultShipDate={selectedDeal.closing_date || undefined}
          onClose={() => setShowNewShipmentModal(false)}
          onCreated={() => {
            loadStockData();
          }}
        />
      )}

      {showTagModal && selectedDealId && (
        <TagSelectionModal
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          onConfirm={handleConfirmTags}
          dealId={selectedDealId}
        />
      )}

      {/* 🖨️ Hidden Print View */}
      {selectedDeal && (
        <QuotePrintView
          deal={{
            id: selectedDeal.id,
            code: selectedDeal.deal_code || "N/A",
            title: selectedDeal.title || "ไม่ระบุชื่อดีล",
            created_at: selectedDeal.created_at
          }}
          items={dealItems.map(item => ({
            id: item.id || Math.random().toString(),
            description: item.description || "สินค้า",
            subText: item.trunk_size_inch ? `ขนาด ${item.trunk_size_inch} นิ้ว` : undefined,
            quantity: item.quantity || 0,
            unitPrice: item.price_per_tree || 0,
            imageUrl: null,
            gradeLabel: item.gradeLabel
          }))}
          customerInfo={{
            name: selectedDeal.customer_name || "ไม่ระบุชื่อ",
            phone: "081-111-1111", // Mock
            address: "123 หมู่ 4 ต.ปากช่อง อ.ปากช่อง จ.นครราชสีมา", // Mock
          }}
          summary={{
            totalAmount: selectedDeal.total_amount || 0,
            depositAmount: paymentSummary?.deposit_required_amount ?? (selectedDeal.deposit_amount || 0)
          }}
        />
      )}
    </div>
  );
};

export default DealsMain;
