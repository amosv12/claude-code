export const CHAMBERS = ["House", "Senate"] as const;
export type Chamber = (typeof CHAMBERS)[number];

export const EVENT_TYPES = ["Floor", "Committee"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const STATUSES = ["Scheduled", "Tentative", "Expected"] as const;
export type EventStatus = (typeof STATUSES)[number];

export const CONFIDENCE_LEVELS = ["High", "Medium", "Low"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const FETCH_STATUSES = ["Success", "Failed", "Partial"] as const;
export type FetchStatus = (typeof FETCH_STATUSES)[number];

export const STATUS_COLORS: Record<EventStatus, { bg: string; text: string; dot: string }> = {
  Scheduled: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  Tentative: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  Expected: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
};

export const CHAMBER_COLORS: Record<Chamber, { bg: string; text: string }> = {
  House: { bg: "bg-blue-100", text: "text-blue-800" },
  Senate: { bg: "bg-red-100", text: "text-red-800" },
};

export const HOUSE_COMMITTEES = [
  "Appropriations",
  "Armed Services",
  "Budget",
  "Education and the Workforce",
  "Energy and Commerce",
  "Financial Services",
  "Foreign Affairs",
  "Homeland Security",
  "Judiciary",
  "Natural Resources",
  "Oversight and Accountability",
  "Rules",
  "Science, Space, and Technology",
  "Transportation and Infrastructure",
  "Ways and Means",
  "Intelligence",
] as const;

export const SENATE_COMMITTEES = [
  "Appropriations",
  "Armed Services",
  "Banking, Housing, and Urban Affairs",
  "Budget",
  "Commerce, Science, and Transportation",
  "Energy and Natural Resources",
  "Environment and Public Works",
  "Finance",
  "Foreign Relations",
  "Health, Education, Labor, and Pensions",
  "Homeland Security and Governmental Affairs",
  "Judiciary",
  "Intelligence",
  "Rules and Administration",
  "Veterans' Affairs",
] as const;

export const OFFICIAL_SOURCES = {
  houseMajorityLeader: {
    name: "House Majority Leader",
    url: "https://www.majoritywhip.gov/floor-schedule/",
    description: "Official weekly House floor schedule",
  },
  houseCommittee: {
    name: "House Committee Schedule",
    url: "https://www.congress.gov/committee-schedule",
    description: "House committee hearings and markups",
  },
  senateFloor: {
    name: "Senate Floor Schedule",
    url: "https://www.senate.gov/legislative/schedule.htm",
    description: "Official Senate floor schedule",
  },
  senateHearings: {
    name: "Senate Hearings & Meetings",
    url: "https://www.senate.gov/committees/hearings_meetings.htm",
    description: "Senate committee hearings and meetings",
  },
} as const;
