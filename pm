#!/usr/bin/env node
/**
 * Project Manager CLI - Main Entry Point
 */

const pm = require('./lib/project.js');
const path = require('path');
const { spawn } = require('child_process');

const command = process.argv[2];
const subcommand = process.argv[3];
const args = process.argv.slice(4);

const SKILL_DIR = path.dirname(__filename);

// Run a command file as subprocess with proper arguments
function runCommand(cmdFile) {
  const cmdPath = path.join(SKILL_DIR, 'commands', cmdFile);
  const proc = spawn('node', [cmdPath, subcommand, ...args], {
    stdio: 'inherit',
    cwd: SKILL_DIR,
  });
  proc.on('exit', code => process.exit(code || 0));
}

// Quick status
function showStatus() {
  const active = pm.getActiveProject();
  if (!active) {
    console.log('No active project. Use: pm project switch <name>');
    return;
  }
  
  const todo = pm.listTasks(active.name, 'todo').length;
  const inProgress = pm.listTasks(active.name, 'in-progress').length;
  const done = pm.listTasks(active.name, 'done').length;
  
  console.log(`📋 ${active.name.toUpperCase()}`);
  console.log(`   Tasks: ${todo} todo · ${inProgress} in progress · ${done} done`);
}

// Quick switch + kanban
function doWork() {
  const projectName = subcommand;
  if (!projectName) {
    console.error('Usage: pm work <project-name>');
    process.exit(1);
  }
  
  pm.switchProject(projectName);
  console.log(`\n🚀 Working on: ${projectName.toUpperCase()}\n`);
  
  // Show kanban - need to pass 'kanban' as subcommand
  const cmdPath = path.join(SKILL_DIR, 'commands', 'task.js');
  const proc = spawn('node', [cmdPath, 'kanban'], {
    stdio: 'inherit',
    cwd: SKILL_DIR,
  });
  proc.on('exit', code => process.exit(code || 0));
}

// Help
function showHelp() {
  console.log(`
Project Manager - Multi-Project Task Management

Usage: pm <command> [subcommand] [args]

Commands:
  project list|create|switch|active|info    Manage projects
  task add|list|move|complete|delete|kanban  Manage tasks
  task archive [--dry-run]                   Archive completed tasks (keep last 10)
  memory save|read|context                   Manage memories
  session attach|list                        Track sessions
  status                                     Quick status
  work <project>                             Switch + show kanban
  help                                       This help

Quick Start:
  pm project create my-project
  pm project switch my-project
  pm task add "First task"
  pm task kanban

Examples:
  pm task add "Fix bug" --project my-project
  pm task move task-001 in-progress
  pm memory save "Learned something important"
  pm session attach <session-key>
  pm task archive --dry-run
`);
}

if (!command || command === 'help') {
  showHelp();
  process.exit(0);
}

switch (command) {
  case 'project':
    runCommand('project.js');
    break;
  case 'task':
    runCommand('task.js');
    break;
  case 'memory':
    runCommand('memory.js');
    break;
  case 'session':
    runCommand('session.js');
    break;
  case 'status':
    showStatus();
    break;
  case 'work':
    doWork();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Use: pm help');
    process.exit(1);
}
