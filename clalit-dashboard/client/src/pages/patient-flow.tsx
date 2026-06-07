import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { UserPlus, Siren, RotateCcw, ClipboardList, HeartOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { WardKpi } from "@shared/schema";

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

export default function PatientFlow() {
  const { hospitalName, hospital, querySuffix } = useHospitalContext();
  const isPsych = hospital?.type === "פסיכיאטרי";
  // hq replaced by querySuffix from useHospitalContext
  const hq = querySuffix;

  const { data: kpis, isLoading } = useQuery<WardKpi[]>({
    queryKey: [`/api/kpi/current${hq}`],
  });

  const totalAdmissions = (kpis ?? []).reduce((s, k) => s + k.physicalAdmissions, 0);
  const totalUrgent = (kpis ?? []).reduce((s, k) => s + k.urgentPatients, 0);
  const totalReturningMonth = (kpis ?? []).reduce((s, k) => s + k.returningPatientsMonth, 0);
  const totalRegulationCommittee = (kpis ?? []).reduce((s, k) =>
    s + k.regulationCommitteeRehab + k.regulationCommitteeChronic + k.regulationCommitteeComplexNursing, 0);
  const totalDeceased = (kpis ?? []).reduce((s, k) => s + (k.deceasedLast24h ?? 0), 0);

  // Admissions + Urgent per ward
  const admissionsData = [...(kpis ?? [])]
    .filter((k) => k.physicalAdmissions > 0 || k.urgentPatients > 0)
    .sort((a, b) => (b.physicalAdmissions + b.urgentPatients) - (a.physicalAdmissions + a.urgentPatients))
    .slice(0, 15)
    .map((k) => ({
      name: k.wardName,
      admissions: k.physicalAdmissions,
      urgent: k.urgentPatients,
    }));

  // Returning patients
  const returningData = [...(kpis ?? [])]
    .filter((k) => k.returningPatientsMonth + k.returningPatientsWeek + k.returningPatientsUrgent > 0)
    .sort((a, b) =>
      (b.returningPatientsMonth + b.returningPatientsWeek + b.returningPatientsUrgent) -
      (a.returningPatientsMonth + a.returningPatientsWeek + a.returningPatientsUrgent))
    .slice(0, 15)
    .map((k) => ({
      name: k.wardName,
      month: k.returningPatientsMonth,
      week: k.returningPatientsWeek,
      urgent: k.returningPatientsUrgent,
    }));

  // Regulation committees
  const committeeData = [...(kpis ?? [])]
    .filter((k) => k.regulationCommitteeRehab + k.regulationCommitteeChronic + k.regulationCommitteeComplexNursing > 0)
    .sort((a, b) =>
      (b.regulationCommitteeRehab + b.regulationCommitteeChronic + b.regulationCommitteeComplexNursing) -
      (a.regulationCommitteeRehab + a.regulationCommitteeChronic + a.regulationCommitteeComplexNursing))
    .slice(0, 15)
    .map((k) => ({
      name: k.wardName,
      rehab: k.regulationCommitteeRehab,
      chronic: k.regulationCommitteeChronic,
      complexNursing: k.regulationCommitteeComplexNursing,
    }));

  // Step-down + regulation table
  const flowTableData = [...(kpis ?? [])]
    .filter((k) => k.patientsForStepDown + k.patientsForRegulation + k.physicalAdmissions + k.urgentPatients > 0)
    .sort((a, b) => (b.physicalAdmissions + b.urgentPatients) - (a.physicalAdmissions + a.urgentPatients));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-2 ${isPsych ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-3`}>
        {!isPsych && <KpiCard title="קבלות פיזיות" value={totalAdmissions} icon={UserPlus} trend="flat" />}
        {!isPsych && <KpiCard title="מטופלים דחופים" value={totalUrgent} icon={Siren} trend={totalUrgent > 5 ? "up" : "flat"} />}
        <KpiCard title="חוזרים (חודש)" value={totalReturningMonth} icon={RotateCcw} trend="flat" />
        <KpiCard title="ועדות ויסות" value={totalRegulationCommittee} icon={ClipboardList} trend="flat" />
        {!isPsych && <KpiCard title="נפטרו ב-24ש" value={totalDeceased} icon={HeartOff} trend="flat" className={totalDeceased > 0 ? "border-destructive/30" : ""} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Admissions + Urgent — hide for psychiatric */}
        {!isPsych && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">קבלות ודחופים לפי מחלקה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={admissionsData} margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="admissions" fill="hsl(var(--chart-1))" name="קבלות" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="urgent" fill="hsl(0, 72%, 50%)" name="דחופים" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Returning Patients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">מטופלים חוזרים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={returningData} margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="month" stackId="a" fill="hsl(var(--chart-1))" name="חודש" />
                  <Bar dataKey="week" stackId="a" fill="hsl(var(--chart-2))" name="שבוע" />
                  <Bar dataKey="urgent" stackId="a" fill="hsl(0, 72%, 50%)" name="דחוף" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regulation Committees */}
      {committeeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ועדות ויסות חולים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={committeeData} margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="rehab" stackId="a" fill="hsl(var(--chart-1))" name="שיקומי" />
                  <Bar dataKey="chronic" stackId="a" fill="hsl(var(--chart-4))" name="מונשם כרוני" />
                  <Bar dataKey="complexNursing" stackId="a" fill="hsl(var(--chart-2))" name="סיעודי מורכב" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Flow Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">פירוט תנועת מטופלים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>מחלקה</TableHead>
                  {!isPsych && <TableHead className="text-left">קבלות</TableHead>}
                  {!isPsych && <TableHead className="text-left">דחופים</TableHead>}
                  <TableHead className="text-left">לרידוד</TableHead>
                  <TableHead className="text-left">לויסות</TableHead>
                  <TableHead className="text-left">חוזרים (ח)</TableHead>
                  <TableHead className="text-left">חוזרים (ש)</TableHead>
                  <TableHead className="text-left">חוזרים (ד)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flowTableData.map((k) => (
                  <TableRow key={k.wardCode || k.wardName}>
                    <TableCell className="text-sm font-medium">{k.wardName}</TableCell>
                    {!isPsych && (
                      <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {k.physicalAdmissions}
                      </TableCell>
                    )}
                    {!isPsych && (
                      <TableCell className={`text-sm text-left ${k.urgentPatients > 3 ? "text-red-600 dark:text-red-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {k.urgentPatients}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.patientsForStepDown}
                    </TableCell>
                    <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.patientsForRegulation}
                    </TableCell>
                    <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.returningPatientsMonth}
                    </TableCell>
                    <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.returningPatientsWeek}
                    </TableCell>
                    <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                      {k.returningPatientsUrgent}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
