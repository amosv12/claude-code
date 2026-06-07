import { createContext, useContext, useState, type ReactNode } from "react";

interface DateContextType {
  asOfDate: string | null; // YYYY-MM-DD or null for "now"
  setAsOfDate: (date: string | null) => void;
  isHistorical: boolean;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateContextProvider({ children }: { children: ReactNode }) {
  const [asOfDate, setAsOfDate] = useState<string | null>(null);

  return (
    <DateContext.Provider value={{
      asOfDate,
      setAsOfDate,
      isHistorical: asOfDate !== null,
    }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDateContext() {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error("useDateContext must be used within DateContextProvider");
  return ctx;
}

/**
 * Build a query string suffix for API calls that supports an asOfDate filter.
 * Usage: `/api/kpi/current${buildDateQuery(asOfDate, hospital)}`
 */
export function buildDateQuery(asOfDate: string | null, hospital?: string): string {
  const params = new URLSearchParams();
  if (hospital) params.set("hospital", hospital);
  if (asOfDate) params.set("asOfDate", asOfDate);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
