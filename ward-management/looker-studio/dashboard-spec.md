# Looker Studio Dashboard Specification

## Hospital Ward Management — Operations Dashboard

### Data Source

- **Type:** Google Sheets
- **Source:** The main Ward Management operations spreadsheet
- **Connection:** Use the Looker Studio Google Sheets connector
- **Sheets to connect:**
  - `BedOccupancyTable`
  - `AdmissionsLog`
  - `DischargesLog`
  - `StaffingTable`
  - `IncidentsTable`
  - `ShortagesTable`
  - `KPI_Daily`
  - `Config` (for ward names and metadata)

---

## Dashboard Pages

### Page 1: Overview

The executive summary page provides a snapshot of current hospital operations.

**Scorecards (top row):**

| Metric | Source Field | Aggregation |
|--------|-------------|-------------|
| Total Beds | BedOccupancyTable — count of rows | COUNT |
| Occupancy % | BedOccupancyTable — status = "Occupied" / total | Calculated field |
| Admissions Today | AdmissionsLog — today's date filter | COUNT |
| Incidents Today | IncidentsTable — today's date filter | COUNT |

**Bar Chart — Occupancy by Ward:**
- Dimension: Ward Code (BedOccupancyTable)
- Metric: Count of beds where Status = "Occupied"
- Secondary metric: Total beds per ward
- Sort: Ward Code ascending
- Color: Use conditional formatting — red if occupancy > 90%

**Table — Recent Incidents:**
- Data source: IncidentsTable
- Columns: Date, Ward, Type, Severity, Description, Status
- Sort: Date descending
- Row limit: 10
- Conditional formatting: Severity "Critical" in red, "High" in orange

**Filters:**
- Date range control (default: today)
- Ward selector dropdown

---

### Page 2: Bed Management

Detailed view of bed status and occupancy trends.

**Heatmap / Pivot Table — Bed Status by Ward:**
- Rows: Ward Code
- Columns: Bed Status (Available, Occupied, Reserved, Maintenance)
- Values: Count of beds
- Color scale: Green (available) to red (occupied)

**Pie Chart — Bed Status Distribution:**
- Dimension: Bed Status
- Metric: Count of beds
- Colors: Available = green, Occupied = blue, Reserved = amber, Maintenance = grey

**Time Series — Occupancy Rate Over Time:**
- Data source: KPI_Daily
- X-axis: Date
- Y-axis: Occupancy Rate %
- Reference line at 85% (target) and 95% (critical threshold)
- Date range: Last 30 days (adjustable)

**Filters:**
- Date range control
- Ward selector dropdown

---

### Page 3: Patient Flow

Admission, discharge, and transfer analytics.

**Line Chart — Admissions vs. Discharges (30 days):**
- X-axis: Date
- Series 1: Count of admissions per day (blue)
- Series 2: Count of discharges per day (green)
- Smooth lines enabled
- Tooltip: Show exact counts

**Bar Chart — Transfers by Ward:**
- Dimension: Source Ward and Destination Ward
- Metric: Count of transfers
- Grouped bar chart
- Sort: Transfer count descending

**Stacked Bar Chart — Admission Sources:**
- X-axis: Date (grouped by week)
- Stacks: Admission source/type (Emergency, Scheduled, Transfer, etc.)
- Metric: Count of admissions
- Colors: Distinct for each source type

**Filters:**
- Date range control (default: last 30 days)
- Ward selector dropdown
- Admission source filter

---

### Page 4: Staffing

Nurse-to-patient ratios and staffing adequacy tracking.

**Grouped Bar Chart — Nurse-to-Patient Ratio by Ward & Shift:**
- Dimension: Ward Code
- Breakdown dimension: Shift (Day, Evening, Night)
- Metric: Nurse-to-patient ratio
- Reference line at target ratio (from Config)
- Conditional formatting: Below target in red

**Table — Staffing Shortages:**
- Data source: StaffingTable (filtered where actual < required)
- Columns: Ward, Shift, Required Staff, Actual Staff, Shortage, Date
- Sort: Shortage descending
- Conditional formatting: Shortages > 2 in red

**Trend Line — Ratio Over Time:**
- Data source: KPI_Daily
- X-axis: Date
- Y-axis: Average nurse-to-patient ratio
- Breakdown: By ward (multi-line)
- Date range: Last 30 days

**Filters:**
- Date range control
- Ward selector dropdown
- Shift selector

---

### Page 5: Incidents & Shortages

Safety incident tracking and supply/equipment shortage monitoring.

**Pie Chart — Incidents by Type:**
- Dimension: Incident Type (Fall, Medication Error, Equipment Failure, etc.)
- Metric: Count of incidents
- Sort: Count descending
- Show percentages on labels

**Bar Chart — Incidents by Severity:**
- Dimension: Severity level (Critical, High, Medium, Low)
- Metric: Count of incidents
- Colors: Critical = red, High = orange, Medium = yellow, Low = green
- Date range: Last 30 days

