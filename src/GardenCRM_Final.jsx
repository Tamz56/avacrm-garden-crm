import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Trees, Sprout, ShoppingCart, ClipboardList, Users, 
  Settings, Search, Bell, Menu, X, Plus, MapPin, Truck, Calendar, 
  Filter, CheckCircle2, AlertCircle, FileText, ChevronRight, Printer, 
  Download, ArrowRight, MoreVertical, DollarSign, PieChart, TrendingUp, 
  Activity, History, Lock, User, Clock, LogOut, BarChart3, Info,
  CreditCard, Receipt, FileCheck, Leaf, ArrowUpRight, ArrowDownRight,
  Image as ImageIcon, Share2, AlertTriangle, Calculator, Package, Check,
  XCircle, Home, Droplets, Shovel, Edit3, Trash2
} from 'lucide-react';

// --- 1. CONFIG & HELPER FUNCTIONS ---

const CONFIG = {
  appName: 'Garden CRM',
  version: '1.2.0',
  geminiApiKey: "" // ⚠️ ใส่ API Key ของคุณที่นี่
};

const toThaiBaht = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '฿0';
  return `฿${Number(val).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()+543}`;
};

const getDaysDiff = (dateStr) => {
    if (!dateStr) return 999;
    const today = new Date();
    const target = new Date(dateStr);
    const diffTime = Math.abs(today - target);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

const VEHICLE_TYPES = [
  { id: 'pickup', name: 'รถกระบะ (Pickup)', base: 500, perKm: 15, capacity: 'ไม้เล็ก 20-30 ต้น' },
  { id: '6-wheel', name: 'รถ 6 ล้อติดเครน', base: 4000, perKm: 30, capacity: 'ไม้ขุด 10-15 ต้น' },
  { id: '10-wheel', name: 'รถ 10 ล้อติดเครน', base: 7000, perKm: 45, capacity: 'ไม้ขุด 20-30 ต้น' },
];

const MENU_ITEMS = [
  { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { id: 'stock', label: 'คลังต้นไม้', icon: Trees },
  { id: 'zones', label: 'จัดการแปลง', icon: MapPin },
  { id: 'deals', label: 'การขาย', icon: ShoppingCart },
  { id: 'customers', label: 'ลูกค้า', icon: Users },
  { id: 'deliveries', label: 'การจัดส่ง', icon: Truck },
  { id: 'tasks', label: 'งานปฏิบัติการ', icon: ClipboardList },
  { id: 'finance', label: 'บัญชี/การเงิน', icon: DollarSign },
];

// --- 2. MOCK DATA (INITIAL_DATA) ---
const INITIAL_DATA = {
  customers: [
    { id: 'uuid-c1', code: 'C-001', name: 'บริษัท 999 จำกัด', type: 'Corporate', taxId: '0305568899', isHeadOffice: true, branch: '', phone: '089-9991125', email: 'purchase@999.co.th', address: '123 ถนนมิตรภาพ', subDistrict: 'ในเมือง', district: 'เมืองนครราชสีมา', province: 'นครราชสีมา', zipcode: '30000', deals_count: 5, total_spend: 250000 },
    { id: 'uuid-c2', code: 'C-002', name: 'รีสอร์ทเขาใหญ่ (คุณสมชาย)', type: 'Business', taxId: '-', isHeadOffice: false, branch: '', phone: '081-234-5678', email: 'somchai@resort.com', address: '555 หมู่ 3', subDistrict: 'หมูสี', district: 'ปากช่อง', province: 'นครราชสีมา', zipcode: '30130', deals_count: 2, total_spend: 180000 },
  ],
  plant_zones: [
    { id: 'z1', name: 'Zone A', location: 'แปลงหน้าฟาร์ม', area: '2 ไร่', soil_type: 'ดินร่วนปนทราย', water_system: 'สปริงเกอร์อัตโนมัติ', capacity: 500, planting_date: '15/01/2567', notes: 'แปลงสำหรับไม้กระถางและไม้พร้อมขาย' },
    { id: 'z2', name: 'Zone B', location: 'แปลงหลังฟาร์ม', area: '5 ไร่', soil_type: 'ดินร่วน', water_system: 'สปริงเกอร์มือหมุน', capacity: 1200, planting_date: '10/06/2565', notes: 'แปลงสำหรับไม้ขุดล้อมและไม้ใหญ่' },
    { id: 'z3', name: 'Zone C', location: 'แปลงข้างอ่างเก็บน้ำ', area: '3 ไร่', soil_type: 'ดินเหนียว', water_system: 'น้ำหยด', capacity: 800, planting_date: '20/09/2566', notes: 'แปลงสำหรับไม้ประดับและไม้ดอก' },
    { id: 'z4', name: 'Nursery', location: 'เรือนเพาะชำ', area: '0.5 ไร่', soil_type: 'ดินผสมพิเศษ', water_system: 'ระบบน้ำฝอย', capacity: 2000, planting_date: '-', notes: 'สำหรับต้นกล้าและไม้ขนาดเล็ก' }
  ],
  stock: [
    ...Array(15).fill().map((_, i) => ({ id: `so-a-pot-${i}`, code: `SO-A-POT-${100+i}`, name: 'Silver Oak', species: 'Silver Oak', plant_zone_id: 'z1', trunk_size: 3, height: 2.5, canopy: 1.2, age_month: 12, price: 3500, status: 'ready', tree_type: 'potted', pot_size: '24 นิ้ว', ready_date: '2025-12-10', planting_date: '2024-01-15', last_fertilizer: '2025-02-20', last_watering: '2025-03-25', health_status: 'excellent', notes: 'ทรงพุ่มสวย รากแข็งแรง' })),
    ...Array(25).fill().map((_, i) => ({ id: `so-b-ground-${i}`, code: `SO-B-GND-${200+i}`, name: 'Silver Oak', species: 'Silver Oak', plant_zone_id: 'z2', trunk_size: 6, height: 4.5, canopy: 2.8, age_month: 36, price: 12000, status: 'in_ground', tree_type: 'in_ground', digging_required: true, estimated_digging_days: 45, root_ball_size: '1.5x1.5 เมตร', ready_date: '2025-12-15', planting_date: '2022-06-10', last_fertilizer: '2025-01-15', last_watering: '2025-03-20', health_status: 'good', notes: 'เหมาะสำหรับงานโครงการใหญ่' })),
    ...Array(10).fill().map((_, i) => ({ id: `go-c-pot-${i}`, code: `GO-C-POT-${300+i}`, name: 'Golden Oak', species: 'Golden Oak', plant_zone_id: 'z3', trunk_size: 4, height: 3.2, canopy: 1.8, age_month: 18, price: 6500, status: 'ready', tree_type: 'potted', pot_size: '30 นิ้ว', ready_date: '2025-11-20', planting_date: '2023-09-15', last_fertilizer: '2025-02-28', last_watering: '2025-03-26', health_status: 'excellent', notes: 'สีเหลืองทองสวยงาม' })),
    ...Array(20).fill().map((_, i) => ({ id: `pp-nursery-${i}`, code: `PP-NUR-${400+i}`, name: 'Pencil Pine', species: 'Pencil Pine', plant_zone_id: 'z4', trunk_size: 8, height: 1.8, canopy: 0.5, age_month: 8, price: 1200, status: 'ready', tree_type: 'potted', pot_size: '12 นิ้ว', ready_date: '2025-10-01', planting_date: '2024-07-20', last_fertilizer: '2025-03-10', last_watering: '2025-03-27', health_status: 'good', notes: 'เหมาะสำหรับจัดสวนแนวตั้ง' }))
  ],
  deals: [
    { id: 'uuid-d1', deal_code: 'QOK20250309', customer_id: 'uuid-c1', customer_name: 'บริษัท 999 จำกัด', deal_date: '2025-03-25', total_amount: 47000, tree_total: 42000, transport_total: 5000, payment_status: 'deposit', deal_status: 'confirmed', delivery_responsibility: 'company', address: '123 ถนนมิตรภาพ ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000', items: [{ name: 'Silver Oak 3"', quantity: 12, unit_price: 3500, status: 'ready', qty: 12 }] }
  ],
  deliveries: [
    { id: 'del-001', deal_id: 'uuid-d1', delivery_date: '2025-03-30', transport_company: 'ส.ขนส่งปากช่อง (6 ล้อ)', tracking_number: 'TRK-8899', status: 'preparing', deal_code: 'QOK20250309', customer_name: 'บริษัท 999 จำกัด', location: 'เมืองนครราชสีมา', items_count: 12, transport_cost: 5000 },
    { id: 'del-002', deal_id: 'uuid-d2', delivery_date: '2025-03-28', transport_company: 'รถกระบะลุงดำ', tracking_number: '-', status: 'shipped', deal_code: 'QOK20250308', customer_name: 'รีสอร์ทคุณสมชาย', location: 'ปากช่อง', items_count: 5, transport_cost: 1500 }
  ],
  tasks: [
    { id: 1, title: 'ส่งไม้ไปเขาใหญ่ (QOK20250309)', type: 'Transport', status: 'Pending', assignee: 'รถบรรทุก 6 ล้อ', due: '2025-03-30' },
    { id: 2, title: 'ขุดล้อม Silver Oak 10 ต้น', type: 'Digging', status: 'In Progress', assignee: 'หัวหน้าคนงาน (ลุงดำ)', due: '2025-03-28' },
    { id: 3, title: 'งานปลูก บริษัท 999', type: 'Planting', status: 'Completed', assignee: 'ทีม A', due: '2025-03-20' }
  ],
  finances: [
    { id: 1, date: '2025-03-20', desc: 'มัดจำ QOK20250309', type: 'Income', amount: 23500, category: 'Sales' },
    { id: 2, date: '2025-03-21', desc: 'ค่าแรงขุด QOK20250309', type: 'Expense', amount: 2000, category: 'Labor' },
    { id: 3, date: '2025-03-22', desc: 'ค่าน้ำมันรถบริษัท', type: 'Expense', amount: 1500, category: 'Utility' },
  ],
  monthlyStats: [ { month: 'ม.ค.', sales: 850000 }, { month: 'ก.พ.', sales: 920000 }, { month: 'มี.ค.', sales: 1250000 }, { month: 'เม.ย.', sales: 0 }, { month: 'พ.ค.', sales: 0 }, { month: 'มิ.ย.', sales: 0 } ],
  customerStats: [ { month: 'ม.ค.', new: 8 }, { month: 'ก.พ.', new: 6 }, { month: 'มี.ค.', new: 4 }, { month: 'เม.ย.', new: 0 }, { month: 'พ.ค.', new: 0 }, { month: 'มิ.ย.', new: 0 } ],
  plantingStats: [ { month: 'ม.ค.', planted: 45 }, { month: 'ก.พ.', planted: 68 }, { month: 'มี.ค.', planted: 92 }, { month: 'เม.ย.', planted: 0 }, { month: 'พ.ค.', planted: 0 }, { month: 'มิ.ย.', planted: 0 } ]
};

// --- 3. API Function (Gemini) ---
const fetchGeminiResponse = async ({ prompt, systemInstruction, model = 'gemini-2.5-flash-preview-09-2025' }) => {
    const apiKey = CONFIG.geminiApiKey; 
    if (!apiKey) return "⚠️ กรุณาใส่ API Key ในไฟล์ Config";

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined };
    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || "ไม่สามารถสร้างข้อความได้";
    } catch (error) {
        console.error(error);
        return `เกิดข้อผิดพลาด: ${error.message}`;
    }
};

