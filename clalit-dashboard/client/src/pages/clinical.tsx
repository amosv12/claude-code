import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Footprints, Stethoscope, Activity, Heart, TrendingDown, Clock, HeartOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/kpi-card";
import { useHospitalContext } from "@/lib/useHospitalContext";
import type { WardKpi, WardMaster } from "@shared/schema";

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

function scoreColor(value: number, high: number): string {
  if (value > high) return "hsl(0, 72%, 50%)";
  if (value > high * 0.6) return "hsl(38, 92%, 50%)";
  return "hsl(152, 69%, 40%)";
}

export default function Clinical() {
  const [selectedWard, setSelectedWard] = useState("all");
  const { hospitalName, hospital, querySuffix } = useHospitalContext();
  const isPsych = hospital?.type === "פסיכיאטרי";
  // hq replaced by querySuffix from useHospitalContext
  const hq = querySuffix;

  const { data: kpis, isLoading } = useQuery<WardKpi[]>({
    queryKey: [`/api/kpi/current${hq}`],
  });

  const { data: wards } = useQuery<WardMaster[]>({
    queryKey: [`/api/wards${hq}`],
  });

  const filteredKpis =
    kpis && selectedWard !== "all"
      ? kpis.filter((k) => k.wardCode === selectedWard)
      : kpis;

  const totalFallRisk = filteredKpis?.reduce((s, k) => s + k.fallRiskPatients, 0) ?? 0;
  const totalPressureSores = filteredKpis?.reduce((s, k) => s + k.pressureSorePatients, 0) ?? 0;
  const totalWorsened = filteredKpis?.reduce((s, k) => s + (k.worsenedPatients ?? 0), 0) ?? 0;
  const totalDelayed = filteredKpis?.reduce((s, k) => s + (k.delayedTreatmentPatients ?? 0), 0) ?? 0;
  const totalDeceased = filteredKpis?.reduce((s, k) => s + (k.deceasedLast24h ?? 0), 0) ?? 0;

  const withScores = (filteredKpis ?? []).filter((k) => k.nortonScore > 0 || k.mustScore > 0 || k.morseScore > 0);
  const avgNorton = withScores.length > 0
    ? Math.round(withScores.reduce((s, k) => s + k.nortonScore, 0) / withScores.length * 10) / 10
    : 0;
  const avgMust = withScores.length > 0
    ? Math.round(withScores.reduce((s, k) => s + k.mustScore, 0) / withScores.length * 10) / 10
    : 0;
  const avgMorse = withScores.length > 0
    ? Math.round(withScores.reduce((s, k) => s + k.morseScore, 0) / withScores.length * 10) / 10
    : 0;

  // Assessment scores by ward
  const assessmentData = [...(kpis ?? [])]
    .filter((k) => k.nortonScore > 0 || k.mustScore > 0 || k.morseScore > 0)
    .sort((a, b) => (b.morseScore + b.nortonScore + b.mustScore) - (a.morseScore + a.nortonScore + a.mustScore))
    .slice(0, 15)
    .map((k) => ({
      name: k.wardName,
      norton: k.nortonScore,
      must: k.mustScore,
      morse: k.morseScore,
    }));

  // Fall risk + Pressure sores by ward
  const riskData = [...(kpis ?? [])]
    .filter((k) => k.fallRiskPatients > 0 || k.pressureSorePatients > 0)
    .sort((a, b) => (b.fallRiskPatients + b.pressureSorePatients) - (a.fallRiskPatients + a.pressureSorePatients))
    .slice(0, 15)
    .map((k) => ({
      name: k.wardName,
      fallRisk: k.fallRiskPatients,
      pressureSores: k.pressureSorePatients,
    }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={selectedWard} onValueChange={setSelectedWard}>
          <SelectTrigger className="w-48" data-testid="clinical-ward-filter">
            <SelectValue placeholder="כל המחלקות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המחלקות</SelectItem>
            {wards?.map((w) => (
              <SelectItem key={w.wardCode} value={w.wardCode}>
                {w.wardName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPsych ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <p className="text-lg font-semibold">מדדים קליניים</p>
          <p className="text-sm text-muted-foreground">דף זה אינו רלוונטי לבתי חולים פסיכיאטריים.</p>
          <p className="text-sm text-muted-foreground">מדדים פסיכיאטריים יוצגו בדף הסקירה.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="מועדים לנפילה" value={totalFallRisk} icon={Footprints} trend={totalFallRisk > 20 ? "up" : "flat"} />
          <KpiCard title="פצעי לחץ" value={totalPressureSores} icon={Heart} trend={totalPressureSores > 10 ? "up" : "flat"} />
          <KpiCard title="ממוצע נורטון" value={avgNorton} icon={Stethoscope} trend="flat" />
          <KpiCard title="ממוצע מאסט" value={avgMust} icon={Activity} trend="flat" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="ממוצע מורס" value={avgMorse} icon={Footprints} trend="flat" />
          <KpiCard title="מצב הוחמר" value={totalWorsened} icon={TrendingDown} trend={totalWorsened > 0 ? "up" : "flat"} />
          <KpiCard title="טיפול התעכב" value={totalDelayed} icon={Clock} trend={totalDelayed > 0 ? "up" : "flat"} />
          <KpiCard title="נפטרו ב-24ש" value={totalDeceased} icon={HeartOff} trend="flat" className={totalDeceased > 0 ? "border-destructive/30" : ""} />
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assessment Scores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">אומדנים לפי מחלקה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assessmentData} margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="norton" fill="hsl(var(--chart-1))" name="נורטון" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="must" fill="hsl(var(--chart-2))" name="מאסט" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="morse" fill="hsl(var(--chart-4))" name="מורס" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fall Risk + Pressure Sores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">סיכוני נפילה ופצעי לחץ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="fallRisk" fill="hsl(38, 92%, 50%)" name="מועדים לנפילה" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pressureSores" fill="hsl(var(--chart-2))" name="פצעי לחץ" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Clinical Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">פירוט מדדים קליניים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>מחלקה</TableHead>
                  <TableHead className="text-left">נפילה</TableHead>
                  <TableHead className="text-left">פצעי לחץ</TableHead>
                  <TableHead className="text-left">נורטון</TableHead>
                  <TableHead className="text-left">מאסט</TableHead>
                  <TableHead className="text-left">מורס</TableHead>
                  <TableHead className="text-left">מונשמים</TableHead>
                  <TableHead className="text-left">בידוד</TableHead>
                  <TableHead className="text-left">הוחמר</TableHead>
                  <TableHead className="text-left">עיכוב</TableHead>
                  <TableHead className="text-left">נפטרו</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(filteredKpis ?? [])
                  .filter((k) => k.fallRiskPatients + k.pressureSorePatients + k.nortonScore + k.mustScore + k.morseScore > 0)
                  .map((k) => (
                  <TableRow key={k.wardCode || k.wardName}>
                    <TableCell className="text-sm font-medium">{k.wardName}</TableCell>
                    <TableCell className={`text-sm text-left ${k.fallRiskPatients > 3 ? "text-red-600 dark:text-red-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.fallRiskPatients}
                    </TableCell>
                    <TableCell className={`text-sm text-left ${k.pressureSorePatients > 2 ? "text-red-600 dark:text-red-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.pressureSorePatients}
                    </TableCell>
                    <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.nortonScore || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.mustScore || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.morseScore || "—"}
                    </TableCell>
                    <TableCell className={`text-sm text-left ${k.ventilatedPatients > 2 ? "text-amber-600 dark:text-amber-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.ventilatedPatients}
                    </TableCell>
                    <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.isolationPatients}
                    </TableCell>
                    <TableCell className={`text-sm text-left ${(k.worsenedPatients ?? 0) > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.worsenedPatients ?? 0}
                    </TableCell>
                    <TableCell className={`text-sm text-left ${(k.delayedTreatmentPatients ?? 0) > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.delayedTreatmentPatients ?? 0}
                    </TableCell>
                    <TableCell className={`text-sm text-left ${(k.deceasedLast24h ?? 0) > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.deceasedLast24h ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
