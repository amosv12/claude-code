import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HospitalOverviewData } from "@shared/schema";
import israelBoundary from "@/lib/israel-boundary.json";

const TYPE_COLORS: Record<string, string> = {
  "כללי": "#14b8a6",
  "פסיכיאטרי": "#a855f7",
  "שיקומי": "#3b82f6",
  "גריאטרי": "#f59e0b",
};

function markerSize(beds: number): number {
  if (beds > 800) return 18;
  if (beds > 500) return 15;
  if (beds > 200) return 12;
  return 9;
}

function createIcon(type: string, beds: number) {
  const color = TYPE_COLORS[type] ?? "#6b7280";
  const size = markerSize(beds);
  return L.divIcon({
    className: "",
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    popupAnchor: [0, -size],
    html: `<div style="
      width: ${size * 2}px;
      height: ${size * 2}px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      opacity: 0.9;
    "></div>`,
  });
}

interface HospitalMapProps {
  hospitals: HospitalOverviewData[];
  className?: string;
}

export function HospitalMap({ hospitals, className }: HospitalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!mapRef.current) return;

    // Israel bounds — restrict map to Israel only
    const israelBounds = L.latLngBounds(
      L.latLng(29.45, 34.25),  // southwest (Eilat area)
      L.latLng(33.35, 35.90),  // northeast (Golan area)
    );

    const map = L.map(mapRef.current, {
      center: [31.5, 34.85],
      zoom: 7,
      minZoom: 7,
      maxZoom: 14,
      maxBounds: israelBounds,
      maxBoundsViscosity: 1.0,
      zoomControl: true,
      attributionControl: true,
    });

    // Use CartoDB Positron — clean, muted tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // ── Mask everything outside Israel ──
    // Build a polygon with a large outer ring ("world") and Israel as inner hole(s)
    const worldRing: [number, number][] = [
      [-90, -180], [90, -180], [90, 180], [-90, 180], [-90, -180],
    ];

    const geom = (israelBoundary as any).geometry;
    // Collect Israel outer ring(s) as holes in the mask polygon
    const israelRings: [number, number][][] = [];
    if (geom.type === "Polygon") {
      // [lng, lat] → [lat, lng] for Leaflet
      const outerRing = geom.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
      israelRings.push(outerRing);
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        const outerRing = poly[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
        israelRings.push(outerRing);
      }
    }

    // Mask: outer ring is the world, inner rings are Israel's outline(s) — leaflet renders holes
    L.polygon([worldRing, ...israelRings], {
      color: "transparent",
      fillColor: "#e5e7eb",
      fillOpacity: 0.75,
      interactive: false,
      stroke: false,
    }).addTo(map);

    // Israel border outline on top
    L.geoJSON(israelBoundary as any, {
      style: {
        color: "#0f172a",
        weight: 1.5,
        fill: false,
        opacity: 0.6,
      },
      interactive: false,
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Add hospital markers
    hospitals.forEach((h) => {
      if (!h.lat || !h.lng) return;

      const icon = createIcon(h.type, h.totalBeds);
      const marker = L.marker([h.lat, h.lng], { icon }).addTo(map);

      const popupContent = `
        <div dir="rtl" style="font-family: Inter, sans-serif; min-width: 160px; font-size: 13px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${h.name}</div>
          <div style="color: #6b7280; font-size: 11px; margin-bottom: 6px;">${h.city} · ${h.type}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px 8px; font-variant-numeric: tabular-nums lining-nums;">
            <span style="color: #6b7280;">מיטות:</span><span style="font-weight: 600;">${h.totalBeds}</span>
            <span style="color: #6b7280;">תפוסה:</span><span style="font-weight: 600;">${h.occupancyRate}%</span>
            <span style="color: #6b7280;">מחלקות:</span><span style="font-weight: 600;">${h.totalWards}</span>
            <span style="color: #6b7280;">מונשמים:</span><span style="font-weight: 600;">${h.ventilatedPatients}</span>
          </div>
          <div style="margin-top: 8px; text-align: center;">
            <a href="javascript:void(0)" class="map-nav-link" data-code="${h.code}" style="
              color: #14b8a6; font-weight: 600; font-size: 12px; text-decoration: none;
            ">פתח לוח בקרה →</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 250 });
    });

    // Handle popup link clicks for navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("map-nav-link")) {
        const code = target.getAttribute("data-code");
        if (code) setLocation(`/hospital/${code}`);
      }
    };
    map.getContainer().addEventListener("click", handleClick);

    return () => {
      map.getContainer().removeEventListener("click", handleClick);
    };
  }, [hospitals, setLocation]);

  return (
    <div
      ref={mapRef}
      className={className}
      style={{ height: "100%", width: "100%", borderRadius: "var(--radius)" }}
      data-testid="hospital-map"
    />
  );
}
