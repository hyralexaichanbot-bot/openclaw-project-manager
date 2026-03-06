#!/usr/bin/env node
/**
 * Project Manager CLI - Memory Commands
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
  case 'save':
  case 'add':
  case 'write': {
    // memory save "content" [--project <name>]
    let projectName = null;
    let content = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (!content && !args[i].startsWith('--')) {
        content = args[i];
      }
    }
    
    if (!content) {
      console.error('Usage: memory save "content" [--project <name>]');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    const result = pm.addMemory(projectName, content);
    console.log(`✓ Memory saved to ${result.path}`);
    break;
  }
  
  case 'read':
  case 'show':
  case 'get': {
    // memory read [--project <name>]
    let projectName = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      }
    }
    
    projectName = getProjectName(projectName);
    const memory = pm.getMemory(projectName);
    
    if (!memory || memory.trim() === '') {
      console.log('(no memories yet)');
    } else {
      console.log(memory);
    }
    break;
  }
  
  case 'context': {
    // memory context [--project <name>]
    let projectName = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      }
    }
    
    projectName = getProjectName(projectName);
    const context = pm.getContext(projectName);
    
    if (!context || context.trim() === '') {
      console.log('(no context yet)');
    } else {
      console.log(context);
    }
    break;
  }
  
  default:
    console.log(`
Project Manager - Memory Commands

Usage:
  memory save "content" [--project <name>]   Save a memory/learning
  memory read [--project <name>]             Read project memories
  memory context [--project <name>]          Read project context
`);
    process.exit(1);
}
