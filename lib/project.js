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

// Generate next globally unique task ID
function generateTaskId(data) {
  const globalCounter = data.globalTaskCounter || 0;
  const taskId = `task-${String(globalCounter + 1).padStart(3, '0')}`;
  data.globalTaskCounter = globalCounter + 1;
  return taskId;
}

// Get or create project
function getProject(name) {
  const data = loadProjects();
  if (!data.projects[name]) {
    // Check for similar existing projects (prevent duplicates)
    const similarProjects = Object.keys(data.projects).filter(key => 
      key.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(key.toLowerCase())
    );
    
    if (similarProjects.length > 0) {
      console.warn(`⚠️  Warning: Similar project(s) already exist: ${similarProjects.join(', ')}`);
      console.warn(`   Consider using an existing project instead of creating "${name}"`);
    }
    
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

// Check if task needs refinement
function needsRefinement(description) {
  if (!description || description.length === 0) return true;
  if (description.length > 150) return false;
  if (description.includes('##') || description.includes('###')) return false;
  if (description.includes('Objective') || description.includes('Acceptance')) return false;
  return description.length < 50;
}

// Load refinement prompt template from file
function loadRefinementPrompt() {
  const customPromptPath = process.env.REFINEMENT_PROMPT_PATH;
  const defaultPromptPath = path.join(__dirname, '..', 'refinement-prompt.md');
  const promptPath = customPromptPath || defaultPromptPath;
  
  try {
    if (!fs.existsSync(promptPath)) {
      console.warn(`⚠️ Refinement prompt not found: ${promptPath}`);
      return null;
    }
    const content = fs.readFileSync(promptPath, 'utf-8');
    // Validate essential placeholders
    if (!content.includes('{{title}}') || !content.includes('{{description}}')) {
      console.warn(`⚠️ Prompt missing placeholders: ${promptPath}`);
      return null;
    }
    return content;
  } catch (error) {
    console.error(`❌ Error loading prompt: ${error.message}`);
    return null;
  }
}

// Interpolate prompt template with values
function interpolatePrompt(template, values) {
  return template
    .replace(/{{title}}/g, values.title)
    .replace(/{{description}}/g, values.description || '(no description provided)')
    .replace(/{{project}}/g, values.projectName);
}

// Basic refinement logic - enriches task description
function refineTaskDescription(title, description, projectName) {
  // Try to load prompt from file
  const promptTemplate = loadRefinementPrompt();
  
  if (promptTemplate) {
    // Use loaded prompt template
    const prompt = interpolatePrompt(promptTemplate, { title, description, projectName });
    // For CLI-based refinement, we just return the prompt as-is
    // The actual refinement would be done by an agent if needed
    // For now, fall through to default template-based refinement
  }
  
  // Default template-based refinement (fallback)
  const sections = [];
  
  sections.push(`## Objective\n\n${description || title}. The goal is to complete this task successfully with clear outcomes.`);
  sections.push(`## Context\n\nThis task was created for project "${projectName}". Further context should be gathered from project files (AGENTS.md, context.md) and related tasks.`);
  sections.push(`## Technical Approach\n\n1. Analyze the requirements and understand the scope\n2. Review existing code and project structure\n3. Implement the solution following project conventions\n4. Test thoroughly before marking complete`);
  sections.push(`## Files to Modify\n\n*To be determined based on task analysis. Check project structure and related tasks.*`);
  sections.push(`## Acceptance Criteria\n\n- [ ] Task objective is fully achieved\n- [ ] Code follows project conventions\n- [ ] Tests pass (if applicable)\n- [ ] No regressions introduced\n- [ ] Documentation updated (if needed)`);
  sections.push(`## Dependencies\n\n*Check related tasks in the project backlog for prerequisites.*`);
  sections.push(`## Potential Pitfalls\n\n- Ensure understanding of full requirements before implementation\n- Watch for edge cases and error handling\n- Consider impact on existing functionality`);
  
  return sections.join('\n\n');
}

// Add task to project
function addTask(projectName, title, description = '', skipRefinement = false) {
  let data = loadProjects();
  
  // Ensure project exists (creates if needed)
  if (!data.projects[projectName]) {
    getProject(projectName);
    // Reload to get the newly created project with all existing tasks
    data = loadProjects();
  }
  
  const project = data.projects[projectName];
  const taskId = generateTaskId(data);
  
  // Check if refinement is needed
  const shouldRefine = !skipRefinement && needsRefinement(description);
  
  let finalDescription = description;
  let refined = false;
  let refinedAt = null;
  let refinedBy = null;
  let originalDescription = description;
  
  // Perform auto-refinement if needed
  if (shouldRefine) {
    console.log(`🔄 Auto-refining task: ${taskId} - "${title}"`);
    finalDescription = refineTaskDescription(title, description, projectName);
    refined = true;
    refinedAt = new Date().toISOString();
    refinedBy = 'agent:coder:pm-auto-refine';
  }
  
  const task = {
    id: taskId,
    title: title,
    description: finalDescription,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Refinement metadata
    refined,
    refinedAt,
    refinedBy,
    originalDescription: originalDescription || null,
    skipRefinement: skipRefinement || false,
  };
  
  project.tasks.push(task);
  saveProjects(data);
  
  if (refined) {
    console.log(`✓ Task ${taskId} refined automatically`);
  }
  
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

// Attach session to a specific task
function attachSessionToTask(projectName, taskId, sessionKey, type = 'work') {
  const data = loadProjects();
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
  
  saveProjects(data);
  
  // Also attach to project sessions list for history
  attachSession(projectName, sessionKey, { taskId, type });
  
  return { success: true, sessionKey, type, taskId };
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
  attachSessionToTask,
  needsRefinement,
  refineTaskDescription,
};
