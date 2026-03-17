/**
 * DischargeHandler.gs
 * Handles Google Forms onFormSubmit events for patient discharges.
 * Validates input, writes to DischargesLog, and updates BedOccupancyTable
 * to set the bed status to Cleaning.
 */

/**
 * Triggered when the Discharge form is submitted.
 * @param {Object} e - The form submit event object.
 * @param {string[]} e.values - Array of response values in column order.
 * @param {Range} e.range - The range in the response sheet.
 */
function onDischargeSubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    Logger.log('DischargeHandler: Could not acquire lock. Submission will be retried.');
    throw err;
  }

  try {
    var values = e.values;

    var rawData = {
      timestamp: values[0],
      patientId: values[1],
      patientName: values[2],
      dischargeDate: values[3],
      dischargeTime: values[4],
      ward: values[5],
      bed: values[6],
      physician: values[7],
      disposition: values[8],
      los: values[9],
      notes: values[10]
    };

    Logger.log('DischargeHandler: Processing discharge for patient ' + rawData.patientId);

    var validationResult = ValidationEngine.validate('discharge', rawData);

    if (!validationResult.isValid) {
      Logger.log('DischargeHandler: Validation failed for patient ' + rawData.patientId +
        '. Errors: ' + validationResult.errors.join('; '));
      return;
    }

    var validatedData = validationResult.data;

    writeToDischargesLog_(validatedData);
    updateBedOccupancyForDischarge_(validatedData);
    updateAdmissionStatusForDischarge_(validatedData);

    Logger.log('DischargeHandler: Successfully processed discharge for patient ' +
      validatedData.patientId + ' from ' + validatedData.ward + ' bed ' + validatedData.bed);

  } catch (err) {
    Logger.log('DischargeHandler: Unexpected error - ' + err.message + '\nStack: ' + err.stack);
    try {
      AlertEngine.sendImmediateAlert('system_error', {
        handler: 'DischargeHandler',
        error: err.message,
        patientId: (e.values && e.values[1]) || 'unknown'
      });
    } catch (alertErr) {
      Logger.log('DischargeHandler: Failed to send error alert - ' + alertErr.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Writes the validated discharge data to the DischargesLog sheet.
 * @param {Object} data - Validated discharge data.
 * @private
 */
function writeToDischargesLog_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('DischargesLog');

  if (!sheet) {
    throw new Error('DischargesLog sheet not found. Please create it before processing discharges.');
  }

  var row = [
    data.timestamp,
    data.patientId,
    data.patientName,
    data.dischargeDate,
    data.dischargeTime,
    data.ward,
    data.bed,
    data.physician,
    data.disposition,
    data.los,
    data.notes,
    new Date()        // processedTimestamp
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

/**
 * Updates the BedOccupancyTable to set the discharged bed to Cleaning status.
 * @param {Object} data - Validated discharge data.
 * @private
 */
function updateBedOccupancyForDischarge_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('BedOccupancyTable');

  if (!sheet) {
    throw new Error('BedOccupancyTable sheet not found.');
  }

  var dataRange = sheet.getDataRange();
  var allValues = dataRange.getValues();
  var headerRow = allValues[0];

  var wardCol = headerRow.indexOf('Ward');
  var bedCol = headerRow.indexOf('Bed');
  var statusCol = headerRow.indexOf('Status');
  var patientIdCol = headerRow.indexOf('PatientId');
  var lastUpdatedCol = headerRow.indexOf('LastUpdated');

  if (wardCol === -1 || bedCol === -1 || statusCol === -1) {
    throw new Error('BedOccupancyTable is missing required columns (Ward, Bed, Status).');
  }

  var updated = false;

  for (var i = 1; i < allValues.length; i++) {
    if (String(allValues[i][wardCol]).trim() === String(data.ward).trim() &&
        String(allValues[i][bedCol]).trim() === String(data.bed).trim()) {

      var rowIndex = i + 1;
      sheet.getRange(rowIndex, statusCol + 1).setValue('Cleaning');

      if (patientIdCol !== -1) {
        sheet.getRange(rowIndex, patientIdCol + 1).setValue('');
      }
      if (lastUpdatedCol !== -1) {
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(new Date());
      }

      updated = true;
      break;
    }
  }

  if (!updated) {
    Logger.log('DischargeHandler: Bed ' + data.bed + ' in ward ' + data.ward +
      ' not found in BedOccupancyTable.');
  }

  SpreadsheetApp.flush();
}

/**
 * Updates the AdmissionsLog to mark the patient's admission as Discharged.
 * @param {Object} data - Validated discharge data.
 * @private
 */
function updateAdmissionStatusForDischarge_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AdmissionsLog');

  if (!sheet) {
    Logger.log('DischargeHandler: AdmissionsLog sheet not found. Skipping admission status update.');
    return;
  }

  var dataRange = sheet.getDataRange();
  var allValues = dataRange.getValues();
  var headerRow = allValues[0];

  var patientIdCol = headerRow.indexOf('PatientId');
  var statusCol = headerRow.indexOf('AdmissionStatus');

  if (patientIdCol === -1) {
    patientIdCol = 1; // Default column B
  }
  if (statusCol === -1) {
    Logger.log('DischargeHandler: AdmissionStatus column not found in AdmissionsLog.');
    return;
  }

  // Find the most recent active admission for this patient (search bottom-up)
  for (var i = allValues.length - 1; i >= 1; i--) {
    if (String(allValues[i][patientIdCol]).trim() === String(data.patientId).trim() &&
        String(allValues[i][statusCol]).trim() === 'Active') {
      var rowIndex = i + 1;
      sheet.getRange(rowIndex, statusCol + 1).setValue('Discharged');
      SpreadsheetApp.flush();
      break;
    }
  }
}
