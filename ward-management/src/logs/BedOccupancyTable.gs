/**
 * BedOccupancyTable — Manages the live bed-status grid in the
 * Log_BedOccupancy sheet tab.
 *
 * Each row represents one physical bed.  The sheet is structured as:
 *   ward | bedNumber | status | patientId | updatedBy | updatedAt | notes
 *
 * Dependencies: Config.gs (getSheet, WARD_LIST)
 */

var BedOccupancyTable = (function () {

  var SHEET_NAME = 'Log_BedOccupancy';

  var HEADERS = [
    'ward',
    'bedNumber',
    'status',
    'patientId',
    'updatedBy',
    'updatedAt',
    'notes'
  ];

  var VALID_STATUSES = ['occupied', 'available', 'cleaning', 'maintenance', 'blocked'];

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

  /**
   * Find the 1-based row index for a ward + bedNumber combination.
   * Returns -1 if no matching row exists.
   */
  function findBedRow_(ward, bedNumber) {
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last <= 1) return -1;

    var data = sh.getRange(2, 1, last - 1, 2).getValues(); // cols A-B
    var w = String(ward).trim().toUpperCase();
    var b = Number(bedNumber);

    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === w && Number(data[i][1]) === b) {
        return i + 2;
      }
    }
    return -1;
  }

  /**
   * Read all data rows as objects.
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

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Upsert a bed row.  If the ward + bedNumber combination already
   * exists the row is updated in place; otherwise a new row is appended.
   *
   * @param {string} ward
   * @param {number} bedNumber
   * @param {string} status       One of VALID_STATUSES.
   * @param {string} [patientId]  Required when status is 'occupied'.
   * @param {string} updatedBy
   * @param {string} [notes]
   */
  function updateBed(ward, bedNumber, status, patientId, updatedBy, notes) {
    var w = String(ward).trim().toUpperCase();
    var b = Number(bedNumber);
    var s = String(status).trim().toLowerCase();

    if (VALID_STATUSES.indexOf(s) === -1) {
      throw new Error('Invalid bed status: ' + status);
    }

    var rowData = [
      w,
      b,
      s,
      patientId || '',
      updatedBy || '',
      new Date(),
      notes     || ''
    ];

    var sh = sheet_();
    var rowIdx = findBedRow_(w, b);

    if (rowIdx !== -1) {
      sh.getRange(rowIdx, 1, 1, HEADERS.length).setValues([rowData]);
    } else {
      sh.appendRow(rowData);
    }
  }

  /**
   * Get the current status object for a single bed.
   *
   * @param {string} ward
   * @param {number} bedNumber
   * @return {Object|null}
   */
  function getBedStatus(ward, bedNumber) {
    var w = String(ward).trim().toUpperCase();
    var b = Number(bedNumber);

    var rows = allRows_();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].ward).trim().toUpperCase() === w &&
          Number(rows[i].bedNumber) === b) {
        return rows[i];
      }
    }
    return null;
  }

  /**
   * Calculate occupancy counts for a single ward.
   *
   * @param {string} ward
   * @return {{total: number, occupied: number, available: number,
   *           cleaning: number, maintenance: number, blocked: number}}
   */
  function getWardOccupancy(ward) {
    var w = String(ward).trim().toUpperCase();
    var result = {
      total: 0,
      occupied: 0,
      available: 0,
      cleaning: 0,
      maintenance: 0,
      blocked: 0
    };

    allRows_().forEach(function (r) {
      if (String(r.ward).trim().toUpperCase() !== w) return;
      result.total++;
      var s = String(r.status).trim().toLowerCase();
      if (result.hasOwnProperty(s)) {
        result[s]++;
      }
    });

    return result;
  }

  /**
   * Get occupancy stats for every ward, keyed by ward code.
   *
   * @return {Object.<string, {total, occupied, available, cleaning, maintenance, blocked}>}
   */
  function getAllOccupancy() {
    var wards = {};

    allRows_().forEach(function (r) {
      var w = String(r.ward).trim().toUpperCase();
      if (!wards[w]) {
        wards[w] = { total: 0, occupied: 0, available: 0, cleaning: 0, maintenance: 0, blocked: 0 };
      }
      wards[w].total++;
      var s = String(r.status).trim().toLowerCase();
      if (wards[w].hasOwnProperty(s)) {
        wards[w][s]++;
      }
    });

    return wards;
  }

  /**
   * List all bed numbers currently marked 'available' in a ward.
   *
   * @param {string} ward
   * @return {number[]}
   */
  function getAvailableBeds(ward) {
    var w = String(ward).trim().toUpperCase();

    return allRows_()
      .filter(function (r) {
        return String(r.ward).trim().toUpperCase() === w &&
               String(r.status).trim().toLowerCase() === 'available';
      })
      .map(function (r) { return Number(r.bedNumber); })
      .sort(function (a, b) { return a - b; });
  }

  /**
   * Initialise bed rows for every ward defined in WARD_LIST.
   *
   * WARD_LIST entries are expected to have at minimum:
   *   { code: 'WARD-A', totalBeds: 30, ... }
   *
   * All beds start with status 'available'.  Existing rows are not
   * duplicated -- the function skips beds that already have a row.
   */
  function initializeBeds() {
    if (typeof WARD_LIST === 'undefined' || !Array.isArray(WARD_LIST)) {
      throw new Error('WARD_LIST is not defined. Ensure Config.gs is loaded.');
    }

    var sh = sheet_();

    // Build a set of existing ward+bed keys for fast lookup
    var existing = {};
    allRows_().forEach(function (r) {
      var key = String(r.ward).trim().toUpperCase() + '|' + Number(r.bedNumber);
      existing[key] = true;
    });

    var newRows = [];

    WARD_LIST.forEach(function (entry) {
      var code = (typeof entry === 'string') ? entry : (entry.code || '');
      var total = (typeof entry === 'object') ? (entry.totalBeds || 0) : 0;
      code = code.toUpperCase();

      for (var bed = 1; bed <= total; bed++) {
        var key = code + '|' + bed;
        if (existing[key]) continue;
        newRows.push([code, bed, 'available', '', 'SYSTEM', new Date(), 'Initial setup']);
      }
    });

    if (newRows.length > 0) {
      var startRow = sh.getLastRow() + 1;
      sh.getRange(startRow, 1, newRows.length, HEADERS.length).setValues(newRows);
    }

    return newRows.length;
  }

  /* ------------------------------------------------------------------ */

  return {
    updateBed:        updateBed,
    getBedStatus:     getBedStatus,
    getWardOccupancy: getWardOccupancy,
    getAllOccupancy:   getAllOccupancy,
    getAvailableBeds: getAvailableBeds,
    initializeBeds:   initializeBeds
  };

})();
