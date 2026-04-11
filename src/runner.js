const sandbox = require('./sandbox');
const { chatCompletion } = require('./api-client');
const { buildScorecard } = require('./scorer');

async function runTest(testCase, apiUrl, model, apiKey, timeoutMs, modelOverride) {
  const testDir = sandbox.createTestDir(testCase.id);
  const ctx = { sandboxDir: testDir, apiUrl, model };
  const start = Date.now();

  try {
    // Setup
    await testCase.setup(ctx);

    // Get prompt
    const prompt = await testCase.prompt(ctx);

    // Call gateway with timeout
    const effectiveTimeout = Math.min(timeoutMs, testCase.timeout || 90000);
    const { content, modelUsed } = await chatCompletion(apiUrl, model, [
      { role: 'user', content: prompt }
    ], apiKey, effectiveTimeout, modelOverride);

    // Evaluate
    const result = await testCase.evaluate(content, ctx);
    result.latencyMs = Date.now() - start;
    result.modelUsed = modelUsed; // capture actual model from gateway response
    return result;
  } catch (err) {
    return {
      id: testCase.id,
      category: testCase.category,
      description: testCase.description,
      score: 0,
      maxPoints: testCase.maxPoints,
      passed: false,
      reason: err.message.includes('timed out') ? 'Timed out' : 'Evaluation error',
      error: err.message,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Ask the agent what model it is currently using. Returns the model name
 * string, or null if detection fails / times out.
 */
async function discoverModel(apiUrl, model, apiKey, timeoutMs = 15000) {
  try {
    const { content } = await chatCompletion(apiUrl, model, [
      {
        role: 'user',
        content: 'What AI model are you currently using? Reply with only the model name, e.g. "minimax/MiniMax-M2.7" or "openai/gpt-5.4". No explanation, just the name.',
      },
    ], apiKey, timeoutMs, null);

    if (content && content.trim().length > 0) {
      // Strip any quotes, whitespace, or markdown formatting
      return content.trim().replace(/^[`"'\*_]+|[`"'\*_]+$/g, '').split(/\s/)[0];
    }
  } catch (_) {
    // Discovery is best-effort
  }
  return null;
}

async function runSuite(testCases, options) {
  const { apiUrl, model, apiKey, timeoutMs = 90000, modelOverride = null, onResult } = options;
  const results = [];

  // Probe the agent for its actual model before running tests
  const discoveredModel = await discoverModel(apiUrl, model, apiKey, 15000);

  for (const tc of testCases) {
    const result = await runTest(tc, apiUrl, model, apiKey, timeoutMs, modelOverride);
    results.push(result);
    if (onResult) onResult(result);
  }

  // Collect all modelUsed values from individual test runs
  const modelUsedValues = results.map(r => r.modelUsed).filter(Boolean);
  // Deduplicate — prefer modelOverride, then any non-"openclaw/default" value, then first available
  const detectedModel = modelOverride
    || modelUsedValues.find(m => m && m !== model && m !== 'openclaw/default')
    || modelUsedValues[0]
    || modelOverride
    || model;

  return buildScorecard(results, detectedModel, apiUrl, modelOverride, discoveredModel);
}

module.exports = { runSuite, runTest };
