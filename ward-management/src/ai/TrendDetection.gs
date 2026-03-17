/**
 * TrendDetection.gs
 * AI-powered trend analysis for hospital ward operations.
 * Compares 7-day data against 30-day baselines to surface anomalies and patterns.
 *
 * @namespace TrendDetection
 */
var TrendDetection = (function () {

  var SYSTEM_PROMPT =
    'You are a hospital data analyst. Analyze the provided KPI data and identify significant trends, anomalies, ' +
    'and actionable insights. Compare 7-day trends against 30-day baselines. Flag any concerning patterns that ' +
    'require management attention. Be specific with numbers and percentages.';

  // ---------------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------------

  /**
   * Runs weekly trend detection.
   * Gathers KPI data for the last 7 and 30 days, sends to Claude for analysis,
   * and emails the resulting report to hospital leadership.
   */
  function detectTrends() {
    if (!ClaudeClient.isConfigured()) {
      Logger.log('TrendDetection: Claude API key not configured.');
      return;
    }

    var kpiData = gatherKpiData();
    var prompt = buildTrendPrompt(kpiData.last7, kpiData.last30);
    var analysis = ClaudeClient.callClaude(prompt, SYSTEM_PROMPT);

    if (!analysis) {
      Logger.log('TrendDetection: No response from Claude.');
      return;
    }

    emailTrendReport(analysis, kpiData);
    Logger.log('TrendDetection: Trend report sent successfully.');
  }

  // ---------------------------------------------------------------------------
  // Data gathering
  // ---------------------------------------------------------------------------

  /** @private */
  function gatherKpiData() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('KPI_Daily');
    if (!sheet) {
      Logger.log('TrendDetection: KPI_Daily sheet not found.');
      return { last7: [], last30: [] };
    }

    var rows = sheet.getDataRange().getValues();
    var headers = rows[0];
    var now = new Date();
    var sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    var thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    var last7 = [];
    var last30 = [];

    for (var i = 1; i < rows.length; i++) {
      var rowDate = rows[i][0];
      if (!(rowDate instanceof Date)) continue;

      var record = {};
      for (var j = 0; j < headers.length; j++) {
        record[headers[j]] = rows[i][j];
      }

      if (rowDate >= sevenDaysAgo) {
        last7.push(record);
      }
      if (rowDate >= thirtyDaysAgo) {
        last30.push(record);
      }
    }

    return { last7: last7, last30: last30 };
  }

  // ---------------------------------------------------------------------------
  // Prompt building
  // ---------------------------------------------------------------------------

  /**
   * Constructs the trend analysis prompt.
   *
   * @param {Object[]} kpiData7Day - KPI records from the last 7 days.
   * @param {Object[]} kpiData30Day - KPI records from the last 30 days.
   * @return {string} The prompt string.
   */
  function buildTrendPrompt(kpiData7Day, kpiData30Day) {
    var lines = [];
    lines.push('Analyze the following hospital KPI data and identify significant trends.');
    lines.push('Report date: ' + new Date().toLocaleDateString());
    lines.push('');

    lines.push('Please identify:');
    lines.push('1. Rising or falling occupancy trends');
    lines.push('2. Seasonal patterns');
    lines.push('3. Staffing adequacy trends');
    lines.push('4. Incident frequency changes');
    lines.push('5. Supply shortage patterns');
    lines.push('');

    // 7-day data
    lines.push('=== LAST 7 DAYS (' + kpiData7Day.length + ' records) ===');
    if (kpiData7Day.length > 0) {
      lines.push(formatKpiSummary(kpiData7Day));
      lines.push('');
      lines.push('Daily detail:');
      kpiData7Day.forEach(function (record) {
        lines.push(formatKpiRecord(record));
      });
    } else {
      lines.push('No data available.');
    }
    lines.push('');

    // 30-day data (summary)
    lines.push('=== LAST 30 DAYS (' + kpiData30Day.length + ' records) ===');
    if (kpiData30Day.length > 0) {
      lines.push(formatKpiSummary(kpiData30Day));
      lines.push('');
      lines.push('Weekly aggregates:');
      var weeks = groupByWeek(kpiData30Day);
      weeks.forEach(function (week) {
        lines.push('Week of ' + week.start + ': ' + formatKpiRecord(week.avg));
      });
    } else {
      lines.push('No data available.');
    }

    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // KPI helpers
  // ---------------------------------------------------------------------------

  /** @private */
  function formatKpiSummary(records) {
    if (records.length === 0) return 'No records.';

    var numericKeys = getNumericKeys(records[0]);
    var summaryParts = [];

    numericKeys.forEach(function (key) {
      var values = records.map(function (r) { return Number(r[key]) || 0; });
      var avg = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
      var min = Math.min.apply(null, values);
      var max = Math.max.apply(null, values);
      summaryParts.push(key + ': avg=' + avg.toFixed(1) + ', min=' + min + ', max=' + max);
    });

    return summaryParts.join(' | ');
  }

  /** @private */
  function formatKpiRecord(record) {
    var parts = [];
    for (var key in record) {
      if (record.hasOwnProperty(key)) {
        var val = record[key];
        if (val instanceof Date) {
          parts.push(key + ': ' + val.toLocaleDateString());
        } else {
          parts.push(key + ': ' + val);
        }
      }
    }
    return parts.join(' | ');
  }

  /** @private */
  function getNumericKeys(record) {
    var keys = [];
    for (var key in record) {
      if (record.hasOwnProperty(key) && typeof record[key] === 'number') {
        keys.push(key);
      }
    }
    return keys;
  }

  /** @private */
  function groupByWeek(records) {
    var weeks = {};
    records.forEach(function (record) {
      var d = record[Object.keys(record)[0]]; // first column = date
      if (!(d instanceof Date)) return;
      var weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      var weekKey = weekStart.toLocaleDateString();

      if (!weeks[weekKey]) {
        weeks[weekKey] = { start: weekKey, records: [] };
      }
      weeks[weekKey].records.push(record);
    });

    var result = [];
    for (var wk in weeks) {
      if (!weeks.hasOwnProperty(wk)) continue;
      var wkRecords = weeks[wk].records;
      var avg = {};
      var numericKeys = getNumericKeys(wkRecords[0]);
      numericKeys.forEach(function (key) {
        var sum = wkRecords.reduce(function (a, r) { return a + (Number(r[key]) || 0); }, 0);
        avg[key] = (sum / wkRecords.length).toFixed(1);
      });
      result.push({ start: weeks[wk].start, avg: avg });
    }

    return result.sort(function (a, b) {
      return new Date(a.start) - new Date(b.start);
    });
  }

  // ---------------------------------------------------------------------------
  // Email
  // ---------------------------------------------------------------------------

  /**
   * Formats and emails the AI trend analysis to hospital leadership.
   *
   * @param {string} trendAnalysis - The AI-generated analysis text.
   * @param {Object} [kpiData] - Optional raw KPI data for supplementary stats.
   */
  function emailTrendReport(trendAnalysis, kpiData) {
    var recipients = getLeadershipRecipients();
    if (recipients.length === 0) {
      Logger.log('TrendDetection: No leadership recipients configured.');
      return;
    }

    var html = buildTrendHtml(trendAnalysis, kpiData);

    MailApp.sendEmail({
      to: recipients.join(','),
      subject: 'Weekly Trend Report — Ward Operations — ' + new Date().toLocaleDateString(),
      htmlBody: html
    });
  }

  /** @private */
  function buildTrendHtml(analysis, kpiData) {
    var html = '';
    html += '<!DOCTYPE html><html><head><meta charset="utf-8">';
    html += '<style>';
    html += 'body { font-family: Arial, sans-serif; color: #333; max-width: 750px; margin: 0 auto; }';
    html += '.header { background: #1a3c5e; color: #fff; padding: 18px 24px; border-radius: 6px 6px 0 0; }';
    html += '.header h1 { margin: 0; font-size: 22px; }';
    html += '.header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }';
    html += '.content { padding: 20px 24px; background: #f7f9fb; }';
    html += '.section-title { color: #1a3c5e; border-bottom: 2px solid #1a3c5e; padding-bottom: 4px; margin-top: 20px; }';
    html += '.analysis { background: #fff; border-left: 4px solid #e67e22; padding: 16px; line-height: 1.7; white-space: pre-wrap; }';
    html += '.meta { font-size: 12px; color: #888; margin-top: 8px; }';
    html += '.footer { padding: 12px 24px; font-size: 11px; color: #999; text-align: center; }';
    html += '</style></head><body>';

    html += '<div class="header">';
    html += '<h1>Weekly Trend Analysis Report</h1>';
    html += '<p>Generated ' + new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</p>';
    html += '</div>';

    html += '<div class="content">';

    // Summary counts
    if (kpiData) {
      html += '<p class="meta">Based on ' + (kpiData.last7 ? kpiData.last7.length : 0) +
              ' daily records (7-day) and ' + (kpiData.last30 ? kpiData.last30.length : 0) +
              ' daily records (30-day baseline).</p>';
    }

    html += '<h2 class="section-title">AI Trend Analysis</h2>';
    html += '<div class="analysis">' + escapeHtml(analysis) + '</div>';

    html += '</div>';
    html += '<div class="footer">Generated by Ward Management System &middot; AI-powered analysis</div>';
    html += '</body></html>';

    return html;
  }

  /** @private */
  function getLeadershipRecipients() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName('Config');
    if (!configSheet) return [];

    var rows = configSheet.getDataRange().getValues();
    var emails = [];
    for (var i = 1; i < rows.length; i++) {
      // Look for a row with ward code "LEADERSHIP" or column E for leadership emails
      if (String(rows[i][0]).toUpperCase() === 'LEADERSHIP') {
        if (rows[i][2]) {
          String(rows[i][2]).split(',').forEach(function (e) {
            if (e.trim()) emails.push(e.trim());
          });
        }
        break;
      }
    }

    // Fallback: check for a named range or script property
    if (emails.length === 0) {
      var prop = PropertiesService.getScriptProperties().getProperty('LEADERSHIP_EMAILS');
      if (prop) {
        prop.split(',').forEach(function (e) {
          if (e.trim()) emails.push(e.trim());
        });
      }
    }

    return emails;
  }

  /** @private */
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    detectTrends: detectTrends,
    buildTrendPrompt: buildTrendPrompt,
    emailTrendReport: emailTrendReport
  };

})();
