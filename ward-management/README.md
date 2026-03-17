# Hospital Ward Management System

A Google Apps Script-based operational management system for hospital wards. Tracks bed occupancy, patient admissions and discharges, staffing levels, incidents, and supply shortages. Includes AI-powered briefings and trend analysis via the Claude API, automated KPI calculations, email alerts, and a Looker Studio dashboard specification.

---

## Architecture

```
Google Sheets (data store)
  ├── Config                  — Ward definitions, contacts, thresholds
  ├── BedOccupancyTable       — Real-time bed status per ward
  ├── AdmissionsLog           — Patient admission records
  ├── DischargesLog           — Patient discharge records
  ├── StaffingTable           — Shift staffing levels per ward
  ├── IncidentsTable          — Safety and operational incidents
  ├── ShortagesTable          — Supply and equipment shortages
  └── KPI_Daily               — Calculated daily KPI snapshots

Google Forms (data entry)
  ├── Admission Form
  ├── Discharge Form
  ├── Incident Report Form
  ├── Staffing Update Form
  ├── Shortage Report Form
  └── Transfer Form

Google Apps Script (logic)
  ├── src/
  │   ├── ai/
  │   │   ├── ClaudeClient.gs      — Claude API client
  │   │   ├── DailyBriefing.gs     — AI ward briefings
  │   │   ├── TrendDetection.gs    — AI trend analysis
  │   │   └── QandA.gs             — Natural language Q&A interface
  │   ├── triggers/
  │   │   └── TriggerSetup.gs      — Trigger installation & management
  │   ├── core/                    — Spreadsheet init, form creation, config
  │   ├── kpi/                     — KPI calculation modules
  │   └── handlers/                — Form submission handlers
  └── looker-studio/
      └── dashboard-spec.md        — Looker Studio dashboard specification

Looker Studio (visualization)
  └── Dashboard connected to Google Sheets
```

---

## Prerequisites

