#!/usr/bin/env node
/**
 * TheNexus API Client
 * Provides API methods for task and project management via TheNexus API
 * Falls back to direct JSON writes when API is unavailable
 */

const fs = require('fs');
const path = require('path');

const THENEXUS_URL = process.env.THENEXUS_URL || 'http://localhost:3000';
const PROJECTS_DIR = path.join(process.env.HOME || require('os').homedir(), 'dev', 'projects');
const PROJECTS_FILE = path.join(PROJECTS_DIR, 'projects.json');

// Ensure projects directory exists (for fallback)
function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROJECTS_FILE)) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ projects: {}, activeProject: null, globalTaskCounter: 0 }, null, 2));
  }
}

// Load projects database (fallback only)
function loadProjectsFallback() {
  ensureProjectsDir();
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error loading projects.json:', e.message);
    return { projects: {}, activeProject: null, globalTaskCounter: 0 };
  }
}

// Save projects database (fallback only)
function saveProjectsFallback(data) {
  ensureProjectsDir();
  const backupPath = PROJECTS_FILE + '.bak';
  const tempPath = PROJECTS_FILE + '.tmp';
  
  // Backup existing file
  if (fs.existsSync(PROJECTS_FILE)) {
    fs.copyFileSync(PROJECTS_FILE, backupPath);
  }
  
  try {
    // Write to temp file
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n');
    fs.fsyncSync(fs.openSync(tempPath, 'rs+'));
    
    // Atomic rename
    fs.renameSync(tempPath, PROJECTS_FILE);
  } catch (e) {
    console.error('Error saving projects.json:', e.message);
    // Restore backup on failure
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, PROJECTS_FILE);
    }
    throw e;
  }
}

// Generate next globally unique task ID (fallback only)
function generateTaskIdFallback(data) {
  const globalCounter = data.globalTaskCounter || 0;
  const taskId = `task-${String(globalCounter + 1).padStart(3, '0')}`;
  data.globalTaskCounter = globalCounter + 1;
  return taskId;
}

// API availability cache (check every 30 seconds)
let apiAvailableCache = null;
let apiAvailableCacheTime = 0;
const API_CACHE_TTL_MS = 30000;

// Check if TheNexus API is available (with caching)
async function isApiAvailable() {
  const now = Date.now();
  
  // Return cached result if still valid
  if (apiAvailableCache !== null && (now - apiAvailableCacheTime) < API_CACHE_TTL_MS) {
    return apiAvailableCache;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const res = await fetch(`${THENEXUS_URL}/api/agents`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    apiAvailableCache = res.ok;
    apiAvailableCacheTime = now;
    return apiAvailableCache;
  } catch (e) {
    apiAvailableCache = false;
    apiAvailableCacheTime = now;
    return false;
  }
}

// Force refresh API availability cache
function refreshApiCache() {
  apiAvailableCache = null;
  apiAvailableCacheTime = 0;
}

// Create a new task via API (with fallback)
async function createTask(input) {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to create task: ${res.status} ${error}`);
    }
    
    const data = await res.json();
    return data.task;
  } catch (e) {
    // API failed, fall back to direct JSON write
    console.warn('⚠️  TheNexus API unavailable, falling back to direct JSON write');
    const data = loadProjectsFallback();
    
    // Ensure project exists
    if (!data.projects[input.project]) {
      data.projects[input.project] = {
        name: input.project,
        path: path.join(PROJECTS_DIR, input.project),
        active: true,
        createdAt: new Date().toISOString(),
        tasks: [],
      };
      fs.mkdirSync(path.join(PROJECTS_DIR, input.project), { recursive: true });
    }
    
    const taskId = generateTaskIdFallback(data);
    const task = {
      id: taskId,
      title: input.title,
      description: input.description || '',
      status: 'todo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      refined: input.refined || false,
      refinedAt: input.refinedAt || null,
      refinedBy: input.refinedBy || null,
      originalDescription: input.originalDescription || null,
      skipRefinement: input.skipRefinement || false,
      project: input.project,
    };
    
    data.projects[input.project].tasks.push(task);
    saveProjectsFallback(data);
    
    return task;
  }
}

// Update a task via API (with fallback)
async function updateTask(taskId, input) {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to update task: ${res.status} ${error}`);
    }
    
    const data = await res.json();
    return data.task;
  } catch (e) {
    // API failed, fall back to direct JSON write
    console.warn('⚠️  TheNexus API unavailable, falling back to direct JSON write');
    const data = loadProjectsFallback();
    
    // Find task in any project
    let foundProject = null;
    let foundTask = null;
    
    for (const [projName, project] of Object.entries(data.projects)) {
      const task = project.tasks.find(t => t.id === taskId);
      if (task) {
        foundProject = projName;
        foundTask = task;
        break;
      }
    }
    
    if (!foundTask) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Update task fields
    Object.assign(foundTask, input, { updatedAt: new Date().toISOString() });
    saveProjectsFallback(data);
    
    return foundTask;
  }
}