// --- 4. Shared UI Components ---
const Card = ({ children, className = "", onClick }) => <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>{children}</div>;
const Toast = ({ message, type = 'success', onClose }) => <div className={`fixed bottom-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-slide-in-right ${type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}<div className="font-medium">{message}</div><button onClick={onClose}><X size={16}/></button></div>;
const SearchBar = ({ value, onChange, placeholder }) => <div className="relative w-full md:w-64"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-slate-400"/></div><input type="text" className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder={placeholder} value={value} onChange={(e)=>onChange(e.target.value)} /></div>;

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;
  const sizeClasses = { md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}>
        <div className="flex justify-between items-center p-5 border-b"><h3 className="font-bold text-lg">{title}</h3><button onClick={onClose}><X size={24}/></button></div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
    const colorMap = { ready: 'bg-green-100 text-green-800', in_ground: 'bg-orange-100 text-orange-800', reserved: 'bg-pink-100 text-pink-800', sold: 'bg-gray-100 text-gray-600', pending: 'bg-yellow-100 text-yellow-800', paid: 'bg-green-100 text-green-800' };
    return <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${colorMap[status] || 'bg-gray-100'}`}>{status}</span>;
};

// Specific Components
const StockSummaryView = ({ stock, plantZones, onAddTree, onDeleteStockItem }) => {
  const [filterZone, setFilterZone] = useState('all');
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const aggregatedStock = useMemo(() => {
    const groups = {};
    stock.forEach(tree => {
        if (filterZone !== 'all' && tree.plant_zone_id !== filterZone) return;
        if (selectedSpecies !== 'all' && tree.species !== selectedSpecies) return;
        if (tree.status === 'sold') return;

        const key = `${tree.species}|${tree.plant_zone_id}|${tree.trunk_size}|${tree.tree_type}`;
        if (!groups[key]) {
            const zone = plantZones.find(z => z.id === tree.plant_zone_id);
            groups[key] = {
                id: key, species: tree.species, zone_name: zone ? zone.name : 'Unknown',
                trunk_size: tree.trunk_size, height: tree.height || '-', tree_type: tree.tree_type,
                count: 0, ready: 0, in_ground: 0, price_min: tree.price, price_max: tree.price, total_value: 0, items: []
            };
        }
        groups[key].count++; groups[key].total_value += tree.price;
        if (tree.status === 'ready') groups[key].ready++;
        if (tree.status === 'in_ground') groups[key].in_ground++;
        groups[key].price_min = Math.min(groups[key].price_min, tree.price);
        groups[key].price_max = Math.max(groups[key].price_max, tree.price);
        groups[key].items.push(tree);
    });
    return Object.values(groups).sort((a, b) => a.species.localeCompare(b.species));
  }, [stock, plantZones, filterZone, selectedSpecies]);

  const stats = {
      total: aggregatedStock.reduce((s, g) => s + g.count, 0),
      value: aggregatedStock.reduce((s, g) => s + g.total_value, 0),
      ready: aggregatedStock.reduce((s, g) => s + g.ready, 0),
      species: [...new Set(stock.map(t => t.species))].length
  };

  const openDetailModal = (group) => { setSelectedGroup(group); setIsDetailModalOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-800">คลังต้นไม้ (Inventory)</h2><p className="text-sm text-slate-500">ภาพรวมต้นไม้ทั้งหมด</p></div><div className="flex gap-2"><select value={filterZone} onChange={e=>setFilterZone(e.target.value)} className="border rounded p-2 text-sm"><option value="all">ทุกแปลงปลูก</option>{plantZones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select><button onClick={onAddTree} className="bg-green-600 text-white px-4 py-2 rounded flex gap-2 items-center"><Plus size={16}/> เพิ่มต้นไม้</button></div></div>
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center"><div className="text-2xl font-bold text-blue-600">{stats.total.toLocaleString()}</div><div className="text-xs text-slate-500">ต้นทั้งหมด</div></Card>
          <Card className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{toThaiBaht(stats.value)}</div><div className="text-xs text-slate-500">มูลค่ารวม</div></Card>
          <Card className="p-4 text-center"><div className="text-2xl font-bold text-emerald-600">{stats.ready.toLocaleString()}</div><div className="text-xs text-slate-500">พร้อมขาย</div></Card>
          <Card className="p-4 text-center"><div className="text-2xl font-bold text-orange-600">{stats.species}</div><div className="text-xs text-slate-500">ชนิดพันธุ์</div></Card>
       </div>
       <Card className="overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50 border-b font-bold"><tr><th className="p-4">ชนิดพันธุ์</th><th className="p-4">แปลง</th><th className="p-4 text-center">ขนาด (นิ้ว)</th><th className="p-4 text-center text-blue-600">ความสูง (ม.)</th><th className="p-4 text-center">ประเภท</th><th className="p-4 text-center">จำนวน</th><th className="p-4 text-center">พร้อมขาย</th><th className="p-4 text-center text-orange-600">ไม้ขุดล้อม</th><th className="p-4 text-right">ช่วงราคา</th><th className="p-4 text-center">Action</th></tr></thead><tbody className="divide-y">{aggregatedStock.map(item=>(<tr key={item.id} className="hover:bg-slate-50 cursor-pointer" onClick={()=>openDetailModal(item)}><td className="p-4 font-bold">{item.species}</td><td className="p-4 text-slate-600">{item.zone_name}</td><td className="p-4 text-center">{item.trunk_size}"</td><td className="p-4 text-center font-bold text-slate-700">{String(item.height)}</td><td className="p-4 text-center"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs">{item.tree_type==='potted'?'กระถาง':'ไม้ขุด'}</span></td><td className="p-4 text-center font-bold">{item.count}</td><td className="p-4 text-center text-green-600 font-bold">{item.ready}</td><td className="p-4 text-center text-orange-600 font-bold">{item.in_ground}</td><td className="p-4 text-right">{toThaiBaht(item.price_min)}</td><td className="p-4 text-center"><button className="text-blue-600"><Info size={16}/></button></td></tr>))}</tbody></table></Card>
       {isDetailModalOpen && selectedGroup && (<Modal isOpen={true} onClose={()=>setIsDetailModalOpen(false)} title={`รายละเอียด: ${selectedGroup.species}`} size="lg"><div className="space-y-3">{selectedGroup.items.map(item=>(<div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100"><div><div className="font-bold">{item.code}</div><div className="text-xs text-slate-500">ราคา: {toThaiBaht(item.price)}</div></div><div className="flex gap-2"><StatusBadge status={item.status}/><button onClick={(e)=>{e.stopPropagation(); if(confirm('ยืนยันลบ?')){onDeleteStockItem(item.id);setIsDetailModalOpen(false)}}} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button></div></div>))}</div></Modal>)}
    </div>
  );
};

// Views for Deliveries & Tasks
const DeliveriesView = ({ deliveries, searchTerm, onAddClick }) => {
    const filtered = deliveries.filter(d => d.deal_code.toLowerCase().includes(searchTerm.toLowerCase()) || d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">การจัดส่ง (Deliveries)</h2><button onClick={onAddClick} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"><Plus size={16}/> บันทึกการส่ง</button></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['preparing', 'shipped', 'delivered'].map(status => (
                <div key={status} className="bg-slate-50 p-4 rounded border min-h-[400px] flex flex-col">
                    <div className="flex justify-between mb-4"><h3 className="font-bold capitalize">{status}</h3><span className="bg-white px-2 rounded text-xs border">{filtered.filter(d=>d.status===status).length}</span></div>
                    <div className="space-y-3 overflow-y-auto flex-1">{filtered.filter(d=>d.status===status).map(d=><Card key={d.id} className="p-4 text-sm"><div className="flex justify-between mb-2"><span className="font-bold text-blue-600">{d.deal_code}</span><span className="text-xs text-slate-400">{formatDate(d.delivery_date)}</span></div><div>{d.customer_name}</div><div className="text-xs text-slate-500 mt-2">{d.transport_company}</div></Card>)}</div>
                </div>
            ))}
          </div>
        </div>
    );
};

const TasksView = ({ tasks, searchTerm, onAddClick }) => {
    const filtered = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">งานปฏิบัติการ (Tasks)</h2><button onClick={onAddClick} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"><Plus size={16}/> เพิ่มงาน</button></div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Pending', 'In Progress', 'Completed'].map(st => (
                    <div key={st} className="bg-slate-50 p-4 rounded border h-[500px] flex flex-col"><h3 className="font-bold mb-3">{st}</h3><div className="space-y-2 overflow-y-auto flex-1">{filtered.filter(t=>t.status===st).map(t=><Card key={t.id} className="p-3"><div className="font-bold">{t.title}</div><div className="text-xs text-slate-500 mt-1">{t.assignee}</div></Card>)}</div></div>
                ))}
             </div>
        </div>
    );
};

