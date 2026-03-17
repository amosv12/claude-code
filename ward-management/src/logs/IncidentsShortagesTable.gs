/**
 * IncidentsTable & ShortagesTable — Manage incident and supply-shortage
 * records in the Log_Incidents and Log_Shortages sheet tabs.
 *
 * Dependencies: Config.gs (getSheet)
 */

/* ====================================================================
 *  IncidentsTable
 * ==================================================================== */

var IncidentsTable = (function () {

  var SHEET_NAME = 'Log_Incidents';

  var HEADERS = [
    'recordId',
    'ward',
    'incidentDate',
    'incidentTime',
    'severity',
    'incidentType',
    'description',
    'patientId',
    'actionTaken',
    'reportedBy',
    'status',
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
   * Append a validated incident record.
   * @param {Object} validatedData  Output of ValidationEngine.validateIncident().data
   * @return {string} recordId
   */
  function appendIncident(validatedData) {
    var d = validatedData;
    var sh = sheet_();
    sh.appendRow([
      d.recordId,
      d.ward,
      d.incidentDate,
      d.incidentTime,
      d.severity,
      d.incidentType,
      d.description   || '',
      d.patientId     || '',
      d.actionTaken   || '',
      d.reportedBy    || '',
      d.status        || 'open',
      d.submittedAt   || new Date()
    ]);
    return d.recordId;
  }

  /**
   * Filter incidents by ward and optional date range.
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
        var rDay = dayKey_(r.incidentDate);
        if (start !== null && rDay < start) return false;
        if (end   !== null && rDay > end)   return false;
      }
      return true;
    });
  }

  /**
   * Filter incidents by severity level and optional date range.
   * @param {string} severity  One of: low, medium, high, critical
   * @param {Date|string} [startDate]
   * @param {Date|string} [endDate]
   * @return {Object[]}
   */
  function getBySeverity(severity, startDate, endDate) {
    var sev   = String(severity).trim().toLowerCase();
    var start = startDate ? dayKey_(startDate) : null;
    var end   = endDate   ? dayKey_(endDate)   : null;

    return allRows_().filter(function (r) {
      if (String(r.severity).trim().toLowerCase() !== sev) return false;
      if (start !== null || end !== null) {
        var rDay = dayKey_(r.incidentDate);
        if (start !== null && rDay < start) return false;
        if (end   !== null && rDay > end)   return false;
      }
      return true;
    });
  }

  /**
   * Count incidents for a ward on a specific date.
   * @param {string} ward
   * @param {Date|string} date
   * @return {number}
   */
  function countByWard(ward, date) {
    var w   = String(ward).trim().toUpperCase();
    var day = dayKey_(date);

    return allRows_().reduce(function (n, r) {
      if (String(r.ward).trim().toUpperCase() === w && dayKey_(r.incidentDate) === day) {
        return n + 1;
      }
      return n;
    }, 0);
  }

  return {
    appendIncident: appendIncident,
    getByWard:      getByWard,
    getBySeverity:  getBySeverity,
    countByWard:    countByWard
  };

})();


/* ====================================================================
 *  ShortagesTable
 * ==================================================================== */

var ShortagesTable = (function () {

  var SHEET_NAME = 'Log_Shortages';

  var HEADERS = [
    'recordId',
    'ward',
    'reportDate',
    'itemName',
    'category',
    'priority',
    'quantityNeeded',
    'quantityAvailable',
    'description',
    'impact',
    'reportedBy',
    'status',
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
   * Append a validated supply-shortage record.
   * @param {Object} validatedData  Output of ValidationEngine.validateSupplyShortage().data
   * @return {string} recordId
   */
  function appendShortage(validatedData) {
    var d = validatedData;
    var sh = sheet_();
    sh.appendRow([
      d.recordId,
      d.ward,
      d.reportDate,
      d.itemName,
      d.category           || '',
      d.priority,
      d.quantityNeeded     !== null ? d.quantityNeeded     : '',
      d.quantityAvailable  !== null ? d.quantityAvailable  : '',
      d.description        || '',
      d.impact             || '',
      d.reportedBy         || '',
      d.status             || 'open',
      d.submittedAt        || new Date()
    ]);
    return d.recordId;
  }

  /**
   * Filter shortages by ward and optional date range.
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
        var rDay = dayKey_(r.reportDate);
        if (start !== null && rDay < start) return false;
        if (end   !== null && rDay > end)   return false;
      }
      return true;
    });
  }

  /**
   * Filter shortages by priority level.
   * @param {string} priority  One of: low, medium, high, urgent
   * @return {Object[]}
   */
  function getByPriority(priority) {
    var p = String(priority).trim().toLowerCase();
    return allRows_().filter(function (r) {
      return String(r.priority).trim().toLowerCase() === p;
    });
  }

  /**
   * Count shortages for a ward on a specific date.
   * @param {string} ward
   * @param {Date|string} date
   * @return {number}
   */
  function countByWard(ward, date) {
    var w   = String(ward).trim().toUpperCase();
    var day = dayKey_(date);

    return allRows_().reduce(function (n, r) {
      if (String(r.ward).trim().toUpperCase() === w && dayKey_(r.reportDate) === day) {
        return n + 1;
      }
      return n;
    }, 0);
  }

  return {
    appendShortage: appendShortage,
    getByWard:      getByWard,
    getByPriority:  getByPriority,
    countByWard:    countByWard
  };

})();
