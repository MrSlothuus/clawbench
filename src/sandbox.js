const fs = require('fs');
const path = require('path');
const os = require('os');

let rootDir = null;

function create(customDir) {
  if (customDir) {
    fs.mkdirSync(customDir, { recursive: true });
    rootDir = customDir;
  } else {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawbench-'));
  }
  return rootDir;
}

function createTestDir(testId) {
  const dir = path.join(rootDir, testId.replace(/[^a-zA-Z0-9_-]/g, '_'));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup() {
  if (rootDir && fs.existsSync(rootDir)) {
    fs.rmSync(rootDir, { recursive: true, force: true });
    rootDir = null;
  }
}

function getRoot() {
  return rootDir;
}

// Register cleanup on exit signals
function registerCleanupHandlers(keepSandbox) {
  if (keepSandbox) return;

  const handler = () => {
    cleanup();
    process.exit(0);
  };

  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
  process.on('exit', () => {
    // Sync cleanup on exit — rmSync is fine here
    if (rootDir && fs.existsSync(rootDir)) {
      try { fs.rmSync(rootDir, { recursive: true, force: true }); } catch {}
    }
  });
}

module.exports = { create, createTestDir, cleanup, getRoot, registerCleanupHandlers };
