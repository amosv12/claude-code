"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatDateShort } from "@/lib/dates";

interface WeekSelectorProps {
  currentWeek: string;
}

export default function WeekSelector({ currentWeek }: WeekSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigateWeek(offset: number) {
    const date = new Date(currentWeek + "T12:00:00");
    date.setDate(date.getDate() + offset * 7);
    const newWeek = date.toISOString().split("T")[0];
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", newWeek);
    router.push(`?${params.toString()}`);
  }

  const weekEnd = new Date(currentWeek + "T12:00:00");
  weekEnd.setDate(weekEnd.getDate() + 4);
  const endStr = weekEnd.toISOString().split("T")[0];

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigateWeek(-1)}
        className="btn-secondary px-3 py-1.5 text-sm"
      >
        &larr; Prev
      </button>
      <span className="text-sm font-medium text-slate-700">
        {formatDateShort(currentWeek)} – {formatDateShort(endStr)}
      </span>
      <button
        onClick={() => navigateWeek(1)}
        className="btn-secondary px-3 py-1.5 text-sm"
      >
        Next &rarr;
      </button>
    </div>
  );
}