// Complete a task via API (PATCH status) (with fallback)
async function completeTask(taskId) {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to complete task: ${res.status} ${error}`);
    }
    
    const data = await res.json();
    return data.task;
  } catch (e) {
    // API failed, fall back to direct JSON write
    console.warn('⚠️  TheNexus API unavailable, falling back to direct JSON write');
    const data = loadProjectsFallback();
    
    // Find task in any project
    let foundTask = null;
    
    for (const [projName, project] of Object.entries(data.projects)) {
      const task = project.tasks.find(t => t.id === taskId);
      if (task) {
        foundTask = task;
        break;
      }
    }
    
    if (!foundTask) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    foundTask.status = 'done';
    foundTask.completedAt = new Date().toISOString();
    foundTask.updatedAt = new Date().toISOString();
    saveProjectsFallback(data);
    
    return foundTask;
  }
}

// Move a task to a new status via API (with fallback)
async function moveTask(taskId, status) {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to move task: ${res.status} ${error}`);
    }
    
    const data = await res.json();
    return data.task;
  } catch (e) {
    // API failed, fall back to direct JSON write
    console.warn('⚠️  TheNexus API unavailable, falling back to direct JSON write');
    const data = loadProjectsFallback();
    
    // Find task in any project
    let foundTask = null;
    
    for (const [projName, project] of Object.entries(data.projects)) {
      const task = project.tasks.find(t => t.id === taskId);
      if (task) {
        foundTask = task;
        break;
      }
    }
    
    if (!foundTask) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const oldStatus = foundTask.status;
    foundTask.status = status;
    foundTask.updatedAt = new Date().toISOString();
    
    if (status === 'done' && oldStatus !== 'done') {
      foundTask.completedAt = new Date().toISOString();
    }
    
    saveProjectsFallback(data);
    return foundTask;
  }
}

// Delete a task via API (with fallback)
async function deleteTask(taskId) {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to delete task: ${res.status} ${error}`);
    }
    
    const data = await res.json();
    return data.success;
  } catch (e) {
    // API failed, fall back to direct JSON write
    console.warn('⚠️  TheNexus API unavailable, falling back to direct JSON write');
    const data = loadProjectsFallback();
    
    // Find and remove task from any project
    for (const [projName, project] of Object.entries(data.projects)) {
      const index = project.tasks.findIndex(t => t.id === taskId);
      if (index !== -1) {
        project.tasks.splice(index, 1);
        project.updatedAt = new Date().toISOString();
        saveProjectsFallback(data);
        return true;
      }
    }
    
    throw new Error(`Task ${taskId} not found`);
  }
}

// Get a task by ID via API (with fallback)
async function getTask(taskId) {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/tasks/${taskId}`);
    
    if (!res.ok) {
      return null;
    }
    
    const data = await res.json();
    return data.task;
  } catch (e) {
    // API failed, fall back to direct JSON read
    const data = loadProjectsFallback();
    
    for (const [projName, project] of Object.entries(data.projects)) {
      const task = project.tasks.find(t => t.id === taskId);
      if (task) {
        return task;
      }
    }
    
    return null;
  }
}

