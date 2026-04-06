const toolAccuracy = require('./tool-accuracy');
const codeGeneration = require('./code-generation');
const reasoning = require('./reasoning');
const errorRecovery = require('./error-recovery');
const multiStep = require('./multi-step');
const research = require('./research');
const context = require('./context');

function getAllTestCases() {
  return [
    ...toolAccuracy,
    ...codeGeneration,
    ...reasoning,
    ...errorRecovery,
    ...multiStep,
    ...research,
    ...context,
  ];
}

module.exports = { getAllTestCases };
