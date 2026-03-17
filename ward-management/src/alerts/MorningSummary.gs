/**
 * MorningSummary — Daily morning briefing email for hospital ward management.
 *
 * Triggered at 6 AM daily. Gathers overnight and current operational data
 * across all wards, calls the Claude AI integration for a narrative summary,
 * and sends a formatted HTML email to all ward managers and operations.
 *
 * Depends on:
 *   - KpiEngine         (getLatestKPIs, getAllWardsKPIs)
 *   - CapacityAlerts    (getCapacityStatus)
 *   - StaffingAlerts    (getStaffingStatus)
 *   - AlertEngine       (getAlertRecipients)
 *   - ClaudeClient      (callClaude)
 *   - Config sheet, Ref_WardMaster, BedOccupancy, Log_Admissions,
 *     Log_Discharges, Log_Transfers, Log_Incidents, Log_Shortages, Staffing
 */

var MorningSummary = (function () {
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

  function _normaliseDate(d) {
    var dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  function _sameDay(a, b) {
    return _normaliseDate(a).getTime() === _normaliseDate(b).getTime();
  }

  function _formatDate(d) {
    var dt = new Date(d);
    var yyyy = dt.getFullYear();
    var mm = ('0' + (dt.getMonth() + 1)).slice(-2);
    var dd = ('0' + dt.getDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
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
   * Count events for a ward on a given date from a log sheet.
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
   * Get incidents from the last 24 hours.
   */
  function _recentIncidents() {
    var headers = _headers('Log_Incidents');
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, 'Ward');
    var typeCol = _colIndex(headers, 'Type');
    if (typeCol === -1) typeCol = _colIndex(headers, 'IncidentType');
    var descCol = _colIndex(headers, 'Description');
    if (descCol === -1) descCol = _colIndex(headers, 'Details');
    var severityCol = _colIndex(headers, 'Severity');

    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;
    if (typeCol === -1) typeCol = 2;
    if (descCol === -1) descCol = 3;
    if (severityCol === -1) severityCol = 4;

    var cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    var data = _sheetData('Log_Incidents');
    var incidents = [];

    for (var i = 0; i < data.length; i++) {
      var rowDate = new Date(data[i][dateCol]);
      if (rowDate.getTime() >= cutoff.getTime()) {
        incidents.push({
          date: rowDate,
          ward: String(data[i][wardCol]).trim(),
          type: String(data[i][typeCol] || '').trim(),
          description: String(data[i][descCol] || '').trim(),
          severity: String(data[i][severityCol] || '').trim()
        });
      }
    }

    return incidents;
  }

  /**
   * Get critical shortages (active/unresolved).
   */
  function _criticalShortages() {
    var headers = _headers('Log_Shortages');
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, 'Ward');
    var itemCol = _colIndex(headers, 'Item');
    if (itemCol === -1) itemCol = _colIndex(headers, 'SupplyItem');
    var statusCol = _colIndex(headers, 'Status');
    var severityCol = _colIndex(headers, 'Severity');

    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;
    if (itemCol === -1) itemCol = 2;
    if (statusCol === -1) statusCol = 3;
    if (severityCol === -1) severityCol = 4;

    var data = _sheetData('Log_Shortages');
    var shortages = [];

    for (var i = 0; i < data.length; i++) {
      var status = String(data[i][statusCol] || '').trim().toLowerCase();
      // Include active/open/unresolved shortages
      if (status === 'active' || status === 'open' || status === 'unresolved' || status === 'critical' || status === '') {
        shortages.push({
          date: new Date(data[i][dateCol]),
          ward: String(data[i][wardCol]).trim(),
          item: String(data[i][itemCol] || '').trim(),
          status: String(data[i][statusCol] || '').trim(),
          severity: String(data[i][severityCol] || '').trim()
        });
      }
    }

    return shortages;
  }

  /**
   * Get today's day shift staffing data for all wards.
   */
  function _todayStaffing() {
    var today = _normaliseDate(new Date());
    var headers = _headers('Staffing');
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, 'Ward');
    var shiftCol = _colIndex(headers, 'Shift');
    var nursesCol = _colIndex(headers, 'NursesPresent');
    var patientsCol = _colIndex(headers, 'PatientsAssigned');
    var scheduledCol = _colIndex(headers, 'NursesScheduled');

    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;
    if (shiftCol === -1) shiftCol = 2;
    if (nursesCol === -1) nursesCol = 3;
    if (patientsCol === -1) patientsCol = 4;

    var data = _sheetData('Staffing');
    var staffing = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!_sameDay(row[dateCol], today)) continue;
      var shift = String(row[shiftCol]).trim().toLowerCase();
      if (shift !== 'day' && shift !== 'morning' && shift !== 'am') continue;

      var entry = {
        ward: String(row[wardCol]).trim(),
        shift: String(row[shiftCol]).trim(),
        nursesPresent: Number(row[nursesCol]) || 0,
        patientsAssigned: Number(row[patientsCol]) || 0
      };
      if (scheduledCol !== -1) {
        entry.nursesScheduled = Number(row[scheduledCol]) || 0;
      }
      staffing.push(entry);
    }

    return staffing;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * buildSummaryData — Collects all data points for the morning summary
   * into a single structured object.
   *
   * @returns {Object} Summary data with keys: date, wards, capacity,
   *   staffing, incidents, shortages, wardDetails.
   */
  function buildSummaryData() {
    var yesterday = _normaliseDate(new Date());
    yesterday.setDate(yesterday.getDate() - 1);

    var wards = _wardList();
    var capacityStatus = CapacityAlerts.getCapacityStatus();
    var staffingToday = _todayStaffing();
    var incidents = _recentIncidents();
    var shortages = _criticalShortages();

    // Per-ward detail: admissions, discharges, transfers for yesterday
    var wardDetails = [];
    for (var i = 0; i < wards.length; i++) {
      var ward = wards[i];

      var admissions = _countEvents('Log_Admissions', ward, yesterday);
      var discharges = _countEvents('Log_Discharges', ward, yesterday);
      var transfersFrom = _countEvents('Log_Transfers', ward, yesterday, 'FromWard');
      var transfersTo = _countEvents('Log_Transfers', ward, yesterday, 'ToWard');

      // Find capacity for this ward
      var capInfo = null;
      for (var c = 0; c < capacityStatus.length; c++) {
        if (capacityStatus[c].ward === ward) {
          capInfo = capacityStatus[c];
          break;
        }
      }

      // Find staffing for this ward
      var staffInfo = null;
      for (var s = 0; s < staffingToday.length; s++) {
        if (staffingToday[s].ward === ward) {
          staffInfo = staffingToday[s];
          break;
        }
      }

      wardDetails.push({
        ward: ward,
        admissions: admissions,
        discharges: discharges,
        transfersIn: transfersTo,
        transfersOut: transfersFrom,
        occupancyRate: capInfo ? capInfo.occupancyRate : null,
        totalBeds: capInfo ? capInfo.totalBeds : null,
        occupiedBeds: capInfo ? capInfo.occupiedBeds : null,
        capacityStatus: capInfo ? capInfo.status : 'unknown',
        nursesPresent: staffInfo ? staffInfo.nursesPresent : null,
        patientsAssigned: staffInfo ? staffInfo.patientsAssigned : null
      });
    }

    // Totals
    var totalAdmissions = 0;
    var totalDischarges = 0;
    var totalTransfers = 0;
    for (var t = 0; t < wardDetails.length; t++) {
      totalAdmissions += wardDetails[t].admissions;
      totalDischarges += wardDetails[t].discharges;
      totalTransfers += wardDetails[t].transfersIn + wardDetails[t].transfersOut;
    }

    return {
      date: _formatDate(yesterday),
      today: _formatDate(new Date()),
      wardCount: wards.length,
      totals: {
        admissions: totalAdmissions,
        discharges: totalDischarges,
        transfers: totalTransfers
      },
      wardDetails: wardDetails,
      capacityStatus: capacityStatus,
      staffingToday: staffingToday,
      incidents: incidents,
      shortages: shortages
    };
  }

  /**
   * formatSummaryEmail — Creates an HTML email combining the AI narrative
   * summary with structured data tables.
   *
   * @param {string} aiSummary - Narrative text generated by Claude.
   * @param {Object} rawData - Output of buildSummaryData().
   * @returns {string} Complete HTML email body.
   */
  function formatSummaryEmail(aiSummary, rawData) {
    var html = '';

    // Container
    html += '<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;">';

    // Header
    html += '<div style="background:#1a5276;color:#ffffff;padding:16px 20px;border-radius:4px 4px 0 0;">';
    html += '  <h1 style="margin:0;font-size:22px;">Morning Operations Summary</h1>';
    html += '  <p style="margin:4px 0 0 0;font-size:14px;opacity:0.85;">Data as of ' + rawData.date + ' | Generated ' + rawData.today + ' 06:00</p>';
    html += '</div>';

    // AI narrative
    html += '<div style="border:1px solid #ddd;border-top:none;padding:16px 20px;background:#f8f9fa;">';
    html += '  <h2 style="margin:0 0 10px 0;font-size:16px;color:#1a5276;">Executive Summary</h2>';
    html += '  <div style="line-height:1.6;color:#333333;">' + (aiSummary || '<em>AI summary unavailable.</em>') + '</div>';
    html += '</div>';

    // Quick stats bar
    html += '<div style="border:1px solid #ddd;border-top:none;padding:12px 20px;display:flex;background:#ffffff;">';
    html += '  <div style="flex:1;text-align:center;border-right:1px solid #eee;">';
    html += '    <div style="font-size:24px;font-weight:bold;color:#1a5276;">' + rawData.totals.admissions + '</div>';
    html += '    <div style="font-size:12px;color:#666;">Admissions</div>';
    html += '  </div>';
    html += '  <div style="flex:1;text-align:center;border-right:1px solid #eee;">';
    html += '    <div style="font-size:24px;font-weight:bold;color:#1a5276;">' + rawData.totals.discharges + '</div>';
    html += '    <div style="font-size:12px;color:#666;">Discharges</div>';
    html += '  </div>';
    html += '  <div style="flex:1;text-align:center;border-right:1px solid #eee;">';
    html += '    <div style="font-size:24px;font-weight:bold;color:#1a5276;">' + rawData.totals.transfers + '</div>';
    html += '    <div style="font-size:12px;color:#666;">Transfers</div>';
    html += '  </div>';
    html += '  <div style="flex:1;text-align:center;">';
    html += '    <div style="font-size:24px;font-weight:bold;color:#1a5276;">' + rawData.incidents.length + '</div>';
    html += '    <div style="font-size:12px;color:#666;">Incidents (24h)</div>';
    html += '  </div>';
    html += '</div>';

    // Ward details table
    html += '<div style="border:1px solid #ddd;border-top:none;padding:16px 20px;">';
    html += '  <h2 style="margin:0 0 10px 0;font-size:16px;color:#1a5276;">Ward Status</h2>';
    html += '  <table style="border-collapse:collapse;width:100%;font-size:13px;">';
    html += '    <thead>';
    html += '      <tr style="background:#1a5276;color:#ffffff;">';
    html += '        <th style="padding:8px 10px;text-align:left;">Ward</th>';
    html += '        <th style="padding:8px 10px;text-align:center;">Occupancy</th>';
    html += '        <th style="padding:8px 10px;text-align:center;">Beds (Occ/Total)</th>';
    html += '        <th style="padding:8px 10px;text-align:center;">Admissions</th>';
    html += '        <th style="padding:8px 10px;text-align:center;">Discharges</th>';
    html += '        <th style="padding:8px 10px;text-align:center;">Transfers</th>';
    html += '        <th style="padding:8px 10px;text-align:center;">Nurses</th>';
    html += '        <th style="padding:8px 10px;text-align:center;">Status</th>';
    html += '      </tr>';
    html += '    </thead>';
    html += '    <tbody>';

    for (var w = 0; w < rawData.wardDetails.length; w++) {
      var wd = rawData.wardDetails[w];
      var rowBg = w % 2 === 0 ? '#ffffff' : '#f9f9f9';
      var statusColor;
      switch (wd.capacityStatus) {
        case 'critical': statusColor = '#cc0000'; break;
        case 'warning':  statusColor = '#e67e00'; break;
        default:         statusColor = '#27ae60'; break;
      }
      var statusLabel = wd.capacityStatus.charAt(0).toUpperCase() + wd.capacityStatus.slice(1);
      var transfers = (wd.transfersIn || 0) + (wd.transfersOut || 0);

      html += '      <tr style="background:' + rowBg + ';">';
      html += '        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold;">' + wd.ward + '</td>';
      html += '        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">' + (wd.occupancyRate !== null ? wd.occupancyRate + '%' : '-') + '</td>';
      html += '        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">' + (wd.occupiedBeds !== null ? wd.occupiedBeds + '/' + wd.totalBeds : '-') + '</td>';
      html += '        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">' + wd.admissions + '</td>';
      html += '        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">' + wd.discharges + '</td>';
      html += '        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">' + transfers + '</td>';
      html += '        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">' + (wd.nursesPresent !== null ? wd.nursesPresent : '-') + '</td>';
      html += '        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;color:' + statusColor + ';font-weight:bold;">' + statusLabel + '</td>';
      html += '      </tr>';
    }

    html += '    </tbody>';
    html += '  </table>';
    html += '</div>';

    // Incidents section (if any)
    if (rawData.incidents.length > 0) {
      html += '<div style="border:1px solid #ddd;border-top:none;padding:16px 20px;">';
      html += '  <h2 style="margin:0 0 10px 0;font-size:16px;color:#cc0000;">Incidents (Last 24 Hours)</h2>';
      html += '  <table style="border-collapse:collapse;width:100%;font-size:13px;">';
      html += '    <thead>';
      html += '      <tr style="background:#fbeaea;">';
      html += '        <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #ddd;">Ward</th>';
      html += '        <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #ddd;">Type</th>';
      html += '        <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #ddd;">Severity</th>';
      html += '        <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #ddd;">Description</th>';
      html += '      </tr>';
      html += '    </thead>';
      html += '    <tbody>';

      for (var inc = 0; inc < rawData.incidents.length; inc++) {
        var incident = rawData.incidents[inc];
        html += '      <tr>';
        html += '        <td style="padding:5px 10px;border-bottom:1px solid #eee;">' + incident.ward + '</td>';
        html += '        <td style="padding:5px 10px;border-bottom:1px solid #eee;">' + incident.type + '</td>';
        html += '        <td style="padding:5px 10px;border-bottom:1px solid #eee;">' + incident.severity + '</td>';
        html += '        <td style="padding:5px 10px;border-bottom:1px solid #eee;">' + incident.description + '</td>';
        html += '      </tr>';
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';
    }

    // Shortages section (if any)
    if (rawData.shortages.length > 0) {
      html += '<div style="border:1px solid #ddd;border-top:none;padding:16px 20px;">';
      html += '  <h2 style="margin:0 0 10px 0;font-size:16px;color:#e67e00;">Active Supply Shortages</h2>';
      html += '  <table style="border-collapse:collapse;width:100%;font-size:13px;">';
      html += '    <thead>';
      html += '      <tr style="background:#fef5e7;">';
      html += '        <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #ddd;">Ward</th>';
      html += '        <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #ddd;">Item</th>';
      html += '        <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #ddd;">Severity</th>';
      html += '        <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #ddd;">Status</th>';
      html += '      </tr>';
      html += '    </thead>';
      html += '    <tbody>';

      for (var sh = 0; sh < rawData.shortages.length; sh++) {
        var shortage = rawData.shortages[sh];
        html += '      <tr>';
        html += '        <td style="padding:5px 10px;border-bottom:1px solid #eee;">' + shortage.ward + '</td>';
        html += '        <td style="padding:5px 10px;border-bottom:1px solid #eee;">' + shortage.item + '</td>';
        html += '        <td style="padding:5px 10px;border-bottom:1px solid #eee;">' + shortage.severity + '</td>';
        html += '        <td style="padding:5px 10px;border-bottom:1px solid #eee;">' + shortage.status + '</td>';
        html += '      </tr>';
      }

      html += '    </tbody>';
      html += '  </table>';
      html += '</div>';
    }

    // Footer
    html += '<div style="border:1px solid #ddd;border-top:none;padding:12px 20px;background:#f8f9fa;border-radius:0 0 4px 4px;">';
    html += '  <p style="margin:0;font-size:11px;color:#999999;">';
    html += '    This summary was auto-generated by the Ward Management System. ';
    html += '    Data sourced from operational logs as of ' + rawData.today + ' 06:00. ';
    html += '    Narrative summary powered by Claude AI.';
    html += '  </p>';
    html += '</div>';

    html += '</div>';

    return html;
  }

  /**
   * getSummaryRecipients — Returns all email addresses that should receive
   * the morning summary (all ward managers + operations center).
   *
   * @returns {string[]} Array of email addresses.
   */
  function getSummaryRecipients() {
    var opsEmail = _configValue('OPS_CENTER_EMAIL', '');
    var additionalRecipients = _configValue('MORNING_SUMMARY_RECIPIENTS', '');

    var headers = _headers('Ref_WardMaster');
    var emailCol = _colIndex(headers, 'WardManagerEmail');
    if (emailCol === -1) emailCol = _colIndex(headers, 'ManagerEmail');
    if (emailCol === -1) emailCol = _colIndex(headers, 'Email');

    var seen = {};
    var recipients = [];

    // Operations center
    if (opsEmail) {
      seen[opsEmail.toLowerCase()] = true;
      recipients.push(opsEmail);
    }

    // Additional configured recipients
    if (additionalRecipients) {
      var extras = additionalRecipients.split(',');
      for (var e = 0; e < extras.length; e++) {
        var email = extras[e].trim();
        if (email && !seen[email.toLowerCase()]) {
          seen[email.toLowerCase()] = true;
          recipients.push(email);
        }
      }
    }

    // Ward managers
    if (emailCol !== -1) {
      var data = _sheetData('Ref_WardMaster');
      for (var i = 0; i < data.length; i++) {
        var mgr = String(data[i][emailCol]).trim();
        if (mgr && !seen[mgr.toLowerCase()]) {
          seen[mgr.toLowerCase()] = true;
          recipients.push(mgr);
        }
      }
    }

    return recipients;
  }

  /**
   * generateMorningSummary — Main entry point, intended to be triggered
   * daily at 6 AM via Apps Script time-driven trigger.
   *
   * 1. Collects all operational data via buildSummaryData().
   * 2. Calls ClaudeClient.callClaude() to generate a narrative summary.
   * 3. Formats a comprehensive HTML email via formatSummaryEmail().
   * 4. Sends to all ward managers and operations center.
   */
  function generateMorningSummary() {
    Logger.log('MorningSummary.generateMorningSummary: Starting morning summary generation.');

    // 1. Collect data
    var rawData;
    try {
      rawData = buildSummaryData();
    } catch (e) {
      Logger.log('MorningSummary: Failed to build summary data — ' + e.message);
      return;
    }

    // 2. Generate AI narrative
    var aiSummary = '';
    var prompt = _buildClaudePrompt(rawData);

    try {
      if (typeof ClaudeClient !== 'undefined' && typeof ClaudeClient.callClaude === 'function') {
        var aiResponse = ClaudeClient.callClaude(prompt);
        aiSummary = aiResponse || '';
      } else {
        Logger.log('MorningSummary: ClaudeClient not available, using fallback summary.');
        aiSummary = _fallbackSummary(rawData);
      }
    } catch (e) {
      Logger.log('MorningSummary: Claude API call failed — ' + e.message + '. Using fallback.');
      aiSummary = _fallbackSummary(rawData);
    }

    // 3. Format email
    var htmlBody = formatSummaryEmail(aiSummary, rawData);

    // 4. Send
    var recipients = getSummaryRecipients();
    if (recipients.length === 0) {
      Logger.log('MorningSummary: No recipients configured. Aborting send.');
      return;
    }

    var subject = 'Morning Operations Summary — ' + rawData.today;
    var recipientStr = recipients.join(',');

    try {
      GmailApp.sendEmail(recipientStr, subject, '', {
        htmlBody: htmlBody,
        name: 'Ward Management System'
      });
      Logger.log('MorningSummary: Sent to ' + recipients.length + ' recipients.');
    } catch (e) {
      Logger.log('MorningSummary: Failed to send email — ' + e.message);
    }

    // Log to Alert_History for auditing
    try {
      AlertEngine.logAlert('morning_summary', 'ALL', subject, recipientStr, 'SENT');
    } catch (e) {
      Logger.log('MorningSummary: Failed to log alert — ' + e.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers for AI prompt / fallback
  // ---------------------------------------------------------------------------

  /**
   * Build the prompt sent to Claude for narrative generation.
   */
  function _buildClaudePrompt(data) {
    var prompt = 'You are a hospital operations analyst. Generate a concise morning briefing summary (3-5 paragraphs) based on the following ward data from yesterday (' + data.date + ').\n\n';
    prompt += 'Focus on: key trends, wards needing attention, staffing concerns, and any incidents or shortages that require follow-up.\n\n';

    prompt += 'TOTALS: Admissions=' + data.totals.admissions + ', Discharges=' + data.totals.discharges + ', Transfers=' + data.totals.transfers + '\n\n';

    prompt += 'WARD DETAILS:\n';
    for (var i = 0; i < data.wardDetails.length; i++) {
      var wd = data.wardDetails[i];
      prompt += '- ' + wd.ward + ': Occupancy=' + (wd.occupancyRate !== null ? wd.occupancyRate + '%' : 'N/A');
      prompt += ', Beds=' + (wd.occupiedBeds !== null ? wd.occupiedBeds + '/' + wd.totalBeds : 'N/A');
      prompt += ', Adm=' + wd.admissions + ', Dis=' + wd.discharges;
      prompt += ', Status=' + wd.capacityStatus;
      if (wd.nursesPresent !== null) {
        prompt += ', Nurses=' + wd.nursesPresent;
      }
      prompt += '\n';
    }

    if (data.incidents.length > 0) {
      prompt += '\nINCIDENTS (last 24h):\n';
      for (var j = 0; j < data.incidents.length; j++) {
        var inc = data.incidents[j];
        prompt += '- ' + inc.ward + ': ' + inc.type + ' (Severity: ' + inc.severity + ') — ' + inc.description + '\n';
      }
    }

    if (data.shortages.length > 0) {
      prompt += '\nACTIVE SHORTAGES:\n';
      for (var k = 0; k < data.shortages.length; k++) {
        var sh = data.shortages[k];
        prompt += '- ' + sh.ward + ': ' + sh.item + ' (Severity: ' + sh.severity + ', Status: ' + sh.status + ')\n';
      }
    }

    prompt += '\nProvide the summary in plain HTML paragraphs (no <html>/<body> tags). Highlight critical items in bold.';

    return prompt;
  }

  /**
   * Generate a basic fallback summary when Claude is unavailable.
   */
  function _fallbackSummary(data) {
    var html = '';
    html += '<p><strong>Operations Overview for ' + data.date + ':</strong> ';
    html += 'The facility processed ' + data.totals.admissions + ' admissions, ';
    html += data.totals.discharges + ' discharges, and ' + data.totals.transfers + ' transfers ';
    html += 'across ' + data.wardCount + ' wards.</p>';

    // Highlight critical capacity wards
    var criticalWards = [];
    var warningWards = [];
    for (var i = 0; i < data.wardDetails.length; i++) {
      if (data.wardDetails[i].capacityStatus === 'critical') {
        criticalWards.push(data.wardDetails[i].ward + ' (' + data.wardDetails[i].occupancyRate + '%)');
      } else if (data.wardDetails[i].capacityStatus === 'warning') {
        warningWards.push(data.wardDetails[i].ward + ' (' + data.wardDetails[i].occupancyRate + '%)');
      }
    }

    if (criticalWards.length > 0) {
      html += '<p><strong style="color:#cc0000;">Critical capacity:</strong> ' + criticalWards.join(', ') + '. Immediate action recommended.</p>';
    }
    if (warningWards.length > 0) {
      html += '<p><strong style="color:#e67e00;">Capacity warnings:</strong> ' + warningWards.join(', ') + '. Monitor closely.</p>';
    }
    if (criticalWards.length === 0 && warningWards.length === 0) {
      html += '<p>All wards are operating within normal capacity thresholds.</p>';
    }

    if (data.incidents.length > 0) {
      html += '<p><strong>' + data.incidents.length + ' incident(s)</strong> reported in the last 24 hours. Review the incidents table below for details.</p>';
    }

    if (data.shortages.length > 0) {
      html += '<p><strong>' + data.shortages.length + ' active supply shortage(s)</strong> require attention. See details below.</p>';
    }

    return html;
  }

  // ---------------------------------------------------------------------------
  // Return public interface
  // ---------------------------------------------------------------------------

  return {
    generateMorningSummary: generateMorningSummary,
    buildSummaryData:       buildSummaryData,
    formatSummaryEmail:     formatSummaryEmail,
    getSummaryRecipients:   getSummaryRecipients
  };

})();
