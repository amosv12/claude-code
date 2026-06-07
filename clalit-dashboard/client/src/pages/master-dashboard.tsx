import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BedDouble,
  Wind,
  ShieldAlert,
  Footprints,
  UserPlus,
  Siren,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/kpi-card";
import { HospitalMap } from "@/components/hospital-map";
import type { HospitalOverviewData } from "@shared/schema";
import { useDateContext } from "@/lib/useDateContext";

/* ── Tooltip shared across charts ── */
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
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm" dir="rtl">
      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Color helpers ── */
function occupancyBarColor(rate: number) {
  if (rate > 90) return "hsl(var(--destructive))";
  if (rate > 80) return "hsl(45, 93%, 47%)";
  return "hsl(var(--chart-1))";
}

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-3))",
];

const RISK_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function MasterDashboard() {
  const [, setLocation] = useLocation();

  const { asOfDate } = useDateContext();
  const overviewUrl = asOfDate ? `/api/hospitals/overview?asOfDate=${asOfDate}` : "/api/hospitals/overview";
  const { data: hospitals, isLoading } = useQuery<HospitalOverviewData[]>({
    queryKey: [overviewUrl],
  });

  /* ── Aggregated totals ── */
  const totals = (hospitals ?? []).reduce(
    (acc, h) => ({
      totalBeds: acc.totalBeds + h.totalBeds,
      occupiedBeds: acc.occupiedBeds + h.occupiedBeds,
      availableBeds: acc.availableBeds + h.availableBeds,
      ventilatedPatients: acc.ventilatedPatients + h.ventilatedPatients,
      isolationPatients: acc.isolationPatients + h.isolationPatients,
      fallRiskPatients: acc.fallRiskPatients + h.fallRiskPatients,
      pressureSorePatients: acc.pressureSorePatients + h.pressureSorePatients,
      physicalAdmissions: acc.physicalAdmissions + h.physicalAdmissions,
      urgentPatients: acc.urgentPatients + h.urgentPatients,
    }),
    {
      totalBeds: 0,
      occupiedBeds: 0,
      availableBeds: 0,
      ventilatedPatients: 0,
      isolationPatients: 0,
      fallRiskPatients: 0,
      pressureSorePatients: 0,
      physicalAdmissions: 0,
      urgentPatients: 0,
    },
  );

  const occupancyRate =
    totals.totalBeds > 0
      ? Math.round((totals.occupiedBeds / totals.totalBeds) * 1000) / 10
      : 0;

  /* ── Chart data ── */
  const sorted = [...(hospitals ?? [])].sort((a, b) => b.occupancyRate - a.occupancyRate);

  // 1. Occupancy horizontal bar
  const occupancyData = sorted.map((h) => ({
    name: h.name,
    code: h.code,
    תפוסה: h.occupancyRate,
  }));

  // 2. Beds donut
  const bedsDonutData = [
    { name: "תפוסות", value: totals.occupiedBeds },
    { name: "פנויות", value: totals.availableBeds },
  ];

  // 3. Clinical grouped bar chart
  const clinicalData = sorted.map((h) => ({
    name: h.name,
    code: h.code,
    מונשמים: h.ventilatedPatients,
    בידוד: h.isolationPatients,
    נפילות: h.fallRiskPatients,
    "פצעי לחץ": h.pressureSorePatients,
  }));

  const CLINICAL_COLORS = {
    מונשמים: "hsl(var(--chart-1))",
    בידוד: "hsl(var(--chart-3))",
    נפילות: "hsl(var(--chart-4))",
    "פצעי לחץ": "hsl(var(--chart-5))",
  } as Record<string, string>;

  // 4. Risk stacked bar
  const riskData = sorted.map((h) => ({
    name: h.name,
    code: h.code,
    גבוה: h.highRiskWards,
    בינוני: h.mediumRiskWards,
    נמוך: h.totalWards - h.highRiskWards - h.mediumRiskWards,
  }));

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard title="סה״כ מיטות" value={totals.totalBeds} icon={BedDouble} trend="flat" />
        <KpiCard
          title="תפוסות"
          value={totals.occupiedBeds}
          delta={occupancyRate}
          trend={occupancyRate > 85 ? "up" : occupancyRate < 70 ? "down" : "flat"}
          icon={Layers}
        />
        <KpiCard title="מונשמים" value={totals.ventilatedPatients} icon={Wind} trend="flat" />
        <KpiCard title="בידוד" value={totals.isolationPatients} icon={ShieldAlert} trend="flat" />
        <KpiCard title="מועדים לנפילה" value={totals.fallRiskPatients} icon={Footprints} trend="flat" />
        <KpiCard title="קבלות פיזיות" value={totals.physicalAdmissions} icon={UserPlus} trend="flat" />
        <KpiCard
          title="דחופים"
          value={totals.urgentPatients}
          icon={Siren}
          trend={totals.urgentPatients > 10 ? "up" : "flat"}
          className={totals.urgentPatients > 10 ? "border-destructive/50" : ""}
        />
      </div>

      {/* ── Row 1: Map (left) + Occupancy Bar + Beds Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map — tall, left side (1/4) */}
        <Card className="lg:col-span-1 lg:order-first order-last">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">מפת בתי חולים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[800px]">
              <HospitalMap hospitals={hospitals ?? []} />
            </div>
          </CardContent>
        </Card>

        {/* Occupancy comparison — takes 2/4 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">תפוסה לפי בית חולים (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={occupancyData}
                  layout="vertical"
                  margin={{ right: 10, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
                  <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="תפוסה"
                    name="תפוסה"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                    cursor="pointer"
                    onClick={(data) => {
                      if (data?.code) setLocation(`/hospital/${data.code}`);
                    }}
                  >
                    {occupancyData.map((entry, i) => (
                      <Cell key={i} fill={occupancyBarColor(entry["תפוסה"])} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Beds donut — takes 1/4 */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">מיטות — תפוסות מול פנויות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={bedsDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                    labelLine={false}
                  >
                    {bedsDonutData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-2xl font-bold mt-2" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                {occupancyRate}%
              </p>
              <p className="text-xs text-muted-foreground">תפוסה כוללת</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Clinical Indicators Grouped Bar ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">מדדים קליניים לפי בית חולים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[460px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={clinicalData}
                layout="vertical"
                margin={{ right: 10, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend
                  verticalAlign="top"
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
                {Object.entries(CLINICAL_COLORS).map(([key, color]) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    fill={color}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={12}
                    cursor="pointer"
                    onClick={(data) => {
                      if (data?.code) setLocation(`/hospital/${data.code}`);
                    }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Row 3: Risk Overview ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">סיכוני עומס לפי בית חולים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={riskData}
                layout="vertical"
                margin={{ right: 10, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend
                  verticalAlign="top"
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
                <Bar
                  dataKey="גבוה"
                  name="גבוה"
                  stackId="risk"
                  fill={RISK_COLORS.high}
                  radius={[0, 0, 0, 0]}
                  maxBarSize={20}
                  cursor="pointer"
                  onClick={(data) => {
                    if (data?.code) setLocation(`/hospital/${data.code}`);
                  }}
                />
                <Bar
                  dataKey="בינוני"
                  name="בינוני"
                  stackId="risk"
                  fill={RISK_COLORS.medium}
                  maxBarSize={20}
                  cursor="pointer"
                  onClick={(data) => {
                    if (data?.code) setLocation(`/hospital/${data.code}`);
                  }}
                />
                <Bar
                  dataKey="נמוך"
                  name="נמוך"
                  stackId="risk"
                  fill={RISK_COLORS.low}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                  cursor="pointer"
                  onClick={(data) => {
                    if (data?.code) setLocation(`/hospital/${data.code}`);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
