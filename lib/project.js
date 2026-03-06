#!/usr/bin/env node
/**
 * Project Manager - Core Library
 * Manages projects, tasks, and memories across multiple projects
 */

const fs = require('fs');
const path = require('path');

// Use HOME env var, fallback to user's home directory
const HOME_DIR = process.env.HOME || require('os').homedir();
const PROJECTS_DIR = path.join(HOME_DIR, 'dev', 'projects');
const PROJECTS_FILE = path.join(PROJECTS_DIR, 'projects.json');

// Ensure projects directory exists
function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROJECTS_FILE)) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ projects: {}, activeProject: null }, null, 2));
  }
}

// Load projects database
function loadProjects() {
  ensureProjectsDir();
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error loading projects.json:', e.message);
    return { projects: {}, activeProject: null };
  }
}

// Save projects database
function saveProjects(data) {
  ensureProjectsDir();
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2));
}

// Generate next task ID for a project
function generateTaskId(tasks) {
  const maxId = tasks.reduce((max, task) => {
    const num = parseInt(task.id.replace('task-', ''), 10);
    return num > max ? num : max;
  }, 0);
  return `task-${String(maxId + 1).padStart(3, '0')}`;
}

// Get or create project
function getProject(name) {
  const data = loadProjects();
  if (!data.projects[name]) {
    data.projects[name] = {
      name: name,
      path: path.join(PROJECTS_DIR, name),
      active: true,
      createdAt: new Date().toISOString(),
      tasks: [],
    };
    // Create project folder
    fs.mkdirSync(path.join(PROJECTS_DIR, name), { recursive: true });
    // Create context.md if not exists
    const contextPath = path.join(PROJECTS_DIR, name, 'context.md');
    if (!fs.existsSync(contextPath)) {
      fs.writeFileSync(contextPath, `# ${name}\n\n## Goals\n\n\n## Tech Stack\n\n\n## Key Decisions\n\n`);
    }
    // Create memory.md if not exists
    const memoryPath = path.join(PROJECTS_DIR, name, 'memory.md');
    if (!fs.existsSync(memoryPath)) {
      fs.writeFileSync(memoryPath, `# Project Memory - ${name}\n\n`);
    }
    // Create sessions.json if not exists
    const sessionsPath = path.join(PROJECTS_DIR, name, 'sessions.json');
    if (!fs.existsSync(sessionsPath)) {
      fs.writeFileSync(sessionsPath, JSON.stringify({ sessions: [] }, null, 2));
    }
    saveProjects(data);
  }
  return data.projects[name];
}

// List all projects
function listProjects() {
  const data = loadProjects();
  return Object.values(data.projects);
}

// Switch active project
function switchProject(name) {
  const data = loadProjects();
  getProject(name); // Ensure project exists
  data.activeProject = name;
  saveProjects(data);
  return { success: true, project: data.projects[name] };
}

// Get active project
function getActiveProject() {
  const data = loadProjects();
  if (!data.activeProject) return null;
  return data.projects[data.activeProject] || null;
}

// Add task to project
function addTask(projectName, title, description = '') {
  const data = loadProjects();
  
  // Ensure project exists (creates if needed)
  if (!data.projects[projectName]) {
    getProject(projectName);
    // Reload to get the newly created project
    return addTask(projectName, title, description);
  }
  
  const project = data.projects[projectName];
  const taskId = generateTaskId(project.tasks);
  
  const task = {
    id: taskId,
    title: title,
    description: description,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  project.tasks.push(task);
  saveProjects(data);
  return task;
}

// Get task by ID
function getTask(projectName, taskId) {
  const data = loadProjects();
  const project = data.projects[projectName];
  if (!project) return null;
  return project.tasks.find(t => t.id === taskId) || null;
}

// Move task to new status
function moveTask(projectName, taskId, status) {
  const data = loadProjects();
  const project = data.projects[projectName];
  if (!project) {
    // Try to get/create project
    getProject(projectName);
    const newData = loadProjects();
    return moveTask(projectName, taskId, status);
  }
  
  const task = project.tasks.find(t => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  
  const oldStatus = task.status;
  task.status = status;
  task.updatedAt = new Date().toISOString();
  
  if (status === 'done' && oldStatus !== 'done') {
    task.completedAt = new Date().toISOString();
  }
  
  saveProjects(data);
  return task;
}

// Delete task
function deleteTask(projectName, taskId) {
  const data = loadProjects();
  const project = data.projects[projectName];
  if (!project) {
    getProject(projectName);
    const newData = loadProjects();
    return deleteTask(projectName, taskId);
  }
  
  const index = project.tasks.findIndex(t => t.id === taskId);
  if (index === -1) throw new Error(`Task ${taskId} not found`);
  
  project.tasks.splice(index, 1);
  saveProjects(data);
  return true;
}

// List tasks by status
function listTasks(projectName, status = null) {
  const data = loadProjects();
  const project = data.projects[projectName];
  if (!project) return [];
  
  if (status) {
    return project.tasks.filter(t => t.status === status);
  }
  return project.tasks;
}

// Add memory to project
function addMemory(projectName, content) {
  const project = getProject(projectName);
  const memoryPath = path.join(PROJECTS_DIR, projectName, 'memory.md');
  
  const timestamp = new Date().toISOString();
  const entry = `\n## ${timestamp}\n\n${content}\n`;
  
  fs.appendFileSync(memoryPath, entry);
  return { success: true, path: memoryPath };
}

// Get project memory
function getMemory(projectName) {
  const project = getProject(projectName);
  const memoryPath = path.join(PROJECTS_DIR, projectName, 'memory.md');
  
  if (!fs.existsSync(memoryPath)) return '';
  return fs.readFileSync(memoryPath, 'utf-8');
}

// Get project context
function getContext(projectName) {
  const project = getProject(projectName);
  const contextPath = path.join(PROJECTS_DIR, projectName, 'context.md');
  
  if (!fs.existsSync(contextPath)) return '';
  return fs.readFileSync(contextPath, 'utf-8');
}

// Attach session to project
function attachSession(projectName, sessionKey, metadata = {}) {
  const project = getProject(projectName);
  const sessionsPath = path.join(PROJECTS_DIR, projectName, 'sessions.json');
  
  let sessionsData = { sessions: [] };
  if (fs.existsSync(sessionsPath)) {
    sessionsData = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
  }
  
  sessionsData.sessions.push({
    sessionKey,
    attachedAt: new Date().toISOString(),
    ...metadata,
  });
  
  fs.writeFileSync(sessionsPath, JSON.stringify(sessionsData, null, 2));
  return { success: true, sessionKey };
}

// List sessions for project
function listSessions(projectName) {
  const project = getProject(projectName);
  const sessionsPath = path.join(PROJECTS_DIR, projectName, 'sessions.json');
  
  if (!fs.existsSync(sessionsPath)) return [];
  const data = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
  return data.sessions || [];
}

// Export for CLI and skill usage
module.exports = {
  PROJECTS_DIR,
  PROJECTS_FILE,
  loadProjects,
  saveProjects,
  getProject,
  listProjects,
  switchProject,
  getActiveProject,
  addTask,
  getTask,
  moveTask,
  deleteTask,
  listTasks,
  addMemory,
  getMemory,
  getContext,
  attachSession,
  listSessions,
};