// List tasks via API (with fallback)
async function listTasks(projectName, status = null) {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/tasks?project=${encodeURIComponent(projectName)}${status ? `&status=${status}` : ''}`);
    
    if (!res.ok) {
      return [];
    }
    
    const data = await res.json();
    return data.tasks || [];
  } catch (e) {
    // API failed, fall back to direct JSON read
    const data = loadProjectsFallback();
    const project = data.projects[projectName];
    if (!project) return [];
    
    if (status) {
      return project.tasks.filter(t => t.status === status);
    }
    return project.tasks;
  }
}

// Create a project via API (with fallback)
async function createProject(name, description = '') {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to create project: ${res.status} ${error}`);
    }
    
    const data = await res.json();
    return data.project;
  } catch (e) {
    // API failed, fall back to direct JSON write
    console.warn('⚠️  TheNexus API unavailable, falling back to direct JSON write');
    const data = loadProjectsFallback();
    
    if (data.projects[name]) {
      return data.projects[name];
    }
    
    data.projects[name] = {
      name: name,
      path: path.join(PROJECTS_DIR, name),
      active: true,
      description: description,
      createdAt: new Date().toISOString(),
      tasks: [],
    };
    
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
    
    saveProjectsFallback(data);
    return data.projects[name];
  }
}

// Get project via API (with fallback)
async function getProject(name) {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/projects`);
    
    if (!res.ok) {
      return null;
    }
    
    const data = await res.json();
    return data.projects[name] || null;
  } catch (e) {
    // API failed, fall back to direct JSON read
    const data = loadProjectsFallback();
    return data.projects[name] || null;
  }
}

// List projects via API (with fallback)
async function listProjects() {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/projects`);
    
    if (!res.ok) {
      return [];
    }
    
    const data = await res.json();
    return Object.values(data.projects || {});
  } catch (e) {
    // API failed, fall back to direct JSON read
    const data = loadProjectsFallback();
    return Object.values(data.projects);
  }
}

// Switch active project via API (with fallback)
async function switchProject(name) {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/projects/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to switch project: ${res.status} ${error}`);
    }
    
    const data = await res.json();
    return { success: true, project: data.project };
  } catch (e) {
    // API failed, fall back to direct JSON write
    console.warn('⚠️  TheNexus API unavailable, falling back to direct JSON write');
    const data = loadProjectsFallback();
    
    // Ensure project exists
    if (!data.projects[name]) {
      data.projects[name] = {
        name: name,
        path: path.join(PROJECTS_DIR, name),
        active: true,
        createdAt: new Date().toISOString(),
        tasks: [],
      };
      fs.mkdirSync(path.join(PROJECTS_DIR, name), { recursive: true });
    }
    
    data.activeProject = name;
    saveProjectsFallback(data);
    
    return { success: true, project: data.projects[name] };
  }
}

// Get active project via API (with fallback)
async function getActiveProject() {
  try {
    const res = await fetch(`${THENEXUS_URL}/api/projects/active`);
    
    if (!res.ok) {
      return null;
    }
    
    const data = await res.json();
    return data.project || null;
  } catch (e) {
    // API failed, fall back to direct JSON read
    const data = loadProjectsFallback();
    if (!data.activeProject) return null;
    return data.projects[data.activeProject] || null;
  }
}

// Add memory to project (always local file operation)
async function addMemory(projectName, content) {
  const project = await getProject(projectName);
  if (!project) {
    throw new Error(`Project ${projectName} not found`);
  }
  
  const memoryPath = path.join(project.path, 'memory.md');
  const timestamp = new Date().toISOString();
  const entry = `\n## ${timestamp}\n\n${content}\n`;
  
  fs.appendFileSync(memoryPath, entry);
  return { success: true, path: memoryPath };
}

// Get project memory (always local file operation)
async function getMemory(projectName) {
  const project = await getProject(projectName);
  if (!project) {
    return '';
  }
  
  const memoryPath = path.join(project.path, 'memory.md');
  if (!fs.existsSync(memoryPath)) return '';
  return fs.readFileSync(memoryPath, 'utf-8');
}

// Get project context (always local file operation)
async function getContext(projectName) {
  const project = await getProject(projectName);
  if (!project) {
    return '';
  }
  
  const contextPath = path.join(project.path, 'context.md');
  if (!fs.existsSync(contextPath)) return '';
  return fs.readFileSync(contextPath, 'utf-8');
}

