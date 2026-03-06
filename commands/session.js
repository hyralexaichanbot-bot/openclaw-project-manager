#!/usr/bin/env node
/**
 * Project Manager CLI - Session Commands
 */

const pm = require('../lib/project.js');

const command = process.argv[2];
const args = process.argv.slice(3);

function getProjectName(projectArg) {
  if (projectArg) return projectArg;
  const active = pm.getActiveProject();
  if (!active) {
    console.error('No active project. Use: project switch <name>');
    process.exit(1);
  }
  return active.name;
}

switch (command) {
  case 'attach':
  case 'log':
  case 'save': {
    // session attach <session-key> [--project <name>]
    let projectName = null;
    let sessionKey = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (!sessionKey && !args[i].startsWith('--')) {
        sessionKey = args[i];
      }
    }
    
    if (!sessionKey) {
      console.error('Usage: session attach <session-key> [--project <name>]');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    const result = pm.attachSession(projectName, sessionKey);
    console.log(`✓ Session attached to ${projectName}`);
    console.log(`  Session: ${result.sessionKey}`);
    break;
  }
  
  case 'list':
  case 'ls':
  case 'show': {
    // session list [--project <name>]
    let projectName = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      }
    }
    
    projectName = getProjectName(projectName);
    const sessions = pm.listSessions(projectName);
    
    if (sessions.length === 0) {
      console.log('No sessions attached to this project');
    } else {
      console.log(`Sessions for ${projectName}:`);
      sessions.forEach((s, i) => {
        const date = new Date(s.attachedAt).toLocaleString();
        console.log(`  ${i + 1}. ${s.sessionKey} (attached: ${date})`);
      });
    }
    break;
  }
  
  default:
    console.log(`
Project Manager - Session Commands

Usage:
  session attach <key> [--project <name>]   Attach session to project
  session list [--project <name>]           List attached sessions
`);
    process.exit(1);
}
