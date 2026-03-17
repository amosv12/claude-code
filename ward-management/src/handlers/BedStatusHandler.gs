/**
 * BedStatusHandler.gs
 * Handles Google Forms onFormSubmit events for bed status updates.
 * Validates input, updates BedOccupancyTable, and checks capacity
 * alerts when a bed status changes to Occupied.
 */

/**
 * Triggered when the Bed Status form is submitted.
 * @param {Object} e - The form submit event object.
 * @param {string[]} e.values - Array of response values in column order.
 * @param {Range} e.range - The range in the response sheet.
 */
function onBedStatusSubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    Logger.log('BedStatusHandler: Could not acquire lock. Submission will be retried.');
    throw err;
  }

  try {
    var values = e.values;

    var rawData = {
      timestamp: values[0],
      date: values[1],
      ward: values[2],
      bedNumber: values[3],
      status: values[4],
      patientId: values[5],
      updatedBy: values[6],
      notes: values[7]
    };

    Logger.log('BedStatusHandler: Processing bed status update for ' +
      rawData.ward + '/' + rawData.bedNumber + ' to status: ' + rawData.status);

    var validationResult = ValidationEngine.validate('bedStatus', rawData);

    if (!validationResult.isValid) {
      Logger.log('BedStatusHandler: Validation failed for ' + rawData.ward + '/' +
        rawData.bedNumber + '. Errors: ' + validationResult.errors.join('; '));
      return;
    }

    var validatedData = validationResult.data;

    var previousStatus = updateBedOccupancyForStatusChange_(validatedData);
    logBedStatusChange_(validatedData, previousStatus);

    if (String(validatedData.status).trim() === 'Occupied') {
      checkBedStatusCapacityAlerts_(validatedData.ward);
    }

    Logger.log('BedStatusHandler: Successfully updated bed ' + validatedData.bedNumber +
      ' in ward ' + validatedData.ward + ' to ' + validatedData.status);

  } catch (err) {
    Logger.log('BedStatusHandler: Unexpected error - ' + err.message + '\nStack: ' + err.stack);
    try {
      AlertEngine.sendImmediateAlert('system_error', {
        handler: 'BedStatusHandler',
        error: err.message,
        ward: (e.values && e.values[2]) || 'unknown',
        bed: (e.values && e.values[3]) || 'unknown'
      });
    } catch (alertErr) {
      Logger.log('BedStatusHandler: Failed to send error alert - ' + alertErr.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Updates the BedOccupancyTable with the new bed status.
 * @param {Object} data - Validated bed status data.
 * @returns {string} The previous status of the bed, or empty string if not found.
 * @private
 */
function updateBedOccupancyForStatusChange_(data) {
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
  var notesCol = headerRow.indexOf('Notes');

  if (wardCol === -1 || bedCol === -1 || statusCol === -1) {
    throw new Error('BedOccupancyTable is missing required columns (Ward, Bed, Status).');
  }

  var previousStatus = '';
  var now = new Date();

  for (var i = 1; i < allValues.length; i++) {
    if (String(allValues[i][wardCol]).trim() === String(data.ward).trim() &&
        String(allValues[i][bedCol]).trim() === String(data.bedNumber).trim()) {

      var rowIndex = i + 1;
      previousStatus = String(allValues[i][statusCol]).trim();

      sheet.getRange(rowIndex, statusCol + 1).setValue(data.status);

      if (patientIdCol !== -1) {
        if (data.status === 'Occupied' && data.patientId) {
          sheet.getRange(rowIndex, patientIdCol + 1).setValue(data.patientId);
        } else if (data.status !== 'Occupied') {
          sheet.getRange(rowIndex, patientIdCol + 1).setValue('');
        }
      }

      if (lastUpdatedCol !== -1) {
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(now);
      }

      if (notesCol !== -1 && data.notes) {
        sheet.getRange(rowIndex, notesCol + 1).setValue(data.notes);
      }

      SpreadsheetApp.flush();
      return previousStatus;
    }
  }

  // Bed not found -- add it
  Logger.log('BedStatusHandler: Bed ' + data.bedNumber + ' in ward ' + data.ward +
    ' not found in BedOccupancyTable. Adding new row.');

  var newRow = [];
  for (var j = 0; j < headerRow.length; j++) newRow[j] = '';
  newRow[wardCol] = data.ward;
  newRow[bedCol] = data.bedNumber;
  newRow[statusCol] = data.status;
  if (patientIdCol !== -1 && data.patientId) newRow[patientIdCol] = data.patientId;
  if (lastUpdatedCol !== -1) newRow[lastUpdatedCol] = now;
  if (notesCol !== -1 && data.notes) newRow[notesCol] = data.notes;

  sheet.appendRow(newRow);
  SpreadsheetApp.flush();

  return '';
}

/**
 * Logs the bed status change to a BedStatusChangeLog sheet for audit purposes.
 * @param {Object} data - Validated bed status data.
 * @param {string} previousStatus - The status before the change.
 * @private
 */
function logBedStatusChange_(data, previousStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('BedStatusChangeLog');

  if (!sheet) {
    Logger.log('BedStatusHandler: BedStatusChangeLog sheet not found. Skipping audit log.');
    return;
  }

  var row = [
    data.timestamp,
    data.date,
    data.ward,
    data.bedNumber,
    previousStatus,
    data.status,
    data.patientId || '',
    data.updatedBy,
    data.notes || '',
    new Date()        // processedTimestamp
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

/**
 * Checks ward capacity alerts after a bed becomes Occupied.
 * @param {string} ward - The ward to check.
 * @private
 */
function checkBedStatusCapacityAlerts_(ward) {
  try {
    AlertEngine.checkCapacity(ward);
  } catch (err) {
    Logger.log('BedStatusHandler: Capacity alert check failed for ward ' + ward +
      ' - ' + err.message);
  }
}
