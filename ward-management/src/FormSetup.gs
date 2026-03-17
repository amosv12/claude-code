/**
 * FormSetup.gs - Google Forms Programmatic Creation
 * Hospital Ward Management System
 *
 * Creates all nine data-collection forms and optionally links their
 * response destinations to the main spreadsheet.
 */

// ---------------------------------------------------------------------------
// Master functions
// ---------------------------------------------------------------------------

/**
 * Creates all nine Google Forms for the ward management system.
 * Each form is logged with its edit URL and published URL so that
 * administrators can distribute the links.
 *
 * @return {Object<string, GoogleAppsScript.Forms.Form>} Map of form name to Form object.
 */
function createAllForms() {
  var forms = {};

  forms['DailySummary']       = createDailySummaryForm();
  forms['OperationalUpdates'] = createOperationalUpdatesForm();
  forms['Admission']          = createAdmissionForm();
  forms['Discharge']          = createDischargeForm();
  forms['Transfer']           = createTransferForm();
  forms['BedStatus']          = createBedStatusForm();
  forms['Staffing']           = createStaffingForm();
  forms['Incident']           = createIncidentForm();
  forms['SupplyShortage']     = createSupplyShortageForm();

  // Log all URLs for easy retrieval.
  var keys = Object.keys(forms);
  for (var i = 0; i < keys.length; i++) {
    var f = forms[keys[i]];
    Logger.log(keys[i] + ' | Edit: ' + f.getEditUrl() + ' | Published: ' + f.getPublishedUrl());
  }

  return forms;
}

/**
 * Links every form's response destination to the specified spreadsheet.
 * Responses will land in the corresponding Raw_ tab.
 *
 * @param {string} spreadsheetId - The ID of the destination spreadsheet.
 */
function linkFormsToSheet(spreadsheetId) {
  var forms = createAllForms();

  var tabMapping = {
    'DailySummary':       SHEET_NAMES.RAW_DAILY_SUMMARY,
    'OperationalUpdates': SHEET_NAMES.RAW_OPERATIONAL_UPDATES,
    'Admission':          SHEET_NAMES.RAW_ADMISSIONS,
    'Discharge':          SHEET_NAMES.RAW_DISCHARGES,
    'Transfer':           SHEET_NAMES.RAW_TRANSFERS,
    'BedStatus':          SHEET_NAMES.RAW_BED_STATUS,
    'Staffing':           SHEET_NAMES.RAW_STAFFING,
    'Incident':           SHEET_NAMES.RAW_INCIDENTS,
    'SupplyShortage':     SHEET_NAMES.RAW_SUPPLY_SHORTAGES
  };

  var keys = Object.keys(forms);
  for (var i = 0; i < keys.length; i++) {
    var form = forms[keys[i]];
    form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheetId);
    Logger.log('Linked ' + keys[i] + ' form to spreadsheet ' + spreadsheetId +
               ' (tab will be auto-created by Forms; rename to ' + tabMapping[keys[i]] + ').');
  }
}

// ---------------------------------------------------------------------------
// Ward name helper
// ---------------------------------------------------------------------------

/**
 * Returns an array of ward display names for use in dropdown items.
 * @return {string[]}
 * @private
 */
function getWardNames_() {
  return WARD_LIST.map(function (w) { return w.name; });
}

/**
 * Returns an array of ward codes for use in dropdown items.
 * @return {string[]}
 * @private
 */
function getWardCodes_() {
  return WARD_LIST.map(function (w) { return w.code; });
}

/**
 * Populates a ListItem with ward name choices.
 * @param {GoogleAppsScript.Forms.ListItem} listItem
 * @return {GoogleAppsScript.Forms.ListItem}
 * @private
 */
function addWardChoices_(listItem) {
  var names = getWardNames_();
  var choices = names.map(function (n) { return listItem.createChoice(n); });
  listItem.setChoices(choices);
  return listItem;
}

// ---------------------------------------------------------------------------
// Form 1 - Daily Ward Summary
// ---------------------------------------------------------------------------

/**
 * Creates the Daily Ward Summary form.
 * @return {GoogleAppsScript.Forms.Form}
 */
