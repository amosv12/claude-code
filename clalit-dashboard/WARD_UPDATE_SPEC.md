# Ward Expansion Update Specification

## 1. Update Ward Data (server/storage.ts)

Replace the current 8 wards with ALL of the following Hebrew wards. These are real Clalit/Soroka departments. Keep the existing data generation logic but expand it to work with all wards.

### Complete Ward List (from the hospital directory image)

```typescript
const WARDS: WardMaster[] = [
  // Row 1
  { wardCode: "ONCO", wardName: "אונקולוגיה", hospital: "Soroka Medical Center", specialty: "Oncology", totalBeds: 30, manager: "Dr. A. Cohen" },
  { wardCode: "URO", wardName: "אורולוגיה", hospital: "Soroka Medical Center", specialty: "Urology", totalBeds: 24, manager: "Dr. B. Levy" },
  { wardCode: "ORTHO", wardName: "אורתופדיה", hospital: "Soroka Medical Center", specialty: "Orthopedics", totalBeds: 32, manager: "Dr. C. Mizrahi" },
  { wardCode: "ALLERGY", wardName: "אלרגיה ואימונולוגיה קלינית", hospital: "Soroka Medical Center", specialty: "Allergy & Immunology", totalBeds: 16, manager: "Dr. D. Shapira" },
  { wardCode: "ENDO", wardName: "אנדוקרינולוגיה", hospital: "Soroka Medical Center", specialty: "Endocrinology", totalBeds: 18, manager: "Dr. E. Katz" },
  { wardCode: "ENT", wardName: "אף אוזן וגרון וניתוחי ראש וצוואר", hospital: "Soroka Medical Center", specialty: "ENT & Head/Neck Surgery", totalBeds: 22, manager: "Dr. F. Ben-David" },
  // Row 2
  { wardCode: "BLOOD_BANK", wardName: "בנק הדם - מחלקת שירותי הדם ואפרזיס", hospital: "Soroka Medical Center", specialty: "Blood Bank & Apheresis", totalBeds: 10, manager: "Dr. G. Alon" },
  { wardCode: "GENETICS", wardName: "גנטיקה", hospital: "Soroka Medical Center", specialty: "Genetics", totalBeds: 8, manager: "Dr. H. Dahan" },
  { wardCode: "GASTRO", wardName: "גסטרואנטרולוגיה", hospital: "Soroka Medical Center", specialty: "Gastroenterology", totalBeds: 26, manager: "Dr. I. Peretz" },
  { wardCode: "GERIATRIC", wardName: "גריאטריה", hospital: "Soroka Medical Center", specialty: "Geriatrics", totalBeds: 34, manager: "Dr. J. Avraham" },
  { wardCode: "IMAGING", wardName: "דימות", hospital: "Soroka Medical Center", specialty: "Imaging/Radiology", totalBeds: 12, manager: "Dr. K. Friedman" },
  { wardCode: "HEMATO", wardName: "המטולוגיה", hospital: "Soroka Medical Center", specialty: "Hematology", totalBeds: 24, manager: "Dr. L. Goldstein" },
  { wardCode: "ANESTHESIA", wardName: "הרדמה", hospital: "Soroka Medical Center", specialty: "Anesthesiology", totalBeds: 16, manager: "Dr. M. Biton" },
  // Row 3
  { wardCode: "TRANSPLANT", wardName: "מחלקת השתלות איברים", hospital: "Soroka Medical Center", specialty: "Organ Transplant", totalBeds: 14, manager: "Dr. N. Segal" },
  { wardCode: "ICU_GEN", wardName: "טיפול נמרץ כללי", hospital: "Soroka Medical Center", specialty: "General ICU", totalBeds: 20, manager: "Dr. O. Hadad" },
  { wardCode: "PARAMEDICAL", wardName: "יחידות פארא-רפואיות", hospital: "Soroka Medical Center", specialty: "Paramedical Units", totalBeds: 10, manager: "Dr. P. Levi" },
  { wardCode: "PEDIATRICS", wardName: "ילדים", hospital: "Soroka Medical Center", specialty: "Pediatrics", totalBeds: 36, manager: "Dr. Q. Marcus" },
  { wardCode: "LIVER", wardName: "כבד", hospital: "Soroka Medical Center", specialty: "Hepatology", totalBeds: 18, manager: "Dr. R. Sasson" },
  { wardCode: "SURGERY", wardName: "כירורגיה", hospital: "Soroka Medical Center", specialty: "General Surgery", totalBeds: 34, manager: "Dr. S. Yosef" },
  // Row 4
  { wardCode: "ER", wardName: "מיון (רפואה דחופה)", hospital: "Soroka Medical Center", specialty: "Emergency Medicine", totalBeds: 40, manager: "Dr. T. Azulay" },
  { wardCode: "LAB", wardName: "מערך המעבדות", hospital: "Soroka Medical Center", specialty: "Laboratory", totalBeds: 8, manager: "Dr. U. Harari" },
  { wardCode: "PSYCH_SVC", wardName: "השירות הפסיכולוגי", hospital: "Soroka Medical Center", specialty: "Psychology Service", totalBeds: 12, manager: "Dr. V. Naor" },
  { wardCode: "DAVIDOFF", wardName: "מרכז דוידוף לסרטן", hospital: "Soroka Medical Center", specialty: "Davidoff Cancer Center", totalBeds: 28, manager: "Dr. W. Stern" },
  { wardCode: "MEMORY", wardName: "מרפאת זיכרון", hospital: "Soroka Medical Center", specialty: "Memory Clinic", totalBeds: 10, manager: "Dr. X. Zilber" },
  { wardCode: "TRAVEL", wardName: "מרפאת מטיילים", hospital: "Soroka Medical Center", specialty: "Travel Medicine", totalBeds: 6, manager: "Dr. Y. Landau" },
  // Row 5
  { wardCode: "NEUROSURG", wardName: "נוירוכירורגיה", hospital: "Soroka Medical Center", specialty: "Neurosurgery", totalBeds: 22, manager: "Dr. Z. Oren" },
  { wardCode: "NEURO", wardName: "נוירולוגיה", hospital: "Soroka Medical Center", specialty: "Neurology", totalBeds: 26, manager: "Dr. AA. Baruch" },
  { wardCode: "VASC_SURG", wardName: "ניתוחי כלי דם", hospital: "Soroka Medical Center", specialty: "Vascular Surgery", totalBeds: 18, manager: "Dr. AB. Golan" },
  { wardCode: "CARDIAC_SURG", wardName: "ניתוחי לב וחזה", hospital: "Soroka Medical Center", specialty: "Cardiothoracic Surgery", totalBeds: 24, manager: "Dr. AC. Tal" },
  { wardCode: "NEPHRO", wardName: "נפרולוגיה ויתר לחץ דם", hospital: "Soroka Medical Center", specialty: "Nephrology & Hypertension", totalBeds: 22, manager: "Dr. AD. Shemesh" },
  { wardCode: "WOMEN", wardName: "נשים", hospital: "Soroka Medical Center", specialty: "OB/GYN", totalBeds: 36, manager: "Dr. AE. Romano" },
  { wardCode: "NURSING", wardName: "סיעוד (אחיות)", hospital: "Soroka Medical Center", specialty: "Nursing", totalBeds: 20, manager: "Dr. AF. Mor" },
  // Row 6
  { wardCode: "DERMA", wardName: "עור ומין", hospital: "Soroka Medical Center", specialty: "Dermatology", totalBeds: 14, manager: "Dr. AG. Ziv" },
  { wardCode: "OPHTHAL", wardName: "עיניים", hospital: "Soroka Medical Center", specialty: "Ophthalmology", totalBeds: 16, manager: "Dr. AH. Rubin" },
  { wardCode: "ORAL", wardName: "פה ולסת", hospital: "Soroka Medical Center", specialty: "Oral & Maxillofacial", totalBeds: 12, manager: "Dr. AI. Dvir" },
  { wardCode: "PLASTIC", wardName: "פלסטיקה וכוויות", hospital: "Soroka Medical Center", specialty: "Plastic Surgery & Burns", totalBeds: 20, manager: "Dr. AJ. Carmel" },
  { wardCode: "INTERNAL", wardName: "פנימית", hospital: "Soroka Medical Center", specialty: "Internal Medicine", totalBeds: 38, manager: "Dr. AK. Yaniv" },
  { wardCode: "PATHOLOGY", wardName: "פתולוגיה", hospital: "Soroka Medical Center", specialty: "Pathology", totalBeds: 6, manager: "Dr. AL. Elias" },
  { wardCode: "CARDIO", wardName: "קרדיולוגיה", hospital: "Soroka Medical Center", specialty: "Cardiology", totalBeds: 30, manager: "Dr. AM. Harel" },
  { wardCode: "RHEUMA", wardName: "ראומטולוגיה", hospital: "Soroka Medical Center", specialty: "Rheumatology", totalBeds: 14, manager: "Dr. AN. Shohat" },
  { wardCode: "PULMO", wardName: "ריאות", hospital: "Soroka Medical Center", specialty: "Pulmonology", totalBeds: 26, manager: "Dr. AO. Tamir" },
  // Row 7
  { wardCode: "NUCLEAR", wardName: "רפואה גרעינית - איזוטופים", hospital: "Soroka Medical Center", specialty: "Nuclear Medicine", totalBeds: 8, manager: "Dr. AP. Eyal" },
  { wardCode: "ER_DEPT", wardName: "רפואה דחופה (מיון)", hospital: "Soroka Medical Center", specialty: "Emergency Department", totalBeds: 40, manager: "Dr. AQ. Natan" },
  { wardCode: "FAMILY", wardName: "רפואת המשפחה", hospital: "Soroka Medical Center", specialty: "Family Medicine", totalBeds: 12, manager: "Dr. AR. Levy" },
  { wardCode: "SOCIAL", wardName: "שירות לעבודה סוציאלית", hospital: "Soroka Medical Center", specialty: "Social Work", totalBeds: 6, manager: "Dr. AS. Cohen" },
  { wardCode: "COMPLEMENT", wardName: "רפואה משלימה", hospital: "Soroka Medical Center", specialty: "Complementary Medicine", totalBeds: 10, manager: "Dr. AT. Sharon" },
  // Row 8
  { wardCode: "BREAST", wardName: "שד", hospital: "Soroka Medical Center", specialty: "Breast Center", totalBeds: 14, manager: "Dr. AU. Gal" },
  { wardCode: "INFECTIOUS", wardName: "מחלות זיהומיות", hospital: "Soroka Medical Center", specialty: "Infectious Disease", totalBeds: 22, manager: "Dr. AV. Maor" },
  { wardCode: "REHAB", wardName: "שיקום", hospital: "Soroka Medical Center", specialty: "Rehabilitation", totalBeds: 30, manager: "Dr. AW. Paz" },
];
```

