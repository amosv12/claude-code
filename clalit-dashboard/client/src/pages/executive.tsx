import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { he } from "date-fns/locale/he";
import { TrendingUp, Wind, ClipboardList, AlertTriangle, Scale, TrendingDown, Clock, HeartOff } from "lucide-react";
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
import { RiskBadge } from "@/components/risk-badge";
import { useHospitalContext } from "@/lib/useHospitalContext";
import type { WardKpi, OverviewStats } from "@shared/schema";

export default function Executive() {
  const { hospitalName, hospital, querySuffix } = useHospitalContext();
  const isPsych = hospital?.type === "פסיכיאטרי";
  // hq replaced by querySuffix from useHospitalContext
  const hq = querySuffix;

  const { data: stats, isLoading: statsLoading } = useQuery<OverviewStats>({
    queryKey: [`/api/stats/overview${hq}`],
  });

  const { data: kpis } = useQuery<WardKpi[]>({
    queryKey: [`/api/kpi/current${hq}`],
  });

  // Find highest occupancy ward
  const highOccupancyWard = kpis
    ? [...kpis].sort((a, b) => b.occupancyPercent - a.occupancyPercent)[0]
    : null;

  // Regulation committee totals
  const totalRegulation = (kpis ?? []).reduce((s, k) =>
    s + k.regulationCommitteeRehab + k.regulationCommitteeChronic + k.regulationCommitteeComplexNursing, 0);

  // Ward risk table sorted by risk level
  const riskOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedWards = [...(kpis ?? [])].sort(
    (a, b) => (riskOrder[a.riskLevel] ?? 2) - (riskOrder[b.riskLevel] ?? 2),
  );

  // Action items
  const actionItems: string[] = [];
  (kpis ?? []).forEach((k) => {
    if (k.occupancyPercent > 90) {
      actionItems.push(
        `${k.wardName} בתפוסה ${k.occupancyPercent}% - יש לשקול פרוטוקול גלישה`,
      );
    }
  });
  if (!isPsych) {
    (kpis ?? []).forEach((k) => {
      if (k.ventilatedPatients > 3) {
        actionItems.push(
          `${k.wardName} - ${k.ventilatedPatients} מונשמים - נדרש ניטור מוגבר`,
        );
      }
    });
    (kpis ?? []).forEach((k) => {
      if (k.fallRiskPatients > 5) {
        actionItems.push(
          `${k.wardName} - ${k.fallRiskPatients} מועדים לנפילה - נדרש תגבור מניעה`,
        );
      }
    });
  }
  if (!isPsych) {
    (kpis ?? []).forEach((k) => {
      if ((k.worsenedPatients ?? 0) > 0) {
        actionItems.push(
          `${k.wardName} - ${k.worsenedPatients ?? 0} מטופלים שמצבם הוחמר`,
        );
      }
    });
    (kpis ?? []).forEach((k) => {
      if ((k.delayedTreatmentPatients ?? 0) > 0) {
        actionItems.push(
          `${k.wardName} - ${k.delayedTreatmentPatients ?? 0} מטופלים שהטיפול התעכב`,
        );
      }
    });
    (kpis ?? []).forEach((k) => {
      if ((k.deceasedLast24h ?? 0) > 0) {
        actionItems.push(
          `${k.wardName} - ${k.deceasedLast24h ?? 0} נפטרו ב-24 שעות האחרונות`,
        );
      }
    });
  }
  if (totalRegulation > 10) {
    actionItems.push(
      `${totalRegulation} מטופלים ממתינים לועדות ויסות`,
    );
  }

  function cellColor(value: number, thresholds: [number, number]) {
    if (value > thresholds[1]) return "text-red-600 dark:text-red-400 font-medium";
    if (value > thresholds[0]) return "text-amber-600 dark:text-amber-400 font-medium";
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        סיכום מנהלי - {format(new Date(), "EEEE, d MMMM yyyy", { locale: he })}
      </div>

      {/* Three attention cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              מחלקה בתפוסה גבוהה
            </CardTitle>
          </CardHeader>
          <CardContent>
            {highOccupancyWard ? (
              <div className="space-y-1">
                <p className="text-lg font-bold">{highOccupancyWard.wardName}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                    תפוסה: {highOccupancyWard.occupancyPercent}%
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                    מונשמים: {highOccupancyWard.ventilatedPatients}
                  </span>
                </div>
                <RiskBadge level={highOccupancyWard.riskLevel as "low" | "medium" | "high"} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">אין נתונים</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isPsych ? (
                <><Scale className="h-4 w-4 text-amber-500" /> סטטוס משפטי</>
              ) : (
                <><Wind className="h-4 w-4 text-amber-500" /> מונשמים במערכת</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPsych ? (
              <>
                <p className="text-2xl font-bold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>0</p>
                <p className="text-xs text-muted-foreground mt-1">לועדה פסיכיאטרית: 0</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                  {stats?.ventilatedPatients ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  בידוד: {stats?.isolationPatients ?? 0}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-900/50">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-orange-500" />
              ועדות ויסות ממתינות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
              {totalRegulation}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              רידוד: {stats?.patientsForStepDown ?? 0} | ויסות: {stats?.patientsForRegulation ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ward Risk Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">סקירת מחלקות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>מחלקה</TableHead>
                  <TableHead className="text-left">תפוסה</TableHead>
                  {!isPsych && <TableHead className="text-left">מונשמים</TableHead>}
                  {!isPsych && <TableHead className="text-left">נפילה</TableHead>}
                  {!isPsych && <TableHead className="text-left">פצעי לחץ</TableHead>}
                  {!isPsych && <TableHead className="text-left">בידוד</TableHead>}
                  {!isPsych && <TableHead className="text-left">הוחמר</TableHead>}
                  {!isPsych && <TableHead className="text-left">עיכוב</TableHead>}
                  {!isPsych && <TableHead className="text-left">נפטרו</TableHead>}
                  <TableHead>סיכון</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedWards.map((w) => (
                  <TableRow key={w.wardCode || w.wardName}>
                    <TableCell className="text-sm font-medium">{w.wardName}</TableCell>
                    <TableCell
                      className={`text-sm text-left ${cellColor(w.occupancyPercent, [80, 90])}`}
                      style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                    >
                      {w.occupancyPercent}%
                    </TableCell>
                    {!isPsych && (
                      <TableCell
                        className={`text-sm text-left ${cellColor(w.ventilatedPatients, [2, 3])}`}
                        style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                      >
                        {w.ventilatedPatients}
                      </TableCell>
                    )}
                    {!isPsych && (
                      <TableCell
                        className={`text-sm text-left ${cellColor(w.fallRiskPatients, [3, 5])}`}
                        style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                      >
                        {w.fallRiskPatients}
                      </TableCell>
                    )}
                    {!isPsych && (
                      <TableCell
                        className={`text-sm text-left ${cellColor(w.pressureSorePatients, [2, 3])}`}
                        style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
                      >
                        {w.pressureSorePatients}
                      </TableCell>
                    )}
                    {!isPsych && (
                      <TableCell className="text-sm text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {w.isolationPatients}
                      </TableCell>
                    )}
                    {!isPsych && (
                      <TableCell className={`text-sm text-left ${(w.worsenedPatients ?? 0) > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {w.worsenedPatients ?? 0}
                      </TableCell>
                    )}
                    {!isPsych && (
                      <TableCell className={`text-sm text-left ${(w.delayedTreatmentPatients ?? 0) > 0 ? "text-amber-600 dark:text-amber-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {w.delayedTreatmentPatients ?? 0}
                      </TableCell>
                    )}
                    {!isPsych && (
                      <TableCell className={`text-sm text-left ${(w.deceasedLast24h ?? 0) > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                        {w.deceasedLast24h ?? 0}
                      </TableCell>
                    )}
                    <TableCell>
                      <RiskBadge level={w.riskLevel as "low" | "medium" | "high"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">פעולות נדרשות</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
