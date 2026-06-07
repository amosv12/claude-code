import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Hospital } from "@shared/schema";
import { useDateContext } from "./useDateContext";

/**
 * Extracts hospital context from the current URL.
 * Returns hospitalCode, hospitalName, and a query suffix to append to API URLs.
 */
export function useHospitalContext() {
  const [location] = useLocation();
  const match = location.match(/^\/hospital\/([^/]+)/);
  const hospitalCode = match ? match[1] : null;

  const { data: hospitals } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
    enabled: !!hospitalCode,
  });

  const hospital = hospitalCode
    ? hospitals?.find((h) => h.code === hospitalCode) ?? null
    : null;

  const { asOfDate } = useDateContext();

  // Build query-string suffix with hospital and asOfDate
  const qs = new URLSearchParams();
  if (hospital?.name) qs.set("hospital", hospital.name);
  if (asOfDate) qs.set("asOfDate", asOfDate);
  const querySuffix = qs.toString() ? `?${qs.toString()}` : "";

  return {
    hospitalCode,
    hospitalName: hospital?.name ?? null,
    hospital,
    /** Base path prefix for navigation links within this hospital context */
    basePath: hospitalCode ? `/hospital/${hospitalCode}` : "",
    /** Query string for API calls — includes hospital + asOfDate */
    querySuffix,
    asOfDate,
  };
}