IMPORTANT: When assigning IDs, do NOT duplicate the ER/ER_DEPT entries if they are the same in your context. Keep both as they appear in the original image (מיון (רפואה דחופה) and רפואה דחופה (מיון) are separate entries). Use id: serial starting from 1.

### Data Generation Adjustments
- The data generators should still work with all wards — they iterate over the WARDS array
- For wards with very small totalBeds (6-10), reduce admission/discharge volume proportionally (maybe 0-1 per day instead of 1-5)
- Keep the same logic for incidents, staffing, supplies, transfers etc but scale to all wards

## 2. New Ward Detail Page (client/src/pages/ward-detail.tsx)

Route: `/ward/:code` where `:code` is the wardCode.

This page shows a dedicated dashboard for a single ward. It should include:

### Layout:
- **Header**: Ward name (Hebrew) in large text, with specialty subtitle, ward code badge, and risk badge
- **KPI Row** (5 cards): Occupied Beds, Available Beds, Occupancy Rate, Staffing Coverage, Open Incidents
- **Two-column layout below KPIs**:
  - Left: Bed Grid — visual grid showing each bed as a small colored square/rectangle. Color by status: occupied (teal/primary), available (green), blocked (gray), cleaning (yellow), isolation (purple), maintenance (orange). Each bed shows its bed ID on hover via tooltip.
  - Right: Staffing Detail — small grouped bar chart showing planned vs actual for each shift (day/evening/night) for today
