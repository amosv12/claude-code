/**
 * SupplyShortageHandler.gs
 * Handles Google Forms onFormSubmit events for supply shortage reports.
 * Validates input, writes to ShortagesTable, and sends alerts for
 * Critical priority shortages.
 */

/**
 * Triggered when the Supply Shortage form is submitted.
 * @param {Object} e - The form submit event object.
 * @param {string[]} e.values - Array of response values in column order.
 * @param {Range} e.range - The range in the response sheet.
 */
function onSupplyShortageSubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    Logger.log('SupplyShortageHandler: Could not acquire lock. Submission will be retried.');
    throw err;
  }

  try {
    var values = e.values;

    var rawData = {
      timestamp: values[0],
      date: values[1],
      ward: values[2],
      category: values[3],
      itemName: values[4],
      qtyNeeded: values[5],
      currentStock: values[6],
      priority: values[7],
      impact: values[8],
      reportedBy: values[9]
    };

    Logger.log('SupplyShortageHandler: Processing supply shortage - ' +
      rawData.itemName + ' (' + rawData.priority + ') in ' + rawData.ward);

    var validationResult = ValidationEngine.validate('supplyShortage', rawData);

    if (!validationResult.isValid) {
      Logger.log('SupplyShortageHandler: Validation failed for ' + rawData.itemName +
        '. Errors: ' + validationResult.errors.join('; '));
      return;
    }

    var validatedData = validationResult.data;

    var shortageId = writeToShortagesTable_(validatedData);
    checkForDuplicateShortage_(validatedData);
    sendSupplyAlertIfNeeded_(validatedData, shortageId);

    Logger.log('SupplyShortageHandler: Successfully processed shortage ' + shortageId +
      ' - ' + validatedData.itemName + ' in ' + validatedData.ward);

  } catch (err) {
    Logger.log('SupplyShortageHandler: Unexpected error - ' + err.message +
      '\nStack: ' + err.stack);
    try {
      AlertEngine.sendImmediateAlert('system_error', {
        handler: 'SupplyShortageHandler',
        error: err.message,
        ward: (e.values && e.values[2]) || 'unknown'
      });
    } catch (alertErr) {
      Logger.log('SupplyShortageHandler: Failed to send error alert - ' + alertErr.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Writes the validated shortage data to the ShortagesTable sheet.
 * @param {Object} data - Validated supply shortage data.
 * @returns {string} The generated shortage ID.
 * @private
 */
function writeToShortagesTable_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ShortagesTable');

  if (!sheet) {
    throw new Error('ShortagesTable sheet not found. Please create it before processing shortage reports.');
  }

  // Generate a unique shortage ID: SHT-YYYYMMDD-XXXX
  var dateStr = '';
  if (data.date instanceof Date) {
    dateStr = Utilities.formatDate(data.date, Session.getScriptTimeZone(), 'yyyyMMdd');
  } else {
    var parsed = new Date(data.date);
    if (!isNaN(parsed.getTime())) {
      dateStr = Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyyMMdd');
    } else {
      dateStr = String(data.date).replace(/[^0-9]/g, '').substring(0, 8);
    }
  }

  var lastRow = sheet.getLastRow();
  var seqNum = String(lastRow).padStart(4, '0');
  var shortageId = 'SHT-' + dateStr + '-' + seqNum;

  var deficit = Number(data.qtyNeeded) - Number(data.currentStock);

  var row = [
    shortageId,
    data.timestamp,
    data.date,
    data.ward,
    data.category,
    data.itemName,
    data.qtyNeeded,
    data.currentStock,
    deficit > 0 ? deficit : 0,
    data.priority,
    data.impact,
    data.reportedBy,
    'Open',           // shortageStatus
    new Date()        // processedTimestamp
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();

  return shortageId;
}

/**
 * Checks if a similar shortage has been reported recently for the same ward and item.
 * Logs a warning if a duplicate is found within the last 24 hours.
 * @param {Object} data - Validated supply shortage data.
 * @private
 */
function checkForDuplicateShortage_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ShortagesTable');

  if (!sheet || sheet.getLastRow() <= 1) {
    return;
  }

  var dataRange = sheet.getDataRange();
  var allValues = dataRange.getValues();
  var headerRow = allValues[0];

  var wardCol = headerRow.indexOf('Ward');
  var itemCol = headerRow.indexOf('ItemName');
  var statusCol = headerRow.indexOf('ShortageStatus');
  var timestampCol = headerRow.indexOf('Timestamp');

  if (wardCol === -1 || itemCol === -1) {
    // Try by column position: ward=3, itemName=5
    wardCol = 3;
    itemCol = 5;
  }

  var cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 24);

  var duplicateCount = 0;

  for (var i = allValues.length - 1; i >= 1; i--) {
    // Stop searching if we go past the 24-hour window
    var rowTimestamp = new Date(allValues[i][timestampCol !== -1 ? timestampCol : 1]);
    if (rowTimestamp < cutoff) break;

    var isOpen = (statusCol === -1) || String(allValues[i][statusCol]).trim() === 'Open';

    if (String(allValues[i][wardCol]).trim() === String(data.ward).trim() &&
        String(allValues[i][itemCol]).trim() === String(data.itemName).trim() &&
        isOpen) {
      duplicateCount++;
    }
  }

  // Count > 1 because the current entry was already written
  if (duplicateCount > 1) {
    Logger.log('SupplyShortageHandler: Duplicate shortage detected - ' + data.itemName +
      ' in ' + data.ward + ' has been reported ' + duplicateCount +
      ' times in the last 24 hours.');
  }
}

/**
 * Sends an immediate alert if the shortage priority is Critical.
 * @param {Object} data - Validated supply shortage data.
 * @param {string} shortageId - The generated shortage ID.
 * @private
 */
function sendSupplyAlertIfNeeded_(data, shortageId) {
  var priority = String(data.priority).trim();

  if (priority === 'Critical') {
    Logger.log('SupplyShortageHandler: Sending immediate alert for critical shortage ' +
      shortageId);

    var deficit = Number(data.qtyNeeded) - Number(data.currentStock);

    try {
      AlertEngine.sendImmediateAlert('supply_shortage', {
        shortageId: shortageId,
        ward: data.ward,
        category: data.category,
        itemName: data.itemName,
        qtyNeeded: data.qtyNeeded,
        currentStock: data.currentStock,
        deficit: deficit > 0 ? deficit : 0,
        impact: data.impact,
        reportedBy: data.reportedBy
      });
    } catch (err) {
      Logger.log('SupplyShortageHandler: Failed to send supply alert for ' + shortageId +
        ' - ' + err.message);
    }
  }
}
