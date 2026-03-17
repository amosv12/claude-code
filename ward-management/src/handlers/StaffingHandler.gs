/**
 * StaffingHandler.gs
 * Handles Google Forms onFormSubmit events for staffing reports.
 * Validates input, writes to StaffingTable, and checks staffing ratio alerts.
 */

/**
 * Triggered when the Staffing form is submitted.
 * @param {Object} e - The form submit event object.
 * @param {string[]} e.values - Array of response values in column order.
 * @param {Range} e.range - The range in the response sheet.
 */
function onStaffingSubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    Logger.log('StaffingHandler: Could not acquire lock. Submission will be retried.');
    throw err;
  }

  try {
    var values = e.values;

    var rawData = {
      timestamp: values[0],
      date: values[1],
      ward: values[2],
      shift: values[3],
      nursesScheduled: values[4],
      nursesPresent: values[5],
      physicians: values[6],
      supportStaff: values[7],
      ratio: values[8],
      shortages: values[9],
      reportedBy: values[10]
    };

    Logger.log('StaffingHandler: Processing staffing report for ' +
      rawData.ward + ' / ' + rawData.shift + ' shift on ' + rawData.date);

    var validationResult = ValidationEngine.validate('staffing', rawData);

    if (!validationResult.isValid) {
      Logger.log('StaffingHandler: Validation failed for ' + rawData.ward + '/' +
        rawData.shift + '. Errors: ' + validationResult.errors.join('; '));
      return;
    }

    var validatedData = validationResult.data;

    writeToStaffingTable_(validatedData);
    checkStaffingAlerts_(validatedData);
    checkForAbsenteeism_(validatedData);

    Logger.log('StaffingHandler: Successfully processed staffing report for ' +
      validatedData.ward + ' / ' + validatedData.shift + ' shift');

  } catch (err) {
    Logger.log('StaffingHandler: Unexpected error - ' + err.message + '\nStack: ' + err.stack);
    try {
      AlertEngine.sendImmediateAlert('system_error', {
        handler: 'StaffingHandler',
        error: err.message,
        ward: (e.values && e.values[2]) || 'unknown'
      });
    } catch (alertErr) {
      Logger.log('StaffingHandler: Failed to send error alert - ' + alertErr.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Writes the validated staffing data to the StaffingTable sheet.
 * Updates an existing row for the same ward/date/shift if one exists,
 * otherwise appends a new row.
 * @param {Object} data - Validated staffing data.
 * @private
 */
function writeToStaffingTable_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('StaffingTable');

  if (!sheet) {
    throw new Error('StaffingTable sheet not found. Please create it before processing staffing reports.');
  }

  var dataRange = sheet.getDataRange();
  var allValues = dataRange.getValues();
  var headerRow = allValues[0];

  var dateCol = headerRow.indexOf('Date');
  var wardCol = headerRow.indexOf('Ward');
  var shiftCol = headerRow.indexOf('Shift');

  // Check for an existing row with the same ward/date/shift to update in place
  if (dateCol !== -1 && wardCol !== -1 && shiftCol !== -1) {
    for (var i = 1; i < allValues.length; i++) {
      var rowDate = allValues[i][dateCol];
      // Normalize dates for comparison
      var rowDateStr = (rowDate instanceof Date) ?
        Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd') :
        String(rowDate).trim();
      var dataDateStr = (data.date instanceof Date) ?
        Utilities.formatDate(data.date, Session.getScriptTimeZone(), 'yyyy-MM-dd') :
        String(data.date).trim();

      if (rowDateStr === dataDateStr &&
          String(allValues[i][wardCol]).trim() === String(data.ward).trim() &&
          String(allValues[i][shiftCol]).trim() === String(data.shift).trim()) {

        // Update existing row
        var rowIndex = i + 1;
        var updatedRow = [
          data.timestamp,
          data.date,
          data.ward,
          data.shift,
          data.nursesScheduled,
          data.nursesPresent,
          data.physicians,
          data.supportStaff,
          data.ratio,
          data.shortages,
          data.reportedBy,
          new Date()
        ];
        sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
        SpreadsheetApp.flush();
        Logger.log('StaffingHandler: Updated existing staffing row for ' +
          data.ward + '/' + data.shift + ' on ' + dataDateStr);
        return;
      }
    }
  }

  // No existing row found -- append new
  var row = [
    data.timestamp,
    data.date,
    data.ward,
    data.shift,
    data.nursesScheduled,
    data.nursesPresent,
    data.physicians,
    data.supportStaff,
    data.ratio,
    data.shortages,
    data.reportedBy,
    new Date()        // processedTimestamp
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

/**
 * Checks staffing ratio alerts using the AlertEngine.
 * @param {Object} data - Validated staffing data.
 * @private
 */
function checkStaffingAlerts_(data) {
  try {
    AlertEngine.checkStaffing(data.ward, data.shift);
  } catch (err) {
    Logger.log('StaffingHandler: Staffing alert check failed for ' +
      data.ward + '/' + data.shift + ' - ' + err.message);
  }
}

/**
 * Checks for significant nurse absenteeism and sends an alert if
 * more than 20% of scheduled nurses are absent.
 * @param {Object} data - Validated staffing data.
 * @private
 */
function checkForAbsenteeism_(data) {
  var scheduled = Number(data.nursesScheduled);
  var present = Number(data.nursesPresent);

  if (scheduled <= 0 || isNaN(scheduled) || isNaN(present)) {
    return;
  }

  var absentRate = (scheduled - present) / scheduled;

  if (absentRate > 0.20) {
    var absentCount = scheduled - present;
    Logger.log('StaffingHandler: High absenteeism detected in ' + data.ward +
      ' (' + data.shift + ' shift): ' + absentCount + ' of ' + scheduled +
      ' nurses absent (' + Math.round(absentRate * 100) + '%)');

    try {
      AlertEngine.sendImmediateAlert('staffing_shortage', {
        ward: data.ward,
        shift: data.shift,
        date: data.date,
        nursesScheduled: scheduled,
        nursesPresent: present,
        absentCount: absentCount,
        absentRate: Math.round(absentRate * 100) + '%',
        reportedBy: data.reportedBy
      });
    } catch (err) {
      Logger.log('StaffingHandler: Failed to send absenteeism alert - ' + err.message);
    }
  }
}
