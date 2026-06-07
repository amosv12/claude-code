import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale/he";
import {
  ArrowRight,
  BedDouble,
  Wind,
  ShieldAlert,
  Footprints,
  Siren,
  UserPlus,
  Activity,
  ClipboardCheck,
  Scale,
  Users,
  TrendingDown,
  Clock,
  HeartOff,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/kpi-card";
import { RiskBadge } from "@/components/risk-badge";
import type { WardKpi, WardMaster, Hospital, OccupancyTrendPoint } from "@shared/schema";
import { useDateContext } from "@/lib/useDateContext";

function ChartTooltip({
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
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function WardDetail() {
  const [, params] = useRoute("/ward/:code");
  const [, hospitalParams] = useRoute("/hospital/:hospitalCode/ward/:code");
  const [, setLocation] = useLocation();
  const wardCode = hospitalParams?.code ?? params?.code ?? "";
  const hospitalCode = hospitalParams?.hospitalCode ?? null;
  const backPath = hospitalCode ? `/hospital/${hospitalCode}` : "/";

  const { data: wards } = useQuery<WardMaster[]>({
    queryKey: ["/api/wards"],
  });

  const { data: hospitals } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
  });

  const { asOfDate } = useDateContext();
  const kpiUrl = asOfDate ? `/api/kpi/current?asOfDate=${asOfDate}` : "/api/kpi/current";
  const { data: allKpis, isLoading: kpiLoading } = useQuery<WardKpi[]>({
    queryKey: [kpiUrl],
  });

  const ward = wards?.find((w) => w.wardCode === wardCode);
  const kpi = allKpis?.find((k) => k.wardCode === wardCode);
  const hospital = ward ? hospitals?.find((h) => h.name === ward.hospital) : null;
  const isPsych = hospital?.type === "פסיכיאטרי";

  const { data: trendData } = useQuery<OccupancyTrendPoint[]>({
    queryKey: [`/api/trends/${wardCode}?days=14`],
    enabled: !!wardCode,
  });

  // Assessment scores chart
  const assessmentData = kpi
    ? [
        { name: "נורטון", score: kpi.nortonScore },
        { name: "מאסט", score: kpi.mustScore },
        { name: "מורס", score: kpi.morseScore },
      ]
    : [];

  // Patient flow summary
  const patientFlowData = kpi
    ? [
        { name: "קבלות פיזיות", value: kpi.physicalAdmissions },
        { name: "דחופים", value: kpi.urgentPatients },
        { name: "לרידוד", value: kpi.patientsForStepDown },
        { name: "לויסות", value: kpi.patientsForRegulation },
      ]
    : [];

  // Regulation committees
  const committeeData = kpi
    ? [
        { name: "שיקומי", value: kpi.regulationCommitteeRehab },
        { name: "מונשם כרוני", value: kpi.regulationCommitteeChronic },
        { name: "סיעודי מורכב", value: kpi.regulationCommitteeComplexNursing },
      ]
    : [];

  // Returning patients
  const returningData = kpi
    ? [
        { name: "חודשי", value: kpi.returningPatientsMonth },
        { name: "שבועי", value: kpi.returningPatientsWeek },
        { name: "דחוף", value: kpi.returningPatientsUrgent },
      ]
    : [];

  if (kpiLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-96 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!kpi) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-lg text-muted-foreground">מחלקה לא נמצאה: {wardCode}</p>
        <Button variant="outline" onClick={() => setLocation(backPath)} data-testid="back-to-overview">
          <ArrowRight className="h-4 w-4 me-2" /> חזרה לסקירה
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(backPath)}
          data-testid="back-to-overview"
          className="mt-1 shrink-0"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{kpi.wardName}</h1>
            <Badge variant="outline" className="text-xs">{wardCode}</Badge>
            <RiskBadge level={kpi.riskLevel as "low" | "medium" | "high"} />
          </div>
          <p className="text-sm text-muted-foreground">{ward?.specialty ?? kpi.wardName}</p>
          {kpi.lastUpdated ? (
            <p className="text-xs text-muted-foreground">
              עודכן{" "}
              {formatDistanceToNow(new Date(kpi.lastUpdated), { addSuffix: true, locale: he })}
            </p>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">אין נתוני דיווח עדכניים</p>
          )}
        </div>
      </div>

      {/* KPI Row */}
      {isPsych ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard title="מיטות תקן" value={kpi.standardBeds} icon={BedDouble} trend="flat" />
          <KpiCard title="תפוסה" value={kpi.occupancyPercent} suffix="%" icon={Activity} trend={kpi.occupancyPercent > 90 ? "up" : "flat"} />
          <KpiCard title="סטטוס משפטי" value={kpi.legalStatusPatients} icon={Scale} trend="flat" />
          <KpiCard title="לועדה פסיכיאטרית" value={kpi.psychiatricCommitteePatients} icon={Users} trend="flat" />
          <KpiCard title="לרידוד" value={kpi.patientsForStepDown} icon={UserPlus} trend="flat" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiCard title="מיטות תקן" value={kpi.standardBeds} icon={BedDouble} trend="flat" />
          <KpiCard title="תפוסה" value={kpi.occupancyPercent} suffix="%" icon={Activity} trend={kpi.occupancyPercent > 90 ? "up" : "flat"} />
          <KpiCard title="מונשמים" value={kpi.ventilatedPatients} icon={Wind} trend="flat" />
          <KpiCard title="בידוד" value={kpi.isolationPatients} icon={ShieldAlert} trend="flat" />
          <KpiCard title="מועדים לנפילה" value={kpi.fallRiskPatients} icon={Footprints} trend="flat" />
          <KpiCard title="קבלות פיזיות" value={kpi.physicalAdmissions} icon={UserPlus} trend="flat" />
          <KpiCard title="דחופים" value={kpi.urgentPatients} icon={Siren} trend={kpi.urgentPatients > 2 ? "up" : "flat"} />
        </div>
      )}

      {/* Risk factor reasoning — shown when risk is medium or high */}
      {kpi.riskFactors && kpi.riskFactors.length > 0 && kpi.riskLevel !== "low" && (
        <div className={`rounded-lg border p-3 flex items-start gap-3 ${
          kpi.riskLevel === "high"
            ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
            : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
        }`}>
          <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
            kpi.riskLevel === "high" ? "text-red-500" : "text-amber-500"
          }`} />
          <div className="space-y-0.5">
            <p className={`text-xs font-semibold ${
              kpi.riskLevel === "high" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
            }`}>
              גורמי סיכון:
            </p>
            <ul className="space-y-0.5">
              {kpi.riskFactors.map((factor, i) => (
                <li key={i} className={`text-xs ${
                  kpi.riskLevel === "high" ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300"
                }`}>
                  • {factor}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* General hospital additional indicators */}
      {!isPsych && (
        <div className="grid grid-cols-3 gap-3">
          <KpiCard title="מצב הוחמר" value={kpi.worsenedPatients ?? 0} icon={TrendingDown} trend={(kpi.worsenedPatients ?? 0) > 0 ? "up" : "flat"} />
          <KpiCard title="טיפול התעכב" value={kpi.delayedTreatmentPatients ?? 0} icon={Clock} trend={(kpi.delayedTreatmentPatients ?? 0) > 0 ? "up" : "flat"} />
          <KpiCard title="נפטרו ב-24ש" value={kpi.deceasedLast24h ?? 0} icon={HeartOff} trend="flat" className={(kpi.deceasedLast24h ?? 0) > 0 ? "border-destructive/30" : ""} />
        </div>
      )}

      {/* 14-day occupancy trend — shown when trend data is available */}
      {trendData && trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">מגמת תפוסה — 14 ימים אחרונים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "occupancyRate" ? `${value}%` : value,
                      name === "occupancyRate" ? "תפוסה" : name === "admissions" ? "קבלות" : "שחרורים",
                    ]}
                    labelFormatter={(label) => `תאריך: ${label}`}
                  />
                  <Legend formatter={(value) =>
                    value === "occupancyRate" ? "תפוסה %" :
                    value === "admissions" ? "קבלות" : "שחרורים"
                  } />
                  <Line
                    type="monotone"
                    dataKey="occupancyRate"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                    name="occupancyRate"
                  />
                  <Line
                    type="monotone"
                    dataKey="admissions"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={1.5}
                    dot={false}
                    name="admissions"
                  />
                  <Line
                    type="monotone"
                    dataKey="discharges"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={1.5}
                    dot={false}
                    name="discharges"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column: Assessment Scores + Patient Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assessment Scores Chart — hide for psychiatric */}
        {!isPsych && <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">ציוני אומדן</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assessmentData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="score" fill="hsl(var(--chart-1))" name="ציון" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>}

        {/* Patient Flow Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">תנועת מטופלים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patientFlowData} layout="vertical" margin={{ right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" name="כמות" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Regulation Committees */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ועדות ויסות</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>סוג ועדה</TableHead>
                  <TableHead>מספר מטופלים</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {committeeData.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="text-sm">{row.name}</TableCell>
                    <TableCell className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {row.value}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="text-sm font-bold">סה״כ</TableCell>
                  <TableCell className="text-sm font-bold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                    {committeeData.reduce((s, r) => s + r.value, 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Returning Patients + Clinical */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">מטופלים חוזרים ומדדים קליניים</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מדד</TableHead>
                  <TableHead>ערך</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returningData.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="text-sm">חוזרים - {row.name}</TableCell>
                    <TableCell className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {row.value}
                    </TableCell>
                  </TableRow>
                ))}
                {!isPsych && (
                  <TableRow>
                    <TableCell className="text-sm">פצעי לחץ</TableCell>
                    <TableCell className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {kpi.pressureSorePatients}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
