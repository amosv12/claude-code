import { STATUS_COLORS } from "@/lib/constants";
import type { EventStatus } from "@/lib/constants";

export default function StatusBadge({ status }: { status: EventStatus }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.Expected;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {status}
    </span>
  );
}
