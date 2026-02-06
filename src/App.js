import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  Search,
  Bell,
  Menu,
  Loader2
} from "lucide-react";
import { LoginForm } from "./components/auth/LoginForm.tsx";
import { PinGate } from "./components/auth/PinGate";
import { PinSetup } from "./components/auth/PinSetup";
import * as pinLock from "./pinLock";
import { getQueryParam, setQueryParam } from "./utils/urlState";


// Components
import { Sidebar } from "./components/Sidebar.tsx";
import Dashboard from "./components/Dashboard.tsx";
import DealsMain from "./components/deals/DealsMain.tsx";
import CustomersMain from "./components/customers/CustomersMain.tsx";
import StockMainPage from "./pages/StockMainPage.tsx";
import SettingsPage from "./components/SettingsPage.jsx";
import CommissionConfigPage from "./components/commissions/CommissionConfigPage.jsx";
import CommissionCenterPage from "./pages/CommissionCenterPage.tsx";
import ShipmentsPage from "./components/shipments/ShipmentsPage.tsx";
import { ZonesPage } from "./components/zones/ZonesPage.tsx";
import TreeDatabaseMain from "./components/TreeDatabaseMain.tsx";
import SalesActivityReport from "./components/dashboard/SalesActivityReport.tsx";
import DigPlansPage from "./components/dig-plans/DigPlansPage.tsx";
import BillingConsolePage from "./pages/BillingConsolePage.tsx";
import TasksPage from "./pages/TasksPage.tsx";

const DEFAULT_PAGE = "dashboard";
const VALID_PAGES = new Set([
  "dashboard",
  "deals",
  "billing",
  "shipments",
  "customers",
  "stock",
  "commission",
  "db_schema",
  "settings",
  "commission_settings",
  "zones",
  "dig_plans",
  "activity_report",
  "tasks"
]);

