/**
 * StaffingTable — Manages staffing-level records in the Log_Staffing
 * sheet tab.  Each row captures the actual vs. required nurse/doctor
 * counts for a specific ward, shift, and date.
 *
 * Dependencies: Config.gs (getSheet), BedOccupancyTable (for ratio calc)
 */

var StaffingTable = (function () {

  var SHEET_NAME = 'Log_Staffing';

  var HEADERS = [
    'recordId',
    'ward',
    'date',
    'shift',
    'nursesRequired',
    'nursesActual',
    'doctorsRequired',
    'doctorsActual',
    'supportStaff',
    'nurseShortage',
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
   * Append a validated staffing record.
   * @param {Object} validatedData  Output of ValidationEngine.validateStaffing().data
   * @return {string} recordId
   */
  function append(validatedData) {
    var d = validatedData;
    var sh = sheet_();
    sh.appendRow([
      d.recordId,
      d.ward,
      d.date,
      d.shift,
      d.nursesRequired   !== null ? d.nursesRequired   : '',
      d.nursesActual     !== null ? d.nursesActual     : '',
      d.doctorsRequired  !== null ? d.doctorsRequired  : '',
      d.doctorsActual    !== null ? d.doctorsActual    : '',
      d.supportStaff     !== null ? d.supportStaff     : '',
      d.nurseShortage    !== null ? d.nurseShortage    : '',
      d.notes            || '',
      d.submittedBy      || '',
      d.submittedAt      || new Date()
    ]);
    return d.recordId;
  }

  /**
   * Retrieve the staffing record for a specific ward, shift, and date.
   *
   * @param {string} ward
   * @param {string} shift  One of: day, evening, night
   * @param {Date|string} date
   * @return {Object|null}
   */
  function getByWardAndShift(ward, shift, date) {
    var w = String(ward).trim().toUpperCase();
    var s = String(shift).trim().toLowerCase();
    var d = dayKey_(date);

    var rows = allRows_();
    for (var i = rows.length - 1; i >= 0; i--) {
      var r = rows[i];
      if (String(r.ward).trim().toUpperCase() === w &&
          String(r.shift).trim().toLowerCase() === s &&
          dayKey_(r.date) === d) {
        return r;
      }
    }
    return null;
  }

  /**
   * All staffing data for a ward within an optional date range.
   *
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
        var rDay = dayKey_(r.date);
        if (start !== null && rDay < start) return false;
        if (end   !== null && rDay > end)   return false;
      }
      return true;
    });
  }

  /**
   * Calculate the patient-to-nurse ratio for a ward during a given
   * shift and date.  Uses BedOccupancyTable to determine occupied beds.
   *
   * @param {string} ward
   * @param {string} shift
   * @param {Date|string} date
   * @return {{ratio: number|null, patients: number, nurses: number}}
   */
  function getNurseRatio(ward, shift, date) {
    var record = getByWardAndShift(ward, shift, date);
    var nurses = record ? Number(record.nursesActual) : 0;

    // Get current occupied beds from BedOccupancyTable
    var patients = 0;
    if (typeof BedOccupancyTable !== 'undefined') {
      var occ = BedOccupancyTable.getWardOccupancy(ward);
      patients = occ.occupied || 0;
    }

    var ratio = null;
    if (nurses > 0) {
      ratio = Math.round((patients / nurses) * 100) / 100;
    }

    return {
      ratio: ratio,
      patients: patients,
      nurses: nurses
    };
  }

  /**
   * Return all staffing records that show a nurse shortage
   * (nurseShortage > 0) within the given date range.
   *
   * @param {Date|string} startDate
   * @param {Date|string} endDate
   * @return {Object[]}
   */
  function getShortages(startDate, endDate) {
    var start = startDate ? dayKey_(startDate) : null;
    var end   = endDate   ? dayKey_(endDate)   : null;

    return allRows_().filter(function (r) {
      var shortage = Number(r.nurseShortage);
      if (isNaN(shortage) || shortage <= 0) return false;

      if (start !== null || end !== null) {
        var rDay = dayKey_(r.date);
        if (start !== null && rDay < start) return false;
        if (end   !== null && rDay > end)   return false;
      }
      return true;
    });
  }

  /* ------------------------------------------------------------------ */

  return {
    append:            append,
    getByWardAndShift: getByWardAndShift,
    getByWard:         getByWard,
    getNurseRatio:     getNurseRatio,
    getShortages:      getShortages
  };

})();