**Table — Active Supply Shortages:**
- Data source: ShortagesTable (filtered where Status = "Active")
- Columns: Item, Ward, Priority, Date Reported, Expected Resolution, Status
- Sort: Priority (Critical first), then Date Reported descending
- Conditional formatting: Priority "Critical" rows highlighted red

**Filters:**
- Date range control
- Ward selector dropdown
- Severity filter
- Shortage status filter

---

### Page 6: KPI Trends

Long-term operational metrics and performance tracking.

**Multi-Line Chart — Key KPIs Over 90 Days:**
- X-axis: Date
- Lines (selectable via metric selector):
  - Average occupancy rate
  - Average nurse-to-patient ratio
  - Daily admissions count
  - Daily discharges count
  - Incident count
  - Average length of stay
- Dual Y-axes: Percentages on left, counts on right

**Comparison Table — Week-over-Week:**
- Rows: KPI Name
- Columns: This Week, Last Week, Change (%), Trend Arrow
- Calculated field for % change: `(this_week - last_week) / last_week * 100`
- Conditional formatting: Positive changes in green, negative in red (reversed for negative KPIs like incidents)

**Scorecards with Sparklines:**
- 6 scorecard widgets, each showing:
  - Current value (large)
  - Sparkline of last 14 days
  - Comparison to prior period (delta %)
- KPIs: Occupancy %, Avg LOS, Admission Rate, Discharge Rate, Incident Rate, Staffing Adequacy

**Filters:**
- Date range control (default: last 90 days)
- Ward selector dropdown

---

## Global Filters

Apply the following controls to every page:

1. **Date Range Selector**
   - Type: Date range control
   - Default: Depends on page (today, 30 days, or 90 days as noted above)
   - Applies to the primary date field of each data source

2. **Ward Selector**
   - Type: Drop-down list or multi-select
   - Source: Config sheet — Ward Code column
   - Default: All wards
   - Applies to the Ward Code dimension across all components

---

## Setup Instructions

### Step 1: Create the Data Source

1. Open [Looker Studio](https://lookerstudio.google.com/)
2. Click **Create** > **Data source**
3. Select the **Google Sheets** connector
4. Choose the Ward Management spreadsheet
5. Select the first sheet (e.g., `BedOccupancyTable`)
6. Click **Connect**
7. Review field types — ensure dates are recognized as Date, numbers as Number
8. Click **Create Report** (or **Add to Report** if adding to existing)
9. Repeat for each additional sheet, or use **Blended Data** to join sheets

### Step 2: Create Calculated Fields

Create these calculated fields in the data source configuration:

```
Occupancy Rate = COUNTIF(Status, "Occupied") / COUNT(BedID) * 100

Admissions Today = COUNT(AdmissionID) [with date filter = TODAY()]

Net Patient Flow = COUNT(Admissions) - COUNT(Discharges)

Staffing Shortage = Required Staff - Actual Staff

Nurse Patient Ratio = Nurses on Duty / Patient Count
```

### Step 3: Build Report Pages

1. Click **Add a page** for each of the 6 pages described above
2. Rename each page according to the section headers
3. Add components (charts, tables, scorecards) as described
4. Configure each component's data source, dimensions, and metrics
5. Apply styling:
   - Header color: `#1a5276`
   - Accent color: `#e67e22`
   - Background: `#f7f9fb`
   - Font: Roboto or Arial

### Step 4: Add Filters

1. On each page, add a **Date range control** from the toolbar
2. Add a **Drop-down list** control:
   - Control field: Ward Code
   - Metric: None
   - Order: Ward Code ascending
3. Position filters consistently at the top of each page

### Step 5: Configure Sharing

1. Click **Share** in the top-right corner
2. Add viewers:
   - Ward managers (view only)
   - Operations leadership (view only)
   - Hospital administrators (view + edit)
3. Enable **Schedule email delivery** for weekly PDF snapshots:
   - Recipients: Operations leadership
   - Frequency: Weekly on Monday at 8:00 AM
   - Pages: All

### Step 6: Embed or Link

- Copy the report URL for bookmarking
- Use the **Embed** option to add the dashboard to an internal portal
- The dashboard auto-refreshes based on the Google Sheets data (typically every 15 minutes)

---

## Maintenance Notes

- **Data freshness:** Looker Studio caches Google Sheets data. Use the refresh icon or set cache to 1 hour for near-real-time data.
- **Adding wards:** When new wards are added to the Config sheet, the ward dropdown filter will automatically pick them up on next refresh.
- **Schema changes:** If columns are added or renamed in the spreadsheet, update the data source field configuration in Looker Studio to match.
- **Performance:** For spreadsheets exceeding 50,000 rows, consider using BigQuery as an intermediate data warehouse for better dashboard performance.
