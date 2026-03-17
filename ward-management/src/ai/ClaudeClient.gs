/**
 * ClaudeClient.gs
 * Claude AI API client for the Hospital Ward Management System.
 * Provides methods to call the Anthropic Messages API via UrlFetchApp.
 *
 * @namespace ClaudeClient
 */
var ClaudeClient = (function () {

  var MODEL = 'claude-sonnet-4-20250514';
  var API_URL = 'https://api.anthropic.com/v1/messages';
  var ANTHROPIC_VERSION = '2023-06-01';
  var MAX_TOKENS = 4096;

  /**
   * Calls the Claude Messages API with the given prompt and optional system prompt.
   *
   * @param {string} prompt - The user message to send.
   * @param {string} [systemPrompt] - An optional system-level instruction.
   * @return {string|null} The text content of Claude's response, or null on failure.
   */
  function callClaude(prompt, systemPrompt) {
    if (!isConfigured()) {
      Logger.log('ClaudeClient: API key is not configured. Call ClaudeClient.setApiKey() first.');
      return null;
    }

    var apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');

    var payload = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'user', content: prompt }
      ]
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      var response = UrlFetchApp.fetch(API_URL, options);
      var statusCode = response.getResponseCode();
      var body = response.getContentText();

      if (statusCode !== 200) {
        Logger.log('ClaudeClient: API returned status ' + statusCode + ': ' + body);
        return null;
      }

      var json = JSON.parse(body);

      if (json && json.content && json.content.length > 0 && json.content[0].text) {
        return json.content[0].text;
      }

      Logger.log('ClaudeClient: Unexpected response structure: ' + body);
      return null;

    } catch (error) {
      Logger.log('ClaudeClient: Request failed — ' + error.message);
      return null;
    }
  }

  /**
   * Checks whether the Claude API key has been stored in Script Properties.
   *
   * @return {boolean} True if the key exists and is non-empty.
   */
  function isConfigured() {
    var key = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
    return key !== null && key.trim() !== '';
  }

  /**
   * Stores the Claude API key in Script Properties.
   *
   * @param {string} key - The Anthropic API key.
   */
  function setApiKey(key) {
    if (!key || key.trim() === '') {
      throw new Error('ClaudeClient.setApiKey: key must be a non-empty string.');
    }
    PropertiesService.getScriptProperties().setProperty('CLAUDE_API_KEY', key.trim());
    Logger.log('ClaudeClient: API key stored successfully.');
  }

  return {
    callClaude: callClaude,
    isConfigured: isConfigured,
    setApiKey: setApiKey
  };

})();