// Attach session to project (always local file operation)
async function attachSession(projectName, sessionKey, metadata = {}) {
  const project = await getProject(projectName);
  if (!project) {
    throw new Error(`Project ${projectName} not found`);
  }
  
  const sessionsPath = path.join(project.path, 'sessions.json');
  
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

// List sessions for project (always local file operation)
async function listSessions(projectName) {
  const project = await getProject(projectName);
  if (!project) {
    return [];
  }
  
  const sessionsPath = path.join(project.path, 'sessions.json');
  if (!fs.existsSync(sessionsPath)) return [];
  const data = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
  return data.sessions || [];
}

// Attach session to task via API (with fallback)
async function attachSessionToTask(projectName, taskId, sessionKey, type = 'work') {
  try {
    const sessionField = type === 'refinement' ? 'refinementSessionKey' : 'workSessionKey';
    
    const res = await fetch(`${THENEXUS_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [sessionField]: sessionKey }),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to attach session: ${res.status} ${error}`);
    }
    
    const data = await res.json();
    
    // Also attach to project sessions list for history
    await attachSession(projectName, sessionKey, { taskId, type });
    
    return { success: true, sessionKey, type, taskId };
  } catch (e) {
    // API failed, fall back to direct JSON write
    console.warn('⚠️  TheNexus API unavailable, falling back to direct JSON write');
    const data = loadProjectsFallback();
    const project = data.projects[projectName];
    
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }
    
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Store session key on task based on type
    const sessionField = type === 'refinement' ? 'refinementSessionKey' : 'workSessionKey';
    task[sessionField] = sessionKey;
    task.updatedAt = new Date().toISOString();
    
    saveProjectsFallback(data);
    
    // Also attach to project sessions list for history
    await attachSession(projectName, sessionKey, { taskId, type });
    
    return { success: true, sessionKey, type, taskId };
  }
}

