"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CHAMBERS, EVENT_TYPES, STATUSES } from "@/lib/constants";

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeChamber = searchParams.get("chamber") || "";
  const activeType = searchParams.get("eventType") || "";
  const activeStatus = searchParams.get("status") || "";

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-sm font-medium text-slate-500 mr-1">Filter:</span>

      {/* Chamber filter */}
      <FilterChip
        label="All Chambers"
        active={!activeChamber}
        onClick={() => setFilter("chamber", "")}
      />
      {CHAMBERS.map((c) => (
        <FilterChip
          key={c}
          label={c}
          active={activeChamber === c}
          onClick={() => setFilter("chamber", activeChamber === c ? "" : c)}
        />
      ))}

      <span className="text-slate-300">|</span>

      {/* Event type filter */}
      <FilterChip
        label="All Types"
        active={!activeType}
        onClick={() => setFilter("eventType", "")}
      />
      {EVENT_TYPES.map((t) => (
        <FilterChip
          key={t}
          label={t}
          active={activeType === t}
          onClick={() => setFilter("eventType", activeType === t ? "" : t)}
        />
      ))}

      <span className="text-slate-300">|</span>

      {/* Status filter */}
      <FilterChip
        label="All Statuses"
        active={!activeStatus}
        onClick={() => setFilter("status", "")}
      />
      {STATUSES.map((s) => (
        <FilterChip
          key={s}
          label={s}
          active={activeStatus === s}
          onClick={() => setFilter("status", activeStatus === s ? "" : s)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`chip ${active ? "chip-active" : "chip-inactive"}`}
    >
      {label}
    </button>
  );
}
