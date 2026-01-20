import React, { useState } from "react";
import {
  Search,
  Bell,
  Menu,
} from "lucide-react";

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

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  const handleNavigateToZones = (preset) => {
    setZonesPreset(preset);
    setActivePage("zones");
  };

  const _handleNavigateToTags = (preset) => {
    setTagPreset(preset);
    setActivePage("stock");
  };

  const handleOpenZone = (zoneId) => {
    setZonesPreset({ initialZoneId: zoneId });
    setActivePage("zones");
  };

  // Global reload for Dashboard
  const [dashboardReloadKey, setDashboardReloadKey] = useState(0);
  const bumpDashboardReload = () => {
    setDashboardReloadKey((k) => k + 1);
  };

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-200 ${isDarkMode ? "dark bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"}`}>
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isDarkMode={isDarkMode}
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
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-emerald-200">
              A
            </div>
            <div className="hidden md:block text-sm">
              <div className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>Apirak</div>
              <div className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>Ava Farm 888</div>
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
              onCreateDeal={() => setActivePage("deals")}
              onCreateDigOrder={() => setActivePage("zones")}
              onCreateShipment={() => setActivePage("shipments")}
              onOpenLifecycleView={() => {
                setTagPreset({ initialTab: "lifecycle" });
                setActivePage("stock");
              }}
              onOpenSpeciesStockView={() => {
                setTagPreset({ initialTab: "species" });
                setActivePage("stock");
              }}
              onSearchTags={() => {
                setTagPreset({ initialTab: "tags" });
                setActivePage("stock");
              }}
              onOpenRevenueReport={() => {
                setTagPreset({ initialTab: "monthly" });
                setActivePage("stock");
              }}
              onOpenZonesList={() => setActivePage("zones")}
            />
          )}
          {activePage === "deals" && <DealsMain isDarkMode={isDarkMode} onDataChanged={bumpDashboardReload} />}
          {activePage === "shipments" && <ShipmentsPage isDarkMode={isDarkMode} onDataChanged={bumpDashboardReload} />}
          {activePage === "customers" && <CustomersMain isDarkMode={isDarkMode} />}
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
          {activePage === "settings" && <SettingsPage isDarkMode={isDarkMode} />}
          {activePage === "commission_settings" && <CommissionConfigPage isDarkMode={isDarkMode} />}
          {activePage === "zones" && <ZonesPage initialFilters={zonesPreset} isDarkMode={isDarkMode} />}
          {activePage === "dig_plans" && <DigPlansPage />}
          {activePage === "activity_report" && <SalesActivityReport isDarkMode={isDarkMode} />}
        </main>
      </div>
    </div>
  );
}

export default App;
