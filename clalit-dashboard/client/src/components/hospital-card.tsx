import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BedDouble, Wind, ShieldAlert, Footprints, UserPlus, Siren } from "lucide-react";
import type { HospitalOverviewData } from "@shared/schema";

const typeColors: Record<string, string> = {
  "כללי": "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  "פסיכיאטרי": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "שיקומי": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "גריאטרי": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

function occupancyColor(rate: number) {
  if (rate > 90) return "bg-red-500 dark:bg-red-600";
  if (rate > 80) return "bg-amber-500 dark:bg-amber-500";
  return "bg-emerald-500 dark:bg-emerald-500";
}

function riskDotColor(level: string) {
  if (level === "high") return "bg-red-500";
  if (level === "medium") return "bg-amber-500";
  return "bg-emerald-500";
}

interface HospitalCardProps {
  hospital: HospitalOverviewData;
  className?: string;
}

export function HospitalCard({ hospital, className }: HospitalCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card
      className={cn(
        "p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer hover:border-primary/40",
        className,
      )}
      data-testid={`hospital-card-${hospital.code}`}
      onClick={() => setLocation(`/hospital/${hospital.code}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setLocation(`/hospital/${hospital.code}`);
        }
      }}
    >
      {/* Header: Name + Type badge + Risk dot */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate" dir="rtl">{hospital.name}</h3>
          <p className="text-xs text-muted-foreground" dir="rtl">{hospital.city}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", typeColors[hospital.type] ?? "bg-gray-100 text-gray-800")}>
            {hospital.type}
          </span>
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", riskDotColor(hospital.overallRisk))} />
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>תפוסה</span>
          <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {hospital.occupiedBeds}/{hospital.totalBeds} ({hospital.occupancyRate}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", occupancyColor(hospital.occupancyRate))}
            style={{ width: `${Math.min(hospital.occupancyRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <BedDouble className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>{hospital.totalWards}</span>
          <span className="text-[10px]">מחלקות</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>{hospital.ventilatedPatients}</span>
          <span className="text-[10px]">מונשמים</span>
        </div>
        <div className="flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>{hospital.isolationPatients}</span>
          <span className="text-[10px]">בידוד</span>
        </div>
        <div className="flex items-center gap-1">
          <UserPlus className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>{hospital.physicalAdmissions}</span>
          <span className="text-[10px]">קבלות</span>
        </div>
        <div className="flex items-center gap-1">
          <Footprints className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>{hospital.fallRiskPatients}</span>
          <span className="text-[10px]">נפילות</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", hospital.highRiskWards > 0 ? "bg-red-500" : hospital.mediumRiskWards > 0 ? "bg-amber-500" : "bg-emerald-500")}
          />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {hospital.highRiskWards > 0
              ? `${hospital.highRiskWards} סיכון`
              : hospital.mediumRiskWards > 0
                ? `${hospital.mediumRiskWards} בינוני`
                : "תקין"}
          </span>
        </div>
      </div>
    </Card>
  );
}
