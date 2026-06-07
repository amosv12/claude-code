import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
  BedDouble,
  Wind,
  ShieldAlert,
  Footprints,
  UserPlus,
  Siren,
  Layers,
  ArrowRight,
  Scale,
  Users,
  TrendingDown,
  Clock,
  HeartOff,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { WardCard } from "@/components/ward-card";
import { RiskBadge } from "@/components/risk-badge";
import { SystemsStatus } from "@/components/systems-status";
import { ErSnapshot } from "@/components/er-snapshot";
import { ImagingDevices } from "@/components/imaging-devices";
import type { WardKpi, Hospital, OverviewStats } from "@shared/schema";
import { useDateContext } from "@/lib/useDateContext";

function occupancyBarColor(rate: number) {
  if (rate > 90) return "hsl(var(--destructive))";
  if (rate > 80) return "hsl(45, 93%, 47%)";
  return "hsl(var(--chart-1))";
}

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {typeof entry.value === "number" && entry.name === "תפוסה" ? `${entry.value}%` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HospitalDashboard() {
  const [, params] = useRoute("/hospital/:code");
  const [, paramsNested] = useRoute("/hospital/:code/:rest*");
  const [, setLocation] = useLocation();
  const hospitalCode = params?.code ?? paramsNested?.code ?? "";

  const { data: hospitals } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
  });

  const hospital = hospitals?.find((h) => h.code === hospitalCode);
  const hospitalName = hospital?.name ?? "";
  const isPsych = hospital?.type === "פסיכיאטרי";
  const { asOfDate } = useDateContext();

  const qs = new URLSearchParams();
  if (hospitalName) qs.set("hospital", hospitalName);
  if (asOfDate) qs.set("asOfDate", asOfDate);
  const hq = qs.toString() ? `?${qs.toString()}` : "";

  const { data: stats, isLoading: statsLoading } = useQuery<OverviewStats>({
    queryKey: [`/api/stats/overview${hq}`],
    enabled: !!hospitalName,
  });

  const { data: wardKpis, isLoading: wardsLoading } = useQuery<WardKpi[]>({
    queryKey: [`/api/kpi/current${hq}`],
    enabled: !!hospitalName,
  });

  // Occupancy by ward chart data
  const occupancyChartData = (wardKpis ?? [])
    .slice()
    .sort((a, b) => b.occupancyPercent - a.occupancyPercent)
    .slice(0, 15)
    .map((w) => ({
      name: w.wardName.length > 12 ? w.wardName.slice(0, 12) + "…" : w.wardName,
      occupancy: w.occupancyPercent,
    }));

  // Clinical indicators chart data
  const clinicalChartData = (wardKpis ?? [])
    .filter((w) => w.ventilatedPatients > 0 || w.isolationPatients > 0 || w.fallRiskPatients > 0)
    .slice(0, 12)
    .map((w) => ({
      name: w.wardName.length > 10 ? w.wardName.slice(0, 10) + "…" : w.wardName,
      מונשמים: w.ventilatedPatients,
      בידוד: w.isolationPatients,
      נפילות: w.fallRiskPatients,
    }));

  const riskCounts = wardKpis
    ? {
        high: wardKpis.filter((w) => w.riskLevel === "high").length,
        medium: wardKpis.filter((w) => w.riskLevel === "medium").length,
        low: wardKpis.filter((w) => w.riskLevel === "low").length,
      }
    : { high: 0, medium: 0, low: 0 };

  const atRiskWards = (wardKpis ?? []).filter(
    (w) => w.riskLevel === "high" || w.riskLevel === "medium",
  );

  if (!hospital && hospitals) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-lg text-muted-foreground">בית חולים לא נמצא: {hospitalCode}</p>
        <Button variant="outline" onClick={() => setLocation("/")} data-testid="back-to-master">
          <ArrowRight className="h-4 w-4 me-2" /> חזרה ללוח ארגוני
        </Button>
      </div>
    );
  }

  if (statsLoading || !hospitals) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-96 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="back-to-master"
          className="shrink-0"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold" dir="rtl">{hospital?.fullName ?? hospitalName}</h1>
          <p className="text-sm text-muted-foreground" dir="rtl">{hospital?.city}</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      {isPsych ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard title="סה״כ מיטות" value={stats?.totalBeds ?? 0} icon={BedDouble} trend="flat" />
          <KpiCard
            title="תפוסה"
            value={stats?.occupiedBeds ?? 0}
            delta={stats?.occupancyRate}
            trend={(stats?.occupancyRate ?? 0) > 85 ? "up" : (stats?.occupancyRate ?? 0) < 70 ? "down" : "flat"}
            icon={Layers}
          />
          <KpiCard title="סטטוס משפטי" value={0} icon={Scale} trend="flat" />
          <KpiCard title="לועדה פסיכיאטרית" value={0} icon={Users} trend="flat" />
          <KpiCard title="לרידוד" value={stats?.patientsForStepDown ?? 0} icon={UserPlus} trend="flat" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiCard title="סה״כ מיטות" value={stats?.totalBeds ?? 0} icon={BedDouble} trend="flat" />
          <KpiCard
            title="תפוסה"
            value={stats?.occupiedBeds ?? 0}
            delta={stats?.occupancyRate}
            trend={(stats?.occupancyRate ?? 0) > 85 ? "up" : (stats?.occupancyRate ?? 0) < 70 ? "down" : "flat"}
            icon={Layers}
          />
          <KpiCard title="מונשמים" value={stats?.ventilatedPatients ?? 0} icon={Wind} trend="flat" />
          <KpiCard title="בידוד" value={stats?.isolationPatients ?? 0} icon={ShieldAlert} trend="flat" />
          <KpiCard title="מועדים לנפילה" value={stats?.fallRiskPatients ?? 0} icon={Footprints} trend="flat" />
          <KpiCard title="קבלות פיזיות" value={stats?.physicalAdmissions ?? 0} icon={UserPlus} trend="flat" />
          <KpiCard
            title="דחופים"
            value={stats?.urgentPatients ?? 0}
            icon={Siren}
            trend={(stats?.urgentPatients ?? 0) > 5 ? "up" : "flat"}
            className={(stats?.urgentPatients ?? 0) > 5 ? "border-destructive/50" : ""}
          />
        </div>
      )}

      {/* General hospital additional indicators */}
      {!isPsych && (
        <div className="grid grid-cols-3 gap-3">
          <KpiCard title="מצב הוחמר" value={0} icon={TrendingDown} trend="flat" />
          <KpiCard title="טיפול התעכב" value={0} icon={Clock} trend="flat" />
          <KpiCard title="נפטרו ב-24ש" value={0} icon={HeartOff} trend="flat" className="border-destructive/30" />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Occupancy by Ward */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">תפוסה לפי מחלקה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyChartData} layout="vertical" margin={{ right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
                  <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="occupancy" name="תפוסה" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {occupancyChartData.map((entry, i) => (
                      <Cell key={i} fill={occupancyBarColor(entry.occupancy)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Indicators by Ward — hide for psychiatric */}
        {!isPsych && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">מדדים קליניים לפי מחלקה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clinicalChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="מונשמים" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={14} />
                    <Bar dataKey="בידוד" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} maxBarSize={14} />
                    <Bar dataKey="נפילות" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ward Overview Grid with Tabs */}
      <div>
        <Tabs defaultValue="at-risk" data-testid="ward-tabs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">מחלקות</h2>
            <TabsList>
              <TabsTrigger value="at-risk" data-testid="tab-at-risk">בסיכון</TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all-wards">כל המחלקות</TabsTrigger>
            </TabsList>
          </div>
          {wardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="at-risk">
                {atRiskWards.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6">אין מחלקות בסיכון כרגע.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {atRiskWards.map((ward) => (
                      <WardCard key={ward.wardCode} ward={ward} hospitalCode={hospitalCode} />
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {wardKpis?.map((ward) => (
                    <WardCard key={ward.wardCode} ward={ward} hospitalCode={hospitalCode} />
                  ))}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Risk Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">סיכום סיכוני עומס יתר</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <RiskBadge level="high" />
              <span className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                {riskCounts.high} מחלקות
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge level="medium" />
              <span className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                {riskCounts.medium} מחלקות
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge level="low" />
              <span className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                {riskCounts.low} מחלקות
              </span>
            </div>
          </div>
          <div className="mt-3 flex h-3 w-full rounded-full overflow-hidden">
            {riskCounts.high > 0 && (
              <div className="bg-red-500" style={{ width: `${(riskCounts.high / (wardKpis?.length ?? 1)) * 100}%` }} />
            )}
            {riskCounts.medium > 0 && (
              <div className="bg-amber-500" style={{ width: `${(riskCounts.medium / (wardKpis?.length ?? 1)) * 100}%` }} />
            )}
            {riskCounts.low > 0 && (
              <div className="bg-emerald-500" style={{ width: `${(riskCounts.low / (wardKpis?.length ?? 1)) * 100}%` }} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ER Snapshot — only for general hospitals */}
      {!isPsych && <ErSnapshot wards={wardKpis ?? []} />}

      {/* Imaging Devices */}
      <ImagingDevices />

      {/* Systems Status */}
      <SystemsStatus compact />
    </div>
  );
}
