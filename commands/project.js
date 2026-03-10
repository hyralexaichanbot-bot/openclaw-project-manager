#!/usr/bin/env node
/**
 * Project Manager CLI - Project Commands
 * Updated to use async/await for TheNexus API integration
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

async function main() {
  switch (command) {
    case 'list':
    case 'ls': {
      const projects = await pm.listProjects();
      const active = await pm.getActiveProject();
      
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
      
      // Check for similar existing projects using API
      const allProjects = await pm.listProjects();
      const similarProjects = allProjects.filter(p => 
        p.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(p.name.toLowerCase())
      );
      
      if (similarProjects.length > 0) {
        console.warn(`⚠️  Warning: Similar project(s) already exist:`);
        similarProjects.forEach(p => {
          const taskCount = p.tasks?.length || 0;
          console.warn(`   - ${p.name} (${taskCount} tasks)`);
        });
        console.warn(`\n   Did you mean to use an existing project?`);
        console.warn(`   Use: pm project switch <name>`);
        console.warn(`   Or: pm task add "title" --project <existing-name>`);
        console.warn(`\n   Creating "${name}" anyway...\n`);
      }
      
      const project = await pm.getProject(name);
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
      const result = await pm.switchProject(name);
      console.log(`✓ Switched to project: ${result.project.name}`);
      console.log(`  Path: ${result.project.path}`);
      console.log(`  Tasks: ${result.project.tasks?.length || 0} total`);
      
      // Auto-load context for the agent
      const fs = require('fs');
      const path = require('path');
      const agentsPath = path.join(result.project.path, 'AGENTS.md');
      const contextPath = path.join(result.project.path, 'context.md');
      
      if (fs.existsSync(agentsPath)) {
        const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
        console.log('\n📋 PROJECT CONTEXT (AGENTS.md):');
        console.log('─'.repeat(50));
        console.log(agentsContent.substring(0, 1500) + (agentsContent.length > 1500 ? '\n... (truncated)' : ''));
        console.log('─'.repeat(50));
      } else if (fs.existsSync(contextPath)) {
        const contextContent = fs.readFileSync(contextPath, 'utf-8');
        console.log('\n📋 PROJECT CONTEXT (context.md):');
        console.log('─'.repeat(50));
        console.log(contextContent.substring(0, 1000) + (contextContent.length > 1000 ? '\n... (truncated)' : ''));
        console.log('─'.repeat(50));
      }
      break;
    }
    
    case 'active': {
      const active = await pm.getActiveProject();
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
      const name = args[0] || (await pm.getActiveProject())?.name;
      if (!name) {
        console.error('Usage: project info <name> (or set active project first)');
        process.exit(1);
      }
      const project = await pm.getProject(name);
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
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
