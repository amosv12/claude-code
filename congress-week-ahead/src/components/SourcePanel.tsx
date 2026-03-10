import type { SourceLog } from "@/lib/types";

export default function SourcePanel({ logs }: { logs: SourceLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="card p-4 text-center text-sm text-slate-500">
        No source logs available.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="font-semibold text-slate-700 text-sm">Source Transparency Log</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-2 font-medium text-slate-600">Source</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Events</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Last Fetched</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Notes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <a
                    href={log.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-civic-blue hover:underline font-medium"
                  >
                    {log.sourceName}
                  </a>
                </td>
                <td className="px-4 py-2">
                  <FetchStatusBadge status={log.status} />
                </td>
                <td className="px-4 py-2 font-medium">{log.eventsFound}</td>
                <td className="px-4 py-2 text-slate-500">
                  {formatFetchTime(log.fetchedAt)}
                </td>
                <td className="px-4 py-2 text-slate-500 max-w-xs truncate">
                  {log.notes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FetchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Success: "bg-emerald-50 text-emerald-700",
    Failed: "bg-red-50 text-red-700",
    Partial: "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] || styles.Failed
      }`}
    >
      {status}
    </span>
  );
}

function formatFetchTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}