function App() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // PIN Lock states
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [hasPin, setHasPin] = useState(() => pinLock.hasPin());

  // User Profile state
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        // 1) initial session
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);

        // 2) validate user กับ server เพื่อตัด session เก่า
        if (data.session) {
          const { data: u, error } = await supabase.auth.getUser();
          if (!mounted) return;
          if (error || !u?.user) {
            setSession(null);
          }
        }
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    }

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch user profile - ผูกกับ uid โดยตรง
  const uid = session?.user?.id ?? null;

  useEffect(() => {
    // Reset profile ทันทีเมื่อ uid เปลี่ยน (กันค้าง)
    setProfile(null);

    if (!uid) return;

    let cancelled = false;

    (async () => {
      console.log("[loadProfile] uid =", uid);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name, role, avatar_url")
        .or(`id.eq.${uid},user_id.eq.${uid}`)
        .maybeSingle();

      console.log("[loadProfile] data =", data, "error =", error);

      if (cancelled) return;

      if (error) {
        console.warn("[loadProfile] error:", error.message);
        setProfile(null);
        return;
      }
      setProfile(data ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Derived display values for Header
  const displayName = useMemo(() => {
    if (profile?.full_name) return profile.full_name;
    if (session?.user?.user_metadata?.full_name) return session.user.user_metadata.full_name;
    return session?.user?.email ?? "User";
  }, [profile, session]);

  const displayEmail = useMemo(() => {
    return profile?.email ?? session?.user?.email ?? "";
  }, [profile, session]);

  const avatarText = useMemo(() => {
    const s = (displayName || "").trim();
    if (!s) return "U";
    return s[0].toUpperCase();
  }, [displayName]);

  const avatarUrl = useMemo(() => {
    return profile?.avatar_url || null;
  }, [profile]);

  // Avatar broken state for fallback
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    // Reset when avatarUrl changes
    setAvatarBroken(false);
  }, [avatarUrl]);

  // Profile loading state (for UI indicators)
  const profileLoading = !profile && !!uid;

  // UserMenu state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  async function handleLogout() {
    setIsUserMenuOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout error:", error);
    setProfile(null);
    window.location.reload();
  }

  // Click-outside + ESC to close menu
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const onClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setIsUserMenuOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsUserMenuOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isUserMenuOpen]);

  // PIN Lock effect
  useEffect(() => {
    // ถ้า logout / session หาย: reset สถานะ PIN gate ให้กลับไปจุดเริ่ม
    if (!session) {
      setIsPinLocked(false);
      setHasPin(pinLock.hasPin());
      return;
    }

    // เมื่อเพิ่ง login: โหลดสถานะ PIN จากเครื่องนี้
    setHasPin(pinLock.hasPin());

    // ถ้ามี PIN แล้ว: ตรวจว่า should lock ไหม (กัน flicker)
    if (pinLock.hasPin()) {
      setIsPinLocked(pinLock.shouldAutoLock(pinLock.DEFAULT_IDLE_MINUTES));
    } else {
      setIsPinLocked(false);
    }

    const onLock = () => setIsPinLocked(true);
    const onUnlock = () => setIsPinLocked(false);

    // sync hasPin เมื่อมีการ clearPin/setPin
    const refreshHasPin = () => setHasPin(pinLock.hasPin());

    window.addEventListener("ava:pinlock", onLock);
    window.addEventListener("ava:pinunlock", onUnlock);
    window.addEventListener("ava:pinunlock", refreshHasPin); // ✅ สำคัญ: PinSetup -> unlock event

    const activity = () => pinLock.touchActivity(false);
    window.addEventListener("click", activity, { passive: true });
    window.addEventListener("touchstart", activity, { passive: true });
    window.addEventListener("keydown", activity);

    // เช็คทันทีตอนกลับเข้าแอป (สำคัญสำหรับมือถือ/แท็บเล็ต)
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (pinLock.shouldAutoLock()) {
          pinLock.lockNow();
          setIsPinLocked(true);
        } else {
          pinLock.touchActivity(); // ถือว่าเพิ่งกลับมาใช้งาน
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      if (pinLock.shouldAutoLock(pinLock.DEFAULT_IDLE_MINUTES)) {
        pinLock.lockNow();
        setIsPinLocked(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener("ava:pinlock", onLock);
      window.removeEventListener("ava:pinunlock", onUnlock);
      window.removeEventListener("ava:pinunlock", refreshHasPin);

      window.removeEventListener("click", activity);
      window.removeEventListener("touchstart", activity);
      window.removeEventListener("keydown", activity);
      document.removeEventListener("visibilitychange", onVisibility);

      window.clearInterval(timer);
    };
  }, [session]);


  const [activePage, setActivePage] = useState(DEFAULT_PAGE);

  const applyFromUrl = useCallback(() => {
    const p = getQueryParam("page");
    const next = p && VALID_PAGES.has(p) ? p : DEFAULT_PAGE;
    setActivePage(next);

    // Read deep link params
    const dealId = getQueryParam("deal_id");
    if (dealId) setDealPresetId(dealId);

    const customerId = getQueryParam("customer_id");
    if (customerId) setCustomerPresetId(customerId);

    const zoneId = getQueryParam("zone_id");
    if (zoneId) setZonesPreset({ initialZoneId: zoneId });

    const tagId = getQueryParam("tag_id");
    if (tagId) setTagPreset({ initialTagId: tagId });
  }, []);

  useEffect(() => {
    // init from URL
    applyFromUrl();

    // back/forward
    window.addEventListener("popstate", applyFromUrl);
    return () => window.removeEventListener("popstate", applyFromUrl);
  }, [applyFromUrl]);

  // ✅ ให้เมนูเรียกอันนี้แทน setActivePage ตรง ๆ
  const navigatePage = (page) => {
    const next = VALID_PAGES.has(page) ? page : DEFAULT_PAGE;
    setActivePage(next);

    // pushState เพื่อให้ back/forward ย้อนได้
    setQueryParam("page", next, { replace: false });
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    window.matchMedia("(min-width: 1024px)").matches
  );

  // Initialize theme from localStorage or system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('ava-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Toggle handler with persistence
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('ava-theme', newMode ? 'dark' : 'light');
  };

  // Navigation Presets
  const [zonesPreset, setZonesPreset] = useState(null);
  const [tagPreset, setTagPreset] = useState(null);
  const [dealPresetId, setDealPresetId] = useState(null);
  const [customerPresetId, setCustomerPresetId] = useState(null);

  const handleNavigateToZones = (preset) => {
    setZonesPreset(preset);
    navigatePage("zones");
  };



  const handleOpenZone = (zoneId) => {
    setZonesPreset({ initialZoneId: zoneId });
    navigatePage("zones");
    setQueryParam("zone_id", zoneId, { replace: false });
  };

  const handleOpenContext = useCallback((type, id) => {
    if (!id) return;
    switch (type) {
      case 'deal':
        setDealPresetId(id);
        navigatePage('deals');
        setQueryParam("deal_id", id, { replace: false });
        break;
      case 'customer':
        setCustomerPresetId(id);
        navigatePage('customers');
        setQueryParam("customer_id", id, { replace: false });
        break;
      case 'zone':
        handleOpenZone(id);
        break;
      case 'tag':
        // Stock page expects initialTagFilters
        setTagPreset({ initialTagId: id });
        navigatePage('stock');
        setQueryParam("tag_id", id, { replace: false });
        break;
      case 'stock':
      case 'tag': // Fallback for tag if no ID
        navigatePage('stock');
        break;
      default:
        console.warn("Unknown context type:", type);
    }
  }, []);

  // Global reload for Dashboard
  const [dashboardReloadKey, setDashboardReloadKey] = useState(0);
  const bumpDashboardReload = () => {
    setDashboardReloadKey((k) => k + 1);
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  // ✅ PIN Gate: ใช้เฉพาะกรณี session มีแล้ว (อยู่ในระบบตลอด) แต่ต้องปลดล็อกในเครื่องนี้
  if (!hasPin) {
    return <PinSetup onDone={() => setHasPin(true)} />;
  }
  if (isPinLocked) {
    return <PinGate onUnlocked={() => setIsPinLocked(false)} />;
  }

  return (

    <div className={`flex min-h-screen font-sans transition-colors duration-200 ${isDarkMode ? "dark bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"}`}>
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={navigatePage}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isDarkMode={isDarkMode}
        profile={profile}
        sessionEmail={session?.user?.email}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation */}
        <header className={`h-16 border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 transition-colors duration-200 ${isDarkMode ? "bg-slate-900/80 border-slate-800/80 backdrop-blur-sm" : "bg-white border-slate-200"}`}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`lg:hidden p-2 rounded-lg ${isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-all ${isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
            >
              {isDarkMode ? "🌙 Night mode" : "☀️ Day mode"}
            </button>

            <div className="relative hidden sm:block">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input
                type="text"
                placeholder="ค้นหา (ลูกค้า, ดีล, สต็อก..)"
                className={`pl-9 pr-4 py-2 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 transition-all focus:w-72 ${isDarkMode
                  ? "bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600"
                  : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
              />
            </div>
            <button className={`p-2 rounded-full relative transition-colors ${isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100"}`}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            {/* UserMenu Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className={`flex items-center gap-3 p-1.5 rounded-xl transition-colors ${isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-emerald-200 overflow-hidden">
                  {profileLoading ? (
                    "…"
                  ) : avatarUrl && !avatarBroken ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarBroken(true)}
                    />
                  ) : (
                    avatarText
                  )}
                </div>

                {/* Name/Subtitle */}
                <div className="hidden md:block text-left text-sm">
                  <div className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                    {profileLoading ? "Loading..." : displayName}
                  </div>
                  <div className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    Ava Farm 888
                  </div>
                </div>
              </button>

              {isUserMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-lg overflow-hidden z-50 ${isDarkMode
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-slate-200"
                    }`}
                >
                  <div className={`px-4 py-3 text-xs border-b ${isDarkMode ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-100"}`}>
                    {displayEmail || ""}
                  </div>

                  <button
                    onClick={handleLogout}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${isDarkMode ? "hover:bg-slate-800 text-rose-400" : "hover:bg-slate-50 text-rose-600"
                      }`}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 overflow-auto transition-colors duration-200 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}>
          {activePage === "dashboard" && (
            <Dashboard
              isDarkMode={isDarkMode}
              onOpenZone={handleOpenZone}
              reloadKey={dashboardReloadKey}
              onCreateDeal={() => navigatePage("deals")}
              onCreateDigOrder={() => navigatePage("zones")}
              onCreateShipment={() => navigatePage("shipments")}
              onOpenLifecycleView={() => {
                setTagPreset({ initialTab: "lifecycle" });
                navigatePage("stock");
              }}
              onOpenSpeciesStockView={() => {
                setTagPreset({ initialTab: "species" });
                navigatePage("stock");
              }}
              onSearchTags={() => {
                setTagPreset({ initialTab: "tags" });
                navigatePage("stock");
              }}
              onOpenRevenueReport={() => {
                setTagPreset({ initialTab: "monthly" });
                navigatePage("stock");
              }}
              onOpenZonesList={() => navigatePage("zones")}
              onOpenTasks={() => navigatePage("tasks")}
            />

          )}
          {activePage === "deals" && (
            <DealsMain
              isDarkMode={isDarkMode}
              onDataChanged={bumpDashboardReload}
              initialDealId={dealPresetId}
              onConsumeInitialDeal={() => setDealPresetId(null)}
            />
          )}
          {activePage === "billing" && <BillingConsolePage />}
          {activePage === "shipments" && <ShipmentsPage isDarkMode={isDarkMode} onDataChanged={bumpDashboardReload} />}
          {activePage === "customers" && (
            <CustomersMain
              isDarkMode={isDarkMode}
              initialCustomerId={customerPresetId}
              onConsumeInitialCustomer={() => setCustomerPresetId(null)}
            />
          )}
          {activePage === "stock" && (
            <StockMainPage
              onNavigateToZones={handleNavigateToZones}
              initialTagFilters={tagPreset}
              isDarkMode={isDarkMode}
            />
          )}
          {activePage === "commission" && <CommissionCenterPage isDarkMode={isDarkMode} />}
          {activePage === "db_schema" && <TreeDatabaseMain isDarkMode={isDarkMode} />}
          {activePage === "settings" && <SettingsPage isDarkMode={isDarkMode} />}
          {activePage === "commission_settings" && <CommissionConfigPage isDarkMode={isDarkMode} />}

          {activePage === "zones" && <ZonesPage initialFilters={zonesPreset} isDarkMode={isDarkMode} />}
          {activePage === "dig_plans" && <DigPlansPage />}
          {activePage === "activity_report" && <SalesActivityReport isDarkMode={isDarkMode} />}
          {activePage === "tasks" && <TasksPage onNavigateToContext={handleOpenContext} />}
        </main>
      </div>
    </div>
  );
}

export default App;