function createDailySummaryForm() {
  var form = FormApp.create('Ward Management - Daily Ward Summary');
  form.setDescription('Submit a daily summary for your ward at the end of each shift.');
  form.setCollectEmail(true);

  // Date
  form.addDateItem()
    .setTitle('Date')
    .setRequired(true);

  // Ward
  var wardItem = form.addListItem()
    .setTitle('Ward')
    .setRequired(true);
  addWardChoices_(wardItem);

  // Shift
  form.addListItem()
    .setTitle('Shift')
    .setRequired(true)
    .setChoiceValues(['Day', 'Evening', 'Night']);

  // Submitted By
  form.addTextItem()
    .setTitle('Submitted By')
    .setRequired(true);

  // Total Patients Start
  form.addTextItem()
    .setTitle('Total Patients Start')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number.')
      .requireNumber()
      .build());

  // Total Patients End
  form.addTextItem()
    .setTitle('Total Patients End')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number.')
      .requireNumber()
      .build());

  // Beds Available
  form.addTextItem()
    .setTitle('Beds Available')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number.')
      .requireNumber()
      .build());

  // Key Issues
  form.addParagraphTextItem()
    .setTitle('Key Issues')
    .setRequired(false);

  return form;
}

// ---------------------------------------------------------------------------
// Form 2 - Operational Updates
// ---------------------------------------------------------------------------

/**
 * Creates the Operational Updates form.
 * @return {GoogleAppsScript.Forms.Form}
 */
function createOperationalUpdatesForm() {
  var form = FormApp.create('Ward Management - Operational Updates');
  form.setDescription('Report operational issues or updates for your ward.');
  form.setCollectEmail(true);

  // Ward
  var wardItem = form.addListItem()
    .setTitle('Ward')
    .setRequired(true);
  addWardChoices_(wardItem);

  // Submitted By
  form.addTextItem()
    .setTitle('Submitted By')
    .setRequired(true);

  // Category
  form.addListItem()
    .setTitle('Category')
    .setRequired(true)
    .setChoiceValues(['Staffing', 'Equipment', 'Patient Flow', 'Safety', 'Other']);

  // Priority
  form.addListItem()
    .setTitle('Priority')
    .setRequired(true)
    .setChoiceValues(['Low', 'Medium', 'High', 'Critical']);

  // Description
  form.addParagraphTextItem()
    .setTitle('Description')
    .setRequired(true);

  // Action Taken
  form.addParagraphTextItem()
    .setTitle('Action Taken')
    .setRequired(false);

  return form;
}

// ---------------------------------------------------------------------------
// Form 3 - Admission
// ---------------------------------------------------------------------------

/**
 * Creates the Admission form.
 * @return {GoogleAppsScript.Forms.Form}
 */
function createAdmissionForm() {
  var form = FormApp.create('Ward Management - Admission');
  form.setDescription('Record a new patient admission.');
  form.setCollectEmail(true);

  // Patient ID
  form.addTextItem()
    .setTitle('Patient ID')
    .setRequired(true);

  // Patient Name
  form.addTextItem()
    .setTitle('Patient Name')
    .setRequired(true);

  // DOB
  form.addDateItem()
    .setTitle('DOB')
    .setRequired(true);

  // Admission Date
  form.addDateItem()
    .setTitle('Admission Date')
    .setRequired(true);

  // Admission Time
  form.addTimeItem()
    .setTitle('Admission Time')
    .setRequired(true);

  // Ward
  var wardItem = form.addListItem()
    .setTitle('Ward')
    .setRequired(true);
  addWardChoices_(wardItem);

  // Bed Number
  form.addTextItem()
    .setTitle('Bed Number')
    .setRequired(true);

  // Admitting Physician
  form.addTextItem()
    .setTitle('Admitting Physician')
    .setRequired(true);

  // Diagnosis
  form.addParagraphTextItem()
    .setTitle('Diagnosis')
    .setRequired(true);

  // Source
  form.addListItem()
    .setTitle('Source')
    .setRequired(true)
    .setChoiceValues(['ER', 'Transfer', 'Elective', 'Direct']);

  // Acuity
  form.addScaleItem()
    .setTitle('Acuity')
    .setBounds(1, 5)
    .setLabels('Low acuity', 'High acuity')
    .setRequired(true);

  return form;
}

// ---------------------------------------------------------------------------
// Form 4 - Discharge
// ---------------------------------------------------------------------------

/**
 * Creates the Discharge form.
 * @return {GoogleAppsScript.Forms.Form}
 */
