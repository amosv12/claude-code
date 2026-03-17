/**
 * DailySummaryHandler.gs
 * Handles Google Forms onFormSubmit events for daily ward summaries.
 * Validates input, writes to DailySummaryLog, and optionally updates
 * KPI-related data for dashboard reporting.
 */

/**
 * Triggered when the Daily Summary form is submitted.
 * @param {Object} e - The form submit event object.
 * @param {string[]} e.values - Array of response values in column order.
 * @param {Range} e.range - The range in the response sheet.
 */
function onDailySummarySubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    Logger.log('DailySummaryHandler: Could not acquire lock. Submission will be retried.');
    throw err;
  }

  try {
    var values = e.values;

    var rawData = {
      timestamp: values[0],
      date: values[1],
      ward: values[2],
      shift: values[3],
      submittedBy: values[4],
      patientsStart: values[5],
      patientsEnd: values[6],
      bedsAvailable: values[7],
      keyIssues: values[8]
    };

    Logger.log('DailySummaryHandler: Processing daily summary for ' +
      rawData.ward + ' / ' + rawData.shift + ' on ' + rawData.date);

    var validationResult = ValidationEngine.validate('dailySummary', rawData);

    if (!validationResult.isValid) {
      Logger.log('DailySummaryHandler: Validation failed for ' + rawData.ward +
        '. Errors: ' + validationResult.errors.join('; '));
      return;
    }

    var validatedData = validationResult.data;

    writeToDailySummaryLog_(validatedData);
    updateKpiData_(validatedData);
    checkSummaryAnomalies_(validatedData);

    Logger.log('DailySummaryHandler: Successfully processed daily summary for ' +
      validatedData.ward + ' / ' + validatedData.shift);

  } catch (err) {
    Logger.log('DailySummaryHandler: Unexpected error - ' + err.message +
      '\nStack: ' + err.stack);
    try {
      AlertEngine.sendImmediateAlert('system_error', {
        handler: 'DailySummaryHandler',
        error: err.message,
        ward: (e.values && e.values[2]) || 'unknown'
      });
    } catch (alertErr) {
      Logger.log('DailySummaryHandler: Failed to send error alert - ' + alertErr.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Writes the validated daily summary data to the DailySummaryLog sheet.
 * @param {Object} data - Validated daily summary data.
 * @private
 */
function writeToDailySummaryLog_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('DailySummaryLog');

  if (!sheet) {
    throw new Error('DailySummaryLog sheet not found. Please create it before processing daily summaries.');
  }

  var patientsStart = Number(data.patientsStart);
  var patientsEnd = Number(data.patientsEnd);
  var netChange = patientsEnd - patientsStart;

  var row = [
    data.timestamp,
    data.date,
    data.ward,
    data.shift,
    data.submittedBy,
    data.patientsStart,
    data.patientsEnd,
    netChange,
    data.bedsAvailable,
    data.keyIssues || '',
    new Date()        // processedTimestamp
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

/**
 * Updates KPI tracking data based on the daily summary.
 * Writes or updates the KPIData sheet with occupancy and availability metrics.
 * @param {Object} data - Validated daily summary data.
 * @private
 */
function updateKpiData_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('KPIData');

  if (!sheet) {
    Logger.log('DailySummaryHandler: KPIData sheet not found. Skipping KPI update.');
    return;
  }

  var dataRange = sheet.getDataRange();
  var allValues = dataRange.getValues();
  var headerRow = allValues[0];

  var dateCol = headerRow.indexOf('Date');
  var wardCol = headerRow.indexOf('Ward');
  var shiftCol = headerRow.indexOf('Shift');
  var censusCol = headerRow.indexOf('Census');
  var availableCol = headerRow.indexOf('BedsAvailable');
  var lastUpdatedCol = headerRow.indexOf('LastUpdated');

  if (dateCol === -1 || wardCol === -1) {
    Logger.log('DailySummaryHandler: KPIData sheet missing required columns. Skipping update.');
    return;
  }

  // Look for existing row to update
  var dataDateStr = (data.date instanceof Date) ?
    Utilities.formatDate(data.date, Session.getScriptTimeZone(), 'yyyy-MM-dd') :
    String(data.date).trim();

  for (var i = 1; i < allValues.length; i++) {
    var rowDate = allValues[i][dateCol];
    var rowDateStr = (rowDate instanceof Date) ?
      Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd') :
      String(rowDate).trim();

    var shiftMatch = (shiftCol === -1) ||
      String(allValues[i][shiftCol]).trim() === String(data.shift).trim();

    if (rowDateStr === dataDateStr &&
        String(allValues[i][wardCol]).trim() === String(data.ward).trim() &&
        shiftMatch) {

      var rowIndex = i + 1;
      if (censusCol !== -1) {
        sheet.getRange(rowIndex, censusCol + 1).setValue(data.patientsEnd);
      }
      if (availableCol !== -1) {
        sheet.getRange(rowIndex, availableCol + 1).setValue(data.bedsAvailable);
      }
      if (lastUpdatedCol !== -1) {
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(new Date());
      }
      SpreadsheetApp.flush();
      return;
    }
  }

  // No existing row -- append new KPI data
  var kpiRow = [];
  for (var j = 0; j < headerRow.length; j++) kpiRow[j] = '';
  kpiRow[dateCol] = data.date;
  kpiRow[wardCol] = data.ward;
  if (shiftCol !== -1) kpiRow[shiftCol] = data.shift;
  if (censusCol !== -1) kpiRow[censusCol] = data.patientsEnd;
  if (availableCol !== -1) kpiRow[availableCol] = data.bedsAvailable;
  if (lastUpdatedCol !== -1) kpiRow[lastUpdatedCol] = new Date();

  sheet.appendRow(kpiRow);
  SpreadsheetApp.flush();
}

/**
 * Checks for anomalies in the daily summary data, such as large patient
 * count changes between start and end of shift.
 * @param {Object} data - Validated daily summary data.
 * @private
 */
function checkSummaryAnomalies_(data) {
  var patientsStart = Number(data.patientsStart);
  var patientsEnd = Number(data.patientsEnd);

  if (isNaN(patientsStart) || isNaN(patientsEnd) || patientsStart === 0) {
    return;
  }

  var changeRate = Math.abs(patientsEnd - patientsStart) / patientsStart;

  // Flag if patient count changed by more than 30% in a single shift
  if (changeRate > 0.30) {
    var direction = patientsEnd > patientsStart ? 'increase' : 'decrease';
    Logger.log('DailySummaryHandler: Anomaly detected in ' + data.ward +
      ' (' + data.shift + ' shift on ' + data.date + '): ' +
      Math.round(changeRate * 100) + '% ' + direction +
      ' in patient count (from ' + patientsStart + ' to ' + patientsEnd + ')');
  }

  // Flag if zero beds available
  var bedsAvailable = Number(data.bedsAvailable);
  if (bedsAvailable === 0) {
    Logger.log('DailySummaryHandler: Ward ' + data.ward + ' reports zero beds available ' +
      'at end of ' + data.shift + ' shift on ' + data.date);
  }
}
