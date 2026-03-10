import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import type { CongressEvent, SourceLog } from "./types";
import { OFFICIAL_SOURCES } from "./constants";

const DB_PATH = path.join(process.cwd(), "db", "congress.db");

// Ensure db directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS congress_events (
    id TEXT PRIMARY KEY,
    chamber TEXT NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    committee_name TEXT,
    date TEXT NOT NULL,
    start_time_et TEXT,
    end_time_et TEXT,
    status TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_published_at TEXT,
    source_retrieved_at TEXT NOT NULL,
    location TEXT,
    bill_reference TEXT,
    notes TEXT,
    confidence_level TEXT NOT NULL,
    week_start_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS source_logs (
    id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    status TEXT NOT NULL,
    events_found INTEGER NOT NULL,
    notes TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_events_week ON congress_events(week_start_date);
  CREATE INDEX IF NOT EXISTS idx_events_chamber ON congress_events(chamber);
  CREATE INDEX IF NOT EXISTS idx_events_date ON congress_events(date);
  CREATE INDEX IF NOT EXISTS idx_events_type ON congress_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_source_logs_fetched ON source_logs(fetched_at);
`);

// Clear existing data
sqlite.exec("DELETE FROM congress_events");
sqlite.exec("DELETE FROM source_logs");

const WEEK_START = "2026-03-16";
const now = new Date().toISOString();

const events: CongressEvent[] = [
  // --- HOUSE FLOOR ---
  {
    id: uuid(), chamber: "House", eventType: "Floor",
    title: "Morning Hour Debate",
    description: "Members may speak for up to 5 minutes on any topic during Morning Hour. No legislative business conducted.",
    committeeName: null, date: "2026-03-16", startTimeET: "12:00", endTimeET: "14:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseMajorityLeader.name,
    sourceUrl: OFFICIAL_SOURCES.houseMajorityLeader.url, sourcePublishedAt: "2026-03-13T16:00:00Z",
    sourceRetrievedAt: now, location: "House Chamber", billReference: null,
    notes: "First votes expected no earlier than 6:30 PM", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Floor",
    title: "Consideration of H.R. 4521 — Secure Border Act of 2026",
    description: "General debate and amendment consideration of H.R. 4521, legislation to enhance border security measures and immigration enforcement.",
    committeeName: null, date: "2026-03-16", startTimeET: "18:30", endTimeET: null,
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseMajorityLeader.name,
    sourceUrl: OFFICIAL_SOURCES.houseMajorityLeader.url, sourcePublishedAt: "2026-03-13T16:00:00Z",
    sourceRetrievedAt: now, location: "House Chamber", billReference: "H.R. 4521",
    notes: "Structured rule expected from Rules Committee", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Floor",
    title: "Suspension Bills — Various Measures",
    description: "Consideration of several bills under suspension of the rules, including measures related to veteran healthcare and small business support.",
    committeeName: null, date: "2026-03-17", startTimeET: "12:00", endTimeET: "18:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseMajorityLeader.name,
    sourceUrl: OFFICIAL_SOURCES.houseMajorityLeader.url, sourcePublishedAt: "2026-03-13T16:00:00Z",
    sourceRetrievedAt: now, location: "House Chamber", billReference: null,
    notes: "6+ bills expected under suspension", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Floor",
    title: "Final Passage Vote — H.R. 4521 Secure Border Act",
    description: "Recorded vote on final passage of H.R. 4521 after completion of amendment process.",
    committeeName: null, date: "2026-03-17", startTimeET: "18:30", endTimeET: null,
    status: "Expected", sourceName: OFFICIAL_SOURCES.houseMajorityLeader.name,
    sourceUrl: OFFICIAL_SOURCES.houseMajorityLeader.url, sourcePublishedAt: "2026-03-13T16:00:00Z",
    sourceRetrievedAt: now, location: "House Chamber", billReference: "H.R. 4521",
    notes: null, confidenceLevel: "Medium", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Floor",
    title: "Consideration of H.R. 3298 — American Innovation and Technology Act",
    description: "Debate and votes on legislation to bolster U.S. semiconductor production and AI research funding.",
    committeeName: null, date: "2026-03-18", startTimeET: "10:00", endTimeET: null,
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseMajorityLeader.name,
    sourceUrl: OFFICIAL_SOURCES.houseMajorityLeader.url, sourcePublishedAt: "2026-03-13T16:00:00Z",
    sourceRetrievedAt: now, location: "House Chamber", billReference: "H.R. 3298",
    notes: "Open rule with multiple amendments expected", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Floor",
    title: "Possible Consideration of FY2027 Budget Resolution",
    description: "The House may take up the FY2027 budget resolution framework if the Budget Committee completes markup.",
    committeeName: null, date: "2026-03-19", startTimeET: null, endTimeET: null,
    status: "Tentative", sourceName: OFFICIAL_SOURCES.houseMajorityLeader.name,
    sourceUrl: OFFICIAL_SOURCES.houseMajorityLeader.url, sourcePublishedAt: "2026-03-13T16:00:00Z",
    sourceRetrievedAt: now, location: "House Chamber", billReference: "H.Con.Res. 25",
    notes: "Contingent on Budget Committee action", confidenceLevel: "Low", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Floor",
    title: "Last Votes of the Week",
    description: "Final series of recorded votes expected for the week. Members may depart after conclusion of votes.",
    committeeName: null, date: "2026-03-19", startTimeET: "15:00", endTimeET: null,
    status: "Expected", sourceName: OFFICIAL_SOURCES.houseMajorityLeader.name,
    sourceUrl: OFFICIAL_SOURCES.houseMajorityLeader.url, sourcePublishedAt: "2026-03-13T16:00:00Z",
    sourceRetrievedAt: now, location: "House Chamber", billReference: null,
    notes: "No votes expected on Friday", confidenceLevel: "Medium", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },

  // --- SENATE FLOOR ---
  {
    id: uuid(), chamber: "Senate", eventType: "Floor",
    title: "Senate Convenes — Executive Session",
    description: "The Senate will convene and resume consideration of executive nominations, including judicial nominees.",
    committeeName: null, date: "2026-03-16", startTimeET: "15:00", endTimeET: null,
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateFloor.name,
    sourceUrl: OFFICIAL_SOURCES.senateFloor.url, sourcePublishedAt: "2026-03-13T18:00:00Z",
    sourceRetrievedAt: now, location: "Senate Chamber", billReference: null,
    notes: "Roll call votes expected at 5:30 PM", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Floor",
    title: "Cloture Vote on S. 2187 — National Defense Authorization Act Amendments",
    description: "Vote on cloture to end debate on the motion to proceed to S. 2187, related to defense spending priorities.",
    committeeName: null, date: "2026-03-17", startTimeET: "12:00", endTimeET: null,
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateFloor.name,
    sourceUrl: OFFICIAL_SOURCES.senateFloor.url, sourcePublishedAt: "2026-03-13T18:00:00Z",
    sourceRetrievedAt: now, location: "Senate Chamber", billReference: "S. 2187",
    notes: null, confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Floor",
    title: "Debate on S. 2187 — NDAA Amendments Package",
    description: "Continued floor debate and amendment votes on the National Defense Authorization Act amendments.",
    committeeName: null, date: "2026-03-18", startTimeET: "10:00", endTimeET: null,
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateFloor.name,
    sourceUrl: OFFICIAL_SOURCES.senateFloor.url, sourcePublishedAt: "2026-03-13T18:00:00Z",
    sourceRetrievedAt: now, location: "Senate Chamber", billReference: "S. 2187",
    notes: "Multiple amendment votes expected throughout the day", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Floor",
    title: "Confirmation Vote — Nominee for U.S. Circuit Court",
    description: "Senate vote on the confirmation of the President's nominee to the U.S. Court of Appeals for the Fourth Circuit.",
    committeeName: null, date: "2026-03-18", startTimeET: "14:15", endTimeET: null,
    status: "Expected", sourceName: OFFICIAL_SOURCES.senateFloor.name,
    sourceUrl: OFFICIAL_SOURCES.senateFloor.url, sourcePublishedAt: "2026-03-13T18:00:00Z",
    sourceRetrievedAt: now, location: "Senate Chamber", billReference: null,
    notes: "Pending discharge from Judiciary Committee", confidenceLevel: "Medium", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Floor",
    title: "Final Passage Vote — S. 2187",
    description: "Recorded vote on final passage of S. 2187, the NDAA amendments package.",
    committeeName: null, date: "2026-03-19", startTimeET: "11:30", endTimeET: null,
    status: "Tentative", sourceName: OFFICIAL_SOURCES.senateFloor.name,
    sourceUrl: OFFICIAL_SOURCES.senateFloor.url, sourcePublishedAt: "2026-03-13T18:00:00Z",
    sourceRetrievedAt: now, location: "Senate Chamber", billReference: "S. 2187",
    notes: "Timing depends on completion of amendment votes", confidenceLevel: "Low", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },

  // --- HOUSE COMMITTEE ---
  {
    id: uuid(), chamber: "House", eventType: "Committee",
    title: "Hearing: Oversight of Federal AI Deployment",
    description: "The Committee on Science, Space, and Technology will hold a hearing examining federal agencies' use of artificial intelligence systems and algorithmic decision-making.",
    committeeName: "Science, Space, and Technology", date: "2026-03-16", startTimeET: "10:00", endTimeET: "13:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseCommittee.name,
    sourceUrl: OFFICIAL_SOURCES.houseCommittee.url, sourcePublishedAt: "2026-03-12T14:00:00Z",
    sourceRetrievedAt: now, location: "2318 Rayburn HOB", billReference: null,
    notes: "Witness list includes agency CIOs and AI researchers", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Committee",
    title: "Markup: H.R. 4102 — Wildfire Prevention and Recovery Act",
    description: "The Committee on Natural Resources will conduct a markup of H.R. 4102, addressing wildfire mitigation funding and forest management.",
    committeeName: "Natural Resources", date: "2026-03-16", startTimeET: "14:00", endTimeET: null,
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseCommittee.name,
    sourceUrl: OFFICIAL_SOURCES.houseCommittee.url, sourcePublishedAt: "2026-03-12T14:00:00Z",
    sourceRetrievedAt: now, location: "1324 Longworth HOB", billReference: "H.R. 4102",
    notes: null, confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Committee",
    title: "Hearing: State of U.S.-China Trade Relations",
    description: "The Ways and Means Committee will examine current trade tensions, tariff impacts, and trade policy options regarding the People's Republic of China.",
    committeeName: "Ways and Means", date: "2026-03-17", startTimeET: "10:00", endTimeET: "13:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseCommittee.name,
    sourceUrl: OFFICIAL_SOURCES.houseCommittee.url, sourcePublishedAt: "2026-03-12T14:00:00Z",
    sourceRetrievedAt: now, location: "1100 Longworth HOB", billReference: null,
    notes: "USTR expected to testify", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Committee",
    title: "Hearing: Protecting Children Online — Platform Accountability",
    description: "The Judiciary Committee examines Big Tech's compliance with child safety requirements and Section 230 reform proposals.",
    committeeName: "Judiciary", date: "2026-03-17", startTimeET: "14:00", endTimeET: "17:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseCommittee.name,
    sourceUrl: OFFICIAL_SOURCES.houseCommittee.url, sourcePublishedAt: "2026-03-12T14:00:00Z",
    sourceRetrievedAt: now, location: "2141 Rayburn HOB", billReference: "H.R. 3890",
    notes: "CEOs of major platforms invited to testify", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Committee",
    title: "Hearing: FY2027 Defense Budget Request",
    description: "The Armed Services Committee will receive testimony from the Secretary of Defense on the FY2027 defense budget request.",
    committeeName: "Armed Services", date: "2026-03-18", startTimeET: "10:00", endTimeET: "14:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseCommittee.name,
    sourceUrl: OFFICIAL_SOURCES.houseCommittee.url, sourcePublishedAt: "2026-03-12T14:00:00Z",
    sourceRetrievedAt: now, location: "2118 Rayburn HOB", billReference: null,
    notes: "Open hearing; classified session to follow", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Committee",
    title: "Subcommittee Hearing: Rural Broadband Expansion",
    description: "Energy and Commerce Subcommittee on Communications hearing on progress and challenges in rural broadband deployment.",
    committeeName: "Energy and Commerce", date: "2026-03-18", startTimeET: "14:00", endTimeET: "16:00",
    status: "Tentative", sourceName: OFFICIAL_SOURCES.houseCommittee.name,
    sourceUrl: OFFICIAL_SOURCES.houseCommittee.url, sourcePublishedAt: "2026-03-12T14:00:00Z",
    sourceRetrievedAt: now, location: "2123 Rayburn HOB", billReference: null,
    notes: "May be postponed due to floor schedule conflicts", confidenceLevel: "Medium", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Committee",
    title: "Markup: FY2027 Homeland Security Appropriations Bill",
    description: "The Appropriations Committee will mark up the FY2027 Homeland Security spending bill.",
    committeeName: "Appropriations", date: "2026-03-19", startTimeET: "10:00", endTimeET: null,
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.houseCommittee.name,
    sourceUrl: OFFICIAL_SOURCES.houseCommittee.url, sourcePublishedAt: "2026-03-12T14:00:00Z",
    sourceRetrievedAt: now, location: "2359 Rayburn HOB", billReference: null,
    notes: "Amendments process may extend into evening", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "House", eventType: "Committee",
    title: "Rules Committee Meeting — Rule for Budget Resolution",
    description: "The Rules Committee will meet to set the rule for House floor consideration of the FY2027 budget resolution.",
    committeeName: "Rules", date: "2026-03-19", startTimeET: "17:00", endTimeET: null,
    status: "Tentative", sourceName: OFFICIAL_SOURCES.houseCommittee.name,
    sourceUrl: OFFICIAL_SOURCES.houseCommittee.url, sourcePublishedAt: "2026-03-12T14:00:00Z",
    sourceRetrievedAt: now, location: "H-313, The Capitol", billReference: "H.Con.Res. 25",
    notes: "Subject to Budget Committee completing its markup", confidenceLevel: "Low", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },

  // --- SENATE COMMITTEE ---
  {
    id: uuid(), chamber: "Senate", eventType: "Committee",
    title: "Hearing: Nominations — Deputy Secretary of State",
    description: "The Senate Foreign Relations Committee will hold a confirmation hearing for the nominee to serve as Deputy Secretary of State.",
    committeeName: "Foreign Relations", date: "2026-03-16", startTimeET: "10:00", endTimeET: "13:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateHearings.name,
    sourceUrl: OFFICIAL_SOURCES.senateHearings.url, sourcePublishedAt: "2026-03-11T10:00:00Z",
    sourceRetrievedAt: now, location: "419 Dirksen SOB", billReference: null,
    notes: "Nominee submitted financial disclosures", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Committee",
    title: "Hearing: Medicare and Medicaid Oversight",
    description: "The Finance Committee will examine CMS operations, Medicare Advantage oversight, and Medicaid program integrity.",
    committeeName: "Finance", date: "2026-03-17", startTimeET: "10:00", endTimeET: "12:30",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateHearings.name,
    sourceUrl: OFFICIAL_SOURCES.senateHearings.url, sourcePublishedAt: "2026-03-11T10:00:00Z",
    sourceRetrievedAt: now, location: "215 Dirksen SOB", billReference: null,
    notes: "CMS Administrator expected to testify", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Committee",
    title: "Hearing: Cybersecurity Threats to Critical Infrastructure",
    description: "The Homeland Security Committee examines recent cyberattacks on water systems and energy grids, and federal response capabilities.",
    committeeName: "Homeland Security and Governmental Affairs", date: "2026-03-17", startTimeET: "14:30", endTimeET: "17:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateHearings.name,
    sourceUrl: OFFICIAL_SOURCES.senateHearings.url, sourcePublishedAt: "2026-03-11T10:00:00Z",
    sourceRetrievedAt: now, location: "342 Dirksen SOB", billReference: "S. 1890",
    notes: "CISA Director and NSA representatives invited", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Committee",
    title: "Markup: S. 2340 — Clean Energy Permitting Reform Act",
    description: "The Energy and Natural Resources Committee will conduct a markup of S. 2340 to streamline permitting for clean energy projects.",
    committeeName: "Energy and Natural Resources", date: "2026-03-18", startTimeET: "10:00", endTimeET: null,
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateHearings.name,
    sourceUrl: OFFICIAL_SOURCES.senateHearings.url, sourcePublishedAt: "2026-03-11T10:00:00Z",
    sourceRetrievedAt: now, location: "366 Dirksen SOB", billReference: "S. 2340",
    notes: "Bipartisan bill with 12 co-sponsors", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Committee",
    title: "Hearing: Social Media and Youth Mental Health",
    description: "The HELP Committee will hear testimony from researchers, parents, and advocates on the effects of social media on children's mental health.",
    committeeName: "Health, Education, Labor, and Pensions", date: "2026-03-18", startTimeET: "14:00", endTimeET: "17:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateHearings.name,
    sourceUrl: OFFICIAL_SOURCES.senateHearings.url, sourcePublishedAt: "2026-03-11T10:00:00Z",
    sourceRetrievedAt: now, location: "430 Dirksen SOB", billReference: "S. 1995",
    notes: null, confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Committee",
    title: "Hearing: Judicial Nominations",
    description: "The Judiciary Committee will hold hearings on pending judicial nominees for federal district courts.",
    committeeName: "Judiciary", date: "2026-03-19", startTimeET: "10:00", endTimeET: "13:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateHearings.name,
    sourceUrl: OFFICIAL_SOURCES.senateHearings.url, sourcePublishedAt: "2026-03-11T10:00:00Z",
    sourceRetrievedAt: now, location: "226 Dirksen SOB", billReference: null,
    notes: "Four nominees expected", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Committee",
    title: "Closed Briefing: Intelligence Assessment Update",
    description: "The Intelligence Committee will receive a classified briefing on current global threat assessments.",
    committeeName: "Intelligence", date: "2026-03-19", startTimeET: "14:00", endTimeET: "16:00",
    status: "Scheduled", sourceName: OFFICIAL_SOURCES.senateHearings.name,
    sourceUrl: OFFICIAL_SOURCES.senateHearings.url, sourcePublishedAt: "2026-03-11T10:00:00Z",
    sourceRetrievedAt: now, location: "SH-219, Capitol Visitor Center", billReference: null,
    notes: "Closed session — no public access", confidenceLevel: "High", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
  {
    id: uuid(), chamber: "Senate", eventType: "Committee",
    title: "Hearing: Banking Regulation and Fintech Oversight",
    description: "The Banking Committee will examine regulatory frameworks for cryptocurrency exchanges and digital banking services.",
    committeeName: "Banking, Housing, and Urban Affairs", date: "2026-03-20", startTimeET: "10:00", endTimeET: "12:30",
    status: "Tentative", sourceName: OFFICIAL_SOURCES.senateHearings.name,
    sourceUrl: OFFICIAL_SOURCES.senateHearings.url, sourcePublishedAt: "2026-03-11T10:00:00Z",
    sourceRetrievedAt: now, location: "538 Dirksen SOB", billReference: "S. 2100",
    notes: "Subject to witness availability", confidenceLevel: "Medium", weekStartDate: WEEK_START,
    createdAt: now, updatedAt: now,
  },
];

const sourceLogs: SourceLog[] = [
  {
    id: uuid(), sourceName: OFFICIAL_SOURCES.houseMajorityLeader.name,
    sourceUrl: OFFICIAL_SOURCES.houseMajorityLeader.url,
    fetchedAt: now, status: "Success", eventsFound: 7,
    notes: "Weekly schedule posted Friday afternoon. All floor items retrieved successfully.",
  },
  {
    id: uuid(), sourceName: OFFICIAL_SOURCES.houseCommittee.name,
    sourceUrl: OFFICIAL_SOURCES.houseCommittee.url,
    fetchedAt: now, status: "Success", eventsFound: 8,
    notes: "Committee schedules retrieved. Some subcommittee hearings marked tentative.",
  },
  {
    id: uuid(), sourceName: OFFICIAL_SOURCES.senateFloor.name,
    sourceUrl: OFFICIAL_SOURCES.senateFloor.url,
    fetchedAt: now, status: "Success", eventsFound: 5,
    notes: "Senate floor schedule retrieved. Thursday/Friday schedule not yet finalized.",
  },
  {
    id: uuid(), sourceName: OFFICIAL_SOURCES.senateHearings.name,
    sourceUrl: OFFICIAL_SOURCES.senateHearings.url,
    fetchedAt: now, status: "Partial", eventsFound: 8,
    notes: "Most hearings confirmed. One hearing (Banking Committee) pending witness confirmation.",
  },
];

// Insert events
const insertEvent = sqlite.prepare(`
  INSERT OR REPLACE INTO congress_events
  (id, chamber, event_type, title, description, committee_name, date, start_time_et, end_time_et,
   status, source_name, source_url, source_published_at, source_retrieved_at, location,
   bill_reference, notes, confidence_level, week_start_date, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertLog = sqlite.prepare(`
  INSERT OR REPLACE INTO source_logs
  (id, source_name, source_url, fetched_at, status, events_found, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertAllEvents = sqlite.transaction((items: CongressEvent[]) => {
  for (const e of items) {
    insertEvent.run(
      e.id, e.chamber, e.eventType, e.title, e.description, e.committeeName,
      e.date, e.startTimeET, e.endTimeET, e.status, e.sourceName, e.sourceUrl,
      e.sourcePublishedAt, e.sourceRetrievedAt, e.location, e.billReference,
      e.notes, e.confidenceLevel, e.weekStartDate, e.createdAt, e.updatedAt
    );
  }
});

const insertAllLogs = sqlite.transaction((items: SourceLog[]) => {
  for (const l of items) {
    insertLog.run(l.id, l.sourceName, l.sourceUrl, l.fetchedAt, l.status, l.eventsFound, l.notes);
  }
});

insertAllEvents(events);
insertAllLogs(sourceLogs);

console.log(`Seeded ${events.length} events and ${sourceLogs.length} source logs.`);

sqlite.close();
