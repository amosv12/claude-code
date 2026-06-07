import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ambulance, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WardKpi } from "@shared/schema";

interface ErSnapshotProps {
  wards: WardKpi[];
  className?: string;
}

function occupancyBarColor(rate: number): string {
  if (rate > 90) return "bg-red-500";
  if (rate > 80) return "bg-amber-500";
  return "bg-emerald-500";
}

export function ErSnapshot({ wards, className }: ErSnapshotProps) {
  // Find ER ward (matching "מיון")
  const erWard = wards.find((w) => w.wardName.includes("מיון"));
  const otherWards = wards.filter((w) => !w.wardName.includes("מיון"));

  // Hospital avg occupancy (excluding ER)
  const avgOccupancy = otherWards.length > 0
    ? Math.round(otherWards.reduce((s, w) => s + w.occupancyPercent, 0) / otherWards.length)
    : 0;

  const erOccupancy = erWard?.occupancyPercent ?? 0;
  const diff = erOccupancy - avgOccupancy;

  // Top-3 highest occupancy wards
  const top3 = [...otherWards]
    .sort((a, b) => b.occupancyPercent - a.occupancyPercent)
    .slice(0, 3);

  return (
    <Card className={className} data-testid="er-snapshot">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Ambulance className="h-4 w-4 text-red-600" />
          תמונת מצב מיון
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ER occupancy hero */}
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-muted-foreground">תפוסת המיון</span>
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl font-bold"
                style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
              >
                {erOccupancy}%
              </span>
              {erWard && (
                <span className="text-xs text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                  {erWard.occupiedBeds}/{erWard.standardBeds}
                </span>
              )}
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", occupancyBarColor(erOccupancy))}
              style={{ width: `${Math.min(erOccupancy, 100)}%` }}
            />
          </div>
        </div>

        {/* Compared to hospital avg */}
        <div className="flex items-center justify-between py-2 border-y border-border/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">ממוצע מחלקות</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-lg font-semibold"
              style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
            >
              {avgOccupancy}%
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                diff > 10 ? "text-red-600 dark:text-red-400" : diff < -10 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
              )}
              style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
            >
              {diff > 0 ? "+" : ""}{diff}%
            </span>
          </div>
        </div>

        {/* Top-3 occupancy wards comparison */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">המחלקות העמוסות ביותר</p>
          <div className="space-y-2">
            {top3.map((w) => (
              <div key={w.wardCode} className="flex items-center gap-2 text-xs">
                <span className="truncate flex-1" title={w.wardName}>
                  {w.wardName}
                </span>
                <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", occupancyBarColor(w.occupancyPercent))}
                    style={{ width: `${Math.min(w.occupancyPercent, 100)}%` }}
                  />
                </div>
                <span className="font-medium w-10 text-left" style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                  {w.occupancyPercent}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {!erWard && (
          <p className="text-xs text-muted-foreground italic pt-2">
            אין נתוני מיון. הוסף מחלקה בשם "מיון" לטופס הדיווח.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
