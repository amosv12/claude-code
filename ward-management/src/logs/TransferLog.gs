/**
 * TransferLog — Reads and writes patient transfer records to the
 * Log_Transfers sheet tab.
 *
 * Dependencies: Config.gs (getSheet), ValidationEngine.gs
 */

var TransferLog = (function () {

  var SHEET_NAME = 'Log_Transfers';

  var HEADERS = [
    'recordId',
    'patientId',
    'patientName',
    'transferDate',
    'transferTime',
    'fromWard',
    'toWard',
    'fromBed',
    'toBed',
    'transferType',
    'status',
    'reason',
    'authorizedBy',
    'notes',
    'submittedBy',
    'submittedAt'
  ];

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  function sheet_() {
    var sh = getSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }
    return sh;
  }

  function allRows_() {
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last <= 1) return [];
    var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
    return values.map(function (row) {
      var obj = {};
      HEADERS.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
  }

  function dayKey_(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  /**
   * Find the 1-based row index for a given recordId (returns -1 if not found).
   */
  function findRowIndex_(recordId) {
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last <= 1) return -1;
    var ids = sh.getRange(2, 1, last - 1, 1).getValues(); // column A = recordId
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(recordId).trim()) {
        return i + 2; // +2 because data starts at row 2
      }
    }
    return -1;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Append a validated transfer record.
   * @param {Object} validatedData  Output of ValidationEngine.validateTransfer().data
   * @return {string} The recordId of the appended row.
   */
  function append(validatedData) {
    var d = validatedData;
    var sh = sheet_();
    sh.appendRow([
      d.recordId,
      d.patientId,
      d.patientName,
      d.transferDate,
      d.transferTime,
      d.fromWard,
      d.toWard,
      d.fromBed   || '',
      d.toBed     || '',
      d.transferType || '',
      d.status       || 'pending',
      d.reason       || '',
      d.authorizedBy || '',
      d.notes        || '',
      d.submittedBy  || '',
      d.submittedAt  || new Date()
    ]);
    return d.recordId;
  }

  /**
   * Find all transfer records for a given patient.
   * @param {string} patientId
   * @return {Object[]}
   */
  function getByPatientId(patientId) {
    var pid = String(patientId).trim().toUpperCase();
    return allRows_().filter(function (r) {
      return String(r.patientId).trim().toUpperCase() === pid;
    });
  }

  /**
   * Filter transfers by ward and direction, with optional date range.
   *
   * @param {string} ward       Ward code to match.
   * @param {string} direction  'from' matches fromWard; 'to' matches toWard.
   * @param {Date|string} [startDate]
   * @param {Date|string} [endDate]
   * @return {Object[]}
   */
  function getByWard(ward, direction, startDate, endDate) {
    var w     = String(ward).trim().toUpperCase();
    var dir   = String(direction).trim().toLowerCase();
    var start = startDate ? dayKey_(startDate) : null;
    var end   = endDate   ? dayKey_(endDate)   : null;

    return allRows_().filter(function (r) {
      var matchWard = false;
      if (dir === 'from') {
        matchWard = String(r.fromWard).trim().toUpperCase() === w;
      } else if (dir === 'to') {
        matchWard = String(r.toWard).trim().toUpperCase() === w;
      } else {
        // If direction not specified, match either
        matchWard = String(r.fromWard).trim().toUpperCase() === w ||
                    String(r.toWard).trim().toUpperCase() === w;
      }
      if (!matchWard) return false;

      if (start !== null || end !== null) {
        var rDay = dayKey_(r.transferDate);
        if (start !== null && rDay < start) return false;
        if (end   !== null && rDay > end)   return false;
      }
      return true;
    });
  }

  /**
   * Update the status column of an existing transfer record.
   *
   * @param {string} transferId  The recordId of the transfer.
   * @param {string} newStatus   One of: pending, in-transit, completed, cancelled.
   * @return {boolean} True if the row was found and updated.
   */
  function updateStatus(transferId, newStatus) {
    var VALID = ['pending', 'in-transit', 'completed', 'cancelled'];
    var status = String(newStatus).trim().toLowerCase();
    if (VALID.indexOf(status) === -1) {
      throw new Error('Invalid transfer status: ' + newStatus);
    }

    var rowIdx = findRowIndex_(transferId);
    if (rowIdx === -1) return false;

    var statusCol = HEADERS.indexOf('status') + 1; // 1-based column
    var sh = sheet_();
    sh.getRange(rowIdx, statusCol).setValue(status);
    return true;
  }

  /**
   * Count transfers involving a specific ward on a given date
   * (counts both from and to).
   *
   * @param {string} ward
   * @param {Date|string} date
   * @return {number}
   */
  function count(ward, date) {
    var w   = String(ward).trim().toUpperCase();
    var day = dayKey_(date);

    return allRows_().reduce(function (n, r) {
      var involves = String(r.fromWard).trim().toUpperCase() === w ||
                     String(r.toWard).trim().toUpperCase() === w;
      if (involves && dayKey_(r.transferDate) === day) {
        return n + 1;
      }
      return n;
    }, 0);
  }

  /* ------------------------------------------------------------------ */

  return {
    append:         append,
    getByPatientId: getByPatientId,
    getByWard:      getByWard,
    updateStatus:   updateStatus,
    count:          count
  };

})();
