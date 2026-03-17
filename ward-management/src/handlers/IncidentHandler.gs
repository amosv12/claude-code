/**
 * IncidentHandler.gs
 * Handles Google Forms onFormSubmit events for incident reports.
 * Validates input, writes to IncidentsTable, and sends immediate alerts
 * for Critical or High severity incidents.
 */

/**
 * Triggered when the Incident form is submitted.
 * @param {Object} e - The form submit event object.
 * @param {string[]} e.values - Array of response values in column order.
 * @param {Range} e.range - The range in the response sheet.
 */
function onIncidentSubmit(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    Logger.log('IncidentHandler: Could not acquire lock. Submission will be retried.');
    throw err;
  }

  try {
    var values = e.values;

    var rawData = {
      timestamp: values[0],
      date: values[1],
      time: values[2],
      ward: values[3],
      type: values[4],
      severity: values[5],
      description: values[6],
      patientsAffected: values[7],
      actionTaken: values[8],
      reportedBy: values[9],
      escalatedTo: values[10]
    };

    Logger.log('IncidentHandler: Processing incident report - ' + rawData.type +
      ' (' + rawData.severity + ') in ' + rawData.ward);

    var validationResult = ValidationEngine.validate('incident', rawData);

    if (!validationResult.isValid) {
      Logger.log('IncidentHandler: Validation failed. Errors: ' +
        validationResult.errors.join('; '));
      return;
    }

    var validatedData = validationResult.data;

    var incidentId = writeToIncidentsTable_(validatedData);
    sendIncidentAlertIfNeeded_(validatedData, incidentId);

    Logger.log('IncidentHandler: Successfully processed incident ' + incidentId +
      ' - ' + validatedData.type + ' in ' + validatedData.ward);

  } catch (err) {
    Logger.log('IncidentHandler: Unexpected error - ' + err.message + '\nStack: ' + err.stack);
    try {
      AlertEngine.sendImmediateAlert('system_error', {
        handler: 'IncidentHandler',
        error: err.message,
        ward: (e.values && e.values[3]) || 'unknown'
      });
    } catch (alertErr) {
      Logger.log('IncidentHandler: Failed to send error alert - ' + alertErr.message);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Writes the validated incident data to the IncidentsTable sheet.
 * @param {Object} data - Validated incident data.
 * @returns {string} The generated incident ID.
 * @private
 */
function writeToIncidentsTable_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('IncidentsTable');

  if (!sheet) {
    throw new Error('IncidentsTable sheet not found. Please create it before processing incidents.');
  }

  // Generate a unique incident ID: INC-YYYYMMDD-XXXX
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
  var incidentId = 'INC-' + dateStr + '-' + seqNum;

  var row = [
    incidentId,
    data.timestamp,
    data.date,
    data.time,
    data.ward,
    data.type,
    data.severity,
    data.description,
    data.patientsAffected,
    data.actionTaken,
    data.reportedBy,
    data.escalatedTo || '',
    'Open',           // incidentStatus
    new Date()        // processedTimestamp
  ];

  sheet.appendRow(row);
  SpreadsheetApp.flush();

  return incidentId;
}

/**
 * Sends an immediate alert if the incident severity is Critical or High.
 * @param {Object} data - Validated incident data.
 * @param {string} incidentId - The generated incident ID.
 * @private
 */
function sendIncidentAlertIfNeeded_(data, incidentId) {
  var severity = String(data.severity).trim();

  if (severity === 'Critical' || severity === 'High') {
    Logger.log('IncidentHandler: Sending immediate alert for ' + severity +
      ' severity incident ' + incidentId);

    try {
      AlertEngine.sendImmediateAlert('incident', {
        incidentId: incidentId,
        type: data.type,
        severity: severity,
        ward: data.ward,
        date: data.date,
        time: data.time,
        description: data.description,
        patientsAffected: data.patientsAffected,
        actionTaken: data.actionTaken,
        reportedBy: data.reportedBy,
        escalatedTo: data.escalatedTo || 'Not yet assigned'
      });
    } catch (err) {
      Logger.log('IncidentHandler: Failed to send incident alert for ' + incidentId +
        ' - ' + err.message);
    }
  }
}
