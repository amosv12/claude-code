/**
 * OperationalUpdateHandler.gs
 * Handles Google Forms onFormSubmit events for operational updates.
 * Validates input, writes to OperationalUpdateLog, and sends alerts
 * for Critical priority updates.
 */

/**
 * Triggered when the Operational Update form is submitted.
 * @param {Object} e - The form submit event object.
 * @param {string[]} e.values - Array of response values in column order.
 * @param {Range} e.range - The range in the response sheet.
 */
function onOperationalUpdateSubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    Logger.log('OperationalUpdateHandler: Could not acquire lock. Submission will be retried.');
    throw err;
  }

  try {
    var values = e.values;

    var rawData = {
      timestamp: values[0],
      ward: values[1],
      submittedBy: values[2],
      category: values[3],
      priority: values[4],
      description: values[5],
      actionTaken: values[6]
    };

    Logger.log('OperationalUpdateHandler: Processing update for ' + rawData.ward +
      ' - ' + rawData.category + ' (' + rawData.priority + ')');

    var validationResult = ValidationEngine.validate('operationalUpdate', rawData);

    if (!validationResult.isValid) {
      Logger.log('OperationalUpdateHandler: Validation failed. Errors: ' +
        validationResult.errors.join('; '));
      return;
    }

    var validatedData = validationResult.data;

    var updateId = writeToOperationalUpdateLog_(validatedData);
    sendOperationalAlertIfNeeded_(validatedData, updateId);

    Logger.log('OperationalUpdateHandler: Successfully processed update ' + updateId +
      ' for ' + validatedData.ward);

  } catch (err) {
    Logger.log('OperationalUpdateHandler: Unexpected error - ' + err.message +
      '\nStack: ' + err.stack);
    try {
      AlertEngine.sendImmediateAlert('system_error', {
        handler: 'OperationalUpdateHandler',
        error: err.message,
        ward: (e.values && e.values[1]) || 'unknown'
      });
    } catch (alertErr) {
      Logger.log('OperationalUpdateHandler: Failed to send error alert - ' + alertErr.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Writes the validated operational update to the OperationalUpdateLog sheet.
 * @param {Object} data - Validated operational update data.
 * @returns {string} The generated update ID.
 * @private
 */
function writeToOperationalUpdateLog_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('OperationalUpdateLog');

  if (!sheet) {
    throw new Error('OperationalUpdateLog sheet not found. Please create it before processing updates.');
  }

  // Generate a unique update ID: OPS-YYYYMMDDHHMMSS-XXXX
  var now = new Date();
  var dateTimeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  var lastRow = sheet.getLastRow();
  var seqNum = String(lastRow).padStart(4, '0');
  var updateId = 'OPS-' + dateTimeStr + '-' + seqNum;

  var row = [
    updateId,
    data.timestamp,
    data.ward,
    data.submittedBy,
    data.category,
    data.priority,
    data.description,
    data.actionTaken || '',
    'Open',           // updateStatus
    new Date()        // processedTimestamp
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();

  return updateId;
}

/**
 * Sends an immediate alert if the operational update priority is Critical.
 * @param {Object} data - Validated operational update data.
 * @param {string} updateId - The generated update ID.
 * @private
 */
function sendOperationalAlertIfNeeded_(data, updateId) {
  var priority = String(data.priority).trim();

  if (priority === 'Critical') {
    Logger.log('OperationalUpdateHandler: Sending immediate alert for critical update ' +
      updateId);

    try {
      AlertEngine.sendImmediateAlert('operational_update', {
        updateId: updateId,
        ward: data.ward,
        category: data.category,
        priority: priority,
        description: data.description,
        actionTaken: data.actionTaken || 'None specified',
        submittedBy: data.submittedBy
      });
    } catch (err) {
      Logger.log('OperationalUpdateHandler: Failed to send alert for ' + updateId +
        ' - ' + err.message);
    }
  }
}
