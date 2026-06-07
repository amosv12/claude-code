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
  ReferenceLine,
} from "recharts";
import { BedDouble, Layers, Wind, ShieldAlert, Activity } from "lucide-react";
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

function occupancyBarColor(rate: number) {
  if (rate > 90) return "hsl(0, 72%, 50%)";
  if (rate > 80) return "hsl(38, 92%, 50%)";
  return "hsl(152, 69%, 40%)";
}

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

export default function Capacity() {
  const [selectedWard, setSelectedWard] = useState("all");
  const { hospitalName, hospital, querySuffix } = useHospitalContext();
  const isPsych = hospital?.type === "פסיכיאטרי";
  // hq replaced by querySuffix from useHospitalContext
  const hq = querySuffix;

  const { data: kpis, isLoading: kpisLoading } = useQuery<WardKpi[]>({
    queryKey: [`/api/kpi/current${hq}`],
  });

  const { data: wards } = useQuery<WardMaster[]>({
    queryKey: [`/api/wards${hq}`],
  });

  const filteredKpis =
    kpis && selectedWard !== "all"
      ? kpis.filter((k) => k.wardCode === selectedWard)
      : kpis;

  const totalBeds = filteredKpis?.reduce((s, k) => s + k.standardBeds, 0) ?? 0;
  const occupied = filteredKpis?.reduce((s, k) => s + k.occupiedBeds, 0) ?? 0;
  const available = filteredKpis?.reduce((s, k) => s + k.availableBeds, 0) ?? 0;
  const ventilated = filteredKpis?.reduce((s, k) => s + k.ventilatedPatients, 0) ?? 0;
  const isolation = filteredKpis?.reduce((s, k) => s + k.isolationPatients, 0) ?? 0;

  // Occupancy chart
  const occupancyData = [...(kpis ?? [])]
    .filter((k) => k.standardBeds > 0)
    .sort((a, b) => b.occupancyPercent - a.occupancyPercent)
    .map((k) => ({ name: k.wardName, rate: k.occupancyPercent }));

  // Ventilated + Isolation per ward
  const ventIsolationData = [...(kpis ?? [])]
    .filter((k) => k.ventilatedPatients > 0 || k.isolationPatients > 0)
    .sort((a, b) => (b.ventilatedPatients + b.isolationPatients) - (a.ventilatedPatients + a.isolationPatients))
    .slice(0, 20)
    .map((k) => ({
      name: k.wardName,
      ventilated: k.ventilatedPatients,
      isolation: k.isolationPatients,
    }));

  // Pending regulation table
  const regulationData = [...(kpis ?? [])]
    .filter((k) => k.patientsForStepDown > 0 || k.patientsForRegulation > 0)
    .sort((a, b) => (b.patientsForStepDown + b.patientsForRegulation) - (a.patientsForStepDown + a.patientsForRegulation));

  if (kpisLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-md" />
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
          <SelectTrigger className="w-56" data-testid="ward-filter">
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="סה״כ מיטות" value={totalBeds} icon={BedDouble} />
        <KpiCard title="תפוסות" value={occupied} icon={Layers} trend="flat" />
        <KpiCard title="פנויות" value={available} icon={Activity} trend="flat" />
        {!isPsych && <KpiCard title="מונשמים" value={ventilated} icon={Wind} trend="flat" />}
        {!isPsych && <KpiCard title="בידוד" value={isolation} icon={ShieldAlert} trend="flat" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">השוואת תפוסה לפי מחלקה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                  <Tooltip content={<ChartTooltip />} />
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

        {!isPsych && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">מונשמים ובידוד לפי מחלקה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ventIsolationData} margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="ventilated" stackId="a" fill="hsl(var(--chart-1))" name="מונשמים" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="isolation" stackId="a" fill="hsl(var(--chart-5))" name="בידוד" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending Regulation Table */}
      {regulationData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">מטופלים ממתינים לרידוד / ויסות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>מחלקה</TableHead>
                    <TableHead className="text-left">לרידוד</TableHead>
                    <TableHead className="text-left">לויסות</TableHead>
                    <TableHead className="text-left">סה״כ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regulationData.map((k) => (
                    <TableRow key={k.wardCode || k.wardName}>
                      <TableCell className="text-sm">{k.wardName}</TableCell>
                      <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {k.patientsForStepDown}
                      </TableCell>
                      <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {k.patientsForRegulation}
                      </TableCell>
                      <TableCell className="text-sm text-left font-medium" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {k.patientsForStepDown + k.patientsForRegulation}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
