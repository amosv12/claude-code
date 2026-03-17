/**
 * StaffingAlerts — Staffing-ratio monitoring and alerting for all wards.
 *
 * Checks nurse-to-patient ratios across wards and shifts, provides status
 * snapshots, and formats HTML alert emails.
 *
 * Depends on:
 *   - AlertEngine   (checkStaffing)
 *   - Config sheet  (STAFFING_RATIO_THRESHOLD, STAFFING_CRITICAL_RATIO)
 *   - Ref_WardMaster, Staffing sheets
 */

var StaffingAlerts = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function _ss() {
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function _sheetData(sheetName) {
    var sheet = _ss().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  }

  function _headers(sheetName) {
    var sheet = _ss().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 1) return [];
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) {
      return String(h).trim();
    });
  }

  function _colIndex(headers, name) {
    var lower = name.toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).toLowerCase() === lower) return i;
    }
    return -1;
  }

  function _configValue(key, defaultVal) {
    var headers = _headers('Config');
    var keyCol = _colIndex(headers, 'Key');
    var valCol = _colIndex(headers, 'Value');
    if (keyCol === -1) keyCol = 0;
    if (valCol === -1) valCol = 1;

    var data = _sheetData('Config');
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][keyCol]).trim() === key) {
        return String(data[i][valCol]).trim();
      }
    }
    return defaultVal !== undefined ? String(defaultVal) : '';
  }

  function _wardList() {
    var headers = _headers('Ref_WardMaster');
    var wardCol = _colIndex(headers, 'Ward');
    if (wardCol === -1) wardCol = _colIndex(headers, 'WardCode');
    if (wardCol === -1) wardCol = 0;

    var data = _sheetData('Ref_WardMaster');
    var wards = [];
    for (var i = 0; i < data.length; i++) {
      var w = String(data[i][wardCol]).trim();
      if (w && w !== 'undefined') wards.push(w);
    }
    return wards;
  }

  /**
   * Return the distinct shifts from the Staffing sheet.
   */
  function _shiftList() {
    var headers = _headers('Staffing');
    var shiftCol = _colIndex(headers, 'Shift');
    if (shiftCol === -1) shiftCol = 2;

    var data = _sheetData('Staffing');
    var seen = {};
    var shifts = [];

    for (var i = 0; i < data.length; i++) {
      var s = String(data[i][shiftCol]).trim();
      if (s && !seen[s.toLowerCase()]) {
        seen[s.toLowerCase()] = true;
        shifts.push(s);
      }
    }

    // If no data, return standard hospital shifts
    if (shifts.length === 0) {
      shifts = ['Day', 'Evening', 'Night'];
    }

    return shifts;
  }

  /**
   * Get the latest staffing data for a ward/shift pair.
   */
  function _latestStaffing(ward, shift) {
    var headers = _headers('Staffing');
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, 'Ward');
    var shiftCol = _colIndex(headers, 'Shift');
    var nursesCol = _colIndex(headers, 'NursesPresent');
    var patientsCol = _colIndex(headers, 'PatientsAssigned');
    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;
    if (shiftCol === -1) shiftCol = 2;
    if (nursesCol === -1) nursesCol = 3;
    if (patientsCol === -1) patientsCol = 4;

    var data = _sheetData('Staffing');
    var latestDate = null;
    var nurses = 0;
    var patients = 0;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (String(row[wardCol]).trim() !== ward) continue;
      if (String(row[shiftCol]).trim().toLowerCase() !== shift.toLowerCase()) continue;

      var d = new Date(row[dateCol]);
      if (!latestDate || d.getTime() > latestDate.getTime()) {
        latestDate = d;
        nurses = Number(row[nursesCol]) || 0;
        patients = Number(row[patientsCol]) || 0;
      }
    }

    return {
      date: latestDate,
      nursesPresent: nurses,
      patientsAssigned: patients,
      ratio: patients > 0 ? Math.round((nurses / patients) * 100) / 100 : 0
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * runStaffingCheck — Checks the latest staffing data for every ward and
   * shift combination. Sends alerts via AlertEngine.checkStaffing for any
   * ward/shift below the threshold.
   *
   * @returns {Object[]} Array of check results.
   */
  function runStaffingCheck() {
    var wards = _wardList();
    var shifts = _shiftList();
    var results = [];

    for (var w = 0; w < wards.length; w++) {
      for (var s = 0; s < shifts.length; s++) {
        try {
          var result = AlertEngine.checkStaffing(wards[w], shifts[s]);
          results.push(result);
        } catch (e) {
          Logger.log('StaffingAlerts.runStaffingCheck: Error — ward=' + wards[w] +
                     ', shift=' + shifts[s] + ' — ' + e.message);
          results.push({
            ward: wards[w],
            shift: shifts[s],
            ratio: -1,
            error: e.message
          });
        }
      }
    }

    var alertCount = results.filter(function (r) { return r.exceeded; }).length;
    Logger.log('StaffingAlerts.runStaffingCheck: Checked ' + results.length +
               ' ward-shift combos, ' + alertCount + ' alerts triggered.');

    return results;
  }

  /**
   * getStaffingStatus — Returns a staffing status snapshot for all wards
   * and shifts.
   *
   * Status levels:
   *   - 'normal'   — ratio >= standard threshold
   *   - 'warning'  — ratio < standard threshold but >= critical
   *   - 'critical' — ratio < critical threshold
   *
   * @returns {Object[]} Array of {ward, shift, ratio, nursesPresent, patientsAssigned, status}.
   */
  function getStaffingStatus() {
    var standardThreshold = parseFloat(_configValue('STAFFING_RATIO_THRESHOLD', '0.25'));
    var criticalThreshold = parseFloat(_configValue('STAFFING_CRITICAL_RATIO', '0.17'));

    var wards = _wardList();
    var shifts = _shiftList();
    var statuses = [];

    for (var w = 0; w < wards.length; w++) {
      for (var s = 0; s < shifts.length; s++) {
        var info = _latestStaffing(wards[w], shifts[s]);

        var status;
        if (info.patientsAssigned === 0) {
          status = 'normal'; // no patients assigned
        } else if (info.ratio < criticalThreshold) {
          status = 'critical';
        } else if (info.ratio < standardThreshold) {
          status = 'warning';
        } else {
          status = 'normal';
        }

        statuses.push({
          ward: wards[w],
          shift: shifts[s],
          ratio: info.ratio,
          nursesPresent: info.nursesPresent,
          patientsAssigned: info.patientsAssigned,
          status: status
        });
      }
    }

    return statuses;
  }

  /**
   * formatStaffingAlert — Creates an HTML email body for a staffing alert.
   *
   * @param {string} ward - Ward code.
   * @param {string} shift - Shift name.
   * @param {number} ratio - Current nurse-to-patient ratio.
   * @param {number} nursesPresent - Nurses currently on duty.
   * @param {number} nursesScheduled - Patients assigned (used as denominator context).
   * @returns {string} HTML string.
   */
  function formatStaffingAlert(ward, shift, ratio, nursesPresent, nursesScheduled) {
    var criticalThreshold = parseFloat(_configValue('STAFFING_CRITICAL_RATIO', '0.17'));
    var severity = ratio < criticalThreshold ? 'CRITICAL' : 'WARNING';
    var severityColor = ratio < criticalThreshold ? '#cc0000' : '#e67e00';
    var requiredThreshold = parseFloat(_configValue('STAFFING_RATIO_THRESHOLD', '0.25'));
    var recommendedNurses = Math.ceil(nursesScheduled * requiredThreshold);
    var deficit = recommendedNurses - nursesPresent;

    var html = '';
    html += '<div style="font-family:Arial,sans-serif;max-width:600px;">';
    html += '  <div style="background-color:' + severityColor + ';color:#ffffff;padding:12px 16px;border-radius:4px 4px 0 0;">';
    html += '    <h2 style="margin:0;font-size:18px;">&#128101; Staffing ' + severity + ': ' + ward + ' (' + shift + ' Shift)</h2>';
    html += '  </div>';
    html += '  <div style="border:1px solid #dddddd;border-top:none;padding:16px;border-radius:0 0 4px 4px;">';
    html += '    <p style="margin:0 0 12px 0;">The nurse-to-patient ratio for <strong>' + ward + '</strong> during the <strong>' + shift + '</strong> shift is below the required threshold.</p>';
    html += '    <table style="border-collapse:collapse;width:100%;">';
    html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Current Ratio</td>';
    html += '          <td style="padding:6px 12px;border:1px solid #ddd;color:' + severityColor + ';font-weight:bold;">1:' + (ratio > 0 ? Math.round(1 / ratio) : 'N/A') + ' (' + ratio + ')</td></tr>';
    html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Required Ratio</td>';
    html += '          <td style="padding:6px 12px;border:1px solid #ddd;">1:' + Math.round(1 / requiredThreshold) + ' (' + requiredThreshold + ')</td></tr>';
    html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Nurses on Duty</td>';
    html += '          <td style="padding:6px 12px;border:1px solid #ddd;">' + nursesPresent + '</td></tr>';
    html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Patients Assigned</td>';
    html += '          <td style="padding:6px 12px;border:1px solid #ddd;">' + nursesScheduled + '</td></tr>';
    html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Recommended Nurses</td>';
    html += '          <td style="padding:6px 12px;border:1px solid #ddd;">' + recommendedNurses + '</td></tr>';
    if (deficit > 0) {
      html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Nurse Deficit</td>';
      html += '          <td style="padding:6px 12px;border:1px solid #ddd;color:#cc0000;font-weight:bold;">' + deficit + '</td></tr>';
    }
    html += '    </table>';
    html += '    <p style="margin:12px 0 0 0;font-size:13px;color:#666666;">';
    html += '      Please arrange additional staffing or consider patient redistribution.';
    html += '    </p>';
    html += '  </div>';
    html += '  <p style="font-size:11px;color:#999999;margin-top:8px;">Sent by Ward Management System at ' + new Date().toLocaleString() + '</p>';
    html += '</div>';

    return html;
  }

  // ---------------------------------------------------------------------------
  // Return public interface
  // ---------------------------------------------------------------------------

  return {
    runStaffingCheck:    runStaffingCheck,
    getStaffingStatus:   getStaffingStatus,
    formatStaffingAlert: formatStaffingAlert
  };

})();
