/**
 * AlertEngine — Core alert engine for hospital ward management.
 *
 * Provides threshold checks for capacity and staffing, email-based alerting
 * via GmailApp, and alert history logging.
 *
 * Sheet dependencies:
 *   - Config               (Key, Value pairs — thresholds and email addresses)
 *   - Ref_WardMaster       (Ward, WardManagerEmail, …)
 *   - BedOccupancy         (Date, Ward, OccupiedBeds)
 *   - Staffing             (Date, Ward, Shift, NursesPresent, PatientsAssigned)
 *   - Alert_History        (output — created automatically if missing)
 */

var AlertEngine = (function () {
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

  function _normaliseDate(d) {
    var dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  function _sameDay(a, b) {
    return _normaliseDate(a).getTime() === _normaliseDate(b).getTime();
  }

  /**
   * Read a configuration value from the Config sheet.
   * The Config sheet is expected to have columns: Key, Value.
   * Returns the value as a string, or defaultVal if not found.
   */
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

  /**
   * Return the ward manager email for a given ward from Ref_WardMaster.
   */
  function _wardManagerEmail(ward) {
    var headers = _headers('Ref_WardMaster');
    var wardCol = _colIndex(headers, 'Ward');
    if (wardCol === -1) wardCol = _colIndex(headers, 'WardCode');
    if (wardCol === -1) wardCol = 0;

    var emailCol = _colIndex(headers, 'WardManagerEmail');
    if (emailCol === -1) emailCol = _colIndex(headers, 'ManagerEmail');
    if (emailCol === -1) emailCol = _colIndex(headers, 'Email');

    if (emailCol === -1) return '';

    var data = _sheetData('Ref_WardMaster');
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][wardCol]).trim() === ward) {
        return String(data[i][emailCol]).trim();
      }
    }
    return '';
  }

  /**
   * Ensure the Alert_History sheet exists with the correct header.
   */
  function _ensureAlertHistory() {
    var ss = _ss();
    var sheet = ss.getSheetByName('Alert_History');
    if (!sheet) {
      sheet = ss.insertSheet('Alert_History');
      var header = ['Timestamp', 'AlertType', 'Ward', 'Subject', 'Recipients', 'Status'];
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
      sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
    }
    return sheet;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * checkCapacity — Checks current ward occupancy against the capacity threshold.
   *
   * Reads the most recent BedOccupancy entry for the ward, compares occupied
   * beds to total beds from Ref_WardMaster, and fires an alert if the
   * occupancy rate exceeds CAPACITY_THRESHOLD (from Config, default 85%).
   *
   * @param {string} ward - Ward code.
   * @returns {Object} {ward, occupancyRate, threshold, exceeded}
   */
  function checkCapacity(ward) {
    var threshold = parseFloat(_configValue('CAPACITY_THRESHOLD', '85'));

    // Get total beds from ward master
    var wmHeaders = _headers('Ref_WardMaster');
    var wmWardCol = _colIndex(wmHeaders, 'Ward');
    if (wmWardCol === -1) wmWardCol = _colIndex(wmHeaders, 'WardCode');
    if (wmWardCol === -1) wmWardCol = 0;
    var wmBedsCol = _colIndex(wmHeaders, 'TotalBeds');
    if (wmBedsCol === -1) wmBedsCol = _colIndex(wmHeaders, 'Beds');
    if (wmBedsCol === -1) wmBedsCol = 1;

    var wmData = _sheetData('Ref_WardMaster');
    var totalBeds = 0;
    for (var i = 0; i < wmData.length; i++) {
      if (String(wmData[i][wmWardCol]).trim() === ward) {
        totalBeds = Number(wmData[i][wmBedsCol]) || 0;
        break;
      }
    }

    // Get most recent occupancy record for this ward
    var occHeaders = _headers('BedOccupancy');
    var occDateCol = _colIndex(occHeaders, 'Date');
    var occWardCol = _colIndex(occHeaders, 'Ward');
    var occBedsCol = _colIndex(occHeaders, 'OccupiedBeds');
    if (occDateCol === -1) occDateCol = 0;
    if (occWardCol === -1) occWardCol = 1;
    if (occBedsCol === -1) occBedsCol = 2;

    var occData = _sheetData('BedOccupancy');
    var occupiedBeds = 0;
    var latestDate = null;
    for (var j = 0; j < occData.length; j++) {
      if (String(occData[j][occWardCol]).trim() !== ward) continue;
      var d = new Date(occData[j][occDateCol]);
      if (!latestDate || d.getTime() > latestDate.getTime()) {
        latestDate = d;
        occupiedBeds = Number(occData[j][occBedsCol]) || 0;
      }
    }

    var occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 10000) / 100 : 0;
    var exceeded = occupancyRate > threshold;

    if (exceeded) {
      var subject = 'Capacity Alert: ' + ward + ' at ' + occupancyRate + '% occupancy';
      var body = CapacityAlerts.formatCapacityAlert(ward, occupancyRate, totalBeds, occupiedBeds);
      sendAlert('capacity', ward, subject, body);
    }

    return {
      ward: ward,
      occupancyRate: occupancyRate,
      totalBeds: totalBeds,
      occupiedBeds: occupiedBeds,
      threshold: threshold,
      exceeded: exceeded
    };
  }

  /**
   * checkStaffing — Checks nurse-to-patient ratio for a ward/shift against threshold.
   *
   * @param {string} ward - Ward code.
   * @param {string} shift - Shift identifier (e.g., 'Day', 'Night', 'Evening').
   * @returns {Object} {ward, shift, ratio, threshold, exceeded}
   */
  function checkStaffing(ward, shift) {
    var threshold = parseFloat(_configValue('STAFFING_RATIO_THRESHOLD', '0.25'));

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

    // Find the most recent entry for this ward + shift
    var latestDate = null;
    var nursesPresent = 0;
    var patientsAssigned = 0;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (String(row[wardCol]).trim() !== ward) continue;
      if (String(row[shiftCol]).trim().toLowerCase() !== shift.toLowerCase()) continue;

      var d = new Date(row[dateCol]);
      if (!latestDate || d.getTime() > latestDate.getTime()) {
        latestDate = d;
        nursesPresent = Number(row[nursesCol]) || 0;
        patientsAssigned = Number(row[patientsCol]) || 0;
      }
    }

    var ratio = patientsAssigned > 0 ? Math.round((nursesPresent / patientsAssigned) * 100) / 100 : 0;
    var exceeded = ratio < threshold && patientsAssigned > 0;

    if (exceeded) {
      var subject = 'Staffing Alert: ' + ward + ' (' + shift + ' shift) — Nurse ratio ' + ratio;
      var body = StaffingAlerts.formatStaffingAlert(ward, shift, ratio, nursesPresent, patientsAssigned);
      sendAlert('staffing', ward, subject, body);
    }

    return {
      ward: ward,
      shift: shift,
      ratio: ratio,
      nursesPresent: nursesPresent,
      patientsAssigned: patientsAssigned,
      threshold: threshold,
      exceeded: exceeded
    };
  }

  /**
   * sendAlert — Sends an email alert and logs it.
   *
   * @param {string} alertType - One of: 'capacity', 'staffing', 'critical_incident', 'supply'.
   * @param {string} ward - Ward code.
   * @param {string} subject - Email subject line.
   * @param {string} body - Email body (HTML).
   */
  function sendAlert(alertType, ward, subject, body) {
    var recipients = getAlertRecipients(alertType, ward);

    if (!recipients || recipients.length === 0) {
      Logger.log('AlertEngine.sendAlert: No recipients for alertType=' + alertType + ', ward=' + ward);
      logAlert(alertType, ward, subject, '', 'NO_RECIPIENTS');
      return;
    }

    var recipientStr = recipients.join(',');
    var status = 'SENT';

    try {
      GmailApp.sendEmail(recipientStr, subject, '', {
        htmlBody: body,
        name: 'Ward Management System'
      });
    } catch (e) {
      Logger.log('AlertEngine.sendAlert: Failed to send email — ' + e.message);
      status = 'FAILED: ' + e.message;
    }

    logAlert(alertType, ward, subject, recipientStr, status);
  }

  /**
   * sendImmediateAlert — Sends a high-priority alert for critical events.
   *
   * @param {string} type - Alert type (e.g., 'critical_incident', 'supply').
   * @param {Object} details - Must contain at least {ward, subject, body}.
   */
  function sendImmediateAlert(type, details) {
    var ward = details.ward || 'UNKNOWN';
    var subject = '[URGENT] ' + (details.subject || 'Critical Alert — ' + ward);
    var body = details.body || '';

    // Always include operations center
    var opsEmail = _configValue('OPS_CENTER_EMAIL', '');
    var wardMgr = _wardManagerEmail(ward);
    var recipients = getAlertRecipients(type, ward);

    // Ensure ops and ward manager are always included
    if (opsEmail && recipients.indexOf(opsEmail) === -1) {
      recipients.push(opsEmail);
    }
    if (wardMgr && recipients.indexOf(wardMgr) === -1) {
      recipients.push(wardMgr);
    }

    if (recipients.length === 0) {
      Logger.log('AlertEngine.sendImmediateAlert: No recipients for type=' + type + ', ward=' + ward);
      logAlert(type, ward, subject, '', 'NO_RECIPIENTS');
      return;
    }

    var recipientStr = recipients.join(',');
    var status = 'SENT';

    try {
      GmailApp.sendEmail(recipientStr, subject, '', {
        htmlBody: '<div style="border-left:4px solid #cc0000;padding-left:12px;">' + body + '</div>',
        name: 'Ward Management System — URGENT'
      });
    } catch (e) {
      Logger.log('AlertEngine.sendImmediateAlert: Failed — ' + e.message);
      status = 'FAILED: ' + e.message;
    }

    logAlert(type, ward, subject, recipientStr, status);
  }

  /**
   * getAlertRecipients — Returns an array of email addresses for a given
   * alert type and ward.
   *
   * Routing rules:
   *   - 'capacity'          → operations center + ward manager
   *   - 'staffing'          → nursing lead + ward manager
   *   - 'critical_incident' → operations center + ward manager + medical lead
   *   - 'supply'            → operations center + ward manager
   *
   * Reads named Config keys for role emails; falls back to Ref_WardMaster
   * for the ward manager email.
   *
   * @param {string} alertType
   * @param {string} ward
   * @returns {string[]}
   */
  function getAlertRecipients(alertType, ward) {
    var opsEmail = _configValue('OPS_CENTER_EMAIL', '');
    var nursingLead = _configValue('NURSING_LEAD_EMAIL', '');
    var medicalLead = _configValue('MEDICAL_LEAD_EMAIL', '');
    var wardMgr = _wardManagerEmail(ward);

    var recipients = [];

    switch (alertType) {
      case 'capacity':
        if (opsEmail) recipients.push(opsEmail);
        if (wardMgr) recipients.push(wardMgr);
        break;

      case 'staffing':
        if (nursingLead) recipients.push(nursingLead);
        if (wardMgr) recipients.push(wardMgr);
        break;

      case 'critical_incident':
        if (opsEmail) recipients.push(opsEmail);
        if (wardMgr) recipients.push(wardMgr);
        if (medicalLead) recipients.push(medicalLead);
        break;

      case 'supply':
        if (opsEmail) recipients.push(opsEmail);
        if (wardMgr) recipients.push(wardMgr);
        break;

      default:
        if (opsEmail) recipients.push(opsEmail);
        if (wardMgr) recipients.push(wardMgr);
        break;
    }

    // Deduplicate
    var seen = {};
    var unique = [];
    for (var i = 0; i < recipients.length; i++) {
      var email = recipients[i].toLowerCase();
      if (email && !seen[email]) {
        seen[email] = true;
        unique.push(recipients[i]);
      }
    }

    return unique;
  }

  /**
   * logAlert — Appends an entry to the Alert_History sheet.
   *
   * @param {string} alertType
   * @param {string} ward
   * @param {string} subject
   * @param {string} recipients - Comma-separated email list.
   * @param {string} [status] - 'SENT', 'FAILED', etc.
   */
  function logAlert(alertType, ward, subject, recipients, status) {
    var sheet = _ensureAlertHistory();
    var row = [
      new Date(),
      alertType,
      ward,
      subject,
      recipients || '',
      status || 'SENT'
    ];
    sheet.appendRow(row);
  }

  // ---------------------------------------------------------------------------
  // Return public interface
  // ---------------------------------------------------------------------------

  return {
    checkCapacity:       checkCapacity,
    checkStaffing:       checkStaffing,
    sendAlert:           sendAlert,
    sendImmediateAlert:  sendImmediateAlert,
    getAlertRecipients:  getAlertRecipients,
    logAlert:            logAlert
  };

})();
