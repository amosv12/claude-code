/**
 * QandA.gs
 * Natural language Q&A interface for the Hospital Ward Management System.
 * Deploys as a web app or sidebar that lets staff ask questions about ward operations
 * and receive AI-powered answers grounded in live spreadsheet data.
 */

var QA_SYSTEM_PROMPT =
  'You are a hospital operations assistant with access to real-time ward data. ' +
  'Answer questions about bed availability, patient flow, staffing, incidents, and operational metrics. ' +
  'Be concise and factual. If the data doesn\'t contain information to answer the question, say so.';

// =============================================================================
// Web App entry point
// =============================================================================

/**
 * Serves the Q&A web interface.
 * Deploy as a web app (Execute as: me, Access: anyone in org).
 *
 * @return {HtmlOutput}
 */
function doGet() {
  return HtmlService.createHtmlOutput(QA_HTML)
    .setTitle('Ward Q&A')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Opens the Q&A interface as a sidebar in the spreadsheet.
 */
function openQaSidebar() {
  var html = HtmlService.createHtmlOutput(QA_HTML)
    .setTitle('Ward Q&A Assistant');
  SpreadsheetApp.getUi().showSidebar(html);
}

// =============================================================================
// Server-side functions (called from client via google.script.run)
// =============================================================================

/**
 * Processes a natural-language question.
 *
 * @param {string} question - The user's question.
 * @return {string} The AI-generated answer.
 */
function askQuestion(question) {
  if (!question || question.trim() === '') {
    return 'Please enter a question.';
  }

  if (!ClaudeClient.isConfigured()) {
    return 'Error: Claude API key is not configured. Please run ClaudeClient.setApiKey() in the script editor.';
  }

  try {
    var context = buildContext(question);
    var prompt = 'Question: ' + question + '\n\n' +
                 'Here is the current data from the hospital ward management system:\n\n' +
                 context + '\n\n' +
                 'Answer the question based on the data above.';

    var answer = ClaudeClient.callClaude(prompt, QA_SYSTEM_PROMPT);
    return answer || 'Sorry, I was unable to generate an answer. Please try again.';

  } catch (err) {
    Logger.log('QandA.askQuestion error: ' + err.message);
    return 'An error occurred while processing your question: ' + err.message;
  }
}

// =============================================================================
// Context builder
// =============================================================================

/**
 * Analyzes the question to determine which sheets to query, then assembles
 * a relevant data context string for the AI prompt.
 *
 * @param {string} question - The user's question.
 * @return {string} Formatted context data.
 */
function buildContext(question) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var q = question.toLowerCase();
  var sections = [];

  // Always include a current occupancy summary
  sections.push(getOccupancySummary(ss));

  // Keyword-driven data gathering
  if (/bed|occupancy|capacity/.test(q)) {
    sections.push(getBedOccupancyData(ss));
  }

  if (/admission|admit/.test(q)) {
    sections.push(getRecentSheetData(ss, 'AdmissionsLog', 'Recent Admissions', 20));
  }

  if (/discharge/.test(q)) {
    sections.push(getRecentSheetData(ss, 'DischargesLog', 'Recent Discharges', 20));
  }

  if (/staff|nurse|ratio/.test(q)) {
    sections.push(getStaffingData(ss));
  }

  if (/incident|safety/.test(q)) {
    sections.push(getRecentSheetData(ss, 'IncidentsTable', 'Recent Incidents', 20));
  }

  if (/shortage|supply|equipment/.test(q)) {
    sections.push(getRecentSheetData(ss, 'ShortagesTable', 'Supply & Equipment Shortages', 30));
  }

  if (/kpi|metric|trend/.test(q)) {
    sections.push(getRecentSheetData(ss, 'KPI_Daily', 'KPI Data (last 14 days)', 14));
  }

  return sections.filter(Boolean).join('\n\n');
}

// =============================================================================
// Data retrieval helpers
// =============================================================================

