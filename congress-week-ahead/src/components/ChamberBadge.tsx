import { CHAMBER_COLORS } from "@/lib/constants";
import type { Chamber } from "@/lib/constants";

export default function ChamberBadge({ chamber }: { chamber: Chamber }) {
  const colors = CHAMBER_COLORS[chamber] || CHAMBER_COLORS.House;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {chamber}
    </span>
  );
}
