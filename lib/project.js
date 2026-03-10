#!/usr/bin/env node
/**
 * Project Manager - Core Library
 * Manages projects, tasks, and memories across multiple projects
 * 
 * DEPRECATED: This file now delegates to thenexus-client.js for API-based operations.
 * Direct JSON writes are only used as fallback when TheNexus API is unavailable.
 */

const api = require('./thenexus-client.js');
const fs = require('fs');
const path = require('path');

// Re-export API constants for backward compatibility
const PROJECTS_DIR = api.PROJECTS_DIR;
const PROJECTS_FILE = api.PROJECTS_FILE;

// Ensure projects directory exists (for fallback)
function ensureProjectsDir() {
  api.loadProjectsFallback(); // This ensures directory exists
}

// Load projects database (fallback only - use API when possible)
function loadProjects() {
  return api.loadProjectsFallback();
}

// Save projects database (fallback only - use API when possible)
function saveProjects(data) {
  api.saveProjectsFallback(data);
}

// Generate next globally unique task ID (fallback only)
function generateTaskId(data) {
  const globalCounter = data.globalTaskCounter || 0;
  const taskId = `task-${String(globalCounter + 1).padStart(3, '0')}`;
  data.globalTaskCounter = globalCounter + 1;
  return taskId;
}

// Get or create project (async - uses API)
async function getProject(name) {
  let project = await api.getProject(name);
  
  if (!project) {
    // Check for similar existing projects (prevent duplicates)
    const allProjects = await api.listProjects();
    const similarProjects = allProjects.filter(p => 
      p.name.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(p.name.toLowerCase())
    );
    
    if (similarProjects.length > 0) {
      console.warn(`⚠️  Warning: Similar project(s) already exist: ${similarProjects.map(p => p.name).join(', ')}`);
      console.warn(`   Consider using an existing project instead of creating "${name}"`);
    }
    
    // Create project via API
    project = await api.createProject(name);
  }
  
  return project;
}

// List all projects (async - uses API)
async function listProjects() {
  return await api.listProjects();
}

// Switch active project (async - uses API)
async function switchProject(name) {
  return await api.switchProject(name);
}

// Get active project (async - uses API)
async function getActiveProject() {
  return await api.getActiveProject();
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

// Add task to project (async - uses API)
async function addTask(projectName, title, description = '', skipRefinement = false) {
  // Ensure project exists (creates if needed)
  await getProject(projectName);
  
  // Check if refinement is needed
  const shouldRefine = !skipRefinement && needsRefinement(description);
  
  let finalDescription = description;
  let refined = false;
  let refinedAt = null;
  let refinedBy = null;
  let originalDescription = description;
  
  // Perform auto-refinement if needed
  if (shouldRefine) {
    console.log(`🔄 Auto-refining task: "${title}"`);
    finalDescription = refineTaskDescription(title, description, projectName);
    refined = true;
    refinedAt = new Date().toISOString();
    refinedBy = 'agent:coder:pm-auto-refine';
  }
  
  const taskInput = {
    title: title,
    description: finalDescription,
    project: projectName,
    refined,
    refinedAt,
    refinedBy,
    originalDescription: originalDescription || null,
    skipRefinement: skipRefinement || false,
  };
  
  const task = await api.createTask(taskInput);
  
  if (refined) {
    console.log(`✓ Task ${task.id} refined automatically`);
  }
  
  return task;
}

// Get task by ID (async - uses API)
async function getTask(projectName, taskId) {
  // API doesn't need projectName, but we keep it for backward compatibility
  return await api.getTask(taskId);
}

// Move task to new status (async - uses API)
async function moveTask(projectName, taskId, status) {
  return await api.moveTask(taskId, status);
}

// Delete task (async - uses API)
async function deleteTask(projectName, taskId) {
  return await api.deleteTask(taskId);
}

// List tasks by status (async - uses API)
async function listTasks(projectName, status = null) {
  return await api.listTasks(projectName, status);
}

// Add memory to project (async - uses API)
async function addMemory(projectName, content) {
  return await api.addMemory(projectName, content);
}

// Get project memory (async - uses API)
async function getMemory(projectName) {
  return await api.getMemory(projectName);
}

// Get project context (async - uses API)
async function getContext(projectName) {
  return await api.getContext(projectName);
}

// Attach session to project (async - uses API)
async function attachSession(projectName, sessionKey, metadata = {}) {
  return await api.attachSession(projectName, sessionKey, metadata);
}

// List sessions for project (async - uses API)
async function listSessions(projectName) {
  return await api.listSessions(projectName);
}

// Attach session to a specific task (async - uses API)
async function attachSessionToTask(projectName, taskId, sessionKey, type = 'work') {
  return await api.attachSessionToTask(projectName, taskId, sessionKey, type);
}

// Archive completed tasks (async - uses API with fallback to local JSON)
async function archiveTasks(projectName, dryRun = false, global = true) {
  return await api.archiveTasks(projectName, dryRun, global);
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
  // Archive functions
  archiveTasks,
  // Re-export API for direct access
  api,
};
