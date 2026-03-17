/**
 * TransferHandler.gs
 * Handles Google Forms onFormSubmit events for patient transfers between wards.
 * Validates input, writes to TransferLog, updates BedOccupancyTable for both
 * source and destination wards, and checks capacity alerts.
 */

/**
 * Triggered when the Transfer form is submitted.
 * @param {Object} e - The form submit event object.
 * @param {string[]} e.values - Array of response values in column order.
 * @param {Range} e.range - The range in the response sheet.
 */
function onTransferSubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    Logger.log('TransferHandler: Could not acquire lock. Submission will be retried.');
    throw err;
  }

  try {
    var values = e.values;

    var rawData = {
      timestamp: values[0],
      patientId: values[1],
      patientName: values[2],
      transferDate: values[3],
      transferTime: values[4],
      fromWard: values[5],
      fromBed: values[6],
      toWard: values[7],
      toBed: values[8],
      reason: values[9],
      requestedBy: values[10],
      status: values[11]
    };

    Logger.log('TransferHandler: Processing transfer for patient ' + rawData.patientId +
      ' from ' + rawData.fromWard + '/' + rawData.fromBed +
      ' to ' + rawData.toWard + '/' + rawData.toBed);

    var validationResult = ValidationEngine.validate('transfer', rawData);

    if (!validationResult.isValid) {
      Logger.log('TransferHandler: Validation failed for patient ' + rawData.patientId +
        '. Errors: ' + validationResult.errors.join('; '));
      return;
    }

    var validatedData = validationResult.data;

    writeToTransferLog_(validatedData);
    updateBedOccupancyForTransfer_(validatedData);
    updateAdmissionRecordForTransfer_(validatedData);
    checkTransferCapacityAlerts_(validatedData);

    Logger.log('TransferHandler: Successfully processed transfer for patient ' +
      validatedData.patientId);

  } catch (err) {
    Logger.log('TransferHandler: Unexpected error - ' + err.message + '\nStack: ' + err.stack);
    try {
      AlertEngine.sendImmediateAlert('system_error', {
        handler: 'TransferHandler',
        error: err.message,
        patientId: (e.values && e.values[1]) || 'unknown'
      });
    } catch (alertErr) {
      Logger.log('TransferHandler: Failed to send error alert - ' + alertErr.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Writes the validated transfer data to the TransferLog sheet.
 * @param {Object} data - Validated transfer data.
 * @private
 */
function writeToTransferLog_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('TransferLog');

  if (!sheet) {
    throw new Error('TransferLog sheet not found. Please create it before processing transfers.');
  }

  var row = [
    data.timestamp,
    data.patientId,
    data.patientName,
    data.transferDate,
    data.transferTime,
    data.fromWard,
    data.fromBed,
    data.toWard,
    data.toBed,
    data.reason,
    data.requestedBy,
    data.status,
    new Date()        // processedTimestamp
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();
}

/**
 * Updates the BedOccupancyTable for both source and destination beds.
 * Source bed (fromBed) is set to Cleaning.
 * Destination bed (toBed) is set to Occupied.
 * @param {Object} data - Validated transfer data.
 * @private
 */
function updateBedOccupancyForTransfer_(data) {
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

  var fromUpdated = false;
  var toUpdated = false;
  var now = new Date();

  for (var i = 1; i < allValues.length; i++) {
    var rowWard = String(allValues[i][wardCol]).trim();
    var rowBed = String(allValues[i][bedCol]).trim();
    var rowIndex = i + 1;

    // Update source bed: set to Cleaning and clear patient
    if (rowWard === String(data.fromWard).trim() &&
        rowBed === String(data.fromBed).trim()) {
      sheet.getRange(rowIndex, statusCol + 1).setValue('Cleaning');
      if (patientIdCol !== -1) {
        sheet.getRange(rowIndex, patientIdCol + 1).setValue('');
      }
      if (lastUpdatedCol !== -1) {
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(now);
      }
      fromUpdated = true;
    }

    // Update destination bed: set to Occupied with patient
    if (rowWard === String(data.toWard).trim() &&
        rowBed === String(data.toBed).trim()) {
      sheet.getRange(rowIndex, statusCol + 1).setValue('Occupied');
      if (patientIdCol !== -1) {
        sheet.getRange(rowIndex, patientIdCol + 1).setValue(data.patientId);
      }
      if (lastUpdatedCol !== -1) {
        sheet.getRange(rowIndex, lastUpdatedCol + 1).setValue(now);
      }
      toUpdated = true;
    }

    if (fromUpdated && toUpdated) break;
  }

  if (!fromUpdated) {
    Logger.log('TransferHandler: Source bed ' + data.fromBed + ' in ward ' + data.fromWard +
      ' not found in BedOccupancyTable.');
  }

  if (!toUpdated) {
    Logger.log('TransferHandler: Destination bed ' + data.toBed + ' in ward ' + data.toWard +
      ' not found in BedOccupancyTable. Adding new row.');
    var newRow = [];
    for (var j = 0; j < headerRow.length; j++) newRow[j] = '';
    newRow[wardCol] = data.toWard;
    newRow[bedCol] = data.toBed;
    newRow[statusCol] = 'Occupied';
    if (patientIdCol !== -1) newRow[patientIdCol] = data.patientId;
    if (lastUpdatedCol !== -1) newRow[lastUpdatedCol] = now;
    sheet.appendRow(newRow);
  }

  SpreadsheetApp.flush();
}

/**
 * Updates the AdmissionsLog to reflect the new ward and bed for the transferred patient.
 * @param {Object} data - Validated transfer data.
 * @private
 */
function updateAdmissionRecordForTransfer_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AdmissionsLog');

  if (!sheet) {
    Logger.log('TransferHandler: AdmissionsLog not found. Skipping admission record update.');
    return;
  }

  var dataRange = sheet.getDataRange();
  var allValues = dataRange.getValues();
  var headerRow = allValues[0];

  var patientIdCol = headerRow.indexOf('PatientId');
  var wardCol = headerRow.indexOf('Ward');
  var bedCol = headerRow.indexOf('Bed');
  var statusCol = headerRow.indexOf('AdmissionStatus');

  if (patientIdCol === -1) patientIdCol = 1;
  if (wardCol === -1 || bedCol === -1) {
    Logger.log('TransferHandler: Ward/Bed columns not found in AdmissionsLog.');
    return;
  }

  // Find the most recent active admission for this patient (search bottom-up)
  for (var i = allValues.length - 1; i >= 1; i--) {
    var isActiveAdmission = (statusCol === -1) ||
      String(allValues[i][statusCol]).trim() === 'Active';

    if (String(allValues[i][patientIdCol]).trim() === String(data.patientId).trim() &&
        isActiveAdmission) {
      var rowIndex = i + 1;
      sheet.getRange(rowIndex, wardCol + 1).setValue(data.toWard);
      sheet.getRange(rowIndex, bedCol + 1).setValue(data.toBed);
      SpreadsheetApp.flush();
      break;
    }
  }
}

/**
 * Checks capacity alerts for the destination ward after a transfer.
 * @param {Object} data - Validated transfer data.
 * @private
 */
function checkTransferCapacityAlerts_(data) {
  try {
    AlertEngine.checkCapacity(data.toWard);
  } catch (err) {
    Logger.log('TransferHandler: Capacity alert check failed for ward ' + data.toWard +
      ' - ' + err.message);
  }
}