// --- MAIN APP ---
export default function GardenCRM() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  
  // Data State
  const [stockData, setStockData] = useState(DEFAULT_DATA.stock);
  const [plantZonesData, setPlantZonesData] = useState(DEFAULT_DATA.plant_zones);
  const [dealsData, setDealsData] = useState(DEFAULT_DATA.deals);
  const [customersData, setCustomersData] = useState(DEFAULT_DATA.customers);
  const [deliveriesData, setDeliveriesData] = useState(DEFAULT_DATA.deliveries);
  const [tasksData, setTasksData] = useState(DEFAULT_DATA.tasks);
  
  // Modals
  const [isAddTreeOpen, setIsAddTreeOpen] = useState(false);
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddDeliveryOpen, setIsAddDeliveryOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isSalesDraftOpen, setIsSalesDraftOpen] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);

  // Derived Data
  const filteredDeals = dealsData.filter(d => d.deal_code.toLowerCase().includes(searchTerm.toLowerCase()) || d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredCustomers = customersData.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const dashboardStats = useMemo(() => ({ totalSales: dealsData.reduce((s, d) => s + d.total_amount, 0), pendingCount: 2, receivable: 15000, totalTrees: stockData.length }), [dealsData, stockData]);

  // Handlers
  const showToast = (msg) => { setToast({ message: msg, type: 'success' }); setTimeout(() => setToast(null), 3000); };
  const handleLogin = (e) => { e.preventDefault(); setIsLoggedIn(true); };
  const handleAddTree = (newTrees) => setStockData(prev => [...prev, ...newTrees]);
  const handleAddZone = (zone) => setPlantZonesData(prev => [...prev, zone]);
  const handleEditZone = (zone) => setPlantZonesData(prev => prev.map(z => z.id === zone.id ? zone : z));
  const handleDeleteZone = (id) => { if(confirm('ยืนยันลบ?')) setPlantZonesData(prev => prev.filter(z => z.id !== id)); };
  const handleAddDeal = (e) => { e.preventDefault(); setIsAddDealOpen(false); showToast('บันทึกการขายแล้ว'); };
  const handleAddCustomer = (e) => { e.preventDefault(); setIsAddCustomerOpen(false); showToast('บันทึกลูกค้าแล้ว'); };
  const handleAddDelivery = (fd, items, cost) => { setIsAddDeliveryOpen(false); };
  const handleAddTask = (e) => { e.preventDefault(); setIsAddTaskOpen(false); };

  if (!isLoggedIn) return <div className="h-screen flex items-center justify-center bg-slate-900"><Card className="p-8 w-full max-w-md text-center"><h1 className="text-2xl font-bold mb-4">Garden CRM</h1><form onSubmit={handleLogin}><input className="w-full border p-3 rounded mb-4" placeholder="admin" defaultValue="admin"/><input type="password" className="w-full border p-3 rounded mb-4" placeholder="1234" defaultValue="1234"/><button className="w-full bg-green-600 text-white py-2 rounded font-bold">Login</button></form></Card></div>;

  return (
    <div className="min-h-screen bg-[#f8faf9] font-sans text-slate-900 flex overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-[#0f172a] text-slate-300 border-r border-slate-800 fixed h-full z-20">
        <div className="p-6 flex items-center gap-2 font-bold text-white border-b border-slate-800"><Trees/> Garden CRM</div>
        <nav className="p-4 space-y-1">
            {MENU_ITEMS.map(m => (
                <button key={m.id} onClick={() => { setActiveTab(m.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === m.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                    <m.icon size={18}/> {m.label}
                </button>
            ))}
        </nav>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8 h-screen overflow-y-auto pt-12 md:pt-8">
         <div className="md:hidden mb-4 absolute top-4 left-4 z-30"><button onClick={()=>setIsMobileMenuOpen(true)} className="p-2 bg-slate-800 text-white rounded"><Menu/></button></div>
         {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={()=>setIsMobileMenuOpen(false)}></div>}
         <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0f172a] text-slate-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 z-50 md:hidden`}>
            <div className="p-6 flex items-center gap-2 font-bold text-white border-b border-slate-800"><Trees/> Garden CRM <button className="ml-auto" onClick={()=>setIsMobileMenuOpen(false)}><X/></button></div>
            <nav className="p-4 space-y-1">
                {MENU_ITEMS.map(m => (<button key={m.id} onClick={() => { setActiveTab(m.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === m.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><m.icon size={18}/> {m.label}</button>))}
            </nav>
         </aside>

         {['deals', 'customers', 'deliveries', 'tasks'].includes(activeTab) && <div className="flex justify-end mb-4"><SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="ค้นหา..." /></div>}

         {activeTab === 'dashboard' && (
             <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-5 border-l-4 border-blue-600"><div><p className="text-xs font-bold text-slate-500">ยอดขายรวม</p><h3 className="text-2xl font-bold text-slate-800">{toThaiBaht(dashboardStats.totalSales)}</h3></div></Card>
                    <Card className="p-5 border-l-4 border-green-600"><div><p className="text-xs font-bold text-slate-500">กำไรสุทธิ (Est.)</p><h3 className="text-2xl font-bold text-slate-800">{toThaiBaht(dashboardStats.totalSales * 0.35)}</h3></div></Card>
                    <Card className="p-5 border-l-4 border-orange-500"><div><p className="text-xs font-bold text-slate-500">งานคงค้าง</p><h3 className="text-2xl font-bold text-slate-800">{dashboardStats.pendingCount} งาน</h3></div></Card>
                    <Card className="p-5 border-l-4 border-purple-500"><div><p className="text-xs font-bold text-slate-500">สินค้าพร้อมขาย</p><h3 className="text-2xl font-bold text-slate-800">{dashboardStats.totalTrees} ต้น</h3></div></Card>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="col-span-2 p-6"><h3 className="font-bold mb-4 flex gap-2 items-center"><TrendingUp size={20} className="text-blue-600"/> แนวโน้มยอดขาย</h3><div className="h-64 flex items-end gap-4 px-2 justify-between relative pt-6 border-b">{DEFAULT_DATA.monthlyStats.map((s,i)=><div key={i} className="w-full bg-blue-500 rounded-t" style={{height: `${(s.sales/1500000)*100}%`}}></div>)}</div></Card>
                    <Card className="p-6"><h3 className="font-bold mb-4 flex gap-2 items-center"><PieChart size={20} className="text-green-600"/> สัดส่วน</h3><div className="h-48 flex items-center justify-center border rounded-full w-48 h-48 mx-auto border-[16px] border-green-500 relative"><span className="font-bold text-slate-600">100%</span></div></Card>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <Card className="p-6"><h3 className="font-bold mb-4 flex gap-2 items-center text-slate-700"><Sprout size={20} className="text-green-600"/> ยอดการปลูก (Planting)</h3><div className="h-40 flex items-end justify-between gap-2 px-2 pt-6">{DEFAULT_DATA.plantingStats.map((s, i) => (<div key={i} className="w-full flex flex-col justify-end items-center group relative h-full"><div className="w-full bg-green-100 rounded-t hover:bg-green-500 transition-all relative group-hover:shadow-md" style={{height: `${(s.planted/100)*100}%`}}></div><span className="text-[10px] text-slate-400 mt-2">{s.month}</span></div>))}</div></Card>
                     <Card className="p-6"><h3 className="font-bold mb-4 flex gap-2 items-center text-slate-700"><Users size={20} className="text-purple-600"/> ลูกค้าใหม่ (New Clients)</h3><div className="h-40 flex items-end justify-between gap-2 px-2 pt-6">{DEFAULT_DATA.customerStats.map((s, i) => (<div key={i} className="w-full flex flex-col justify-end items-center group relative h-full"><div className="w-1.5 h-full bg-slate-50 rounded-full relative"><div className="absolute bottom-0 left-0 w-full bg-purple-400 rounded-full hover:bg-purple-600 transition-all" style={{height: `${(s.new/10)*100}%`}}></div></div><span className="text-[10px] text-slate-400 mt-2">{s.month}</span></div>))}</div></Card>
                 </div>
             </div>
         )}

         {activeTab === 'stock' && <StockSummaryView stock={stockData} plantZones={plantZonesData} onAddTree={() => setIsAddTreeOpen(true)} onDeleteStockItem={(id)=>setStockData(prev=>prev.filter(t=>t.id!==id))} />}
         {activeTab === 'zones' && <PlantZonesTable plantZones={plantZonesData} stock={stockData} onAddZone={() => setIsAddZoneOpen(true)} onEditZone={()=>{}} onDeleteZone={handleDeleteZone} />}
         
         {activeTab === 'deals' && <div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold">รายการขาย</h2><button onClick={()=>setIsAddDealOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">สร้างดีล</button></div><Card><table className="w-full text-sm text-left"><thead className="bg-slate-50 font-bold"><tr><th className="p-4">เลขที่</th><th className="p-4">ลูกค้า</th><th className="p-4">ยอดรวม</th><th className="p-4">สถานะ</th></tr></thead><tbody>{filteredDeals.map(d=><tr key={d.id} onClick={()=>setSelectedDeal(d)} className="border-b hover:bg-slate-50 cursor-pointer"><td className="p-4 text-blue-600 font-bold">{d.deal_code}</td><td className="p-4">{d.customer_name}</td><td className="p-4">{toThaiBaht(d.total_amount)}</td><td className="p-4"><StatusBadge status={d.deal_status}/></td></tr>)}</tbody></table></Card></div>}

         {activeTab === 'customers' && <div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold">ลูกค้า</h2><button onClick={()=>setIsAddCustomerOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">เพิ่มลูกค้า</button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{filteredCustomers.map(c=><Card key={c.id} className="p-4"><h3 className="font-bold">{c.name}</h3><p className="text-sm text-slate-500">{c.phone}</p></Card>)}</div></div>}
         
         {activeTab === 'deliveries' && <DeliveriesView deliveries={deliveriesData} searchTerm={searchTerm} onAddClick={()=>setIsAddDeliveryOpen(true)} />}
         {activeTab === 'tasks' && <TasksView tasks={tasksData} searchTerm={searchTerm} onAddClick={()=>setIsAddTaskOpen(true)} />}
         {activeTab === 'finance' && <div className="space-y-6 animate-fade-in"><h2 className="text-2xl font-bold">บัญชีและการเงิน</h2><div className="grid grid-cols-2 gap-4"><Card className="p-4 bg-green-50"><h3 className="font-bold text-green-800">รายรับ</h3><p className="text-2xl font-bold text-green-600">฿1,850,000</p></Card><Card className="p-4 bg-red-50"><h3 className="font-bold text-red-800">รายจ่าย</h3><p className="text-2xl font-bold text-red-600">฿620,000</p></Card></div></div>}
      </main>

      <AddTreeForm isOpen={isAddTreeOpen} onClose={()=>setIsAddTreeOpen(false)} plantZones={plantZonesData} onAddTree={handleAddTree} />
      {isAddZoneOpen && <AddZoneModal onClose={()=>setIsAddZoneOpen(false)} onSubmit={handleAddZone} />}
      {editingZone && <EditZoneModal zone={editingZone} onClose={()=>setEditingZone(null)} onSubmit={handleEditZone} />}
      {selectedDeal && <Modal isOpen={true} onClose={()=>setSelectedDeal(null)} title="รายละเอียดดีล"><div className="space-y-4"><div className="flex justify-between"><span>{selectedDeal.deal_code}</span><StatusBadge status={selectedDeal.deal_status}/></div><div className="flex gap-2"><button onClick={()=>setActiveDocument('quotation')} className="flex-1 border p-2 rounded">ใบเสนอราคา</button><button onClick={()=>setActiveDocument('invoice')} className="flex-1 border p-2 rounded">ใบแจ้งหนี้</button></div>{activeDocument && <DocumentTemplate type={activeDocument} deal={selectedDeal} onClose={()=>setActiveDocument(null)} />}<button onClick={()=>setIsSalesDraftOpen(true)} className="w-full bg-purple-100 text-purple-700 py-2 rounded font-bold flex justify-center gap-2 mt-2">✨ สร้างข้อความติดตามผล (Gemini)</button></div></Modal>}
      {isSalesDraftOpen && selectedDeal && <SalesDraftModal isOpen={true} onClose={()=>setIsSalesDraftOpen(false)} deal={selectedDeal} customer={customersData.find(c=>c.id===selectedDeal.customer_id)} />}
      {isAddDealOpen && <Modal isOpen={true} onClose={()=>setIsAddDealOpen(false)} title="สร้างดีล"><form onSubmit={handleAddDeal} className="space-y-4"><div><label>ลูกค้า</label><select className="w-full border p-2 rounded"><option>เลือก</option></select></div><button className="w-full bg-blue-600 text-white py-2 rounded">บันทึก</button></form></Modal>}
      {isAddCustomerOpen && <Modal isOpen={true} onClose={()=>setIsAddCustomerOpen(false)} title="เพิ่มลูกค้า"><form onSubmit={handleAddCustomer} className="space-y-4"><div><label>ชื่อลูกค้า</label><input className="w-full border p-2 rounded"/></div><button className="w-full bg-blue-600 text-white py-2 rounded">บันทึก</button></form></Modal>}
      {isAddTaskOpen && <Modal isOpen={true} onClose={()=>setIsAddTaskOpen(false)} title="เพิ่มงาน"><form onSubmit={handleAddTask} className="space-y-4"><div><label>ชื่องาน</label><input className="w-full border p-2 rounded"/></div><button className="w-full bg-blue-600 text-white py-2 rounded">บันทึก</button></form></Modal>}
      <AddDeliveryModal isOpen={isAddDeliveryOpen} onClose={()=>setIsAddDeliveryOpen(false)} onAddDelivery={handleAddDelivery} deals={dealsData} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; } .animate-fade-in { animation: fade-in 0.2s ease-out; } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}