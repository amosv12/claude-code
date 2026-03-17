/**
 * DailyBriefing.gs
 * AI-generated daily ward briefings for clinical staff.
 * Uses Claude to produce concise, actionable summaries of each ward's status.
 *
 * @namespace DailyBriefing
 */
var DailyBriefing = (function () {

  var SYSTEM_PROMPT =
    'You are a hospital operations assistant. Generate a concise daily ward briefing for clinical staff. ' +
    'Focus on actionable information: bed availability, staffing concerns, active incidents, and patient flow trends. ' +
    'Be factual and specific. Use bullet points for clarity.';

  // ---------------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------------

  /**
   * Generates and emails briefings for every ward defined on the Config sheet.
   * Intended to run as a daily time-driven trigger (e.g. 6:00 AM).
   */
  function generateAllBriefings() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName('Config');
    if (!configSheet) {
      Logger.log('DailyBriefing: Config sheet not found.');
      return;
    }

    var wardData = configSheet.getDataRange().getValues();
    // Assumes Config columns: WardCode, WardName, Manager Email, ...
    for (var i = 1; i < wardData.length; i++) {
      var wardCode = wardData[i][0];
      if (!wardCode) continue;

      try {
        var briefing = generateBriefing(wardCode);
        if (briefing) {
          var wardName = wardData[i][1] || wardCode;
          var html = formatBriefingEmail(wardCode, wardName, briefing.aiText, briefing.data);
          emailBriefing(wardCode, html);
          Logger.log('DailyBriefing: Sent briefing for ' + wardCode);
        }
      } catch (err) {
        Logger.log('DailyBriefing: Error for ward ' + wardCode + ' — ' + err.message);
      }
    }
  }

  /**
   * Generates a briefing for a single ward.
   *
   * @param {string} wardCode - The ward identifier (e.g. "ICU", "3A").
   * @return {{ aiText: string, data: Object }|null} The AI-generated briefing text and source data.
   */
  function generateBriefing(wardCode) {
    if (!ClaudeClient.isConfigured()) {
      Logger.log('DailyBriefing: Claude API key not configured.');
      return null;
    }

    var data = gatherWardData(wardCode);
    var prompt = buildBriefingPrompt(wardCode, data);
    var aiText = ClaudeClient.callClaude(prompt, SYSTEM_PROMPT);

    if (!aiText) {
      Logger.log('DailyBriefing: No response from Claude for ward ' + wardCode);
      return null;
    }

    return { aiText: aiText, data: data };
  }

  // ---------------------------------------------------------------------------
  // Data gathering
  // ---------------------------------------------------------------------------

  /**
   * Gathers ward data for the last 24 hours from the various operational sheets.
   * @private
   */
  function gatherWardData(wardCode) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var now = new Date();
    var yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    var data = {
      occupancy: getOccupancy(ss, wardCode),
      admissions: getRecentRows(ss, 'AdmissionsLog', wardCode, yesterday),
      discharges: getRecentRows(ss, 'DischargesLog', wardCode, yesterday),
      incidents: getRecentRows(ss, 'IncidentsTable', wardCode, yesterday),
      staffing: getStaffing(ss, wardCode)
    };

    return data;
  }

  /** @private */
  function getOccupancy(ss, wardCode) {
    var sheet = ss.getSheetByName('BedOccupancyTable');
    if (!sheet) return { total: 0, occupied: 0, available: 0, rate: 0 };

    var rows = sheet.getDataRange().getValues();
    var total = 0, occupied = 0;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toUpperCase() === wardCode.toUpperCase()) {
        total++;
        if (String(rows[i][2]).toLowerCase() === 'occupied') {
          occupied++;
        }
      }
    }
    var available = total - occupied;
    var rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total: total, occupied: occupied, available: available, rate: rate };
  }

  /** @private */
  function getRecentRows(ss, sheetName, wardCode, since) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    var rows = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < rows.length; i++) {
      var rowWard = String(rows[i][1]).toUpperCase(); // column B = ward code
      var rowDate = rows[i][0]; // column A = timestamp / date
      if (rowWard === wardCode.toUpperCase() && rowDate instanceof Date && rowDate >= since) {
        results.push(rows[i]);
      }
    }
    return results;
  }

  /** @private */
  function getStaffing(ss, wardCode) {
    var sheet = ss.getSheetByName('StaffingTable');
    if (!sheet) return [];

    var rows = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toUpperCase() === wardCode.toUpperCase()) {
        results.push({
          shift: rows[i][1],
          nurses: rows[i][2],
          patients: rows[i][3],
          ratio: rows[i][4]
        });
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Prompt building
  // ---------------------------------------------------------------------------

  /**
   * Constructs the briefing prompt from gathered ward data.
   *
   * @param {string} wardCode
   * @param {Object} data - The output of gatherWardData().
   * @return {string} The prompt string.
   */
  function buildBriefingPrompt(wardCode, data) {
    var lines = [];
    lines.push('Generate a daily briefing for ward ' + wardCode + ' as of ' + new Date().toLocaleDateString() + '.');
    lines.push('');

    // Occupancy
    lines.push('## Bed Occupancy');
    lines.push('Total beds: ' + data.occupancy.total);
    lines.push('Occupied: ' + data.occupancy.occupied);
    lines.push('Available: ' + data.occupancy.available);
    lines.push('Occupancy rate: ' + data.occupancy.rate + '%');
    lines.push('');

    // Admissions (last 24h)
    lines.push('## Admissions (last 24 hours): ' + data.admissions.length);
    if (data.admissions.length > 0) {
      data.admissions.forEach(function (row) {
        lines.push('- ' + row.join(' | '));
      });
    }
    lines.push('');

    // Discharges (last 24h)
    lines.push('## Discharges (last 24 hours): ' + data.discharges.length);
    if (data.discharges.length > 0) {
      data.discharges.forEach(function (row) {
        lines.push('- ' + row.join(' | '));
      });
    }
    lines.push('');

    // Incidents (last 24h)
    lines.push('## Incidents (last 24 hours): ' + data.incidents.length);
    if (data.incidents.length > 0) {
      data.incidents.forEach(function (row) {
        lines.push('- ' + row.join(' | '));
      });
    }
    lines.push('');

    // Staffing
    lines.push('## Current Staffing');
    if (data.staffing.length > 0) {
      data.staffing.forEach(function (s) {
        lines.push('- Shift: ' + s.shift + ', Nurses: ' + s.nurses + ', Patients: ' + s.patients + ', Ratio: ' + s.ratio);
      });
    } else {
      lines.push('No staffing data available.');
    }

    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Email formatting & sending
  // ---------------------------------------------------------------------------

  /**
   * Formats the briefing into an HTML email.
   *
   * @param {string} wardCode
   * @param {string} wardName
   * @param {string} aiBriefing - The AI-generated text.
   * @param {Object} data - Source data for the key-stats sidebar.
   * @return {string} HTML string.
   */
  function formatBriefingEmail(wardCode, wardName, aiBriefing, data) {
    var html = '';
    html += '<!DOCTYPE html><html><head><meta charset="utf-8">';
    html += '<style>';
    html += 'body { font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto; }';
    html += '.header { background: #1a5276; color: #fff; padding: 16px 24px; border-radius: 6px 6px 0 0; }';
    html += '.header h1 { margin: 0; font-size: 20px; }';
    html += '.header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }';
    html += '.content { padding: 20px 24px; background: #f9f9f9; }';
    html += '.stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }';
    html += '.stat-card { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; flex: 1; min-width: 120px; text-align: center; }';
    html += '.stat-card .value { font-size: 28px; font-weight: bold; color: #1a5276; }';
    html += '.stat-card .label { font-size: 12px; color: #777; margin-top: 4px; }';
    html += '.ai-narrative { background: #fff; border-left: 4px solid #1a5276; padding: 16px; margin-top: 12px; line-height: 1.6; white-space: pre-wrap; }';
    html += '.footer { padding: 12px 24px; font-size: 11px; color: #999; text-align: center; }';
    html += '</style></head><body>';

    // Header
    html += '<div class="header">';
    html += '<h1>Daily Briefing — ' + _escapeHtml(wardName) + ' (' + _escapeHtml(wardCode) + ')</h1>';
    html += '<p>' + new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
    html += '</div>';

    // Key stats
    html += '<div class="content">';
    html += '<div class="stats">';
    html += _statCard(data.occupancy.rate + '%', 'Occupancy');
    html += _statCard(data.occupancy.available, 'Beds Free');
    html += _statCard(data.admissions.length, 'Admissions 24h');
    html += _statCard(data.discharges.length, 'Discharges 24h');
    html += _statCard(data.incidents.length, 'Incidents 24h');
    html += '</div>';

    // AI narrative
    html += '<div class="ai-narrative">' + _escapeHtml(aiBriefing) + '</div>';
    html += '</div>';

    // Footer
    html += '<div class="footer">Generated by Ward Management System &middot; AI-assisted briefing</div>';
    html += '</body></html>';

    return html;
  }

  /**
   * Emails the briefing HTML to the ward manager and charge nurses.
   *
   * @param {string} wardCode
   * @param {string} htmlBody - The formatted HTML email.
   */
  function emailBriefing(wardCode, htmlBody) {
    var recipients = getWardRecipients(wardCode);
    if (!recipients || recipients.length === 0) {
      Logger.log('DailyBriefing: No recipients found for ward ' + wardCode);
      return;
    }

    MailApp.sendEmail({
      to: recipients.join(','),
      subject: 'Daily Ward Briefing — ' + wardCode + ' — ' + new Date().toLocaleDateString(),
      htmlBody: htmlBody
    });
  }

  /** @private */
  function getWardRecipients(wardCode) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName('Config');
    if (!configSheet) return [];

    var rows = configSheet.getDataRange().getValues();
    var emails = [];
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toUpperCase() === wardCode.toUpperCase()) {
        // Column C = manager email, Column D = charge nurse emails (comma-separated)
        if (rows[i][2]) emails.push(String(rows[i][2]).trim());
        if (rows[i][3]) {
          String(rows[i][3]).split(',').forEach(function (e) {
            if (e.trim()) emails.push(e.trim());
          });
        }
        break;
      }
    }
    return emails;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** @private */
  function _statCard(value, label) {
    return '<div class="stat-card"><div class="value">' + value + '</div><div class="label">' + label + '</div></div>';
  }

  /** @private */
  function _escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    generateAllBriefings: generateAllBriefings,
    generateBriefing: generateBriefing,
    buildBriefingPrompt: buildBriefingPrompt,
    formatBriefingEmail: formatBriefingEmail,
    emailBriefing: emailBriefing
  };

})();
