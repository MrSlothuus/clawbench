const pkg = require('../package.json');

function buildScorecard(results, model, apiUrl, modelOverride) {
  const categories = {};

  for (const r of results) {
    if (!categories[r.category]) {
      categories[r.category] = { score: 0, maxPoints: 0, testsPassed: 0, testsTotal: 0 };
    }
    const cat = categories[r.category];
    cat.score += r.score;
    cat.maxPoints += r.maxPoints;
    cat.testsTotal += 1;
    if (r.passed) cat.testsPassed += 1;
  }

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const maxScore = results.reduce((sum, r) => sum + r.maxPoints, 0);

  return {
    tool: 'clawbench',
    version: pkg.version,
    timestamp: new Date().toISOString(),
    agent: model,
    model: modelOverride || model,
    gatewayUrl: apiUrl,
    totalScore,
    maxScore,
    categories,
    results,
  };
}

module.exports = { buildScorecard };
