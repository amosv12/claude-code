import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  BedDouble,
  ClipboardCheck,
  ArrowLeftRight,
  FileText,
  Building2,
  ArrowRight,
  Monitor,
  Hospital as HospitalIcon,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WardMaster, Hospital } from "@shared/schema";

const typeOrder: Record<string, number> = {
  "כללי": 0,
  "פסיכיאטרי": 1,
  "שיקומי": 2,
  "גריאטרי": 3,
};

const typeColors: Record<string, string> = {
  "כללי": "text-teal-600 dark:text-teal-400",
  "פסיכיאטרי": "text-purple-600 dark:text-purple-400",
  "שיקומי": "text-blue-600 dark:text-blue-400",
  "גריאטרי": "text-amber-600 dark:text-amber-400",
};

function extractHospitalCode(location: string): string | null {
  const match = location.match(/^\/hospital\/([^/]+)/);
  return match ? match[1] : null;
}

function extractWardCode(location: string): string | null {
  const match = location.match(/\/ward\/([^/]+)/);
  return match ? match[1] : null;
}

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const [wardSearch, setWardSearch] = useState("");
  const hospitalCode = extractHospitalCode(location);
  const activeWardCode = extractWardCode(location);

  const { data: hospitals } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
  });

  const { data: wards } = useQuery<WardMaster[]>({
    queryKey: ["/api/wards"],
  });

  const hospital = hospitalCode
    ? hospitals?.find((h) => h.code === hospitalCode)
    : null;

  // Hospital-level nav items — updated labels to match new pages
  const hospitalNavItems = hospitalCode
    ? [
        { label: "סקירה", icon: LayoutDashboard, href: `/hospital/${hospitalCode}` },
        { label: "תפוסה ומיטות", icon: BedDouble, href: `/hospital/${hospitalCode}/capacity` },
        { label: "מדדים קליניים", icon: ClipboardCheck, href: `/hospital/${hospitalCode}/clinical` },
        { label: "תנועת מטופלים", icon: ArrowLeftRight, href: `/hospital/${hospitalCode}/patient-flow` },
        { label: "סיכום מנהלי", icon: FileText, href: `/hospital/${hospitalCode}/executive` },
        { label: "מערכות", icon: Monitor, href: `/hospital/${hospitalCode}/systems` },
      ]
    : [];

  // Filter wards by hospital for the dropdown
  const hospitalWards = hospital
    ? (wards ?? [])
        .filter((w) => w.hospital === hospital.name)
        .slice()
        .sort((a, b) => a.wardName.localeCompare(b.wardName, "he"))
    : [];

  // Group hospitals by type for master sidebar
  const groupedHospitals = (hospitals ?? []).reduce<Record<string, Hospital[]>>(
    (acc, h) => {
      if (!acc[h.type]) acc[h.type] = [];
      acc[h.type].push(h);
      return acc;
    },
    {},
  );
  const sortedTypes = Object.keys(groupedHospitals).sort(
    (a, b) => (typeOrder[a] ?? 99) - (typeOrder[b] ?? 99),
  );

  // --- Hospital-level sidebar ---
  if (hospitalCode && hospital) {
    return (
      <Sidebar side="right">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
              <rect x="2" y="2" width="24" height="24" rx="6" className="fill-primary" />
              <path d="M12 8h4v4h4v4h-4v4h-4v-4H8v-4h4V8z" className="fill-primary-foreground" />
            </svg>
            <span className="text-lg font-bold tracking-tight">כללית Ops</span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Back to master */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/")}
                    data-testid="back-to-master"
                    tooltip="חזרה ללוח ארגוני"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>כל בתי החולים</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Hospital nav */}
          <SidebarGroup>
            <SidebarGroupLabel>
              <HospitalIcon className="h-3.5 w-3.5 me-1" />
              {hospital.name}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hospitalNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={location === item.href}
                      onClick={() => setLocation(item.href)}
                      tooltip={item.label}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Ward searchable list */}
          <SidebarGroup>
            <SidebarGroupLabel>
              <Building2 className="h-3.5 w-3.5 me-1" />
              לוח בקרה מחלקתי
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 space-y-1">
                <div className="relative">
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <Input
                    className="h-7 text-xs pe-2 ps-7"
                    placeholder="חיפוש מחלקה..."
                    value={wardSearch}
                    onChange={(e) => setWardSearch(e.target.value)}
                    dir="rtl"
                    data-testid="ward-search-input"
                  />
                </div>
                <ScrollArea className="h-48">
                  <SidebarMenu>
                    {hospitalWards
                      .filter((w) => {
                        if (!wardSearch.trim()) return true;
                        const q = wardSearch.trim().toLowerCase();
                        return (
                          w.wardName.toLowerCase().includes(q) ||
                          w.wardCode.toLowerCase().includes(q) ||
                          (w.specialty ?? "").toLowerCase().includes(q)
                        );
                      })
                      .map((w) => (
                        <SidebarMenuItem key={w.wardCode}>
                          <SidebarMenuButton
                            isActive={w.wardCode === activeWardCode}
                            onClick={() => {
                              setWardSearch("");
                              setLocation(`/hospital/${hospitalCode}/ward/${w.wardCode}`);
                            }}
                            className="text-xs h-7"
                            data-testid={`ward-option-${w.wardCode}`}
                          >
                            <span className="truncate">{w.wardName}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    {hospitalWards.filter((w) => {
                      if (!wardSearch.trim()) return true;
                      const q = wardSearch.trim().toLowerCase();
                      return (
                        w.wardName.toLowerCase().includes(q) ||
                        w.wardCode.toLowerCase().includes(q) ||
                        (w.specialty ?? "").toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-2">לא נמצאו מחלקות</p>
                    )}
                  </SidebarMenu>
                </ScrollArea>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border px-4 py-3">
          <p className="text-xs text-muted-foreground" dir="rtl">
            {hospital.fullName}
          </p>
        </SidebarFooter>
      </Sidebar>
    );
  }

  // --- Master-level sidebar ---
  // Global ward search results (across all hospitals)
  const globalWardResults = wardSearch.trim()
    ? (wards ?? []).filter((w) => {
        const q = wardSearch.trim().toLowerCase();
        return (
          w.wardName.toLowerCase().includes(q) ||
          w.wardCode.toLowerCase().includes(q) ||
          w.hospital.toLowerCase().includes(q) ||
          (w.specialty ?? "").toLowerCase().includes(q)
        );
      }).slice(0, 12)
    : [];

  return (
    <Sidebar side="right">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
            <rect x="2" y="2" width="24" height="24" rx="6" className="fill-primary" />
            <path d="M12 8h4v4h4v4h-4v4h-4v-4H8v-4h4V8z" className="fill-primary-foreground" />
          </svg>
          <span className="text-lg font-bold tracking-tight">כללית Ops</span>
        </div>
        <div className="relative mt-2">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <Input
            className="h-7 text-xs pe-2 ps-7"
            placeholder="חיפוש מחלקה..."
            value={wardSearch}
            onChange={(e) => setWardSearch(e.target.value)}
            dir="rtl"
            data-testid="global-ward-search"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Global ward search results */}
        {globalWardResults.length > 0 && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>תוצאות חיפוש</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {globalWardResults.map((w) => {
                    const h = (hospitals ?? []).find((h) => h.name === w.hospital);
                    return (
                      <SidebarMenuItem key={w.wardCode}>
                        <SidebarMenuButton
                          onClick={() => {
                            setWardSearch("");
                            if (h) setLocation(`/hospital/${h.code}/ward/${w.wardCode}`);
                          }}
                          className="flex-col items-start h-auto py-1.5"
                        >
                          <span className="text-xs font-medium">{w.wardName}</span>
                          <span className="text-[10px] text-muted-foreground">{w.hospital}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
          </>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>כל בתי החולים</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/"}
                  onClick={() => setLocation("/")}
                  tooltip="לוח בקרה ארגוני"
                  data-testid="nav-master-dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>לוח בקרה ארגוני</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {sortedTypes.map((type) => (
          <SidebarGroup key={type}>
            <SidebarGroupLabel className={typeColors[type] ?? ""}>
              <HospitalIcon className="h-3.5 w-3.5 me-1" />
              {type}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedHospitals[type].map((h) => (
                  <SidebarMenuItem key={h.code}>
                    <SidebarMenuButton
                      isActive={location.startsWith(`/hospital/${h.code}`)}
                      onClick={() => setLocation(`/hospital/${h.code}`)}
                      tooltip={h.fullName}
                      data-testid={`nav-hospital-${h.code}`}
                    >
                      <span className="text-xs">{h.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3">
        <p className="text-xs text-muted-foreground">כללית שירותי בריאות</p>
      </SidebarFooter>
    </Sidebar>
  );
}
