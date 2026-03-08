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
    case 'refinement': return '⭐';
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
    // Parse arguments: --project <name> "title" --skip-refinement
    let projectName = null;
    let title = null;
    let skipRefinement = false;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (args[i] === '--skip-refinement') {
        skipRefinement = true;
      } else if (!title && !args[i].startsWith('--')) {
        title = args[i];
      }
    }
    
    if (!title) {
      console.error('Usage: task add "task title" [--project <name>] [--skip-refinement]');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    const task = pm.addTask(projectName, title, '', skipRefinement);
    console.log(`✓ Task created: ${task.id}`);
    console.log(`  Project: ${projectName}`);
    console.log(`  Title: ${task.title}`);
    console.log(`  Status: ${task.status}`);
    if (task.refined) {
      console.log(`  ✨ Refined: Yes (auto-refined)`);
    } else if (task.skipRefinement) {
      console.log(`  ⚡ Quick task (refinement skipped)`);
    }
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
      console.error('  Status: todo, in-progress, refinement, done');
      process.exit(1);
    }
    
    if (!['todo', 'in-progress', 'done', 'refinement'].includes(status)) {
      console.error('Invalid status. Use: todo, in-progress, refinement, or done');
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
    if (task.refined) {
      console.log(`  ✨ Refined: Yes (${new Date(task.refinedAt).toLocaleString()})`);
    }
    if (task.workSessionKey) {
      console.log(`  📀 Work Session: ${task.workSessionKey}`);
    }
    if (task.refinementSessionKey) {
      console.log(`  ⭐ Refinement Session: ${task.refinementSessionKey}`);
    }
    if (task.completedAt) {
      console.log(`  Completed: ${new Date(task.completedAt).toLocaleString()}`);
    }
    break;
  }
  
  case 'refine': {
    // task refine <id> [--project <name>] [--force]
    let projectName = null;
    let taskId = null;
    let force = false;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (args[i] === '--force') {
        force = true;
      } else if (!taskId) {
        taskId = args[i];
      }
    }
    
    if (!taskId) {
      console.error('Usage: task refine <id> [--project <name>] [--force]');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    const task = pm.getTask(projectName, taskId);
    
    if (!task) {
      console.error(`Task ${taskId} not found`);
      process.exit(1);
    }
    
    if (task.refined && !force) {
      console.log(`⚠️  Task ${taskId} is already refined. Use --force to re-refine.`);
      process.exit(0);
    }
    
    // Store original description if not already stored
    if (!task.originalDescription) {
      task.originalDescription = task.description;
    }
    
    // Perform refinement
    task.description = pm.refineTaskDescription(task.title, task.description || '', projectName);
    task.refined = true;
    task.refinedAt = new Date().toISOString();
    task.refinedBy = 'agent:coder:pm-manual-refine';
    task.updatedAt = new Date().toISOString();
    task.skipRefinement = false;
    
    // Save the updated task
    const data = pm.loadProjects();
    const project = data.projects[projectName];
    const taskIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      project.tasks[taskIndex] = task;
      pm.saveProjects(data);
    }
    
    console.log(`✓ Task ${taskId} refined successfully!`);
    console.log(`  Original description preserved for reference.`);
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
    const refinement = pm.listTasks(projectName, 'refinement');
    const done = pm.listTasks(projectName, 'done');
    
    console.log(`\n📋 ${projectName.toUpperCase()} - Kanban\n`);
    
    console.log(`📝 TODO (${todo.length})`);
    todo.forEach(t => console.log(`  ○ ${t.id}: ${t.title}`));
    
    console.log(`\n🚧 IN PROGRESS (${inProgress.length})`);
    inProgress.forEach(t => console.log(`  ◐ ${t.id}: ${t.title}`));
    
    console.log(`\n⭐ REFINEMENT (${refinement.length})`);
    refinement.forEach(t => console.log(`  ⭐ ${t.id}: ${t.title}`));
    
    console.log(`\n✅ DONE (${done.length})`);
    done.forEach(t => console.log(`  ● ${t.id}: ${t.title}`));
    
    console.log('');
    break;
  }
  
  case 'session': {
    // task session attach <task-id> <session-key> [--type work|refinement] [--project <name>]
    const subcommand = args[0];
    
    if (subcommand !== 'attach') {
      console.error('Usage: task session attach <task-id> <session-key> [--type work|refinement] [--project <name>]');
      process.exit(1);
    }
    
    let projectName = null;
    let taskId = null;
    let sessionKey = null;
    let type = 'work';
    
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--project' && args[i + 1]) {
        projectName = args[++i];
      } else if (args[i] === '--type' && args[i + 1]) {
        type = args[++i];
      } else if (!taskId && !args[i].startsWith('--')) {
        taskId = args[i];
      } else if (!sessionKey && !args[i].startsWith('--')) {
        sessionKey = args[i];
      }
    }
    
    if (!taskId || !sessionKey) {
      console.error('Usage: task session attach <task-id> <session-key> [--type work|refinement] [--project <name>]');
      process.exit(1);
    }
    
    if (type !== 'work' && type !== 'refinement') {
      console.error('Error: --type must be "work" or "refinement"');
      process.exit(1);
    }
    
    projectName = getProjectName(projectName);
    const result = pm.attachSessionToTask(projectName, taskId, sessionKey, type);
    
    console.log(`✓ Session attached to task ${taskId}`);
    console.log(`  Type: ${result.type}`);
    console.log(`  Session: ${result.sessionKey}`);
    break;
  }
  
  default:
    console.log(`
Project Manager - Task Commands

Usage:
  task add "title" [--project <name>] [--skip-refinement]  Add a new task
  task list [--project <name>]                             List all tasks
  task move <id> <status>                                  Move task (todo/in-progress/refinement/done)
  task complete <id> [--message "summary"]                 Mark task as done
  task delete <id>                                         Delete a task
  task info <id>                                           Show task details
  task refine <id> [--force]                               Refine task description
  task kanban                                              Show kanban view
  task session attach <id> <key> [--type work|refinement]  Attach session to task

Session Tracking:
  - Attach your work session at the start: task session attach task-123 <session-key>
  - Attach refinement session: task session attach task-123 <key> --type refinement
  - Sessions are displayed in task cards and details UI

Refinement:
  - Tasks with short descriptions (<50 chars) are auto-refined
  - Use --skip-refinement to create quick tasks without refinement
  - Use 'task refine' to manually refine an existing task
  - Use --force to re-refine an already refined task

Tips:
  - Use --message with complete to save a summary to memory
  - Always complete your task before ending a session!
`);
    process.exit(1);
}
