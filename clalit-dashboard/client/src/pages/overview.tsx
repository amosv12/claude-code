import { useQuery } from "@tanstack/react-query";
import {
  BedDouble,
  Wind,
  ShieldAlert,
  Footprints,
  UserPlus,
  AlertTriangle,
  Siren,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/kpi-card";
import { WardCard } from "@/components/ward-card";
import { RiskBadge } from "@/components/risk-badge";
import type { WardKpi, OverviewStats } from "@shared/schema";

function occupancyBarColor(rate: number) {
  if (rate > 90) return "hsl(0, 72%, 50%)";
  if (rate > 80) return "hsl(38, 92%, 50%)";
  return "hsl(152, 69%, 40%)";
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
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}:</span>
          <span
            className="font-semibold"
            style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Overview() {
  const { data: stats, isLoading: statsLoading } = useQuery<OverviewStats>({
    queryKey: ["/api/stats/overview"],
  });

  const { data: wardKpis, isLoading: wardsLoading } = useQuery<WardKpi[]>({
    queryKey: ["/api/kpi/current"],
  });

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

  // Occupancy by ward chart
  const occupancyData = [...(wardKpis ?? [])]
    .filter((k) => k.standardBeds > 0)
    .sort((a, b) => b.occupancyPercent - a.occupancyPercent)
    .slice(0, 20)
    .map((k) => ({ name: k.wardName, rate: k.occupancyPercent }));

  // Clinical indicators by ward (top wards with most indicators)
  const clinicalData = [...(wardKpis ?? [])]
    .map((k) => ({
      name: k.wardName,
      ventilated: k.ventilatedPatients,
      isolation: k.isolationPatients,
      fallRisk: k.fallRiskPatients,
      pressureSores: k.pressureSorePatients,
    }))
    .filter((d) => d.ventilated + d.isolation + d.fallRisk + d.pressureSores > 0)
    .sort((a, b) =>
      (b.ventilated + b.isolation + b.fallRisk + b.pressureSores) -
      (a.ventilated + a.isolation + a.fallRisk + a.pressureSores)
    )
    .slice(0, 15);

  if (statsLoading) {
    return (
      <div className="space-y-6">
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
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard
          title="סה״כ מיטות"
          value={stats?.totalBeds ?? 0}
          icon={BedDouble}
          trend="flat"
        />
        <KpiCard
          title="תפוסה ממוצעת"
          value={stats?.occupancyRate ?? 0}
          suffix="%"
          icon={BedDouble}
          trend={
            (stats?.occupancyRate ?? 0) > 85
              ? "up"
              : (stats?.occupancyRate ?? 0) < 70
                ? "down"
                : "flat"
          }
        />
        <KpiCard
          title="מונשמים"
          value={stats?.ventilatedPatients ?? 0}
          icon={Wind}
          trend={(stats?.ventilatedPatients ?? 0) > 10 ? "up" : "flat"}
        />
        <KpiCard
          title="בידוד"
          value={stats?.isolationPatients ?? 0}
          icon={ShieldAlert}
          trend="flat"
        />
        <KpiCard
          title="מועדים לנפילה"
          value={stats?.fallRiskPatients ?? 0}
          icon={Footprints}
          trend={(stats?.fallRiskPatients ?? 0) > 20 ? "up" : "flat"}
        />
        <KpiCard
          title="קבלות פיזיות"
          value={stats?.physicalAdmissions ?? 0}
          icon={UserPlus}
          trend="flat"
        />
        <KpiCard
          title="מטופלים דחופים"
          value={stats?.urgentPatients ?? 0}
          icon={Siren}
          trend={(stats?.urgentPatients ?? 0) > 5 ? "up" : "flat"}
          className={(stats?.urgentPatients ?? 0) > 5 ? "border-destructive/50" : ""}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Occupancy by Ward */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              תפוסה לפי מחלקה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <ReferenceLine x={90} stroke="hsl(var(--destructive))" strokeDasharray="6 3" />
                  <Bar dataKey="rate" name="תפוסה" radius={[0, 4, 4, 0]}>
                    {occupancyData.map((entry, idx) => (
                      <Cell key={idx} fill={occupancyBarColor(entry.rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Indicators by Ward */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              מדדים קליניים לפי מחלקה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clinicalData} margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="ventilated" stackId="a" fill="hsl(var(--chart-1))" name="מונשמים" />
                  <Bar dataKey="isolation" stackId="a" fill="hsl(var(--chart-5))" name="בידוד" />
                  <Bar dataKey="fallRisk" stackId="a" fill="hsl(38, 92%, 50%)" name="נפילה" />
                  <Bar dataKey="pressureSores" stackId="a" fill="hsl(var(--chart-2))" name="פצעי לחץ" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ward Overview Grid with Tabs */}
      <div>
        <Tabs defaultValue="at-risk" data-testid="ward-tabs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">סקירת מחלקות</h2>
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
                      <WardCard key={ward.wardCode || ward.wardName} ward={ward} />
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {wardKpis?.map((ward) => (
                    <WardCard key={ward.wardCode || ward.wardName} ward={ward} />
                  ))}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Overload Risk Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            סיכום סיכוני עומס
          </CardTitle>
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
              <div className="bg-red-500" style={{ width: `${(riskCounts.high / (stats?.totalWards ?? 1)) * 100}%` }} />
            )}
            {riskCounts.medium > 0 && (
              <div className="bg-amber-500" style={{ width: `${(riskCounts.medium / (stats?.totalWards ?? 1)) * 100}%` }} />
            )}
            {riskCounts.low > 0 && (
              <div className="bg-emerald-500" style={{ width: `${(riskCounts.low / (stats?.totalWards ?? 1)) * 100}%` }} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
