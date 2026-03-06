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
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    break;
  }
  
  case 'complete':
  case 'done': {
    // task complete <id> [--project <name>]
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
      console.error('Usage: task complete <id> [--project <name>]');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    try {
      const task = pm.moveTask(projectName, taskId, 'done');
      console.log(`✓ Task ${task.id} completed!`);
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
  task add "title" [--project <name>]     Add a new task
  task list [--project <name>]            List all tasks
  task move <id> <status>                 Move task (todo/in-progress/done)
  task complete <id>                      Mark task as done
  task delete <id>                        Delete a task
  task info <id>                          Show task details
  task kanban                             Show kanban view
`);
    process.exit(1);
}
