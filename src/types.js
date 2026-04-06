/**
 * @typedef {Object} TestCase
 * @property {string} id - Unique identifier (e.g., "tool-accuracy-1")
 * @property {string} category - Category name
 * @property {string} description - Human-readable description
 * @property {number} maxPoints - Maximum points for this test
 * @property {number} [timeout=60000] - Timeout in ms
 * @property {(ctx: TestContext) => Promise<void>} setup - Prepare sandbox state
 * @property {(ctx: TestContext) => Promise<string>} prompt - Returns the prompt to send to the model
 * @property {(response: string, ctx: TestContext) => Promise<TestResult>} evaluate - Score the response
 */

/**
 * @typedef {Object} TestContext
 * @property {string} sandboxDir - Path to this test's sandbox subdirectory
 * @property {string} apiUrl - API endpoint
 * @property {string} model - Model identifier
 */

/**
 * @typedef {Object} TestResult
 * @property {string} id - Test case id
 * @property {string} category - Category name
 * @property {string} description - Test description
 * @property {number} score - Points earned
 * @property {number} maxPoints - Maximum possible points
 * @property {boolean} passed - Whether the test passed
 * @property {string} [reason] - Explanation of score
 * @property {number} latencyMs - Time taken in ms
 * @property {string} [error] - Error message if eval failed
 */

/**
 * @typedef {Object} Scorecard
 * @property {string} tool - "clawbench"
 * @property {string} version - Package version
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} model - Model identifier
 * @property {string} apiUrl - API endpoint used
 * @property {number} totalScore - Sum of all scores
 * @property {number} maxScore - Sum of all maxPoints (100)
 * @property {Object<string, CategoryScore>} categories - Per-category breakdown
 * @property {TestResult[]} results - Individual test results
 */

/**
 * @typedef {Object} CategoryScore
 * @property {number} score - Points earned in this category
 * @property {number} maxPoints - Maximum points for this category
 * @property {number} testsPassed - Number of tests passed
 * @property {number} testsTotal - Total number of tests
 */

module.exports = {};
