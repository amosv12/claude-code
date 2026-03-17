/**
 * SheetSetup.gs - Spreadsheet Structure Initialization
 * Hospital Ward Management System
 *
 * Creates all required tabs with proper column headers, populates
 * reference data, and writes default configuration values.
 */

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Creates (or verifies) every tab in the spreadsheet and populates
 * reference / config data.  Safe to run multiple times - existing
 * sheets are reused and never overwritten.
 */
function initializeSpreadsheet() {
  var ss = getSpreadsheet();

  // --- Raw form-response tabs -----------------------------------------------
  createOrGetSheet(ss, SHEET_NAMES.RAW_DAILY_SUMMARY, [
    'Timestamp', 'Date', 'Ward', 'Shift', 'SubmittedBy',
    'TotalPatientsStart', 'TotalPatientsEnd', 'BedsAvailable', 'KeyIssues'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.RAW_OPERATIONAL_UPDATES, [
    'Timestamp', 'Ward', 'SubmittedBy', 'Category', 'Priority',
    'Description', 'ActionTaken'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.RAW_ADMISSIONS, [
    'Timestamp', 'PatientID', 'PatientName', 'DOB', 'AdmissionDate',
    'AdmissionTime', 'Ward', 'BedNumber', 'AdmittingPhysician',
    'Diagnosis', 'Source', 'Acuity'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.RAW_DISCHARGES, [
    'Timestamp', 'PatientID', 'PatientName', 'DischargeDate',
    'DischargeTime', 'Ward', 'BedNumber', 'DischargingPhysician',
    'Disposition', 'LOS', 'Notes'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.RAW_TRANSFERS, [
    'Timestamp', 'PatientID', 'PatientName', 'TransferDate',
    'TransferTime', 'FromWard', 'FromBed', 'ToWard', 'ToBed',
    'Reason', 'RequestedBy', 'Status'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.RAW_BED_STATUS, [
    'Timestamp', 'Date', 'Ward', 'BedNumber', 'Status',
    'PatientID', 'UpdatedBy', 'Notes'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.RAW_STAFFING, [
    'Timestamp', 'Date', 'Ward', 'Shift', 'NursesScheduled',
    'NursesPresent', 'PhysiciansOnDuty', 'SupportStaff',
    'PatientToNurseRatio', 'Shortages', 'ReportedBy'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.RAW_INCIDENTS, [
    'Timestamp', 'Date', 'Time', 'Ward', 'Type', 'Severity',
    'Description', 'PatientsAffected', 'ActionTaken',
    'ReportedBy', 'EscalatedTo'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.RAW_SUPPLY_SHORTAGES, [
    'Timestamp', 'Date', 'Ward', 'Category', 'ItemName',
    'QtyNeeded', 'CurrentStock', 'Priority', 'Impact', 'ReportedBy'
  ]);

  // --- Validated / processed log tabs ---------------------------------------
  createOrGetSheet(ss, SHEET_NAMES.LOG_ADMISSIONS, [
    'ID', 'PatientID', 'PatientName', 'DOB', 'AdmissionDate',
    'AdmissionTime', 'Ward', 'Bed', 'Physician', 'Diagnosis',
    'Source', 'Acuity', 'ValidatedAt', 'Status'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.LOG_DISCHARGES, [
    'ID', 'PatientID', 'PatientName', 'DischargeDate',
    'DischargeTime', 'Ward', 'Bed', 'Physician', 'Disposition',
    'LOS', 'Notes', 'ValidatedAt'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.LOG_TRANSFERS, [
    'ID', 'PatientID', 'PatientName', 'TransferDate',
    'TransferTime', 'FromWard', 'FromBed', 'ToWard', 'ToBed',
    'Reason', 'RequestedBy', 'Status', 'ValidatedAt'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.LOG_BED_OCCUPANCY, [
    'Ward', 'BedNumber', 'Status', 'PatientID', 'LastUpdated', 'UpdatedBy'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.LOG_STAFFING, [
    'ID', 'Date', 'Ward', 'Shift', 'NursesScheduled',
    'NursesPresent', 'Physicians', 'SupportStaff', 'Ratio',
    'Shortages', 'ReportedBy', 'ValidatedAt'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.LOG_INCIDENTS, [
    'ID', 'Date', 'Time', 'Ward', 'Type', 'Severity',
    'Description', 'PatientsAffected', 'ActionTaken',
    'ReportedBy', 'EscalatedTo', 'ValidatedAt'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.LOG_SHORTAGES, [
    'ID', 'Date', 'Ward', 'Category', 'ItemName', 'QtyNeeded',
    'CurrentStock', 'Priority', 'Impact', 'ReportedBy', 'ValidatedAt'
  ]);

  // --- Reference data tab ---------------------------------------------------
  createOrGetSheet(ss, SHEET_NAMES.REF_WARD_MASTER, [
    'Code', 'Name', 'Floor', 'TotalBeds', 'Type'
  ]);
  populateWardMaster(ss);

  // --- KPI / reporting tabs -------------------------------------------------
  createOrGetSheet(ss, SHEET_NAMES.KPI_DAILY, [
    'Date', 'Ward', 'OccupancyRate', 'Admissions', 'Discharges',
    'Transfers', 'ALOS', 'NurseRatio', 'IncidentCount', 'ShortageCount'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.KPI_WEEKLY, [
    'WeekStartDate', 'WeekEndDate', 'Ward', 'AvgOccupancyRate',
    'TotalAdmissions', 'TotalDischarges', 'TotalTransfers',
    'AvgALOS', 'AvgNurseRatio', 'TotalIncidents', 'TotalShortages'
  ]);

  createOrGetSheet(ss, SHEET_NAMES.KPI_MONTHLY, [
    'Month', 'Year', 'Ward', 'AvgOccupancyRate', 'TotalAdmissions',
    'TotalDischarges', 'TotalTransfers', 'AvgALOS', 'AvgNurseRatio',
    'TotalIncidents', 'TotalShortages', 'PeakOccupancyDate',
    'PeakOccupancyRate'
  ]);

  // --- Config tab -----------------------------------------------------------
  createOrGetSheet(ss, SHEET_NAMES.CONFIG, [
    'Key', 'Value', 'Description'
  ]);
  populateDefaultConfig_(ss);

  // --- Error log tab --------------------------------------------------------
  createOrGetSheet(ss, SHEET_NAMES.ERROR_LOG, [
    'Timestamp', 'Source', 'Severity', 'Message', 'StackTrace', 'ResolvedAt'
  ]);

  Logger.log('initializeSpreadsheet: all tabs created / verified.');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns an existing sheet or creates a new one with the given headers.
 * If the sheet already exists it is returned as-is (headers are NOT
 * overwritten so that existing data is preserved).
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - The spreadsheet.
 * @param {string} name    - Tab name.
 * @param {string[]} headers - Column header values for row 1.
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The sheet.
 */
function createOrGetSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    return sheet;
  }

  sheet = ss.insertSheet(name);

  if (headers && headers.length > 0) {
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a86c8');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Populates the Ref_WardMaster tab from the global WARD_LIST array.
 * Existing data rows are cleared and rewritten so that the reference
 * table always matches the code-level definitions.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - The spreadsheet.
 */
function populateWardMaster(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.REF_WARD_MASTER);
  if (!sheet) {
    Logger.log('populateWardMaster: Ref_WardMaster sheet not found.');
    return;
  }

  // Clear everything below the header row.
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }

  if (WARD_LIST.length === 0) {
    return;
  }

  var data = WARD_LIST.map(function (w) {
    return [w.code, w.name, w.floor, w.totalBeds, w.type];
  });

  sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
}

/**
 * Writes default key-value pairs into the Config tab if they do not
 * already exist.  Existing keys are never overwritten.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - The spreadsheet.
 * @private
 */
function populateDefaultConfig_(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!sheet) {
    return;
  }

  var defaults = [
    ['CAPACITY_THRESHOLD',       '85',  'Bed-occupancy % that triggers capacity alerts'],
    ['STAFFING_RATIO_THRESHOLD', '6',   'Patient-to-nurse ratio that triggers staffing alerts'],
    ['ALERT_EMAILS',             '',    'Comma-separated list of email addresses for alerts'],
    ['CLAUDE_API_MODEL',         'claude-sonnet-4-20250514', 'Claude model identifier for API calls'],
    ['MAX_RETRY_ATTEMPTS',       '3',   'Maximum retry attempts for API calls'],
    ['LOG_RETENTION_DAYS',       '90',  'Number of days to retain error log entries'],
    ['DAILY_REPORT_HOUR',        '7',   'Hour (0-23) to send the daily summary report'],
    ['TIMEZONE',                 'America/New_York', 'Timezone for date/time calculations']
  ];

  // Read existing keys to avoid duplicates.
  var existing = {};
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    existing[String(data[i][0]).trim()] = true;
  }

  var rowsToAppend = [];
  for (var j = 0; j < defaults.length; j++) {
    if (!existing[defaults[j][0]]) {
      rowsToAppend.push(defaults[j]);
    }
  }

  if (rowsToAppend.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length)
      .setValues(rowsToAppend);
  }
}
