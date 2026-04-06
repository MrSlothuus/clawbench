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

async function runSuite(testCases, options) {
  const { apiUrl, model, apiKey, timeoutMs = 90000, modelOverride = null, onResult } = options;
  const results = [];

  for (const tc of testCases) {
    const result = await runTest(tc, apiUrl, model, apiKey, timeoutMs, modelOverride);
    results.push(result);
    if (onResult) onResult(result);
  }

  return buildScorecard(results, model, apiUrl, modelOverride);
}

module.exports = { runSuite, runTest };
