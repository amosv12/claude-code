/**
 * TriggerSetup.gs
 * Installs and manages time-driven and event-driven triggers for the
 * Hospital Ward Management System.
 */

// =============================================================================
// Installation
// =============================================================================

/**
 * Main setup function. Creates all required time-based triggers and logs
 * guidance for form-submit triggers.
 *
 * Run this once from the script editor after initial deployment.
 */
function installAllTriggers() {
  // Remove any existing project triggers to avoid duplicates
  removeAllTriggers();

  Logger.log('TriggerSetup: Installing all triggers...');

  // ---- Daily triggers at 6:00 AM ----
  ScriptApp.newTrigger('generateMorningSummary')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .nearMinute(0)
    .create();
  Logger.log('  + Daily 6:00 AM — generateMorningSummary');

  ScriptApp.newTrigger('calculateDailyKPIs')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .nearMinute(0)
    .create();
  Logger.log('  + Daily 6:00 AM — calculateDailyKPIs');

  ScriptApp.newTrigger('generateAllBriefings')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .nearMinute(0)
    .create();
  Logger.log('  + Daily 6:00 AM — generateAllBriefings');

  // ---- Weekly triggers: Monday at 7:00 AM ----
  ScriptApp.newTrigger('calculateWeeklyKPIs')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(7)
    .nearMinute(0)
    .create();
  Logger.log('  + Weekly Monday 7:00 AM — calculateWeeklyKPIs');

  ScriptApp.newTrigger('detectTrends')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(7)
    .nearMinute(0)
    .create();
  Logger.log('  + Weekly Monday 7:00 AM — detectTrends');

  // ---- Monthly trigger: 1st of month at 7:00 AM ----
  ScriptApp.newTrigger('calculateMonthlyKPIs')
    .timeBased()
    .onMonthDay(1)
    .atHour(7)
    .nearMinute(0)
    .create();
  Logger.log('  + Monthly 1st 7:00 AM — calculateMonthlyKPIs');

  // ---- Form triggers ----
  setFormTriggers();

  Logger.log('TriggerSetup: All triggers installed successfully.');
  Logger.log('TriggerSetup: Run listTriggers() to verify.');
}

// =============================================================================
// Form triggers
// =============================================================================

/**
 * Provides instructions for setting up form-submit triggers.
 *
 * NOTE: Google Apps Script cannot programmatically create onFormSubmit triggers
 * for external Google Forms. Each form's trigger must be created either:
 *   (a) Manually via the Apps Script Triggers UI (Edit > Current project's triggers), or
 *   (b) From the form's own bound script editor.
 *
 * If the forms are connected to this spreadsheet as response destinations,
 * you can use the spreadsheet's onFormSubmit trigger instead.
 */
function setFormTriggers() {
  Logger.log('');
  Logger.log('=== FORM TRIGGER SETUP (Manual Steps Required) ===');
  Logger.log('');
  Logger.log('Form-submit triggers cannot be created programmatically for external forms.');
  Logger.log('Please set up the following triggers manually:');
  Logger.log('');
  Logger.log('Option A — Spreadsheet-level form submit trigger:');
  Logger.log('  If forms send responses to sheets in this spreadsheet, create a single');
  Logger.log('  installable trigger via Edit > Current project\'s triggers:');
  Logger.log('    Event source: From spreadsheet');
  Logger.log('    Event type:   On form submit');
  Logger.log('    Function:     onFormSubmitRouter');
  Logger.log('');
  Logger.log('Option B — Per-form triggers (from each form\'s script editor):');
  Logger.log('  1. Admission Form  → onAdmissionSubmit(e)');
  Logger.log('  2. Discharge Form  → onDischargeSubmit(e)');
  Logger.log('  3. Incident Form   → onIncidentSubmit(e)');
  Logger.log('  4. Staffing Form   → onStaffingSubmit(e)');
  Logger.log('  5. Shortage Form   → onShortageSubmit(e)');
  Logger.log('  6. Transfer Form   → onTransferSubmit(e)');
  Logger.log('');
  Logger.log('See README.md for detailed setup instructions.');
  Logger.log('===================================================');
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Removes ALL installable triggers owned by this project.
 * Useful for cleanup before reinstalling or during debugging.
 */
function removeAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = triggers.length;

  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  Logger.log('TriggerSetup: Removed ' + count + ' existing trigger(s).');
}

// =============================================================================
// Debugging
// =============================================================================

/**
 * Lists all installed triggers for this project with their configuration.
 * Useful for verifying that triggers are set up correctly.
 */
function listTriggers() {
  var triggers = ScriptApp.getProjectTriggers();

  if (triggers.length === 0) {
    Logger.log('TriggerSetup: No triggers installed.');
    return;
  }

  Logger.log('TriggerSetup: ' + triggers.length + ' trigger(s) installed:');
  Logger.log('');

  for (var i = 0; i < triggers.length; i++) {
    var t = triggers[i];
    var info = [
      '  [' + (i + 1) + ']',
      'Function: ' + t.getHandlerFunction(),
      'Type: ' + t.getEventType(),
      'Source: ' + t.getTriggerSource()
    ];

    // Add trigger ID for reference
    info.push('ID: ' + t.getUniqueId());

    Logger.log(info.join(' | '));
  }
}
