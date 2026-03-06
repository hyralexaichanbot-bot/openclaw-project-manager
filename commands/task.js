#!/usr/bin/env node
/**
 * Project Manager CLI - Task Commands
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

function getStatusIcon(status) {
  switch (status) {
    case 'todo': return '○';
    case 'in-progress': return '◐';
    case 'done': return '●';
    default: return '?';
  }
}

function getProjectName(projectArg) {
  if (projectArg) return projectArg;
  const active = pm.getActiveProject();
  if (!active) {
    console.error('No active project. Use: project switch <name>');
    console.error('Available projects:');
    const projects = pm.listProjects();
    projects.forEach(p => {
      const taskCount = p.tasks?.length || 0;
      console.error(`  - ${p.name} (${taskCount} tasks)`);
    });
    process.exit(1);
  }
  return active.name;
}

switch (command) {
  case 'add':
  case 'create': {
    // Parse arguments: --project <name> "title" or "title" --project <name>
    let projectName = null;
    let title = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (!title && !args[i].startsWith('--')) {
        title = args[i];
      }
    }
    
    if (!title) {
      console.error('Usage: task add "task title" [--project <name>]');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    const task = pm.addTask(projectName, title);
    console.log(`✓ Task created: ${task.id}`);
    console.log(`  Project: ${projectName}`);
    console.log(`  Title: ${task.title}`);
    console.log(`  Status: ${task.status}`);
    break;
  }
  
  case 'list':
  case 'ls':
  case 'show': {
    // Parse: --project <name> [--status todo|in-progress|done]
    let projectName = null;
    let status = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (args[i] === '--status' && args[i + 1]) {
        status = args[++i];
      }
    }
    
    projectName = getProjectName(projectName);
    const tasks = pm.listTasks(projectName, status);
    
    if (tasks.length === 0) {
      console.log(status ? `No ${status} tasks` : 'No tasks');
      break;
    }
    
    const rows = tasks.map(t => [
      getStatusIcon(t.status),
      t.id,
      t.title.substring(0, 50) + (t.title.length > 50 ? '...' : ''),
      new Date(t.createdAt).toLocaleDateString(),
    ]);
    
    printTable([' ', 'ID', 'Title', 'Created'], rows);
    console.log(`\nTotal: ${tasks.length} task(s)`);
    break;
  }
  
  case 'move':
  case 'set': {
    // task move <id> <status> [--project <name>]
    let projectName = null;
    let taskId = null;
    let status = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (!taskId) {
        taskId = args[i];
      } else if (!status) {
        status = args[i];
      }
    }
    
    if (!taskId || !status) {
      console.error('Usage: task move <id> <status> [--project <name>]');
      console.error('  Status: todo, in-progress, done');
      process.exit(1);
    }
    
    if (!['todo', 'in-progress', 'done'].includes(status)) {
      console.error('Invalid status. Use: todo, in-progress, or done');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    try {
      const task = pm.moveTask(projectName, taskId, status);
      console.log(`✓ Task ${task.id} moved to ${status}`);
      
      // Auto-load context when starting work (moving to in-progress)
      if (status === 'in-progress') {
        const fs = require('fs');
        const path = require('path');
        const project = pm.getProject(projectName);
        const agentsPath = path.join(project.path, 'AGENTS.md');
        const contextPath = path.join(project.path, 'context.md');
        
        console.log('\n🚀 STARTING WORK - Here\'s what you need to know:');
        console.log('─'.repeat(50));
        
        if (fs.existsSync(agentsPath)) {
          const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
          console.log(agentsContent.substring(0, 1500) + (agentsContent.length > 1500 ? '\n... (truncated, read full AGENTS.md for more)' : ''));
        } else if (fs.existsSync(contextPath)) {
          const contextContent = fs.readFileSync(contextPath, 'utf-8');
          console.log(contextContent.substring(0, 1000) + (contextContent.length > 1000 ? '\n... (truncated)' : ''));
        } else {
          console.log('No AGENTS.md or context.md found for this project.');
        }
        
        console.log('─'.repeat(50));
      }
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    break;
  }
  
  case 'complete':
  case 'done':
  case 'finish': {
    // task complete <id> [--project <name>] [--message "summary"]
    let projectName = null;
    let taskId = null;
    let message = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (args[i] === '--message' && args[i + 1]) {
        message = args[++i];
      } else if (!taskId && !args[i].startsWith('--')) {
        taskId = args[i];
      }
    }
    
    if (!taskId) {
      console.error('Usage: task complete <id> [--project <name>] [--message "summary"]');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    try {
      const task = pm.moveTask(projectName, taskId, 'done');
      console.log(`✓ Task ${task.id} completed!`);
      
      // If message provided, save to project memory
      if (message) {
        pm.addMemory(projectName, `Completed ${taskId}: ${message}`);
        console.log(`✓ Memory saved: ${message}`);
      }
      
      // Show completion summary
      const duration = new Date(task.completedAt) - new Date(task.createdAt);
      const hours = Math.floor(duration / 3600000);
      const mins = Math.floor((duration % 3600000) / 60000);
      console.log(`\n📊 Task Summary:`);
      console.log(`   Duration: ${hours > 0 ? hours + 'h ' : ''}${mins}m`);
      console.log(`   Status: ${task.status}`);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    break;
  }
  
  case 'delete':
  case 'rm': {
    // task delete <id> [--project <name>]
    let projectName = null;
    let taskId = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (!taskId) {
        taskId = args[i];
      }
    }
    
    if (!taskId) {
      console.error('Usage: task delete <id> [--project <name>]');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    try {
      pm.deleteTask(projectName, taskId);
      console.log(`✓ Task ${taskId} deleted`);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    break;
  }
  
  case 'info': {
    // task info <id> [--project <name>]
    let projectName = null;
    let taskId = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (!taskId) {
        taskId = args[i];
      }
    }
    
    if (!taskId) {
      console.error('Usage: task info <id> [--project <name>]');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    const task = pm.getTask(projectName, taskId);
    
    if (!task) {
      console.error(`Task ${taskId} not found`);
      process.exit(1);
    }
    
    console.log(`Task: ${task.id}`);
    console.log(`  Title: ${task.title}`);
    console.log(`  Description: ${task.description || '(none)'}`);
    console.log(`  Status: ${task.status}`);
    console.log(`  Created: ${new Date(task.createdAt).toLocaleString()}`);
    if (task.completedAt) {
      console.log(`  Completed: ${new Date(task.completedAt).toLocaleString()}`);
    }
    break;
  }
  
  case 'kanban': {
    // task kanban [--project <name>]
    let projectName = null;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      }
    }
    
    projectName = getProjectName(projectName);
    const todo = pm.listTasks(projectName, 'todo');
    const inProgress = pm.listTasks(projectName, 'in-progress');
    const done = pm.listTasks(projectName, 'done');
    
    console.log(`\n📋 ${projectName.toUpperCase()} - Kanban\n`);
    
    console.log(`📝 TODO (${todo.length})`);
    todo.forEach(t => console.log(`  ○ ${t.id}: ${t.title}`));
    
    console.log(`\n🚧 IN PROGRESS (${inProgress.length})`);
    inProgress.forEach(t => console.log(`  ◐ ${t.id}: ${t.title}`));
    
    console.log(`\n✅ DONE (${done.length})`);
    done.forEach(t => console.log(`  ● ${t.id}: ${t.title}`));
    
    console.log('');
    break;
  }
  
  default:
    console.log(`
Project Manager - Task Commands

Usage:
  task add "title" [--project <name>]           Add a new task
  task list [--project <name>]                  List all tasks
  task move <id> <status>                       Move task (todo/in-progress/done)
  task complete <id> [--message "summary"]      Mark task as done
  task delete <id>                              Delete a task
  task info <id>                                Show task details
  task kanban                                   Show kanban view

Tips:
  - Use --message with complete to save a summary to memory
  - Always complete your task before ending a session!
`);
    process.exit(1);
}