// Archive completed tasks (complex operation - uses fallback for now)
async function archiveTasks(projectName, dryRun = false, global = true) {
  // For now, always use fallback for archiving
  // This is a complex operation that needs careful handling
  console.warn('⚠️  Archive operation uses local JSON (API archiving not yet implemented)');
  
  const MAX_COMPLETED_TO_KEEP = 10;
  const ARCHIVED_TASKS_FILE = path.join(PROJECTS_DIR, 'archived-tasks.json');
  
  function getArchivedTasks() {
    ensureProjectsDir();
    if (!fs.existsSync(ARCHIVED_TASKS_FILE)) {
      return [];
    }
    try {
      const data = JSON.parse(fs.readFileSync(ARCHIVED_TASKS_FILE, 'utf-8'));
      return data.tasks || [];
    } catch (e) {
      console.error('Error loading archived-tasks.json:', e.message);
      return [];
    }
  }
  
  function saveArchivedTasks(tasks) {
    ensureProjectsDir();
    fs.writeFileSync(ARCHIVED_TASKS_FILE, JSON.stringify({ tasks, archivedAt: new Date().toISOString() }, null, 2));
  }
  
  const data = loadProjectsFallback();
  
  if (global) {
    // Global archiving: keep MAX_COMPLETED_TO_KEEP across ALL projects
    const allCompletedTasks = [];
    const projectTasksMap = {};
    
    // Collect all completed tasks from all projects
    Object.keys(data.projects).forEach(projName => {
      const project = data.projects[projName];
      const completedTasks = project.tasks.filter(t => t.status === 'done');
      const nonCompletedTasks = project.tasks.filter(t => t.status !== 'done');
      
      projectTasksMap[projName] = {
        completed: completedTasks,
        nonCompleted: nonCompletedTasks
      };
      
      completedTasks.forEach(t => {
        allCompletedTasks.push({
          ...t,
          _projectName: projName
        });
      });
    });
    
    // Sort all completed tasks by completedAt (newest first)
    allCompletedTasks.sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));
    
    // Keep only the last N completed tasks globally
    const tasksToKeep = allCompletedTasks.slice(0, MAX_COMPLETED_TO_KEEP);
    const tasksToArchive = allCompletedTasks.slice(MAX_COMPLETED_TO_KEEP);
    
    if (tasksToArchive.length === 0) {
      return { archived: 0, kept: tasksToKeep.length, message: 'No tasks to archive' };
    }
    
    if (dryRun) {
      return {
        archived: tasksToArchive.length,
        kept: tasksToKeep.length,
        toArchive: tasksToArchive.map(t => ({ id: t.id, title: t.title, project: t._projectName, completedAt: t.completedAt })),
        message: `Would archive ${tasksToArchive.length} task(s) globally, keep ${tasksToKeep.length} most recent completed across all projects`
      };
    }
    
    // Add project name to archived tasks for reference
    const archivedTasks = getArchivedTasks();
    const tasksWithProject = tasksToArchive.map(t => {
      const { _projectName, ...taskWithoutProject } = t;
      return { ...taskWithoutProject, archivedFrom: _projectName, archivedAt: new Date().toISOString() };
    });
    
    saveArchivedTasks([...archivedTasks, ...tasksWithProject]);
    
    // Update each project's tasks
    const keepByProject = {};
    tasksToKeep.forEach(t => {
      if (!keepByProject[t._projectName]) {
        keepByProject[t._projectName] = [];
      }
      keepByProject[t._projectName].push(t);
    });
    
    Object.keys(data.projects).forEach(projName => {
      const project = data.projects[projName];
      const keptTasks = keepByProject[projName] || [];
      const nonCompleted = projectTasksMap[projName].nonCompleted;
      project.tasks = [...nonCompleted, ...keptTasks];
      project.updatedAt = new Date().toISOString();
    });
    
    saveProjectsFallback(data);
    
    return {
      archived: tasksToArchive.length,
      kept: tasksToKeep.length,
      archivedTasks: tasksToArchive.map(t => t.id),
      message: `Archived ${tasksToArchive.length} task(s) globally, kept ${tasksToKeep.length} most recent completed across all projects`
    };
  } else {
    // Per-project archiving (legacy behavior)
    const project = data.projects[projectName];
    
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }
    
    const completedTasks = project.tasks.filter(t => t.status === 'done');
    const nonCompletedTasks = project.tasks.filter(t => t.status !== 'done');
    
    // Sort completed tasks by completedAt (newest first)
    completedTasks.sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));
    
    // Keep only the last N completed tasks
    const tasksToKeep = completedTasks.slice(0, MAX_COMPLETED_TO_KEEP);
    const tasksToArchive = completedTasks.slice(MAX_COMPLETED_TO_KEEP);
    
    if (tasksToArchive.length === 0) {
      return { archived: 0, kept: tasksToKeep.length, message: 'No tasks to archive' };
    }
    
    if (dryRun) {
      return {
        archived: tasksToArchive.length,
        kept: tasksToKeep.length,
        toArchive: tasksToArchive.map(t => ({ id: t.id, title: t.title, completedAt: t.completedAt })),
        message: `Would archive ${tasksToArchive.length} task(s), keep ${tasksToKeep.length} most recent completed`
      };
    }
    
    // Add project name to archived tasks for reference
    const archivedTasks = getArchivedTasks();
    const tasksWithProject = tasksToArchive.map(t => ({ ...t, archivedFrom: projectName, archivedAt: new Date().toISOString() }));
    
    saveArchivedTasks([...archivedTasks, ...tasksWithProject]);
    
    // Update project tasks
    project.tasks = [...nonCompletedTasks, ...tasksToKeep];
    project.updatedAt = new Date().toISOString();
    saveProjectsFallback(data);
    
    return {
      archived: tasksToArchive.length,
      kept: tasksToKeep.length,
      archivedTasks: tasksToArchive.map(t => t.id),
      message: `Archived ${tasksToArchive.length} task(s), kept ${tasksToKeep.length} most recent completed`
    };
  }
}

module.exports = {
  THENEXUS_URL,
  PROJECTS_DIR,
  PROJECTS_FILE,
  isApiAvailable,
  refreshApiCache,
  createTask,
  updateTask,
  completeTask,
  moveTask,
  deleteTask,
  getTask,
  listTasks,
  createProject,
  getProject,
  listProjects,
  switchProject,
  getActiveProject,
  addMemory,
  getMemory,
  getContext,
  attachSession,
  listSessions,
  attachSessionToTask,
  archiveTasks,
  // Fallback exports (for backward compatibility)
  loadProjectsFallback,
  saveProjectsFallback,
};
