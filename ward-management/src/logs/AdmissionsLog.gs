/**
 * AdmissionsLog — Reads and writes admission records to the
 * Log_Admissions sheet tab.
 *
 * Dependencies: Config.gs (getSheet), ValidationEngine.gs
 */

var AdmissionsLog = (function () {

  var SHEET_NAME = 'Log_Admissions';

  var HEADERS = [
    'recordId',
    'patientId',
    'patientName',
    'admissionDate',
    'admissionTime',
    'ward',
    'bedNumber',
    'admittingDoctor',
    'diagnosis',
    'admissionSource',
    'priority',
    'notes',
    'submittedBy',
    'submittedAt'
  ];

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Returns the target sheet, creating headers on first use.
   */
  function sheet_() {
    var sh = getSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }
    return sh;
  }

  /**
   * Reads all data rows (excluding the header) and returns them as an
   * array of objects keyed by HEADERS.
   */
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

  /**
   * Normalise a Date for day-level comparison (strips time).
   */
  function dayKey_(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Append a validated admission record to the sheet.
   * @param {Object} validatedData  Output of ValidationEngine.validateAdmission().data
   * @return {string} The recordId of the appended row.
   */
  function append(validatedData) {
    var d = validatedData;
    var sh = sheet_();
    sh.appendRow([
      d.recordId,
      d.patientId,
      d.patientName,
      d.admissionDate,
      d.admissionTime,
      d.ward,
      d.bedNumber,
      d.admittingDoctor,
      d.diagnosis        || '',
      d.admissionSource  || '',
      d.priority         || '',
      d.notes            || '',
      d.submittedBy      || '',
      d.submittedAt      || new Date()
    ]);
    return d.recordId;
  }

  /**
   * Find all admission records for a given patient.
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
   * Filter admissions by ward and optional date range.
   * @param {string} ward
   * @param {Date|string} [startDate]
   * @param {Date|string} [endDate]
   * @return {Object[]}
   */
  function getByWard(ward, startDate, endDate) {
    var w = String(ward).trim().toUpperCase();
    var start = startDate ? dayKey_(startDate) : null;
    var end   = endDate   ? dayKey_(endDate)   : null;

    return allRows_().filter(function (r) {
      if (String(r.ward).trim().toUpperCase() !== w) return false;
      if (start !== null || end !== null) {
        var rDay = dayKey_(r.admissionDate);
        if (start !== null && rDay < start) return false;
        if (end   !== null && rDay > end)   return false;
      }
      return true;
    });
  }

  /**
   * Get all admissions within a date range.
   * @param {Date|string} startDate
   * @param {Date|string} endDate
   * @return {Object[]}
   */
  function getByDateRange(startDate, endDate) {
    var start = dayKey_(startDate);
    var end   = dayKey_(endDate);

    return allRows_().filter(function (r) {
      var rDay = dayKey_(r.admissionDate);
      return rDay >= start && rDay <= end;
    });
  }

  /**
   * Count admissions for a specific ward on a specific date.
   * @param {string} ward
   * @param {Date|string} date
   * @return {number}
   */
  function count(ward, date) {
    var w   = String(ward).trim().toUpperCase();
    var day = dayKey_(date);

    return allRows_().reduce(function (n, r) {
      if (String(r.ward).trim().toUpperCase() === w && dayKey_(r.admissionDate) === day) {
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
    getByDateRange: getByDateRange,
    count:          count
  };

})();
