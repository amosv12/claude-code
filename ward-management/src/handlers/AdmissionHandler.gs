/**
 * AdmissionHandler.gs
 * Handles Google Forms onFormSubmit events for patient admissions.
 * Validates input, writes to AdmissionsLog, updates BedOccupancyTable,
 * and checks ward capacity alerts.
 */

/**
 * Triggered when the Admission form is submitted.
 * @param {Object} e - The form submit event object.
 * @param {string[]} e.values - Array of response values in column order.
 * @param {Range} e.range - The range in the response sheet.
 */
function onAdmissionSubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    Logger.log('AdmissionHandler: Could not acquire lock. Submission will be retried.');
    throw err;
  }

  try {
    var values = e.values;

    var rawData = {
      timestamp: values[0],
      patientId: values[1],
      patientName: values[2],
      dob: values[3],
      admissionDate: values[4],
      admissionTime: values[5],
      ward: values[6],
      bed: values[7],
      physician: values[8],
      diagnosis: values[9],
      source: values[10],
      acuity: values[11]
    };

    Logger.log('AdmissionHandler: Processing admission for patient ' + rawData.patientId);

    var validationResult = ValidationEngine.validate('admission', rawData);

    if (!validationResult.isValid) {
      Logger.log('AdmissionHandler: Validation failed for patient ' + rawData.patientId +
        '. Errors: ' + validationResult.errors.join('; '));
      return;
    }

    var validatedData = validationResult.data;

    writeToAdmissionsLog_(validatedData);
    updateBedOccupancyForAdmission_(validatedData);
    checkCapacityAlerts_(validatedData.ward);

    Logger.log('AdmissionHandler: Successfully processed admission for patient ' +
      validatedData.patientId + ' to ' + validatedData.ward + ' bed ' + validatedData.bed);

  } catch (err) {
    Logger.log('AdmissionHandler: Unexpected error - ' + err.message + '\nStack: ' + err.stack);
    try {
      AlertEngine.sendImmediateAlert('system_error', {
        handler: 'AdmissionHandler',
        error: err.message,
        patientId: (e.values && e.values[1]) || 'unknown'
      });
    } catch (alertErr) {
      Logger.log('AdmissionHandler: Failed to send error alert - ' + alertErr.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Writes the validated admission data to the AdmissionsLog sheet.
 * @param {Object} data - Validated admission data.
 * @private
 */
function writeToAdmissionsLog_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AdmissionsLog');

  if (!sheet) {
    throw new Error('AdmissionsLog sheet not found. Please create it before processing admissions.');
  }

  var row = [
    data.timestamp,
    data.patientId,
    data.patientName,
    data.dob,
    data.admissionDate,
    data.admissionTime,
    data.ward,
    data.bed,
    data.physician,
    data.diagnosis,
    data.source,
    data.acuity,
    new Date(),       // processedTimestamp
    'Active'          // admissionStatus
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

/**
 * Updates the BedOccupancyTable to mark the bed as Occupied.
 * @param {Object} data - Validated admission data.
 * @private
 */
function updateBedOccupancyForAdmission_(data) {
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

      var rowIndex = i + 1; // 1-based row index for sheet operations
      sheet.getRange(rowIndex, statusCol + 1).setValue('Occupied');

      if (patientIdCol !== -1) {
        sheet.getRange(rowIndex, patientIdCol + 1).setValue(data.patientId);
      }
      if (lastUpdatedCol !== -1) {
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(new Date());
      }

      updated = true;
      break;
    }
  }

  if (!updated) {
    Logger.log('AdmissionHandler: Bed ' + data.bed + ' in ward ' + data.ward +
      ' not found in BedOccupancyTable. Adding new row.');
    var newRow = [];
    newRow[wardCol] = data.ward;
    newRow[bedCol] = data.bed;
    newRow[statusCol] = 'Occupied';
    if (patientIdCol !== -1) newRow[patientIdCol] = data.patientId;
    if (lastUpdatedCol !== -1) newRow[lastUpdatedCol] = new Date();
    sheet.appendRow(newRow);
  }

  SpreadsheetApp.flush();
}

/**
 * Checks if the ward's capacity has exceeded alert thresholds.
 * @param {string} ward - The ward to check.
 * @private
 */
function checkCapacityAlerts_(ward) {
  try {
    AlertEngine.checkCapacity(ward);
  } catch (err) {
    Logger.log('AdmissionHandler: Capacity alert check failed for ward ' + ward +
      ' - ' + err.message);
  }
}
