#!/usr/bin/env node
/**
 * Project Manager CLI - Project Commands
 */

const pm = require('../lib/project.js');

const command = process.argv[2];
const args = process.argv.slice(3);

function printTable(headers, rows) {
  const widths = headers.map((h, i) => 
    Math.max(h.length, ...rows.map(r => String(r[i] || '').length))
  );
  
  const separator = widths.map(w => '─'.repeat(w)).join(' │ ');
  console.log('┌─' + widths.map(w => '─'.repeat(w)).join('─┬─') + '─┐');
  console.log('│ ' + headers.map((h, i) => h.padEnd(widths[i])).join(' │ ') + ' │');
  console.log('├─' + separator + '─┤');
  
  rows.forEach(row => {
    console.log('│ ' + row.map((cell, i) => String(cell || '').padEnd(widths[i])).join(' │ ') + ' │');
  });
  
  console.log('└─' + separator + '─┘');
}

switch (command) {
  case 'list':
  case 'ls': {
    const projects = pm.listProjects();
    const active = pm.getActiveProject();
    
    if (projects.length === 0) {
      console.log('No projects yet. Create one with: project create <name>');
      break;
    }
    
    const rows = projects.map(p => [
      p.name === active?.name ? '● ' + p.name : '  ' + p.name,
      p.tasks?.length || 0,
      new Date(p.createdAt).toLocaleDateString(),
    ]);
    
    printTable(['Project', 'Tasks', 'Created'], rows);
    break;
  }
  
  case 'create': {
    const name = args[0];
    if (!name) {
      console.error('Usage: project create <name>');
      process.exit(1);
    }
    const project = pm.getProject(name);
    console.log(`✓ Created project: ${project.name}`);
    console.log(`  Path: ${project.path}`);
    break;
  }
  
  case 'switch':
  case 'use':
  case 'set': {
    const name = args[0];
    if (!name) {
      console.error('Usage: project switch <name>');
      process.exit(1);
    }
    const result = pm.switchProject(name);
    console.log(`✓ Switched to project: ${result.project.name}`);
    console.log(`  Path: ${result.project.path}`);
    console.log(`  Tasks: ${result.project.tasks?.length || 0} total`);
    break;
  }
  
  case 'active': {
    const active = pm.getActiveProject();
    if (!active) {
      console.log('No active project. Use: project switch <name>');
    } else {
      console.log(`Active project: ${active.name}`);
      console.log(`  Path: ${active.path}`);
      console.log(`  Tasks: ${active.tasks?.length || 0} total`);
    }
    break;
  }
  
  case 'info': {
    const name = args[0] || pm.getActiveProject()?.name;
    if (!name) {
      console.error('Usage: project info <name> (or set active project first)');
      process.exit(1);
    }
    const project = pm.getProject(name);
    console.log(`Project: ${project.name}`);
    console.log(`  Path: ${project.path}`);
    console.log(`  Created: ${new Date(project.createdAt).toLocaleString()}`);
    console.log(`  Tasks: ${project.tasks?.length || 0} total`);
    
    const byStatus = { todo: 0, 'in-progress': 0, done: 0 };
    (project.tasks || []).forEach(t => byStatus[t.status] = (byStatus[t.status] || 0) + 1);
    console.log(`    Todo: ${byStatus.todo}, In Progress: ${byStatus['in-progress']}, Done: ${byStatus.done}`);
    break;
  }
  
  default:
    console.log(`
Project Manager - Project Commands

Usage:
  project list              List all projects
  project create <name>     Create a new project
  project switch <name>     Switch to a project
  project active            Show active project
  project info [name]       Show project details
`);
    process.exit(1);
}
