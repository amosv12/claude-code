import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/risk-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WardKpi } from "@shared/schema";
import { Wind, ShieldAlert, Footprints, Siren, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale/he";

interface WardCardProps {
  ward: WardKpi;
  className?: string;
  hospitalCode?: string;
}

function occupancyColor(rate: number) {
  if (rate > 90) return "bg-red-500 dark:bg-red-600";
  if (rate > 80) return "bg-amber-500 dark:bg-amber-500";
  return "bg-emerald-500 dark:bg-emerald-500";
}

export function WardCard({ ward, className, hospitalCode }: WardCardProps) {
  const [, setLocation] = useLocation();
  const wardPath = hospitalCode
    ? `/hospital/${hospitalCode}/ward/${ward.wardCode}`
    : `/ward/${ward.wardCode}`;

  return (
    <Card
      className={cn(
        "p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer hover:border-primary/40",
        className,
      )}
      data-testid={`ward-card-${ward.wardCode}`}
      onClick={() => setLocation(wardPath)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setLocation(wardPath);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold truncate pe-2">{ward.wardName}</h3>
        {ward.riskFactors && ward.riskFactors.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <RiskBadge level={ward.riskLevel as "low" | "medium" | "high"} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-56 text-right" dir="rtl">
              <p className="font-semibold mb-1 text-xs">גורמי סיכון:</p>
              <ul className="space-y-0.5">
                {ward.riskFactors.map((f, i) => (
                  <li key={i} className="text-xs">• {f}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        ) : (
          <RiskBadge level={ward.riskLevel as "low" | "medium" | "high"} />
        )}
      </div>

      {/* Occupancy bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>תפוסה</span>
          <span
            className="font-medium"
            style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
          >
            {ward.occupiedBeds}/{ward.standardBeds} ({ward.occupancyPercent}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", occupancyColor(ward.occupancyPercent))}
            style={{ width: `${Math.min(ward.occupancyPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1" title="מונשמים">
          <Wind className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {ward.ventilatedPatients}
          </span>
        </div>
        <div className="flex items-center gap-1" title="בידוד">
          <ShieldAlert className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {ward.isolationPatients}
          </span>
        </div>
        <div className="flex items-center gap-1" title="מועדים לנפילה">
          <Footprints className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {ward.fallRiskPatients}
          </span>
        </div>
        <div className="flex items-center gap-1" title="דחופים">
          <Siren className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {ward.urgentPatients}
          </span>
        </div>
        {ward.lastUpdated && (
          <div className="flex items-center gap-1 ms-auto" title="עדכון אחרון">
            <Clock className="h-3 w-3" />
            <span className="text-[10px]">
              {formatDistanceToNow(new Date(ward.lastUpdated), { locale: he })}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
