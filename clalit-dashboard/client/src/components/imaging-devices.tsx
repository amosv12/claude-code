import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Scan } from "lucide-react";
import type { ImagingDevice, ImagingDeviceStatus } from "@shared/schema";

const STATUS_CONFIG: Record<ImagingDeviceStatus, { color: string; dotClass: string }> = {
  "זמין": {
    color: "text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  "לא זמין": {
    color: "text-red-600 dark:text-red-400",
    dotClass: "bg-red-500 animate-pulse",
  },
  "ידני": {
    color: "text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  "לא קיים": {
    color: "text-muted-foreground",
    dotClass: "bg-gray-400",
  },
};

interface ImagingDevicesProps {
  className?: string;
}

export function ImagingDevices({ className }: ImagingDevicesProps) {
  const { data: devices, isLoading } = useQuery<ImagingDevice[]>({
    queryKey: ["/api/imaging"],
  });

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  const counts = {
    "זמין": devices?.filter((d) => d.status === "זמין").length ?? 0,
    "לא זמין": devices?.filter((d) => d.status === "לא זמין").length ?? 0,
    "ידני": devices?.filter((d) => d.status === "ידני").length ?? 0,
    "לא קיים": devices?.filter((d) => d.status === "לא קיים").length ?? 0,
  };

  return (
    <Card className={className} data-testid="imaging-devices">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Scan className="h-4 w-4 text-muted-foreground" />
          מכשירי הדמיה ומעבדות
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center gap-4 mb-3 flex-wrap text-xs">
          {(["זמין", "ידני", "לא זמין", "לא קיים"] as ImagingDeviceStatus[]).map((level) => {
            const cfg = STATUS_CONFIG[level];
            const count = counts[level];
            if (count === 0 && level !== "זמין") return null;
            return (
              <div key={level} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
                <span className={`font-semibold ${cfg.color}`} style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
                  {count}
                </span>
                <span className="text-muted-foreground">{level}</span>
              </div>
            );
          })}
        </div>

        {/* Device list */}
        <div className="space-y-0">
          {devices?.map((d) => {
            const cfg = STATUS_CONFIG[d.status];
            return (
              <div
                key={d.name}
                className="flex items-center justify-between py-2 border-b last:border-0 border-border/50"
                data-testid={`imaging-${d.name}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dotClass}`} />
                  <span className={`text-sm ${d.status !== "זמין" ? `${cfg.color} font-medium` : ""}`}>
                    {d.name}
                  </span>
                </div>
                <span className={`text-xs font-semibold ${cfg.color}`}>
                  {d.status}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
