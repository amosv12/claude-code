/**
 * KpiEngine — KPI calculation engine for hospital ward management.
 *
 * Calculates daily, weekly, and monthly KPIs per ward and writes them
 * to the KPI_Daily, KPI_Weekly, and KPI_Monthly sheets respectively.
 *
 * Sheet dependencies:
 *   - Ref_WardMaster        (ward list with TotalBeds column)
 *   - BedOccupancy          (Date, Ward, OccupiedBeds)
 *   - Log_Admissions        (Date, Ward, PatientID, …)
 *   - Log_Discharges        (Date, Ward, PatientID, AdmitDate, …)
 *   - Log_Transfers         (Date, FromWard, ToWard, …)
 *   - Staffing              (Date, Ward, Shift, NursesPresent, PatientsAssigned)
 *   - Log_Incidents         (Date, Ward, …)
 *   - Log_Shortages         (Date, Ward, …)
 *   - KPI_Daily             (output)
 *   - KPI_Weekly            (output)
 *   - KPI_Monthly           (output)
 *   - Config                (configuration key-value pairs)
 */

var KpiEngine = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  var SPREADSHEET_ID = null; // uses active spreadsheet when null

  /**
   * Return the active spreadsheet or the one identified by SPREADSHEET_ID.
   */
  function _ss() {
    if (SPREADSHEET_ID) {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  /**
   * Return all data rows (excluding header) from a sheet as 2-D array.
   */
  function _sheetData(sheetName) {
    var sheet = _ss().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) {
      return [];
    }
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  }

  /**
   * Return header row (first row) of a sheet as an array of strings.
   */
  function _headers(sheetName) {
    var sheet = _ss().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 1) {
      return [];
    }
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) {
      return String(h).trim();
    });
  }

  /**
   * Find the column index for a header name (case-insensitive).
   */
  function _colIndex(headers, name) {
    var lower = name.toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).toLowerCase() === lower) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Normalise a date to midnight (strip time component).
   */
  function _normaliseDate(d) {
    var dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  /**
   * Format date as YYYY-MM-DD string.
   */
  function _formatDate(d) {
    var dt = new Date(d);
    var yyyy = dt.getFullYear();
    var mm = ('0' + (dt.getMonth() + 1)).slice(-2);
    var dd = ('0' + dt.getDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
  }

  /**
   * Check whether two dates fall on the same calendar day.
   */
  function _sameDay(a, b) {
    var da = _normaliseDate(a);
    var db = _normaliseDate(b);
    return da.getTime() === db.getTime();
  }

  /**
   * Check whether date d is within [start, end] (inclusive, date-only).
   */
  function _inRange(d, start, end) {
    var t = _normaliseDate(d).getTime();
    return t >= _normaliseDate(start).getTime() && t <= _normaliseDate(end).getTime();
  }

  /**
   * Return the list of ward codes from Ref_WardMaster.
   */
  function _wardList() {
    var headers = _headers('Ref_WardMaster');
    var wardCol = _colIndex(headers, 'Ward');
    if (wardCol === -1) {
      wardCol = _colIndex(headers, 'WardCode');
    }
    if (wardCol === -1) {
      wardCol = 0; // fallback to first column
    }

    var data = _sheetData('Ref_WardMaster');
    var wards = [];
    for (var i = 0; i < data.length; i++) {
      var w = String(data[i][wardCol]).trim();
      if (w !== '' && w !== 'undefined') {
        wards.push(w);
      }
    }
    return wards;
  }

  /**
   * Return total beds for a ward from Ref_WardMaster.
   */
  function _totalBeds(ward) {
    var headers = _headers('Ref_WardMaster');
    var wardCol = _colIndex(headers, 'Ward');
    if (wardCol === -1) wardCol = _colIndex(headers, 'WardCode');
    if (wardCol === -1) wardCol = 0;

    var bedsCol = _colIndex(headers, 'TotalBeds');
    if (bedsCol === -1) bedsCol = _colIndex(headers, 'Beds');
    if (bedsCol === -1) bedsCol = 1;

    var data = _sheetData('Ref_WardMaster');
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][wardCol]).trim() === ward) {
        return Number(data[i][bedsCol]) || 0;
      }
    }
    return 0;
  }

  /**
   * Count occupied beds for a ward on a given date from BedOccupancy sheet.
   */
  function _occupiedBeds(ward, date) {
    var headers = _headers('BedOccupancy');
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, 'Ward');
    var bedsCol = _colIndex(headers, 'OccupiedBeds');
    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;
    if (bedsCol === -1) bedsCol = 2;

    var data = _sheetData('BedOccupancy');
    for (var i = data.length - 1; i >= 0; i--) {
      if (String(data[i][wardCol]).trim() === ward && _sameDay(data[i][dateCol], date)) {
        return Number(data[i][bedsCol]) || 0;
      }
    }
    return 0;
  }

  /**
   * Count events (admissions, discharges, etc.) for a ward on a date.
   * @param {string} sheetName - Name of the log sheet.
   * @param {string} ward - Ward code.
   * @param {Date} date - Target date.
   * @param {string} [wardHeader] - Optional override for the ward column name.
   */
  function _countEvents(sheetName, ward, date, wardHeader) {
    var headers = _headers(sheetName);
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, wardHeader || 'Ward');
    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;

    var data = _sheetData(sheetName);
    var count = 0;
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][wardCol]).trim() === ward && _sameDay(data[i][dateCol], date)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Count events for a ward in a date range (inclusive).
   */
  function _countEventsRange(sheetName, ward, startDate, endDate, wardHeader) {
    var headers = _headers(sheetName);
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, wardHeader || 'Ward');
    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;

    var data = _sheetData(sheetName);
    var count = 0;
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][wardCol]).trim() === ward && _inRange(data[i][dateCol], startDate, endDate)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Calculate Average Length of Stay from discharges in the last N days.
   * Uses AdmitDate and Date (discharge date) columns in Log_Discharges.
   */
  function _calculateALOS(ward, referenceDate, lookbackDays) {
    lookbackDays = lookbackDays || 30;
    var headers = _headers('Log_Discharges');
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, 'Ward');
    var admitCol = _colIndex(headers, 'AdmitDate');
    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;
    if (admitCol === -1) admitCol = _colIndex(headers, 'AdmissionDate');
    if (admitCol === -1) admitCol = 3;

    var startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - lookbackDays);

    var data = _sheetData('Log_Discharges');
    var totalDays = 0;
    var count = 0;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (String(row[wardCol]).trim() !== ward) continue;

      var dischargeDate = _normaliseDate(row[dateCol]);
      if (!_inRange(dischargeDate, startDate, referenceDate)) continue;

      var admitDate = _normaliseDate(row[admitCol]);
      if (isNaN(admitDate.getTime())) continue;

      var los = (dischargeDate.getTime() - admitDate.getTime()) / (1000 * 60 * 60 * 24);
      if (los < 0) continue; // skip invalid records
      totalDays += los;
      count++;
    }

    return count > 0 ? Math.round((totalDays / count) * 100) / 100 : 0;
  }

  /**
   * Calculate average nurse-to-patient ratio for a ward on a date.
   * Averages across all shifts for that day.
   */
  function _nurseRatio(ward, date) {
    var headers = _headers('Staffing');
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, 'Ward');
    var nursesCol = _colIndex(headers, 'NursesPresent');
    var patientsCol = _colIndex(headers, 'PatientsAssigned');
    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;
    if (nursesCol === -1) nursesCol = 3;
    if (patientsCol === -1) patientsCol = 4;

    var data = _sheetData('Staffing');
    var totalRatio = 0;
    var count = 0;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (String(row[wardCol]).trim() !== ward) continue;
      if (!_sameDay(row[dateCol], date)) continue;

      var nurses = Number(row[nursesCol]) || 0;
      var patients = Number(row[patientsCol]) || 0;
      if (patients > 0) {
        totalRatio += nurses / patients;
        count++;
      }
    }

    return count > 0 ? Math.round((totalRatio / count) * 100) / 100 : 0;
  }

  /**
   * Ensure a sheet exists; create it with a header row if it does not.
   */
  function _ensureSheet(name, headerRow) {
    var ss = _ss();
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      if (headerRow && headerRow.length) {
        sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
        sheet.getRange(1, 1, 1, headerRow.length).setFontWeight('bold');
      }
    }
    return sheet;
  }

  var KPI_HEADER = [
    'Date', 'Ward', 'OccupancyRate', 'Admissions', 'Discharges',
    'Transfers', 'ALOS', 'NurseRatio', 'IncidentCount', 'ShortageCount'
  ];

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * calculateDailyKPIs — triggered daily (e.g., via time-driven trigger).
   * Calculates KPIs for each ward for *yesterday* and appends to KPI_Daily.
   */
  function calculateDailyKPIs() {
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday = _normaliseDate(yesterday);

    var wards = _wardList();
    if (wards.length === 0) {
      Logger.log('KpiEngine.calculateDailyKPIs: No wards found in Ref_WardMaster.');
      return;
    }

    var sheet = _ensureSheet('KPI_Daily', KPI_HEADER);
    var rows = [];

    for (var i = 0; i < wards.length; i++) {
      var ward = wards[i];
      var total = _totalBeds(ward);
      var occupied = _occupiedBeds(ward, yesterday);
      var occupancyRate = total > 0 ? Math.round((occupied / total) * 10000) / 100 : 0; // percentage

      var admissions = _countEvents('Log_Admissions', ward, yesterday);
      var discharges = _countEvents('Log_Discharges', ward, yesterday);

      // Transfers: count rows where the ward is either the source or destination
      var transfersFrom = _countEvents('Log_Transfers', ward, yesterday, 'FromWard');
      var transfersTo = _countEvents('Log_Transfers', ward, yesterday, 'ToWard');
      var transfers = transfersFrom + transfersTo;

      var alos = _calculateALOS(ward, yesterday, 30);
      var nurseRatio = _nurseRatio(ward, yesterday);
      var incidents = _countEvents('Log_Incidents', ward, yesterday);
      var shortages = _countEvents('Log_Shortages', ward, yesterday);

      rows.push([
        yesterday,
        ward,
        occupancyRate,
        admissions,
        discharges,
        transfers,
        alos,
        nurseRatio,
        incidents,
        shortages
      ]);
    }

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, KPI_HEADER.length).setValues(rows);
    }

    Logger.log('KpiEngine.calculateDailyKPIs: Wrote ' + rows.length + ' rows for ' + _formatDate(yesterday));
  }

  /**
   * calculateWeeklyKPIs — aggregates KPI_Daily data for the past 7 days.
   *
   * Averages rate-based metrics (OccupancyRate, ALOS, NurseRatio) and sums
   * count-based metrics (Admissions, Discharges, Transfers, IncidentCount,
   * ShortageCount). Writes to KPI_Weekly.
   */
  function calculateWeeklyKPIs() {
    var today = _normaliseDate(new Date());
    var endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1); // yesterday
    var startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7 days back from yesterday

    var wards = _wardList();
    var sheet = _ensureSheet('KPI_Weekly', KPI_HEADER);
    var dailyData = _sheetData('KPI_Daily');
    var dailyHeaders = _headers('KPI_Daily');

    var dDateCol = _colIndex(dailyHeaders, 'Date');
    var dWardCol = _colIndex(dailyHeaders, 'Ward');
    if (dDateCol === -1) dDateCol = 0;
    if (dWardCol === -1) dWardCol = 1;

    // Column indices for KPI values (0-indexed in data array)
    var COL_OCCUPANCY   = 2;
    var COL_ADMISSIONS  = 3;
    var COL_DISCHARGES  = 4;
    var COL_TRANSFERS   = 5;
    var COL_ALOS        = 6;
    var COL_NURSE_RATIO = 7;
    var COL_INCIDENTS   = 8;
    var COL_SHORTAGES   = 9;

    var rows = [];

    for (var w = 0; w < wards.length; w++) {
      var ward = wards[w];
      var dayCount = 0;
      var sumOccupancy = 0;
      var sumAdmissions = 0;
      var sumDischarges = 0;
      var sumTransfers = 0;
      var sumALOS = 0;
      var sumNurseRatio = 0;
      var sumIncidents = 0;
      var sumShortages = 0;

      for (var r = 0; r < dailyData.length; r++) {
        var row = dailyData[r];
        if (String(row[dWardCol]).trim() !== ward) continue;
        if (!_inRange(row[dDateCol], startDate, endDate)) continue;

        dayCount++;
        sumOccupancy   += Number(row[COL_OCCUPANCY])   || 0;
        sumAdmissions  += Number(row[COL_ADMISSIONS])  || 0;
        sumDischarges  += Number(row[COL_DISCHARGES])  || 0;
        sumTransfers   += Number(row[COL_TRANSFERS])   || 0;
        sumALOS        += Number(row[COL_ALOS])        || 0;
        sumNurseRatio  += Number(row[COL_NURSE_RATIO]) || 0;
        sumIncidents   += Number(row[COL_INCIDENTS])   || 0;
        sumShortages   += Number(row[COL_SHORTAGES])   || 0;
      }

      if (dayCount === 0) continue;

      rows.push([
        endDate,
        ward,
        Math.round((sumOccupancy / dayCount) * 100) / 100,   // avg
        sumAdmissions,                                         // sum
        sumDischarges,                                         // sum
        sumTransfers,                                          // sum
        Math.round((sumALOS / dayCount) * 100) / 100,         // avg
        Math.round((sumNurseRatio / dayCount) * 100) / 100,   // avg
        sumIncidents,                                          // sum
        sumShortages                                           // sum
      ]);
    }

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, KPI_HEADER.length).setValues(rows);
    }

    Logger.log('KpiEngine.calculateWeeklyKPIs: Wrote ' + rows.length + ' rows for week ending ' + _formatDate(endDate));
  }

  /**
   * calculateMonthlyKPIs — aggregates KPI_Daily data for the previous calendar month.
   */
  function calculateMonthlyKPIs() {
    var today = _normaliseDate(new Date());

    // Previous month date range
    var endDate = new Date(today.getFullYear(), today.getMonth(), 0); // last day of prev month
    var startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1); // first day of prev month

    var wards = _wardList();
    var sheet = _ensureSheet('KPI_Monthly', KPI_HEADER);
    var dailyData = _sheetData('KPI_Daily');
    var dailyHeaders = _headers('KPI_Daily');

    var dDateCol = _colIndex(dailyHeaders, 'Date');
    var dWardCol = _colIndex(dailyHeaders, 'Ward');
    if (dDateCol === -1) dDateCol = 0;
    if (dWardCol === -1) dWardCol = 1;

    var COL_OCCUPANCY   = 2;
    var COL_ADMISSIONS  = 3;
    var COL_DISCHARGES  = 4;
    var COL_TRANSFERS   = 5;
    var COL_ALOS        = 6;
    var COL_NURSE_RATIO = 7;
    var COL_INCIDENTS   = 8;
    var COL_SHORTAGES   = 9;

    var rows = [];

    for (var w = 0; w < wards.length; w++) {
      var ward = wards[w];
      var dayCount = 0;
      var sumOccupancy = 0;
      var sumAdmissions = 0;
      var sumDischarges = 0;
      var sumTransfers = 0;
      var sumALOS = 0;
      var sumNurseRatio = 0;
      var sumIncidents = 0;
      var sumShortages = 0;

      for (var r = 0; r < dailyData.length; r++) {
        var row = dailyData[r];
        if (String(row[dWardCol]).trim() !== ward) continue;
        if (!_inRange(row[dDateCol], startDate, endDate)) continue;

        dayCount++;
        sumOccupancy   += Number(row[COL_OCCUPANCY])   || 0;
        sumAdmissions  += Number(row[COL_ADMISSIONS])  || 0;
        sumDischarges  += Number(row[COL_DISCHARGES])  || 0;
        sumTransfers   += Number(row[COL_TRANSFERS])   || 0;
        sumALOS        += Number(row[COL_ALOS])        || 0;
        sumNurseRatio  += Number(row[COL_NURSE_RATIO]) || 0;
        sumIncidents   += Number(row[COL_INCIDENTS])   || 0;
        sumShortages   += Number(row[COL_SHORTAGES])   || 0;
      }

      if (dayCount === 0) continue;

      rows.push([
        endDate,
        ward,
        Math.round((sumOccupancy / dayCount) * 100) / 100,
        sumAdmissions,
        sumDischarges,
        sumTransfers,
        Math.round((sumALOS / dayCount) * 100) / 100,
        Math.round((sumNurseRatio / dayCount) * 100) / 100,
        sumIncidents,
        sumShortages
      ]);
    }

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, KPI_HEADER.length).setValues(rows);
    }

    Logger.log('KpiEngine.calculateMonthlyKPIs: Wrote ' + rows.length + ' rows for ' +
               _formatDate(startDate) + ' to ' + _formatDate(endDate));
  }

  /**
   * getKPIData — reads KPI_Daily rows for a ward within a date range.
   *
   * @param {string} ward - Ward code.
   * @param {Date|string} startDate - Start of range (inclusive).
   * @param {Date|string} endDate - End of range (inclusive).
   * @returns {Object[]} Array of KPI objects.
   */
  function getKPIData(ward, startDate, endDate) {
    var start = _normaliseDate(startDate);
    var end = _normaliseDate(endDate);
    var headers = _headers('KPI_Daily');
    var data = _sheetData('KPI_Daily');

    var dDateCol = _colIndex(headers, 'Date');
    var dWardCol = _colIndex(headers, 'Ward');
    if (dDateCol === -1) dDateCol = 0;
    if (dWardCol === -1) dWardCol = 1;

    var results = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (String(row[dWardCol]).trim() !== ward) continue;
      if (!_inRange(row[dDateCol], start, end)) continue;

      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        obj[headers[c]] = row[c];
      }
      results.push(obj);
    }

    return results;
  }

  /**
   * getLatestKPIs — returns the most recent KPI_Daily row for a ward.
   *
   * @param {string} ward - Ward code.
   * @returns {Object|null} KPI object or null if none found.
   */
  function getLatestKPIs(ward) {
    var headers = _headers('KPI_Daily');
    var data = _sheetData('KPI_Daily');

    var dDateCol = _colIndex(headers, 'Date');
    var dWardCol = _colIndex(headers, 'Ward');
    if (dDateCol === -1) dDateCol = 0;
    if (dWardCol === -1) dWardCol = 1;

    var latestRow = null;
    var latestTime = 0;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (String(row[dWardCol]).trim() !== ward) continue;
      var t = _normaliseDate(row[dDateCol]).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestRow = row;
      }
    }

    if (!latestRow) return null;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = latestRow[c];
    }
    return obj;
  }

  /**
   * getAllWardsKPIs — returns KPI_Daily rows for all wards on a specific date.
   *
   * @param {Date|string} date - Target date.
   * @returns {Object[]} Array of KPI objects.
   */
  function getAllWardsKPIs(date) {
    var target = _normaliseDate(date);
    var headers = _headers('KPI_Daily');
    var data = _sheetData('KPI_Daily');

    var dDateCol = _colIndex(headers, 'Date');
    if (dDateCol === -1) dDateCol = 0;

    var results = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!_sameDay(row[dDateCol], target)) continue;

      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        obj[headers[c]] = row[c];
      }
      results.push(obj);
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Return public interface
  // ---------------------------------------------------------------------------

  return {
    calculateDailyKPIs:   calculateDailyKPIs,
    calculateWeeklyKPIs:  calculateWeeklyKPIs,
    calculateMonthlyKPIs: calculateMonthlyKPIs,
    getKPIData:           getKPIData,
    getLatestKPIs:        getLatestKPIs,
    getAllWardsKPIs:       getAllWardsKPIs
  };

})();
