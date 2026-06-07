import { type LucideIcon, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface KpiCardProps {
  title: string;
  value: number;
  delta?: number;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
  className?: string;
  suffix?: string;
}

function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => {
    if (suffix === "%") return v.toFixed(1);
    return Math.round(v).toLocaleString();
  });

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.8,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, motionVal]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

const trendColors = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  flat: "text-muted-foreground",
};

const TrendIcon = { up: ArrowUp, down: ArrowDown, flat: Minus };

export function KpiCard({
  title,
  value,
  delta,
  trend = "flat",
  icon: Icon,
  className,
  suffix,
}: KpiCardProps) {
  const TIcon = TrendIcon[trend];

  return (
    <Card
      className={cn("relative overflow-hidden p-4", className)}
      data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground leading-none">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight">
            <AnimatedNumber value={value} suffix={suffix} />
          </p>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      {delta !== undefined && (
        <div className={cn("mt-1 flex items-center gap-1 text-xs font-medium", trendColors[trend])}>
          <TIcon className="h-3 w-3" />
          <span style={{ fontVariantNumeric: "tabular-nums lining-nums" }}>
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        </div>
      )}
    </Card>
  );
}
