/**
 * ValidationEngine — Data cleaning and validation module for the
 * Hospital Ward Management System.
 *
 * Every form submission passes through validate() before being written
 * to any log sheet.  Field-level helpers (sanitizeText, validateDate, etc.)
 * are intentionally exposed so other modules can reuse them.
 *
 * Dependencies: Config.gs  (WARD_LIST, getSheet)
 */

var ValidationEngine = (function () {

  /* ------------------------------------------------------------------ */
  /*  Constants                                                          */
  /* ------------------------------------------------------------------ */

  var FORM_TYPES = [
    'admission',
    'discharge',
    'transfer',
    'bedStatus',
    'staffing',
    'incident',
    'supplyShortage',
    'dailySummary',
    'operationalUpdate'
  ];

  var VALID_BED_STATUSES   = ['occupied', 'available', 'cleaning', 'maintenance', 'blocked'];
  var VALID_SHIFTS         = ['day', 'evening', 'night'];
  var VALID_SEVERITIES     = ['low', 'medium', 'high', 'critical'];
  var VALID_PRIORITIES     = ['low', 'medium', 'high', 'urgent'];
  var VALID_TRANSFER_DIRS  = ['internal', 'external-in', 'external-out'];
  var VALID_TRANSFER_STATS = ['pending', 'in-transit', 'completed', 'cancelled'];
  var VALID_DISCHARGE_TYPES = ['routine', 'against-medical-advice', 'transfer', 'deceased', 'other'];

  var CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  var WHITESPACE_RE    = /\s{2,}/g;
  var PATIENT_ID_RE    = /^[A-Za-z0-9\-]+$/;
  var TIME_24H_RE      = /^([01]\d|2[0-3]):([0-5]\d)$/;

  /* ------------------------------------------------------------------ */
  /*  Utility / field-level helpers                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Trim leading/trailing whitespace, collapse internal runs of whitespace
   * to a single space, and strip control characters.
   */
  function sanitizeText(text) {
    if (text === null || text === undefined) return '';
    var s = String(text);
    s = s.replace(CONTROL_CHARS_RE, '');
    s = s.trim();
    s = s.replace(WHITESPACE_RE, ' ');
    return s;
  }

  /**
   * Attempt to parse a date string (or Date object).
   * Returns a valid Date or null.
   */
  function validateDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? null : dateStr;
    }
    var parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Validate a time string in HH:MM (24-hour) format.
   * Returns the normalised string or null.
   */
  function validateTime(timeStr) {
    if (!timeStr) return null;
    var s = sanitizeText(timeStr);
    if (TIME_24H_RE.test(s)) return s;

    // Attempt to coerce Date objects that Apps Script may pass
    if (timeStr instanceof Date && !isNaN(timeStr.getTime())) {
      var hh = ('0' + timeStr.getHours()).slice(-2);
      var mm = ('0' + timeStr.getMinutes()).slice(-2);
      return hh + ':' + mm;
    }
    return null;
  }

  /**
   * Patient IDs must be non-empty and contain only letters, digits, and hyphens.
   */
  function validatePatientId(id) {
    if (!id) return null;
    var s = sanitizeText(id);
    return PATIENT_ID_RE.test(s) ? s : null;
  }

  /**
   * Ward code must exist in the global WARD_LIST array defined in Config.gs.
   */
  function validateWard(wardCode) {
    if (!wardCode) return null;
    var code = sanitizeText(wardCode).toUpperCase();
    if (typeof WARD_LIST === 'undefined') {
      // Fallback: accept any non-empty code when WARD_LIST is unavailable
      return code.length > 0 ? code : null;
    }
    for (var i = 0; i < WARD_LIST.length; i++) {
      var entry = WARD_LIST[i];
      var listCode = (typeof entry === 'string') ? entry : (entry.code || '');
      if (listCode.toUpperCase() === code) return code;
    }
    return null;
  }

  /**
   * Generic required-field check.  Returns sanitized value or pushes an
   * error and returns null.
   */
  function validateRequired(value, fieldName, errors) {
    var s = sanitizeText(value);
    if (s.length === 0) {
      if (errors) errors.push(fieldName + ' is required');
      return null;
    }
    return s;
  }

  /**
   * Validate a numeric value is within [min, max].
   * Returns the number or null.
   */
  function validateNumber(value, min, max) {
    if (value === null || value === undefined || value === '') return null;
    var n = Number(value);
    if (isNaN(n)) return null;
    if (min !== undefined && min !== null && n < min) return null;
    if (max !== undefined && max !== null && n > max) return null;
    return n;
  }

  /* ------------------------------------------------------------------ */
  /*  ID generation                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Generates a unique ID in the format PREFIX-YYYYMMDD-NNN.
   * The sequence counter resets daily and is tracked via
   * ScriptProperties.
   */
  function generateId(prefix) {
    var now = new Date();
    var datePart = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
    var key = 'seq_' + prefix + '_' + datePart;
    var props = PropertiesService.getScriptProperties();
    var seq = parseInt(props.getProperty(key) || '0', 10) + 1;
    props.setProperty(key, String(seq));
    var seqPart = ('000' + seq).slice(-3);
    return prefix.toUpperCase() + '-' + datePart + '-' + seqPart;
  }

  /* ------------------------------------------------------------------ */
  /*  Error logging                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Appends a row to the Error_Log sheet so issues are auditable.
   */
  function logError(formType, rawData, errors) {
    try {
      var sheet = getSheet('Error_Log');
      if (!sheet) return;
      var timestamp = new Date();
      var rawJson = '';
      try { rawJson = JSON.stringify(rawData); } catch (e) { rawJson = String(rawData); }
      sheet.appendRow([
        timestamp,
        formType || 'unknown',
        errors.join('; '),
        rawJson
      ]);
    } catch (e) {
      Logger.log('ValidationEngine.logError failed: ' + e.message);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Per-form-type validators                                           */
  /* ------------------------------------------------------------------ */

  function validateAdmission(raw) {
    var errors = [];
    var data = {};

    data.recordId     = generateId('ADM');
    data.patientId    = validatePatientId(raw.patientId);
    if (!data.patientId) errors.push('patientId is invalid or missing');

    data.patientName  = validateRequired(raw.patientName, 'patientName', errors);

    data.admissionDate = validateDate(raw.admissionDate);
    if (!data.admissionDate) errors.push('admissionDate is invalid or missing');

    data.admissionTime = validateTime(raw.admissionTime);
    if (!data.admissionTime) errors.push('admissionTime is invalid or missing');

    data.ward = validateWard(raw.ward);
    if (!data.ward) errors.push('ward is invalid or missing');

    data.bedNumber = validateNumber(raw.bedNumber, 1, 9999);
    if (data.bedNumber === null) errors.push('bedNumber is invalid or missing');

    data.admittingDoctor  = validateRequired(raw.admittingDoctor, 'admittingDoctor', errors);
    data.diagnosis        = sanitizeText(raw.diagnosis || '');
    data.admissionSource  = sanitizeText(raw.admissionSource || 'direct');
    data.priority         = sanitizeText(raw.priority || 'routine');
    data.notes            = sanitizeText(raw.notes || '');
    data.submittedBy      = sanitizeText(raw.submittedBy || '');
    data.submittedAt      = new Date();

    return { isValid: errors.length === 0, data: data, errors: errors };
  }

  function validateDischarge(raw) {
    var errors = [];
    var data = {};

    data.recordId     = generateId('DIS');
    data.patientId    = validatePatientId(raw.patientId);
    if (!data.patientId) errors.push('patientId is invalid or missing');

    data.patientName  = validateRequired(raw.patientName, 'patientName', errors);

    data.dischargeDate = validateDate(raw.dischargeDate);
    if (!data.dischargeDate) errors.push('dischargeDate is invalid or missing');

    data.dischargeTime = validateTime(raw.dischargeTime);
    if (!data.dischargeTime) errors.push('dischargeTime is invalid or missing');

    data.ward = validateWard(raw.ward);
    if (!data.ward) errors.push('ward is invalid or missing');

    data.bedNumber = validateNumber(raw.bedNumber, 1, 9999);
    if (data.bedNumber === null) errors.push('bedNumber is invalid or missing');

    data.dischargingDoctor = validateRequired(raw.dischargingDoctor, 'dischargingDoctor', errors);

    data.dischargeType = sanitizeText(raw.dischargeType || '').toLowerCase();
    if (VALID_DISCHARGE_TYPES.indexOf(data.dischargeType) === -1) {
      errors.push('dischargeType must be one of: ' + VALID_DISCHARGE_TYPES.join(', '));
    }

    data.dischargeDestination = sanitizeText(raw.dischargeDestination || '');
    data.admissionDate        = validateDate(raw.admissionDate);
    data.lengthOfStay         = null;
    if (data.admissionDate && data.dischargeDate) {
      data.lengthOfStay = Math.ceil(
        (data.dischargeDate.getTime() - data.admissionDate.getTime()) / 86400000
      );
      if (data.lengthOfStay < 0) {
        errors.push('dischargeDate cannot be before admissionDate');
        data.lengthOfStay = null;
      }
    }

    data.notes       = sanitizeText(raw.notes || '');
    data.submittedBy = sanitizeText(raw.submittedBy || '');
    data.submittedAt = new Date();

    return { isValid: errors.length === 0, data: data, errors: errors };
  }

  function validateTransfer(raw) {
    var errors = [];
    var data = {};

    data.recordId  = generateId('TRF');
    data.patientId = validatePatientId(raw.patientId);
    if (!data.patientId) errors.push('patientId is invalid or missing');

    data.patientName = validateRequired(raw.patientName, 'patientName', errors);

    data.transferDate = validateDate(raw.transferDate);
    if (!data.transferDate) errors.push('transferDate is invalid or missing');

    data.transferTime = validateTime(raw.transferTime);
    if (!data.transferTime) errors.push('transferTime is invalid or missing');

    data.fromWard = validateWard(raw.fromWard);
    if (!data.fromWard) errors.push('fromWard is invalid or missing');

    data.toWard = validateWard(raw.toWard);
    if (!data.toWard) errors.push('toWard is invalid or missing');

    if (data.fromWard && data.toWard && data.fromWard === data.toWard) {
      errors.push('fromWard and toWard cannot be the same');
    }

    data.fromBed = validateNumber(raw.fromBed, 1, 9999);
    data.toBed   = validateNumber(raw.toBed, 1, 9999);

    data.transferType = sanitizeText(raw.transferType || 'internal').toLowerCase();
    if (VALID_TRANSFER_DIRS.indexOf(data.transferType) === -1) {
      errors.push('transferType must be one of: ' + VALID_TRANSFER_DIRS.join(', '));
    }

    data.status = sanitizeText(raw.status || 'pending').toLowerCase();
    if (VALID_TRANSFER_STATS.indexOf(data.status) === -1) {
      errors.push('status must be one of: ' + VALID_TRANSFER_STATS.join(', '));
    }

    data.reason      = sanitizeText(raw.reason || '');
    data.authorizedBy = validateRequired(raw.authorizedBy, 'authorizedBy', errors);
    data.notes       = sanitizeText(raw.notes || '');
    data.submittedBy = sanitizeText(raw.submittedBy || '');
    data.submittedAt = new Date();

    return { isValid: errors.length === 0, data: data, errors: errors };
  }

  function validateBedStatus(raw) {
    var errors = [];
    var data = {};

    data.ward = validateWard(raw.ward);
    if (!data.ward) errors.push('ward is invalid or missing');

    data.bedNumber = validateNumber(raw.bedNumber, 1, 9999);
    if (data.bedNumber === null) errors.push('bedNumber is invalid or missing');

    data.status = sanitizeText(raw.status || '').toLowerCase();
    if (VALID_BED_STATUSES.indexOf(data.status) === -1) {
      errors.push('status must be one of: ' + VALID_BED_STATUSES.join(', '));
    }

    data.patientId = raw.patientId ? validatePatientId(raw.patientId) : '';
    if (data.status === 'occupied' && !data.patientId) {
      errors.push('patientId is required when bed status is occupied');
    }

    data.updatedBy = validateRequired(raw.updatedBy, 'updatedBy', errors);
    data.updatedAt = new Date();
    data.notes     = sanitizeText(raw.notes || '');

    return { isValid: errors.length === 0, data: data, errors: errors };
  }

  function validateStaffing(raw) {
    var errors = [];
    var data = {};

    data.recordId = generateId('STF');

    data.ward = validateWard(raw.ward);
    if (!data.ward) errors.push('ward is invalid or missing');

    data.date = validateDate(raw.date);
    if (!data.date) errors.push('date is invalid or missing');

    data.shift = sanitizeText(raw.shift || '').toLowerCase();
    if (VALID_SHIFTS.indexOf(data.shift) === -1) {
      errors.push('shift must be one of: ' + VALID_SHIFTS.join(', '));
    }

    data.nursesRequired = validateNumber(raw.nursesRequired, 0, 999);
    if (data.nursesRequired === null) errors.push('nursesRequired is invalid');

    data.nursesActual = validateNumber(raw.nursesActual, 0, 999);
    if (data.nursesActual === null) errors.push('nursesActual is invalid');

    data.doctorsRequired = validateNumber(raw.doctorsRequired, 0, 999);
    data.doctorsActual   = validateNumber(raw.doctorsActual, 0, 999);
    data.supportStaff    = validateNumber(raw.supportStaff, 0, 999);

    data.nurseShortage = 0;
    if (data.nursesRequired !== null && data.nursesActual !== null) {
      data.nurseShortage = Math.max(0, data.nursesRequired - data.nursesActual);
    }

    data.notes       = sanitizeText(raw.notes || '');
    data.submittedBy = sanitizeText(raw.submittedBy || '');
    data.submittedAt = new Date();

    return { isValid: errors.length === 0, data: data, errors: errors };
  }

  function validateIncident(raw) {
    var errors = [];
    var data = {};

    data.recordId = generateId('INC');

    data.ward = validateWard(raw.ward);
    if (!data.ward) errors.push('ward is invalid or missing');

    data.incidentDate = validateDate(raw.incidentDate);
    if (!data.incidentDate) errors.push('incidentDate is invalid or missing');

    data.incidentTime = validateTime(raw.incidentTime);
    if (!data.incidentTime) errors.push('incidentTime is invalid or missing');

    data.severity = sanitizeText(raw.severity || '').toLowerCase();
    if (VALID_SEVERITIES.indexOf(data.severity) === -1) {
      errors.push('severity must be one of: ' + VALID_SEVERITIES.join(', '));
    }

    data.incidentType = validateRequired(raw.incidentType, 'incidentType', errors);
    data.description  = validateRequired(raw.description, 'description', errors);
    data.patientId    = raw.patientId ? validatePatientId(raw.patientId) : '';
    data.actionTaken  = sanitizeText(raw.actionTaken || '');
    data.reportedBy   = validateRequired(raw.reportedBy, 'reportedBy', errors);
    data.status       = sanitizeText(raw.status || 'open');
    data.submittedAt  = new Date();

    return { isValid: errors.length === 0, data: data, errors: errors };
  }

  function validateSupplyShortage(raw) {
    var errors = [];
    var data = {};

    data.recordId = generateId('SHT');

    data.ward = validateWard(raw.ward);
    if (!data.ward) errors.push('ward is invalid or missing');

    data.reportDate = validateDate(raw.reportDate);
    if (!data.reportDate) errors.push('reportDate is invalid or missing');

    data.itemName = validateRequired(raw.itemName, 'itemName', errors);
    data.category = sanitizeText(raw.category || '');

    data.priority = sanitizeText(raw.priority || '').toLowerCase();
    if (VALID_PRIORITIES.indexOf(data.priority) === -1) {
      errors.push('priority must be one of: ' + VALID_PRIORITIES.join(', '));
    }

    data.quantityNeeded    = validateNumber(raw.quantityNeeded, 0, null);
    data.quantityAvailable = validateNumber(raw.quantityAvailable, 0, null);
    data.description       = sanitizeText(raw.description || '');
    data.impact            = sanitizeText(raw.impact || '');
    data.reportedBy        = validateRequired(raw.reportedBy, 'reportedBy', errors);
    data.status            = sanitizeText(raw.status || 'open');
    data.submittedAt       = new Date();

    return { isValid: errors.length === 0, data: data, errors: errors };
  }

  function validateDailySummary(raw) {
    var errors = [];
    var data = {};

    data.recordId = generateId('SUM');

    data.ward = validateWard(raw.ward);
    if (!data.ward) errors.push('ward is invalid or missing');

    data.date = validateDate(raw.date);
    if (!data.date) errors.push('date is invalid or missing');

    data.totalAdmissions  = validateNumber(raw.totalAdmissions, 0, null) || 0;
    data.totalDischarges  = validateNumber(raw.totalDischarges, 0, null) || 0;
    data.totalTransfersIn = validateNumber(raw.totalTransfersIn, 0, null) || 0;
    data.totalTransfersOut = validateNumber(raw.totalTransfersOut, 0, null) || 0;
    data.bedsOccupied     = validateNumber(raw.bedsOccupied, 0, null);
    data.bedsAvailable    = validateNumber(raw.bedsAvailable, 0, null);
    data.occupancyRate    = validateNumber(raw.occupancyRate, 0, 100);
    data.incidentCount    = validateNumber(raw.incidentCount, 0, null) || 0;
    data.shortageCount    = validateNumber(raw.shortageCount, 0, null) || 0;
    data.notes            = sanitizeText(raw.notes || '');
    data.submittedBy      = sanitizeText(raw.submittedBy || '');
    data.submittedAt      = new Date();

    return { isValid: errors.length === 0, data: data, errors: errors };
  }

  function validateOperationalUpdate(raw) {
    var errors = [];
    var data = {};

    data.recordId = generateId('OPS');

    data.ward = validateWard(raw.ward);
    if (!data.ward) errors.push('ward is invalid or missing');

    data.date = validateDate(raw.date);
    if (!data.date) errors.push('date is invalid or missing');

    data.shift = sanitizeText(raw.shift || '').toLowerCase();
    if (VALID_SHIFTS.indexOf(data.shift) === -1) {
      errors.push('shift must be one of: ' + VALID_SHIFTS.join(', '));
    }

    data.updateType = validateRequired(raw.updateType, 'updateType', errors);
    data.description = validateRequired(raw.description, 'description', errors);
    data.priority    = sanitizeText(raw.priority || 'medium').toLowerCase();
    data.actionRequired = sanitizeText(raw.actionRequired || '');
    data.submittedBy    = validateRequired(raw.submittedBy, 'submittedBy', errors);
    data.submittedAt    = new Date();

    return { isValid: errors.length === 0, data: data, errors: errors };
  }

  /* ------------------------------------------------------------------ */
  /*  Main dispatcher                                                    */
  /* ------------------------------------------------------------------ */

  var VALIDATORS = {
    'admission':        validateAdmission,
    'discharge':        validateDischarge,
    'transfer':         validateTransfer,
    'bedStatus':        validateBedStatus,
    'staffing':         validateStaffing,
    'incident':         validateIncident,
    'supplyShortage':   validateSupplyShortage,
    'dailySummary':     validateDailySummary,
    'operationalUpdate': validateOperationalUpdate
  };

  /**
   * Main entry point.  Dispatches to the correct type-specific validator,
   * logs errors if validation fails, and returns a standard result object.
   *
   * @param {string} formType  One of the FORM_TYPES constants.
   * @param {Object} rawData   Raw key-value data from the form submission.
   * @return {{isValid: boolean, data: Object, errors: string[]}}
   */
  function validate(formType, rawData) {
    if (!rawData || typeof rawData !== 'object') {
      var err = ['rawData must be a non-null object'];
      logError(formType, rawData, err);
      return { isValid: false, data: {}, errors: err };
    }

    var validator = VALIDATORS[formType];
    if (!validator) {
      var err2 = ['Unknown formType: ' + formType + '. Must be one of: ' + FORM_TYPES.join(', ')];
      logError(formType, rawData, err2);
      return { isValid: false, data: {}, errors: err2 };
    }

    var result = validator(rawData);

    if (!result.isValid) {
      logError(formType, rawData, result.errors);
    }

    return result;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  return {
    validate:             validate,
    validateAdmission:    validateAdmission,
    validateDischarge:    validateDischarge,
    validateTransfer:     validateTransfer,
    validateBedStatus:    validateBedStatus,
    validateStaffing:     validateStaffing,
    validateIncident:     validateIncident,
    validateSupplyShortage: validateSupplyShortage,
    validateDailySummary:   validateDailySummary,
    validateOperationalUpdate: validateOperationalUpdate,
    sanitizeText:         sanitizeText,
    validateDate:         validateDate,
    validateTime:         validateTime,
    validatePatientId:    validatePatientId,
    validateWard:         validateWard,
    validateRequired:     validateRequired,
    validateNumber:       validateNumber,
    logError:             logError,
    generateId:           generateId
  };

})();