- **Google Workspace account** (Google Sheets, Forms, Apps Script, Gmail)
- **Claude API key** from [Anthropic](https://console.anthropic.com/) (required for AI features)
- **Looker Studio** access (free with Google account, for the dashboard)
- (Optional) **clasp** — Google's command-line tool for Apps Script, for local development

---

## Step-by-Step Setup

### 1. Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a new spreadsheet.
2. Rename it to **"Ward Management System"** (or your preferred name).
3. Note the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### 2. Open the Apps Script Editor

1. In the spreadsheet, go to **Extensions > Apps Script**.
2. The script editor opens in a new tab.
3. Remove any default `Code.gs` content.

### 3. Add the Script Files

#### Option A: Manual copy

1. In the Apps Script editor, create files matching the project structure:
   - `ClaudeClient.gs`
   - `DailyBriefing.gs`
   - `TrendDetection.gs`
   - `QandA.gs`
   - `TriggerSetup.gs`
   - (Plus any core, KPI, and handler files from the full project)
2. Copy the contents of each `.gs` file from this repository into the corresponding file in the editor.

#### Option B: Using clasp

```bash
# Install clasp globally
npm install -g @google/clasp

# Log in to your Google account
clasp login

# Clone the Apps Script project (get the script ID from the editor URL)
clasp clone <SCRIPT_ID>

# Copy files into the local project directory
cp src/ai/*.gs .
cp src/triggers/*.gs .

# Push to Apps Script
clasp push
```

### 4. Initialize the Spreadsheet

1. In the Apps Script editor, open the core initialization file.
2. Run the `initializeSpreadsheet()` function:
   - Select `initializeSpreadsheet` from the function dropdown.
   - Click **Run**.
   - Authorize the script when prompted.
3. This creates all required sheets with headers and formatting.

### 5. Create the Google Forms

1. Run the `createAllForms()` function from the script editor.
2. This programmatically creates all data entry forms and links their responses to the spreadsheet.
3. Share the form URLs with ward staff.

### 6. Set the Claude API Key

#### Option A: Via script function

1. In the Apps Script editor, run:
   ```javascript
   ClaudeClient.setApiKey('sk-ant-your-api-key-here');
   ```
2. Execute once, then **delete the key from the editor** (it is stored in Script Properties).

#### Option B: Via Script Properties UI

1. In the Apps Script editor, go to **Project Settings** (gear icon).
2. Scroll to **Script Properties**.
3. Click **Add script property**.
4. Property name: `CLAUDE_API_KEY`
5. Value: your Anthropic API key.
6. Click **Save**.

### 7. Install Triggers

1. Run the `installAllTriggers()` function from the script editor.
2. Authorize any additional permissions when prompted.
3. Verify by running `listTriggers()` — you should see:
   - 3 daily triggers (6:00 AM): morning summary, daily KPIs, AI briefings
   - 2 weekly triggers (Monday 7:00 AM): weekly KPIs, trend detection
   - 1 monthly trigger (1st at 7:00 AM): monthly KPIs
4. **Set up form-submit triggers manually** — see the instructions logged by `setFormTriggers()`.

### 8. Set Up Looker Studio Dashboard

1. See [`looker-studio/dashboard-spec.md`](looker-studio/dashboard-spec.md) for the full specification.
2. Follow the step-by-step Looker Studio setup instructions in that document.
3. Connect the dashboard to your Ward Management spreadsheet.

---

## Configuration

### Config Sheet

The `Config` sheet controls ward definitions, contacts, and thresholds. Columns:

| Column | Description |
|--------|-------------|
| A — Ward Code | Short identifier (e.g., `ICU`, `3A`, `ED`) |
| B — Ward Name | Full name (e.g., `Intensive Care Unit`) |
| C — Manager Email | Ward manager's email address |
| D — Charge Nurse Emails | Comma-separated charge nurse emails |
| E — Total Beds | Number of beds in the ward |
| F — Target Occupancy % | Target occupancy threshold (e.g., `85`) |
| G — Critical Occupancy % | Critical alert threshold (e.g., `95`) |
| H — Target Nurse Ratio | Target nurse-to-patient ratio (e.g., `1:4`) |

Add a row with Ward Code `LEADERSHIP` to define leadership email recipients for trend reports and escalation alerts.

### Customizing Wards

1. Add or remove rows in the `Config` sheet.
2. Run `initializeSpreadsheet()` again if structural changes are needed.
3. Triggers and AI briefings will automatically pick up the new ward list.

---

## Alert Email Setup

The system sends automated emails for:

- **Daily briefings** (6:00 AM) — AI-generated ward summaries to ward managers and charge nurses
- **Weekly trend reports** (Monday 7:00 AM) — AI trend analysis to leadership
- **Incident alerts** — Immediate email on critical/high-severity incident submissions
- **Staffing alerts** — When nurse-to-patient ratio falls below threshold
- **Occupancy alerts** — When ward occupancy exceeds critical threshold

Email recipients are configured in:
- `Config` sheet columns C and D (ward-level recipients)
- `LEADERSHIP` row in Config (leadership recipients)
- `LEADERSHIP_EMAILS` script property (fallback for leadership)

Ensure the script's authorized user has sufficient Gmail sending quota (typically 100/day for free accounts, 1,500/day for Workspace).

---

## Q&A Web App

The natural language Q&A interface can be deployed in two ways:

### As a Sidebar

Run `openQaSidebar()` from the script editor or attach it to a custom menu.

### As a Standalone Web App

1. In the Apps Script editor, click **Deploy > New deployment**.
2. Select type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone within [your organization]**.
5. Click **Deploy** and copy the web app URL.

---

## Troubleshooting

### "Claude API key not configured"

Run `ClaudeClient.setApiKey('your-key')` or add `CLAUDE_API_KEY` to Script Properties. Verify with `ClaudeClient.isConfigured()`.

### Triggers not firing

1. Run `listTriggers()` to verify triggers exist.
2. Check **Executions** in the Apps Script editor (left sidebar) for errors.
3. Ensure the script is authorized — run any function manually first.
4. Time-based triggers run in the project owner's timezone (set in `appsscript.json`).

### Email not sending

1. Check your Gmail sending quota at [Google Admin](https://admin.google.com/).
2. Verify recipient addresses in the Config sheet.
3. Check the **Executions** log for `MailApp` errors.
4. Sent emails may appear in the script owner's Sent folder.

### Form responses not appearing

1. Confirm forms are linked to the correct spreadsheet.
2. Check that form response destination sheets match expected names.
3. For form-submit triggers, verify they are installed (see `setFormTriggers()` instructions).

### Looker Studio shows stale data

1. Click the refresh icon in Looker Studio.
2. Reduce the data source cache duration to 1 hour.
3. Verify the Google Sheets connector is using the correct spreadsheet.

### Script exceeds execution time

Google Apps Script has a 6-minute execution limit. If a function times out:
1. Break large operations into smaller batches.
2. Use `PropertiesService` to store progress and resume in subsequent runs.
3. Consider processing wards sequentially with separate trigger invocations.

### Authorization errors

1. Run any function manually from the editor to trigger the authorization flow.
2. If permissions change, re-authorize by running the function again.
3. Check **Project Settings > OAuth Scopes** to see required permissions.

---

## File Reference

| File | Purpose |
|------|---------|
| `src/ai/ClaudeClient.gs` | Claude API client (call, configure, authenticate) |
| `src/ai/DailyBriefing.gs` | AI-generated daily ward briefings |
| `src/ai/TrendDetection.gs` | Weekly AI trend analysis |
| `src/ai/QandA.gs` | Natural language Q&A web app / sidebar |
| `src/triggers/TriggerSetup.gs` | Trigger installation and management |
| `looker-studio/dashboard-spec.md` | Looker Studio dashboard configuration guide |

---

## License

Internal use only. Consult your organization's policies before deploying in a production clinical environment.
