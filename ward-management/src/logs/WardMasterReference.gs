/**
 * WardMasterReference — Reads and writes ward metadata from the
 * Ref_WardMaster sheet tab.
 *
 * Expected columns:
 *   wardCode | wardName | department | floor | totalBeds |
 *   managerName | managerEmail | phone | status | notes | updatedAt
 *
 * Dependencies: Config.gs (getSheet)
 */

var WardMasterReference = (function () {

  var SHEET_NAME = 'Ref_WardMaster';

  var HEADERS = [
    'wardCode',
    'wardName',
    'department',
    'floor',
    'totalBeds',
    'managerName',
    'managerEmail',
    'phone',
    'status',
    'notes',
    'updatedAt'
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

  /**
   * Find the 1-based row index for a wardCode. Returns -1 if not found.
   */
  function findWardRow_(wardCode) {
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last <= 1) return -1;

    var codes = sh.getRange(2, 1, last - 1, 1).getValues();
    var target = String(wardCode).trim().toUpperCase();

    for (var i = 0; i < codes.length; i++) {
      if (String(codes[i][0]).trim().toUpperCase() === target) {
        return i + 2;
      }
    }
    return -1;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Get a single ward's details by its code.
   *
   * @param {string} wardCode
   * @return {Object|null}  Ward object or null if not found.
   */
  function getWard(wardCode) {
    var target = String(wardCode).trim().toUpperCase();
    var rows = allRows_();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].wardCode).trim().toUpperCase() === target) {
        return rows[i];
      }
    }
    return null;
  }

  /**
   * Return every ward record in the reference sheet.
   *
   * @return {Object[]}
   */
  function getAllWards() {
    return allRows_();
  }

  /**
   * Get total bed count for a ward.
   *
   * @param {string} wardCode
   * @return {number|null}
   */
  function getTotalBeds(wardCode) {
    var ward = getWard(wardCode);
    if (!ward) return null;
    var n = Number(ward.totalBeds);
    return isNaN(n) ? null : n;
  }

  /**
   * Get the ward manager's name and email.
   *
   * @param {string} wardCode
   * @return {{name: string, email: string}|null}
   */
  function getWardManager(wardCode) {
    var ward = getWard(wardCode);
    if (!ward) return null;
    return {
      name:  String(ward.managerName  || '').trim(),
      email: String(ward.managerEmail || '').trim()
    };
  }

  /**
   * Update one or more fields for an existing ward.
   *
   * @param {string} wardCode   The ward to update (must already exist).
   * @param {Object} updates    Key-value pairs matching HEADERS fields.
   * @return {boolean}          True if the ward was found and updated.
   */
  function updateWard(wardCode, updates) {
    if (!updates || typeof updates !== 'object') return false;

    var rowIdx = findWardRow_(wardCode);
    if (rowIdx === -1) return false;

    var sh = sheet_();
    var currentValues = sh.getRange(rowIdx, 1, 1, HEADERS.length).getValues()[0];

    var newValues = HEADERS.map(function (h, i) {
      if (h === 'wardCode') return currentValues[i]; // never change the PK
      if (updates.hasOwnProperty(h)) return updates[h];
      return currentValues[i];
    });

    // Always stamp updatedAt when a change is made
    var updatedAtIdx = HEADERS.indexOf('updatedAt');
    newValues[updatedAtIdx] = new Date();

    sh.getRange(rowIdx, 1, 1, HEADERS.length).setValues([newValues]);
    return true;
  }

  /* ------------------------------------------------------------------ */

  return {
    getWard:        getWard,
    getAllWards:     getAllWards,
    getTotalBeds:   getTotalBeds,
    getWardManager: getWardManager,
    updateWard:     updateWard
  };

})();
