import React from "react";
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    Trees,
    Truck,
    Map,
    Database,
    DollarSign,
    Settings,
    Sliders,
    BarChart,
    FileText,
    Shovel,
    LogOut,
    Lock as LockIcon
} from "lucide-react";
import { logout } from "../authUtils";
import { lockNow } from "../pinLock";


// --- Types ---
type NavItem = {
    id: string;
    label: string;
    icon: React.ReactNode;
};

type NavGroup = {
    title: string;
    items: NavItem[];
};

// --- Data ---
const navGroups: NavGroup[] = [
    {
        title: "OVERVIEW",
        items: [
            {
                id: "dashboard",
                label: "Dashboard",
                icon: <LayoutDashboard size={18} />,
            },
            {
                id: "activity_report",
                label: "รายงานกิจกรรม",
                icon: <BarChart size={18} />,
            },
        ],
    },
    {
        title: "SALES",
        items: [
            {
                id: "deals",
                label: "ดีล / การขาย",
                icon: <ShoppingBag size={18} />,
            },
            {
                id: "customers",
                label: "ลูกค้า",
                icon: <Users size={18} />,
            },
        ],
    },
    {
        title: "FARM OPS",
        items: [
            {
                id: "stock",
                label: "Stock CRM",
                icon: <Trees size={18} />,
            },
            {
                id: "zones",
                label: "จัดการแปลง",
                icon: <Map size={18} />,
            },
            {
                id: "dig_plans",
                label: "แผนขุดต้นไม้",
                icon: <Shovel size={18} />,
            },
            {
                id: "shipments",
                label: "ขนส่ง",
                icon: <Truck size={18} />,
            },
            {
                id: "db_schema",
                label: "ฐานข้อมูลต้นไม้",
                icon: <Database size={18} />,
            },
        ],
    },
    {
        title: "FINANCE & SETTINGS",
        items: [
            {
                id: "billing",
                label: "ศูนย์เอกสาร",
                icon: <FileText size={18} />,
            },
            {
                id: "commission",
                label: "ค่าคอมมิชชั่น",
                icon: <DollarSign size={18} />,
            },
            {
                id: "commission_settings",
                label: "ตั้งค่าคอมมิชชั่น",
                icon: <Sliders size={18} />,
            },
            {
                id: "settings",
                label: "ตั้งค่า",
                icon: <Settings size={18} />,
            },
        ],
    },
];

// --- Sub-components ---

type SidebarNavItemProps = {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
    isDarkMode: boolean;
};

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ label, icon, active, onClick, isDarkMode }) => {
    const base =
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all cursor-pointer border";

    const activeClasses = isDarkMode
        ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/20 shadow-sm"
        : "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm";

    const inactiveClasses = isDarkMode
        ? "text-slate-300 border-transparent hover:bg-slate-800/70 hover:border-slate-700/50"
        : "text-slate-600 border-transparent hover:bg-slate-50 hover:border-slate-100";

    const iconBase =
        "w-8 h-8 flex items-center justify-center rounded-full text-lg transition-colors";

    const iconActive = isDarkMode
        ? "bg-emerald-500/20 text-emerald-300"
        : "bg-emerald-100 text-emerald-600";

    const iconInactive = isDarkMode
        ? "bg-slate-800/50 text-slate-400"
        : "bg-slate-50 text-slate-400";

    return (
        <button onClick={onClick} className={`${base} ${active ? activeClasses : inactiveClasses}`}>
            <div className={`${iconBase} ${active ? iconActive : iconInactive}`}>
                {icon}
            </div>
            <span className="font-medium truncate">{label}</span>
        </button>
    );
};

// --- Main Component ---

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    isDarkMode: boolean;
    profile?: {
        full_name?: string | null;
        role?: string | null;
        email?: string | null;
        avatar_url?: string | null;
    } | null;
    sessionEmail?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
    activePage,
    setActivePage,
    isSidebarOpen,
    setIsSidebarOpen,
    isDarkMode,
    profile,
    sessionEmail
}) => {
    const baseBg = isDarkMode ? "bg-slate-900/80" : "bg-white";
    const baseBorder = isDarkMode ? "border-slate-800/80" : "border-slate-100/80";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-400";

    return (
        <>
            {/* Backdrop overlay สำหรับมือถือ */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 ${baseBg} border-r ${baseBorder} flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* 1. Logo Section (Maximized) */}
                <div className={`h-24 flex items-center px-5 border-b ${baseBorder}`}>
                    <div className="flex items-center gap-4">
                        {/* Always keep white background for logo as requested */}
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                            <img
                                src="/avafarm888-logo.png"
                                alt="AvaFarm888"
                                className="w-full h-full object-contain p-1"
                            />
                        </div>
                        <div className="leading-tight">
                            <p className="text-xs font-bold tracking-[0.15em] text-emerald-600 uppercase mb-0.5">
                                AVAFARM888
                            </p>
                            <p className={`text-[10px] font-medium tracking-wider ${textMuted}`}>
                                Sales & Farm Console
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
                    {navGroups.map((group) => (
                        <div key={group.title}>
                            <h3 className={`px-3 mb-3 text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>
                                {group.title}
                            </h3>
                            <nav className="space-y-1">
                                {group.items.map((item) => (
                                    <SidebarNavItem
                                        key={item.id}
                                        label={item.label}
                                        icon={item.icon}
                                        active={activePage === item.id}
                                        onClick={() => {
                                            setActivePage(item.id);
                                            if (window.innerWidth < 1024) setIsSidebarOpen(false);
                                        }}
                                        isDarkMode={isDarkMode}
                                    />
                                ))}
                            </nav>
                        </div>
                    ))}
                </div>

                {/* 3. User Profile Card */}
                <div className={`p-4 border-t ${baseBorder}`}>
                    <div className={`w-full flex items-center gap-3 p-3 rounded-2xl border border-transparent text-left ${isDarkMode ? "hover:bg-slate-800 hover:border-slate-700" : "hover:bg-slate-50 hover:border-slate-100"}`}>
                        <div className={`w-10 h-10 rounded-full ${isDarkMode ? "bg-emerald-500/15 text-emerald-300 ring-slate-700" : "bg-emerald-50 text-emerald-700 ring-white"} flex items-center justify-center font-bold shadow-sm ring-2`}>
                            {(profile?.full_name || profile?.email || sessionEmail || "U").trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold truncate ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                {profile?.full_name || profile?.email || sessionEmail || "User"}
                            </div>
                            <div className={`text-[11px] truncate ${textMuted}`}>
                                {profile?.role ? `${profile.role} • Ava Farm 888` : "Ava Farm 888"}
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                lockNow();
                            }}
                            className={`p-2 rounded-xl transition-colors ${isDarkMode ? "hover:bg-slate-500/20 text-slate-400 hover:text-slate-200" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                            title="ล็อกหน้าจอ"
                        >
                            <LockIcon size={18} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("ยืนยันการออกจากระบบ?")) {
                                    logout();
                                }
                            }}
                            className={`p-2 rounded-xl transition-colors ${isDarkMode ? "hover:bg-rose-500/20 text-slate-400 hover:text-rose-300" : "hover:bg-rose-50 text-slate-400 hover:text-rose-600"}`}
                            title="ออกจากระบบ"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
