# Clalit Ward Operations Dashboard - Frontend Build Spec

## Overview
Hospital operations dashboard for Clalit Health Services (Israel). 5-page dashboard with sidebar navigation, dark mode, recharts visualizations. Teal/medical color scheme already configured in index.css.

## Font
Add Inter from Google Fonts CDN to `client/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Tech Stack
- React + TypeScript + Tailwind CSS v3 + shadcn/ui components
- Recharts for charts
- Lucide React icons
- Wouter with useHashLocation for routing
- TanStack React Query for data fetching (default queryFn already configured)
- date-fns for date formatting
- framer-motion for subtle animations

## API Endpoints (all GET)
- `/api/stats/overview` - aggregate KPIs (totalBeds, occupiedBeds, availableBeds, occupancyRate, admissionsToday, dischargesToday, transfersPending, delayedDischarges, openIncidents, openShortages, avgStaffingCoverage, highRiskWards, mediumRiskWards, totalWards)
- `/api/kpi/current` - per-ward KPI array
- `/api/wards` - ward master data
- `/api/beds?wardCode=X` - bed data
- `/api/admissions?date=YYYY-MM-DD` - admissions (all 7 days if no date)
- `/api/discharges?date=YYYY-MM-DD` - discharges
- `/api/transfers?date=YYYY-MM-DD` - transfers
- `/api/staffing?date=YYYY-MM-DD` - staffing logs
- `/api/incidents?status=open` - incidents
- `/api/supplies?status=open` - supply requests
- `/api/daily-summaries?date=YYYY-MM-DD` - daily summaries
- `/api/trends/admissions?days=7` - admission trend data
- `/api/trends/discharges?days=7` - discharge trend data
- `/api/trends/occupancy?days=7` - occupancy trend data

## Architecture

### App.tsx Setup
- SidebarProvider with custom width --sidebar-width: "16rem"
- Sidebar on left, main content scrollable on right
- Top header bar with SidebarTrigger, page title, dark mode toggle, and "Updated Xm ago" text
- useHashLocation for routing
- 5 routes: /, /capacity, /staffing, /incidents, /executive

### Dark Mode
- Use useState seeded from window.matchMedia("(prefers-color-scheme: dark)")
- Toggle "dark" class on document.documentElement
- Simple moon/sun icon button in the header

### Sidebar Component (components/app-sidebar.tsx)
- Clalit logo SVG at top (medical cross + "Clalit Ops" text)
- Navigation group with 5 items, each with icon:
  1. Overview (LayoutDashboard icon) -> /
  2. Capacity & Beds (Bed icon or BedDouble) -> /capacity
  3. Staffing (Users icon) -> /staffing
  4. Incidents (AlertTriangle icon) -> /incidents
  5. Executive Summary (FileText icon) -> /executive
- Active state based on current hash location
- Bottom: "Soroka Medical Center" subtitle text in muted

### Shared Components

#### KpiCard (components/kpi-card.tsx)
A card showing a large number, label, optional delta with arrow, and optional sparkline.
Props: title, value, delta (optional, percentage), trend ("up"|"down"|"flat"), icon (LucideIcon), className
- Large bold value with tabular-nums
- Small muted title below
- Delta badge: green for positive/up, red for negative/down, gray for flat
- Icon in top right, muted color

#### RiskBadge (components/risk-badge.tsx)
Shows overload risk level as a colored badge.
Props: level ("low"|"medium"|"high")
- low: green background
- medium: amber/yellow background  
- high: red background
Use appropriate dark mode variants.

#### WardCard (components/ward-card.tsx)
A compact card for each ward showing key stats.
Props: ward KPI data
Shows: ward name, occupancy bar (colored by threshold), beds occupied/total, staffing coverage, open incidents, risk badge

## Pages

### Page 1: Overview (pages/overview.tsx) - Route: /
The main dashboard landing page.

**Top row: 7 KPI cards in a responsive grid (grid-cols-2 md:grid-cols-4 lg:grid-cols-7)**
1. Total Beds (value from totalBeds)
2. Occupied (occupiedBeds, delta shows occupancy %)
3. Available (availableBeds)
4. Admissions Today (admissionsToday)
5. Discharges Today (dischargesToday)
6. Open Incidents (openIncidents) - use destructive color if > 5
7. Avg Staffing (avgStaffingCoverage%) 

**Second row: Two charts side by side (grid-cols-1 lg:grid-cols-2)**
Left: Admissions & Discharges Trend (7 days) - AreaChart from recharts with two areas, one for admissions (teal) and one for discharges (terra/rust). Smooth curves. Custom tooltip.
Right: Occupancy Rate Trend (7 days) - LineChart, single teal line, with a red dashed reference line at 90% threshold. Area fill below.

**Third row: Ward Overview Grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)**
One WardCard per ward showing occupancy, staffing, incidents, risk. Click to see details (just a tooltip or expand for now).

**Fourth row: Overload Risk Summary**
A horizontal bar or card row showing how many wards are at high/medium/low risk. Use colored segments.

### Page 2: Capacity & Beds (pages/capacity.tsx) - Route: /capacity
**Top: Filter bar** - Ward selector dropdown (all wards + individual), Date picker (optional)

**KPI row: 5 cards**
- Total Beds, Occupied, Available, Blocked, Transfers Pending

**Main area: Two columns (lg:grid-cols-2)**
Left: Ward Comparison Bar Chart - Horizontal bar chart showing occupancy rate per ward, sorted descending. Bars colored by threshold (green <80%, amber 80-90%, red >90%). Use recharts BarChart horizontal.
Right: Bed Status Breakdown - Stacked bar chart showing bed status categories per ward (occupied, available, blocked, cleaning, isolation, maintenance). Use distinct colors from chart palette.

**Bottom: Transfer Flow**
A table showing recent transfers: source ward, destination ward, patient ref, status, reason. Use shadcn Table with sticky headers. Badge for status (requested=yellow, approved=blue, completed=green, canceled=gray).

### Page 3: Staffing (pages/staffing.tsx) - Route: /staffing
**Top: Filter bar** - Ward selector, Shift selector (all/day/evening/night)

**KPI row: 4 cards**
- Avg Coverage %, Wards Below Target, Total Staff On Duty, Agency Staff Count

**Main chart: Planned vs Actual Staffing**
Grouped bar chart per ward showing planned (lighter shade) vs actual (darker shade) nurses. Show gap visually. Use recharts BarChart.

**Second chart: Nurse-to-Patient Ratio by Ward**
Horizontal bar chart. Red reference line at the target ratio (e.g., 6:1). Wards exceeding threshold highlighted in red.

**Bottom: Staffing Detail Table**
Table with columns: Ward, Shift, Planned, Actual, Coverage %, Absent, Agency, Physician Coverage, Risk Flag (badge). Sort by coverage ascending to surface problems first. Use shadcn Table.

### Page 4: Incidents & Shortages (pages/incidents.tsx) - Route: /incidents
**Top row: 4 KPI cards**
- Open Incidents, High Severity, Escalations Required, Open Shortages

**Left column (lg:grid-cols-2): Incidents**
- Incidents by Severity: Donut/PieChart (low=green, medium=amber, high=orange, critical=red)
- Incidents by Type: Horizontal bar chart (fall, medication_error, equipment_failure, infection_control, other)
- Incidents Table: Recent incidents sorted by timestamp desc. Columns: ID, Ward, Type, Severity (badge), Status (badge), Summary (truncated), Team. Badge colors: open=red, in_progress=amber, resolved=green.

**Right column: Shortages**
- Shortages by Category: Donut/PieChart (PPE, medication, equipment, linen, other)
- Shortages Table: Ward, Item, Category, Urgency (badge), Quantity, Status (badge)

### Page 5: Executive Summary (pages/executive.tsx) - Route: /executive
**Header: Date and shift context**

**Top: 3 "attention" cards showing the most critical items:**
1. Highest Pressure Ward - show ward name, occupancy, staffing gap, risk level
2. Delayed Discharges - count and top reason
3. Escalation Count - incidents requiring escalation

**Middle: Ward Risk Heatmap/Table**
A styled table showing all wards with columns: Ward, Occupancy, Staffing, Incidents, Shortages, Risk Level. Each numeric cell has conditional coloring (green/amber/red based on thresholds). Risk level uses RiskBadge. Sort by risk level desc.

**Bottom: Daily Trends Summary**
Two small charts side by side:
- Admissions vs Discharges (7-day bar chart)
- Occupancy Rate trend with 90% line

**Footer: Action Items List**
A list of automatically generated action items based on data:
- Wards with occupancy > 90%: "Ward X at Y% occupancy - consider overflow protocol"
- Wards with staffing < 80%: "Ward X staffing at Y% - arrange coverage"  
- Open high-severity incidents: "N high-severity incidents require attention"
- Unresolved shortages: "N supply requests pending resolution"

## Design Rules
- Use `font-variant-numeric: tabular-nums lining-nums` on all numbers
- All charts: Recharts with custom theming using CSS variables (hsl(var(--chart-1)) etc.)
- Dashboard layout: full viewport, no body scroll. Only main area scrolls.
- Cards use the shadcn Card component
- Responsive: works from 1024px+ desktop, degrades gracefully to tablet
- Use skeleton loaders (from shadcn) while data loads
- Keep copy short and scannable per dashboard rules
- No emoji anywhere
- Badge for status values, not plain text
- Maximum 5-7 KPI cards visible per row
- Data-testid on all interactive elements

## File Structure
```
client/src/
  App.tsx
  components/
    app-sidebar.tsx
    kpi-card.tsx
    risk-badge.tsx
    ward-card.tsx
    theme-toggle.tsx
    PerplexityAttribution.tsx (already exists)
  pages/
    overview.tsx
    capacity.tsx
    staffing.tsx
    incidents.tsx
    executive.tsx
    not-found.tsx (already exists)
  hooks/
    use-mobile.tsx (already exists)
    use-toast.ts (already exists)
  lib/
    queryClient.ts (already exists)
    utils.ts (already exists)
```