/** @private */
function getOccupancySummary(ss) {
  var sheet = ss.getSheetByName('BedOccupancyTable');
  if (!sheet) return '## Occupancy Summary\nNo bed data available.';

  var rows = sheet.getDataRange().getValues();
  var wards = {};

  for (var i = 1; i < rows.length; i++) {
    var ward = String(rows[i][0]);
    if (!ward) continue;
    if (!wards[ward]) wards[ward] = { total: 0, occupied: 0 };
    wards[ward].total++;
    if (String(rows[i][2]).toLowerCase() === 'occupied') {
      wards[ward].occupied++;
    }
  }

  var lines = ['## Current Occupancy Summary'];
  var totalBeds = 0, totalOccupied = 0;
  for (var w in wards) {
    if (!wards.hasOwnProperty(w)) continue;
    var avail = wards[w].total - wards[w].occupied;
    var rate = wards[w].total > 0 ? Math.round((wards[w].occupied / wards[w].total) * 100) : 0;
    lines.push(w + ': ' + wards[w].occupied + '/' + wards[w].total + ' occupied (' + rate + '%), ' + avail + ' available');
    totalBeds += wards[w].total;
    totalOccupied += wards[w].occupied;
  }
  var overallRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;
  lines.push('TOTAL: ' + totalOccupied + '/' + totalBeds + ' occupied (' + overallRate + '%), ' + (totalBeds - totalOccupied) + ' available');

  return lines.join('\n');
}

/** @private */
function getBedOccupancyData(ss) {
  var sheet = ss.getSheetByName('BedOccupancyTable');
  if (!sheet) return null;

  var rows = sheet.getDataRange().getValues();
  var lines = ['## Bed Occupancy Detail'];
  lines.push(rows[0].join(' | ')); // header
  lines.push('---');

  var limit = Math.min(rows.length, 101); // cap at 100 data rows
  for (var i = 1; i < limit; i++) {
    lines.push(rows[i].join(' | '));
  }
  if (rows.length > 101) {
    lines.push('... (' + (rows.length - 101) + ' more rows)');
  }

  return lines.join('\n');
}

/** @private */
function getStaffingData(ss) {
  var sheet = ss.getSheetByName('StaffingTable');
  if (!sheet) return null;

  var rows = sheet.getDataRange().getValues();
  var lines = ['## Staffing Data'];
  lines.push(rows[0].join(' | '));
  lines.push('---');

  for (var i = 1; i < rows.length; i++) {
    lines.push(rows[i].join(' | '));
  }

  return lines.join('\n');
}

/** @private */
function getRecentSheetData(ss, sheetName, title, maxRows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;

  var rows = sheet.getDataRange().getValues();
  var lines = ['## ' + title];

  if (rows.length <= 1) {
    lines.push('No data available.');
    return lines.join('\n');
  }

  lines.push(rows[0].join(' | ')); // header
  lines.push('---');

  // Take the most recent rows (bottom of the sheet)
  var startRow = Math.max(1, rows.length - maxRows);
  for (var i = startRow; i < rows.length; i++) {
    var formatted = rows[i].map(function (cell) {
      if (cell instanceof Date) return cell.toLocaleString();
      return cell;
    });
    lines.push(formatted.join(' | '));
  }

  return lines.join('\n');
}

// =============================================================================
// Inline HTML template
// =============================================================================