function createDischargeForm() {
  var form = FormApp.create('Ward Management - Discharge');
  form.setDescription('Record a patient discharge.');
  form.setCollectEmail(true);

  // Patient ID
  form.addTextItem()
    .setTitle('Patient ID')
    .setRequired(true);

  // Patient Name
  form.addTextItem()
    .setTitle('Patient Name')
    .setRequired(true);

  // Discharge Date
  form.addDateItem()
    .setTitle('Discharge Date')
    .setRequired(true);

  // Discharge Time
  form.addTimeItem()
    .setTitle('Discharge Time')
    .setRequired(true);

  // Ward
  var wardItem = form.addListItem()
    .setTitle('Ward')
    .setRequired(true);
  addWardChoices_(wardItem);

  // Bed Number
  form.addTextItem()
    .setTitle('Bed Number')
    .setRequired(true);

  // Discharging Physician
  form.addTextItem()
    .setTitle('Discharging Physician')
    .setRequired(true);

  // Disposition
  form.addListItem()
    .setTitle('Disposition')
    .setRequired(true)
    .setChoiceValues(['Home', 'Transfer', 'AMA', 'Deceased', 'Rehab', 'SNF']);

  // LOS
  form.addTextItem()
    .setTitle('LOS')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter length of stay in days.')
      .requireNumber()
      .build());

  // Notes
  form.addParagraphTextItem()
    .setTitle('Notes')
    .setRequired(false);

  return form;
}

// ---------------------------------------------------------------------------
// Form 5 - Transfer Request
// ---------------------------------------------------------------------------

/**
 * Creates the Transfer Request form.
 * @return {GoogleAppsScript.Forms.Form}
 */
function createTransferForm() {
  var form = FormApp.create('Ward Management - Transfer Request');
  form.setDescription('Request or record a patient transfer between wards.');
  form.setCollectEmail(true);

  // Patient ID
  form.addTextItem()
    .setTitle('Patient ID')
    .setRequired(true);

  // Patient Name
  form.addTextItem()
    .setTitle('Patient Name')
    .setRequired(true);

  // Transfer Date
  form.addDateItem()
    .setTitle('Transfer Date')
    .setRequired(true);

  // Transfer Time
  form.addTimeItem()
    .setTitle('Transfer Time')
    .setRequired(true);

  // From Ward
  var fromWardItem = form.addListItem()
    .setTitle('From Ward')
    .setRequired(true);
  addWardChoices_(fromWardItem);

  // From Bed
  form.addTextItem()
    .setTitle('From Bed')
    .setRequired(true);

  // To Ward
  var toWardItem = form.addListItem()
    .setTitle('To Ward')
    .setRequired(true);
  addWardChoices_(toWardItem);

  // To Bed
  form.addTextItem()
    .setTitle('To Bed')
    .setRequired(true);

  // Reason
  form.addParagraphTextItem()
    .setTitle('Reason')
    .setRequired(true);

  // Requested By
  form.addTextItem()
    .setTitle('Requested By')
    .setRequired(true);

  // Status
  form.addListItem()
    .setTitle('Status')
    .setRequired(true)
    .setChoiceValues(['Pending', 'Approved', 'Completed', 'Cancelled']);

  return form;
}

// ---------------------------------------------------------------------------
// Form 6 - Bed Status Update
// ---------------------------------------------------------------------------

/**
 * Creates the Bed Status Update form.
 * @return {GoogleAppsScript.Forms.Form}
 */
function createBedStatusForm() {
  var form = FormApp.create('Ward Management - Bed Status Update');
  form.setDescription('Update the status of an individual bed.');
  form.setCollectEmail(true);

  // Date
  form.addDateItem()
    .setTitle('Date')
    .setRequired(true);

  // Ward
  var wardItem = form.addListItem()
    .setTitle('Ward')
    .setRequired(true);
  addWardChoices_(wardItem);

  // Bed Number
  form.addTextItem()
    .setTitle('Bed Number')
    .setRequired(true);

  // Status
  form.addListItem()
    .setTitle('Status')
    .setRequired(true)
    .setChoiceValues(['Occupied', 'Available', 'Cleaning', 'Maintenance', 'Blocked']);

  // Patient ID
  form.addTextItem()
    .setTitle('Patient ID')
    .setRequired(false)
    .setHelpText('Required if status is Occupied.');

  // Updated By
  form.addTextItem()
    .setTitle('Updated By')
    .setRequired(true);

  // Notes
  form.addParagraphTextItem()
    .setTitle('Notes')
    .setRequired(false);

  return form;
}

// ---------------------------------------------------------------------------
// Form 7 - Staffing / Shift Report
// ---------------------------------------------------------------------------

/**
 * Creates the Staffing / Shift Report form.
 * @return {GoogleAppsScript.Forms.Form}
 */
