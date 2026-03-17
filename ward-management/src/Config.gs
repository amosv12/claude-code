/**
 * Config.gs - Global Configuration Module
 * Hospital Ward Management System
 *
 * Provides centralized configuration, ward definitions, and
 * spreadsheet access utilities for the entire application.
 */

/**
 * Ward definitions for the hospital.
 * Each entry describes a physical ward with its metadata.
 * @const {Array<Object>}
 */
var WARD_LIST = [
  { code: 'ICU',   name: 'Intensive Care Unit',  floor: 1, totalBeds: 20, type: 'Critical' },
  { code: 'MED1',  name: 'Medical Ward 1',       floor: 2, totalBeds: 30, type: 'Medical' },
  { code: 'MED2',  name: 'Medical Ward 2',       floor: 2, totalBeds: 30, type: 'Medical' },
  { code: 'SURG',  name: 'Surgical Ward',        floor: 3, totalBeds: 25, type: 'Surgical' },
  { code: 'PED',   name: 'Pediatric Ward',       floor: 4, totalBeds: 20, type: 'Pediatric' },
  { code: 'OB',    name: 'Obstetrics Ward',      floor: 4, totalBeds: 15, type: 'Obstetrics' },
  { code: 'ER',    name: 'Emergency Room',       floor: 1, totalBeds: 30, type: 'Emergency' },
  { code: 'ORTHO', name: 'Orthopedic Ward',      floor: 3, totalBeds: 20, type: 'Surgical' }
];

/**
 * Canonical sheet/tab name constants used throughout the application.
 * Always reference these instead of hard-coding tab names.
 * @const {Object<string, string>}
 */
var SHEET_NAMES = {
  // Raw form-response tabs
  RAW_DAILY_SUMMARY:       'Raw_DailySummary',
  RAW_OPERATIONAL_UPDATES: 'Raw_OperationalUpdates',
  RAW_ADMISSIONS:          'Raw_Admissions',
  RAW_DISCHARGES:          'Raw_Discharges',
  RAW_TRANSFERS:           'Raw_Transfers',
  RAW_BED_STATUS:          'Raw_BedStatus',
  RAW_STAFFING:            'Raw_Staffing',
  RAW_INCIDENTS:           'Raw_Incidents',
  RAW_SUPPLY_SHORTAGES:    'Raw_SupplyShortages',

  // Validated / processed log tabs
  LOG_ADMISSIONS:    'Log_Admissions',
  LOG_DISCHARGES:    'Log_Discharges',
  LOG_TRANSFERS:     'Log_Transfers',
  LOG_BED_OCCUPANCY: 'Log_BedOccupancy',
  LOG_STAFFING:      'Log_Staffing',
  LOG_INCIDENTS:     'Log_Incidents',
  LOG_SHORTAGES:     'Log_Shortages',

  // Reference data
  REF_WARD_MASTER: 'Ref_WardMaster',

  // KPI / reporting tabs
  KPI_DAILY:   'KPI_Daily',
  KPI_WEEKLY:  'KPI_Weekly',
  KPI_MONTHLY: 'KPI_Monthly',

  // System tabs
  CONFIG:    'Config',
  ERROR_LOG: 'Error_Log'
};

/**
 * Runtime configuration object.
 * Values are resolved lazily so the script can load without
 * side-effects when the spreadsheet is not yet available.
 * @const {Object}
 */
var CONFIG = {
  /** Placeholder - replace with actual Spreadsheet ID after creation. */
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',

  /** Claude API key stored securely in Script Properties. */
  get CLAUDE_API_KEY() {
    return PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY') || '';
  },

  /** Bed-occupancy percentage that triggers capacity alerts. */
  CAPACITY_THRESHOLD: 85,

  /** Patient-to-nurse ratio that triggers staffing alerts. */
  STAFFING_RATIO_THRESHOLD: 6,

  /**
   * Alert recipient email addresses.
   * Read from the Config sheet; falls back to an empty array.
   */
  get ALERT_EMAILS() {
    try {
      var raw = getConfig('ALERT_EMAILS');
      if (raw && raw.length > 0) {
        return raw.split(',').map(function (e) { return e.trim(); }).filter(Boolean);
      }
    } catch (err) {
      Logger.log('CONFIG.ALERT_EMAILS: unable to read from sheet - ' + err.message);
    }
    return [];
  }
};

// ---------------------------------------------------------------------------
// Spreadsheet helpers
// ---------------------------------------------------------------------------

/**
 * Opens and returns the main spreadsheet by its configured ID.
 * The result is cached for the lifetime of the current execution.
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  if (!getSpreadsheet._cache) {
    getSpreadsheet._cache = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  return getSpreadsheet._cache;
}

/**
 * Returns a specific sheet (tab) from the main spreadsheet.
 * @param {string} tabName - The name of the tab to retrieve.
 * @return {GoogleAppsScript.Spreadsheet.Sheet|null} The sheet, or null if not found.
 */
function getSheet(tabName) {
  return getSpreadsheet().getSheetByName(tabName);
}

// ---------------------------------------------------------------------------
// Config sheet read / write
// ---------------------------------------------------------------------------

/**
 * Reads a configuration value from the Config tab of the spreadsheet.
 * The Config tab is expected to have Key in column A and Value in column B.
 *
 * @param {string} key - The configuration key to look up.
 * @return {string} The value associated with the key, or an empty string if not found.
 */
function getConfig(key) {
  var sheet = getSheet(SHEET_NAMES.CONFIG);
  if (!sheet) {
    Logger.log('getConfig: Config sheet not found.');
    return '';
  }

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { // skip header row
    if (String(data[i][0]).trim() === String(key).trim()) {
      return String(data[i][1]);
    }
  }
  return '';
}

/**
 * Writes (or updates) a configuration value in the Config tab.
 * If the key already exists its value is overwritten; otherwise a new
 * row is appended.
 *
 * @param {string} key   - The configuration key.
 * @param {string} value - The value to store.
 */
function setConfig(key, value) {
  var sheet = getSheet(SHEET_NAMES.CONFIG);
  if (!sheet) {
    Logger.log('setConfig: Config sheet not found.');
    return;
  }

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(key).trim()) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }

  // Key does not exist yet - append a new row.
  sheet.appendRow([key, value, '']);
}
