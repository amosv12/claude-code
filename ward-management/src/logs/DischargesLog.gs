/**
 * DischargesLog — Reads and writes discharge records to the
 * Log_Discharges sheet tab.
 *
 * Dependencies: Config.gs (getSheet), ValidationEngine.gs
 */

var DischargesLog = (function () {

  var SHEET_NAME = 'Log_Discharges';

  var HEADERS = [
    'recordId',
    'patientId',
    'patientName',
    'dischargeDate',
    'dischargeTime',
    'ward',
    'bedNumber',
    'dischargingDoctor',
    'dischargeType',
    'dischargeDestination',
    'admissionDate',
    'lengthOfStay',
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

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Append a validated discharge record.
   * @param {Object} validatedData  Output of ValidationEngine.validateDischarge().data
   * @return {string} The recordId of the appended row.
   */
  function append(validatedData) {
    var d = validatedData;
    var sh = sheet_();
    sh.appendRow([
      d.recordId,
      d.patientId,
      d.patientName,
      d.dischargeDate,
      d.dischargeTime,
      d.ward,
      d.bedNumber,
      d.dischargingDoctor,
      d.dischargeType          || '',
      d.dischargeDestination   || '',
      d.admissionDate          || '',
      d.lengthOfStay !== null ? d.lengthOfStay : '',
      d.notes                  || '',
      d.submittedBy            || '',
      d.submittedAt            || new Date()
    ]);
    return d.recordId;
  }

  /**
   * Find all discharge records for a given patient.
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
   * Filter discharges by ward and optional date range.
   * @param {string} ward
   * @param {Date|string} [startDate]
   * @param {Date|string} [endDate]
   * @return {Object[]}
   */
  function getByWard(ward, startDate, endDate) {
    var w     = String(ward).trim().toUpperCase();
    var start = startDate ? dayKey_(startDate) : null;
    var end   = endDate   ? dayKey_(endDate)   : null;

    return allRows_().filter(function (r) {
      if (String(r.ward).trim().toUpperCase() !== w) return false;
      if (start !== null || end !== null) {
        var rDay = dayKey_(r.dischargeDate);
        if (start !== null && rDay < start) return false;
        if (end   !== null && rDay > end)   return false;
      }
      return true;
    });
  }

  /**
   * Calculate the Length of Stay in days between two dates.
   * Returns 0 for same-day discharge.
   *
   * @param {Date|string} admissionDate
   * @param {Date|string} dischargeDate
   * @return {number|null}  Days, or null if inputs are invalid.
   */
  function calculateLOS(admissionDate, dischargeDate) {
    var ad = admissionDate instanceof Date ? admissionDate : new Date(admissionDate);
    var dd = dischargeDate instanceof Date ? dischargeDate : new Date(dischargeDate);
    if (isNaN(ad.getTime()) || isNaN(dd.getTime())) return null;
    var diff = Math.ceil((dd.getTime() - ad.getTime()) / 86400000);
    return diff >= 0 ? diff : null;
  }

  /**
   * Count discharges for a specific ward on a specific date.
   * @param {string} ward
   * @param {Date|string} date
   * @return {number}
   */
  function count(ward, date) {
    var w   = String(ward).trim().toUpperCase();
    var day = dayKey_(date);

    return allRows_().reduce(function (n, r) {
      if (String(r.ward).trim().toUpperCase() === w && dayKey_(r.dischargeDate) === day) {
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
    calculateLOS:   calculateLOS,
    count:          count
  };

})();