function createStaffingForm() {
  var form = FormApp.create('Ward Management - Staffing/Shift Report');
  form.setDescription('Report staffing levels for your ward and shift.');
  form.setCollectEmail(true);

  // Date
  form.addDateItem()
    .setTitle('Date')
    .setRequired(true);

  // Ward
  var wardItem = form.addListItem()
    .setTitle('Ward')
    .setRequired(true);
  addWardChoices_(wardItem);

  // Shift
  form.addListItem()
    .setTitle('Shift')
    .setRequired(true)
    .setChoiceValues(['Day', 'Evening', 'Night']);

  // Nurses Scheduled
  form.addTextItem()
    .setTitle('Nurses Scheduled')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number.')
      .requireNumber()
      .build());

  // Nurses Present
  form.addTextItem()
    .setTitle('Nurses Present')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number.')
      .requireNumber()
      .build());

  // Physicians on Duty
  form.addTextItem()
    .setTitle('Physicians on Duty')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number.')
      .requireNumber()
      .build());

  // Support Staff
  form.addTextItem()
    .setTitle('Support Staff')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number.')
      .requireNumber()
      .build());

  // Patient-to-Nurse Ratio
  form.addTextItem()
    .setTitle('Patient-to-Nurse Ratio')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter the ratio as a number (e.g. 4.5).')
      .requireNumber()
      .build());

  // Shortages
  form.addParagraphTextItem()
    .setTitle('Shortages')
    .setRequired(false)
    .setHelpText('Describe any staffing shortages or gaps.');

  // Reported By
  form.addTextItem()
    .setTitle('Reported By')
    .setRequired(true);

  return form;
}

// ---------------------------------------------------------------------------
// Form 8 - Incident / Escalation
// ---------------------------------------------------------------------------

/**
 * Creates the Incident / Escalation form.
 * @return {GoogleAppsScript.Forms.Form}
 */
function createIncidentForm() {
  var form = FormApp.create('Ward Management - Incident/Escalation');
  form.setDescription('Report a safety incident, adverse event, or escalation.');
  form.setCollectEmail(true);

  // Date
  form.addDateItem()
    .setTitle('Date')
    .setRequired(true);

  // Time
  form.addTimeItem()
    .setTitle('Time')
    .setRequired(true);

  // Ward
  var wardItem = form.addListItem()
    .setTitle('Ward')
    .setRequired(true);
  addWardChoices_(wardItem);

  // Type
  form.addListItem()
    .setTitle('Type')
    .setRequired(true)
    .setChoiceValues(['Fall', 'Medication Error', 'Equipment Failure', 'Safety', 'Infection', 'Other']);

  // Severity
  form.addListItem()
    .setTitle('Severity')
    .setRequired(true)
    .setChoiceValues(['Low', 'Medium', 'High', 'Critical']);

  // Description
  form.addParagraphTextItem()
    .setTitle('Description')
    .setRequired(true);

  // Patients Affected
  form.addTextItem()
    .setTitle('Patients Affected')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter the number of patients affected.')
      .requireNumber()
      .build());

  // Action Taken
  form.addParagraphTextItem()
    .setTitle('Action Taken')
    .setRequired(true);

  // Reported By
  form.addTextItem()
    .setTitle('Reported By')
    .setRequired(true);

  // Escalated To
  form.addTextItem()
    .setTitle('Escalated To')
    .setRequired(false)
    .setHelpText('Name or role of the person/team this was escalated to.');

  return form;
}

// ---------------------------------------------------------------------------
// Form 9 - Equipment / Supply Shortage
// ---------------------------------------------------------------------------

/**
 * Creates the Equipment / Supply Shortage form.
 * @return {GoogleAppsScript.Forms.Form}
 */
function createSupplyShortageForm() {
  var form = FormApp.create('Ward Management - Equipment/Supply Shortage');
  form.setDescription('Report a shortage or low-stock situation for equipment or supplies.');
  form.setCollectEmail(true);

  // Date
  form.addDateItem()
    .setTitle('Date')
    .setRequired(true);

  // Ward
  var wardItem = form.addListItem()
    .setTitle('Ward')
    .setRequired(true);
  addWardChoices_(wardItem);

  // Category
  form.addListItem()
    .setTitle('Category')
    .setRequired(true)
    .setChoiceValues(['Medical Equipment', 'PPE', 'Medication', 'Linen', 'Consumables', 'Other']);

  // Item Name
  form.addTextItem()
    .setTitle('Item Name')
    .setRequired(true);

  // Qty Needed
  form.addTextItem()
    .setTitle('Qty Needed')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number.')
      .requireNumber()
      .build());

  // Current Stock
  form.addTextItem()
    .setTitle('Current Stock')
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .setHelpText('Enter a whole number.')
      .requireNumber()
      .build());

  // Priority
  form.addListItem()
    .setTitle('Priority')
    .setRequired(true)
    .setChoiceValues(['Low', 'Medium', 'High', 'Critical']);

  // Impact
  form.addParagraphTextItem()
    .setTitle('Impact')
    .setRequired(true)
    .setHelpText('Describe the operational impact of this shortage.');

  // Reported By
  form.addTextItem()
    .setTitle('Reported By')
    .setRequired(true);

  return form;
}
