import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor } from "lucide-react";
import type { SystemStatus, SystemStatusLevel } from "@shared/schema";

const STATUS_CONFIG: Record<SystemStatusLevel, { color: string; dotClass: string; label: string }> = {
  "תקין": {
    color: "text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    label: "תקין",
  },
  "מושבת/מנותק": {
    color: "text-red-600 dark:text-red-400",
    dotClass: "bg-red-500 animate-pulse",
    label: "מושבת/מנותק",
  },
  "נפגע": {
    color: "text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500 animate-pulse",
    label: "נפגע",
  },
  "שיקום": {
    color: "text-blue-600 dark:text-blue-400",
    dotClass: "bg-blue-500",
    label: "שיקום",
  },
};

interface SystemsStatusProps {
  compact?: boolean;
  className?: string;
}

export function SystemsStatus({ compact = false, className }: SystemsStatusProps) {
  const { data: systems, isLoading } = useQuery<SystemStatus[]>({
    queryKey: ["/api/systems"],
  });

  if (isLoading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  const counts = {
    "תקין": systems?.filter((s) => s.status === "תקין").length ?? 0,
    "מושבת/מנותק": systems?.filter((s) => s.status === "מושבת/מנותק").length ?? 0,
    "נפגע": systems?.filter((s) => s.status === "נפגע").length ?? 0,
    "שיקום": systems?.filter((s) => s.status === "שיקום").length ?? 0,
  };
  const total = systems?.length ?? 0;

  const summaryRow = (
    <div className="flex items-center gap-4 flex-wrap">
      {(["תקין", "נפגע", "שיקום", "מושבת/מנותק"] as SystemStatusLevel[]).map((level) => {
        const cfg = STATUS_CONFIG[level];
        const count = counts[level];
        if (count === 0 && level !== "תקין") return null;
        return (
          <div key={level} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
            <span className={`text-sm font-semibold ${cfg.color}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
              {count}
            </span>
            <span className="text-xs text-muted-foreground">{cfg.label}</span>
          </div>
        );
      })}
      {!compact && <span className="text-xs text-muted-foreground">({total} מערכות)</span>}
    </div>
  );

  const listItems = (systems ?? []).map((s) => {
    const cfg = STATUS_CONFIG[s.status];
    return (
      <div
        key={s.name}
        className="flex items-center justify-between py-2 border-b last:border-0 border-border/50"
        data-testid={`system-${s.name}`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dotClass}`} />
          <span className={`text-sm ${s.status !== "תקין" ? `${cfg.color} font-medium` : ""}`}>
            {s.name}
          </span>
        </div>
        <span className={`text-xs font-semibold ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>
    );
  });

  if (compact) {
    return (
      <Card className={className} data-testid="systems-status-compact">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            מערכות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3">{summaryRow}</div>
          <div>{listItems}</div>
        </CardContent>
      </Card>
    );
  }

  // Full page view
  return (
    <div className={className} data-testid="systems-status-full">
      <div className="mb-4">{summaryRow}</div>
      <Card>
        <CardContent className="pt-4">
          <div>{listItems}</div>
        </CardContent>
      </Card>
    </div>
  );
}
