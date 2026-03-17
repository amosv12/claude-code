/**
 * CapacityAlerts — Bed-capacity monitoring and alerting for all wards.
 *
 * Provides batch capacity checks, a status snapshot for dashboards, and
 * HTML formatting for capacity alert emails.
 *
 * Depends on:
 *   - AlertEngine  (sendAlert, checkCapacity)
 *   - Config sheet (CAPACITY_THRESHOLD, CAPACITY_WARNING_THRESHOLD)
 *   - Ref_WardMaster, BedOccupancy sheets
 */

var CapacityAlerts = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function _ss() {
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function _sheetData(sheetName) {
    var sheet = _ss().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  }

  function _headers(sheetName) {
    var sheet = _ss().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 1) return [];
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) {
      return String(h).trim();
    });
  }

  function _colIndex(headers, name) {
    var lower = name.toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).toLowerCase() === lower) return i;
    }
    return -1;
  }

  function _configValue(key, defaultVal) {
    var headers = _headers('Config');
    var keyCol = _colIndex(headers, 'Key');
    var valCol = _colIndex(headers, 'Value');
    if (keyCol === -1) keyCol = 0;
    if (valCol === -1) valCol = 1;

    var data = _sheetData('Config');
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][keyCol]).trim() === key) {
        return String(data[i][valCol]).trim();
      }
    }
    return defaultVal !== undefined ? String(defaultVal) : '';
  }

  /**
   * Return the list of ward codes from Ref_WardMaster.
   */
  function _wardList() {
    var headers = _headers('Ref_WardMaster');
    var wardCol = _colIndex(headers, 'Ward');
    if (wardCol === -1) wardCol = _colIndex(headers, 'WardCode');
    if (wardCol === -1) wardCol = 0;

    var data = _sheetData('Ref_WardMaster');
    var wards = [];
    for (var i = 0; i < data.length; i++) {
      var w = String(data[i][wardCol]).trim();
      if (w && w !== 'undefined') wards.push(w);
    }
    return wards;
  }

  /**
   * Return total beds for a ward.
   */
  function _totalBeds(ward) {
    var headers = _headers('Ref_WardMaster');
    var wardCol = _colIndex(headers, 'Ward');
    if (wardCol === -1) wardCol = _colIndex(headers, 'WardCode');
    if (wardCol === -1) wardCol = 0;
    var bedsCol = _colIndex(headers, 'TotalBeds');
    if (bedsCol === -1) bedsCol = _colIndex(headers, 'Beds');
    if (bedsCol === -1) bedsCol = 1;

    var data = _sheetData('Ref_WardMaster');
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][wardCol]).trim() === ward) {
        return Number(data[i][bedsCol]) || 0;
      }
    }
    return 0;
  }

  /**
   * Return most recent occupied beds count for a ward from BedOccupancy.
   */
  function _latestOccupied(ward) {
    var headers = _headers('BedOccupancy');
    var dateCol = _colIndex(headers, 'Date');
    var wardCol = _colIndex(headers, 'Ward');
    var bedsCol = _colIndex(headers, 'OccupiedBeds');
    if (dateCol === -1) dateCol = 0;
    if (wardCol === -1) wardCol = 1;
    if (bedsCol === -1) bedsCol = 2;

    var data = _sheetData('BedOccupancy');
    var latestDate = null;
    var occupied = 0;

    for (var i = 0; i < data.length; i++) {
      if (String(data[i][wardCol]).trim() !== ward) continue;
      var d = new Date(data[i][dateCol]);
      if (!latestDate || d.getTime() > latestDate.getTime()) {
        latestDate = d;
        occupied = Number(data[i][bedsCol]) || 0;
      }
    }
    return occupied;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * runCapacityCheck — Iterates all wards and sends capacity alerts for any
   * ward whose occupancy exceeds the configured threshold.
   *
   * Intended to be called from a time-driven trigger or on-demand.
   *
   * @returns {Object[]} Array of check results from AlertEngine.checkCapacity.
   */
  function runCapacityCheck() {
    var wards = _wardList();
    var results = [];

    for (var i = 0; i < wards.length; i++) {
      try {
        var result = AlertEngine.checkCapacity(wards[i]);
        results.push(result);
      } catch (e) {
        Logger.log('CapacityAlerts.runCapacityCheck: Error checking ward ' + wards[i] + ' — ' + e.message);
        results.push({
          ward: wards[i],
          occupancyRate: -1,
          error: e.message
        });
      }
    }

    var alertCount = results.filter(function (r) { return r.exceeded; }).length;
    Logger.log('CapacityAlerts.runCapacityCheck: Checked ' + wards.length +
               ' wards, ' + alertCount + ' alerts triggered.');

    return results;
  }

  /**
   * getCapacityStatus — Returns a status snapshot for all wards.
   *
   * Status levels:
   *   - 'normal'   — occupancy <= warning threshold (default 75%)
   *   - 'warning'  — occupancy > warning threshold but <= critical threshold
   *   - 'critical' — occupancy > critical threshold (default 85%)
   *
   * @returns {Object[]} Array of {ward, occupancyRate, totalBeds, occupiedBeds, status}.
   */
  function getCapacityStatus() {
    var criticalThreshold = parseFloat(_configValue('CAPACITY_THRESHOLD', '85'));
    var warningThreshold = parseFloat(_configValue('CAPACITY_WARNING_THRESHOLD', '75'));

    var wards = _wardList();
    var statuses = [];

    for (var i = 0; i < wards.length; i++) {
      var ward = wards[i];
      var totalBeds = _totalBeds(ward);
      var occupiedBeds = _latestOccupied(ward);
      var rate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 10000) / 100 : 0;

      var status;
      if (rate > criticalThreshold) {
        status = 'critical';
      } else if (rate > warningThreshold) {
        status = 'warning';
      } else {
        status = 'normal';
      }

      statuses.push({
        ward: ward,
        occupancyRate: rate,
        totalBeds: totalBeds,
        occupiedBeds: occupiedBeds,
        status: status
      });
    }

    return statuses;
  }

  /**
   * formatCapacityAlert — Creates an HTML email body for a capacity alert.
   *
   * @param {string} ward - Ward code.
   * @param {number} occupancy - Occupancy percentage.
   * @param {number} totalBeds - Total bed count.
   * @param {number} occupiedBeds - Currently occupied beds.
   * @returns {string} HTML string.
   */
  function formatCapacityAlert(ward, occupancy, totalBeds, occupiedBeds) {
    var availableBeds = totalBeds - occupiedBeds;
    var severity = occupancy >= 95 ? 'CRITICAL' : 'WARNING';
    var severityColor = occupancy >= 95 ? '#cc0000' : '#e67e00';

    var html = '';
    html += '<div style="font-family:Arial,sans-serif;max-width:600px;">';
    html += '  <div style="background-color:' + severityColor + ';color:#ffffff;padding:12px 16px;border-radius:4px 4px 0 0;">';
    html += '    <h2 style="margin:0;font-size:18px;">&#9888; Capacity ' + severity + ': ' + ward + '</h2>';
    html += '  </div>';
    html += '  <div style="border:1px solid #dddddd;border-top:none;padding:16px;border-radius:0 0 4px 4px;">';
    html += '    <p style="margin:0 0 12px 0;">Ward <strong>' + ward + '</strong> has exceeded the capacity threshold.</p>';
    html += '    <table style="border-collapse:collapse;width:100%;">';
    html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Occupancy Rate</td>';
    html += '          <td style="padding:6px 12px;border:1px solid #ddd;color:' + severityColor + ';font-weight:bold;">' + occupancy + '%</td></tr>';
    html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Total Beds</td>';
    html += '          <td style="padding:6px 12px;border:1px solid #ddd;">' + totalBeds + '</td></tr>';
    html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Occupied Beds</td>';
    html += '          <td style="padding:6px 12px;border:1px solid #ddd;">' + occupiedBeds + '</td></tr>';
    html += '      <tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Available Beds</td>';
    html += '          <td style="padding:6px 12px;border:1px solid #ddd;">' + availableBeds + '</td></tr>';
    html += '    </table>';
    html += '    <p style="margin:12px 0 0 0;font-size:13px;color:#666666;">';
    html += '      Please review patient flow and consider discharge planning or diversion protocols.';
    html += '    </p>';
    html += '  </div>';
    html += '  <p style="font-size:11px;color:#999999;margin-top:8px;">Sent by Ward Management System at ' + new Date().toLocaleString() + '</p>';
    html += '</div>';

    return html;
  }

  // ---------------------------------------------------------------------------
  // Return public interface
  // ---------------------------------------------------------------------------

  return {
    runCapacityCheck:    runCapacityCheck,
    getCapacityStatus:   getCapacityStatus,
    formatCapacityAlert: formatCapacityAlert
  };

})();