- **Bottom section: Two tables side by side (or stacked on smaller screens)**:
  - Recent Admissions: last 5 admissions for this ward (date, patient ref, source, type, priority)
  - Recent Incidents: last 5 incidents for this ward (date, type, severity badge, status badge, summary)

### Data fetching:
Use existing API endpoints with query parameters:
- `/api/kpi/current` then filter by wardCode
- `/api/beds?wardCode=X`
- `/api/staffing?date=TODAY` then filter by wardCode
- `/api/admissions?date=TODAY` then filter by wardCode (or get all, filter client-side)
- `/api/incidents` then filter by wardCode

### Back navigation:
A "Back to Overview" link/button at the top left.

## 3. Update Ward Cards to be Clickable

In `ward-card.tsx`, wrap the card in a clickable element that navigates to `/ward/${ward.wardCode}` using wouter's `useLocation`.

## 4. Update Sidebar (app-sidebar.tsx)

Add a "Ward Dashboard" section below the navigation group with:
- A searchable dropdown/select that lists all wards (Hebrew names)
- When a ward is selected, navigate to `/ward/WARD_CODE`
- Use the existing shadcn Select component
- Group or just list all wards alphabetically by Hebrew name

The sidebar should fetch wards from `/api/wards` on mount.

## 5. Update App.tsx

Add the new route:
```tsx
<Route path="/ward/:code" component={WardDetail} />
```

Update pageTitles to handle dynamic ward pages (use a fallback like "Ward Dashboard").

## 6. Important Notes
- All ward names MUST be in Hebrew as shown in the image
- The ward dropdown in the sidebar should show Hebrew names
- The ward detail page should display the Hebrew ward name prominently
- Keep all existing pages working — just expand the data to cover more wards
- The Overview page ward grid should now show all wards (use a scrollable grid or pagination if too many — maybe limit the overview to a configurable subset or show all in a 4-column grid with scroll)
- For the overview ward grid with 50 wards, consider showing only the top 12 most critical (by risk level) with a "View all wards" link that scrolls to show all, or just paginate them in rows of 4

## 7. Overview Page Ward Grid Update
Since there are now ~50 wards, modify the overview page:
- Show a "Ward Overview" section with a tab toggle: "At Risk" (default) showing only medium/high risk wards, and "All Wards" showing all
- Use Tabs from shadcn/ui
- "At Risk" tab: show only wards with medium or high risk
- "All Wards" tab: show all wards in the 4-column grid
- Each ward card is clickable and goes to the ward detail page
