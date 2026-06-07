import { useState, useEffect, useCallback } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { DatePickerHeader } from "@/components/date-picker-header";
import { DateContextProvider } from "@/lib/useDateContext";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import MasterDashboard from "@/pages/master-dashboard";
import HospitalDashboard from "@/pages/hospital-dashboard";
import Overview from "@/pages/overview";
import Capacity from "@/pages/capacity";
import Clinical from "@/pages/clinical";
import PatientFlow from "@/pages/patient-flow";
import Executive from "@/pages/executive";
import Systems from "@/pages/systems";
import WardDetail from "@/pages/ward-detail";
import NotFound from "@/pages/not-found";

function getPageTitle(location: string): string {
  // Master dashboard
  if (location === "/") return "לוח בקרה ארגוני";

  // Hospital-level routes
  if (location.startsWith("/hospital/")) {
    const rest = location.replace(/^\/hospital\/[^/]+\/?/, "");
    if (!rest || rest === "") return "סקירה";
    if (rest === "capacity") return "תפוסה ומיטות";
    if (rest === "clinical") return "מדדים קליניים";
    if (rest === "patient-flow") return "תנועת מטופלים";
    if (rest === "executive") return "סיכום מנהלי";
    if (rest === "systems") return "מערכות";
    if (rest.startsWith("ward/")) return "לוח בקרה מחלקתי";
    return "לוח בקרה";
  }

  // Legacy top-level routes
  const titles: Record<string, string> = {
    "/capacity": "תפוסה ומיטות",
    "/clinical": "מדדים קליניים",
    "/patient-flow": "תנועת מטופלים",
    "/executive": "סיכום מנהלי",
    "/systems": "מערכות",
  };
  if (titles[location]) return titles[location];
  if (location.startsWith("/ward/")) return "לוח בקרה מחלקתי";
  return "לוח בקרה";
}

function PageTitle() {
  const [location] = useLocation();
  const title = getPageTitle(location);
  return (
    <h1 className="text-lg font-semibold">
      {title}
    </h1>
  );
}

const AUTO_REFRESH_MS = 10 * 60 * 1000; // 10 minutes

function useAutoRefresh() {
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const refresh = useCallback(() => {
    setSpinning(true);
    queryClient.invalidateQueries();
    setLastRefresh(Date.now());
    setMinutesAgo(0);
    setTimeout(() => setSpinning(false), 800);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setMinutesAgo(Math.floor((Date.now() - lastRefresh) / 60_000));
    }, 30_000);
    return () => clearInterval(tick);
  }, [lastRefresh]);

  useEffect(() => {
    const interval = setInterval(refresh, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { minutesAgo, spinning, refresh };
}

function AppLayout() {
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const { minutesAgo, spinning, refresh } = useAutoRefresh();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
    >
      <AppSidebar />
      <div className="flex flex-1 flex-col min-h-screen overflow-hidden">
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b bg-background/95 backdrop-blur px-4">
          <SidebarTrigger data-testid="sidebar-trigger" />
          <PageTitle />
          <div className="ms-auto flex items-center gap-3">
            <DatePickerHeader />
            <span
              className="text-xs text-muted-foreground hidden sm:inline"
              style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
            >
              עודכן לפני {minutesAgo} דקות
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={refresh}
              data-testid="refresh-button"
              title="רענן נתונים"
            >
              <RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
            </Button>
            <ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Switch>
            {/* Master dashboard */}
            <Route path="/" component={MasterDashboard} />

            {/* Hospital-level routes */}
            <Route path="/hospital/:code" component={HospitalDashboard} />
            <Route path="/hospital/:code/capacity" component={Capacity} />
            <Route path="/hospital/:code/clinical" component={Clinical} />
            <Route path="/hospital/:code/patient-flow" component={PatientFlow} />
            <Route path="/hospital/:code/executive" component={Executive} />
            <Route path="/hospital/:code/systems" component={Systems} />
            <Route path="/hospital/:code/ward/:wardCode" component={WardDetail} />

            {/* Legacy top-level routes (backward compat) */}
            <Route path="/overview" component={Overview} />
            <Route path="/capacity" component={Capacity} />
            <Route path="/clinical" component={Clinical} />
            <Route path="/patient-flow" component={PatientFlow} />
            <Route path="/executive" component={Executive} />
            <Route path="/systems" component={Systems} />
            <Route path="/ward/:code" component={WardDetail} />

            <Route component={NotFound} />
          </Switch>
          <PerplexityAttribution />
        </main>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DateContextProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppLayout />
          </Router>
        </TooltipProvider>
      </DateContextProvider>
    </QueryClientProvider>
  );
}

export default App;