var QA_HTML = '\
<!DOCTYPE html>\
<html>\
<head>\
  <meta charset="utf-8">\
  <meta name="viewport" content="width=device-width, initial-scale=1">\
  <style>\
    * { box-sizing: border-box; margin: 0; padding: 0; }\
    body {\
      font-family: "Segoe UI", Arial, sans-serif;\
      background: #f4f6f9;\
      color: #333;\
      padding: 16px;\
      min-height: 100vh;\
    }\
    .container { max-width: 640px; margin: 0 auto; }\
    h1 {\
      font-size: 20px;\
      color: #1a5276;\
      margin-bottom: 4px;\
    }\
    .subtitle {\
      font-size: 13px;\
      color: #777;\
      margin-bottom: 20px;\
    }\
    .input-group {\
      display: flex;\
      gap: 8px;\
      margin-bottom: 16px;\
    }\
    #questionInput {\
      flex: 1;\
      padding: 10px 14px;\
      font-size: 14px;\
      border: 1px solid #ccc;\
      border-radius: 6px;\
      outline: none;\
      transition: border-color 0.2s;\
    }\
    #questionInput:focus { border-color: #1a5276; }\
    #askBtn {\
      padding: 10px 20px;\
      font-size: 14px;\
      font-weight: 600;\
      color: #fff;\
      background: #1a5276;\
      border: none;\
      border-radius: 6px;\
      cursor: pointer;\
      transition: background 0.2s;\
      white-space: nowrap;\
    }\
    #askBtn:hover { background: #154360; }\
    #askBtn:disabled { background: #999; cursor: not-allowed; }\
    .loading {\
      display: none;\
      align-items: center;\
      gap: 8px;\
      font-size: 13px;\
      color: #555;\
      margin-bottom: 12px;\
    }\
    .loading.visible { display: flex; }\
    .spinner {\
      width: 18px; height: 18px;\
      border: 2px solid #ddd;\
      border-top-color: #1a5276;\
      border-radius: 50%;\
      animation: spin 0.8s linear infinite;\
    }\
    @keyframes spin { to { transform: rotate(360deg); } }\
    .response-area {\
      background: #fff;\
      border: 1px solid #e0e0e0;\
      border-radius: 8px;\
      padding: 16px;\
      min-height: 60px;\
      line-height: 1.6;\
      white-space: pre-wrap;\
      font-size: 14px;\
      display: none;\
    }\
    .response-area.visible { display: block; }\
    .error { color: #c0392b; }\
    .history { margin-top: 24px; }\
    .history-item {\
      background: #fff;\
      border: 1px solid #e8e8e8;\
      border-radius: 8px;\
      padding: 14px;\
      margin-bottom: 10px;\
    }\
    .history-item .q {\
      font-weight: 600;\
      color: #1a5276;\
      margin-bottom: 6px;\
      font-size: 13px;\
    }\
    .history-item .a {\
      font-size: 13px;\
      white-space: pre-wrap;\
      line-height: 1.5;\
    }\
  </style>\
</head>\
<body>\
  <div class="container">\
    <h1>Ward Operations Q&amp;A</h1>\
    <p class="subtitle">Ask questions about beds, staffing, incidents, admissions, and more.</p>\
\
    <div class="input-group">\
      <input type="text" id="questionInput" placeholder="e.g. How many beds are available in ICU?" />\
      <button id="askBtn" onclick="submitQuestion()">Ask</button>\
    </div>\
\
    <div class="loading" id="loading">\
      <div class="spinner"></div>\
      <span>Analyzing ward data&hellip;</span>\
    </div>\
\
    <div class="response-area" id="responseArea"></div>\
\
    <div class="history" id="history"></div>\
  </div>\
\
  <script>\
    var historyEl = document.getElementById("history");\
\
    document.getElementById("questionInput").addEventListener("keydown", function (e) {\
      if (e.key === "Enter") submitQuestion();\
    });\
\
    function submitQuestion() {\
      var input = document.getElementById("questionInput");\
      var question = input.value.trim();\
      if (!question) return;\
\
      var btn = document.getElementById("askBtn");\
      var loading = document.getElementById("loading");\
      var responseArea = document.getElementById("responseArea");\
\
      btn.disabled = true;\
      loading.classList.add("visible");\
      responseArea.classList.remove("visible");\
      responseArea.classList.remove("error");\
\
      google.script.run\
        .withSuccessHandler(function (answer) {\
          btn.disabled = false;\
          loading.classList.remove("visible");\
          responseArea.textContent = answer;\
          responseArea.classList.add("visible");\
\
          var item = document.createElement("div");\
          item.className = "history-item";\
          item.innerHTML = \'<div class="q">Q: \' + escapeHtml(question) + \'</div><div class="a">\' + escapeHtml(answer) + \'</div>\';\
          historyEl.insertBefore(item, historyEl.firstChild);\
\
          input.value = "";\
          input.focus();\
        })\
        .withFailureHandler(function (err) {\
          btn.disabled = false;\
          loading.classList.remove("visible");\
          responseArea.textContent = "Error: " + err.message;\
          responseArea.classList.add("visible", "error");\
        })\
        .askQuestion(question);\
    }\
\
    function escapeHtml(text) {\
      var div = document.createElement("div");\
      div.appendChild(document.createTextNode(text));\
      return div.innerHTML;\
    }\
  </script>\
</body>\
</html>';
