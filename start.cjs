#!/usr/bin/env node
// Launcher for the MCP server — works from any working directory on Windows.
// Uses .mjs entry point so Node always treats it as ESM.

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = __dirname;
const entry = path.join(projectRoot, 'dist', 'index.mjs');

const child = spawn(process.execPath, [entry], {
  cwd: projectRoot,
  stdio: 'inherit',
  windowsHide: true,
});

child.on('exit', (code) => process.exit(code ?? 1));
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
