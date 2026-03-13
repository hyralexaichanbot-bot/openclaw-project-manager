# Subagent Spawn Template for Project Tasks

## When to Use

When spawning a subagent to work on a task tracked in **TheNexus** task system.

## Template Structure

```markdown
**Task-XXX:** "<task title>"

**Full Description:**
"<task description from TheNexus>"

## Project Context

This task is tracked in **TheNexus**.

**Project:** <project-name>
**Task ID:** task-XXX
**Project Location:** /home/azureuser/dev/<project-folder>

## Task Management

Tasks are managed through **TheNexus API**.

Common operations:

```bash
# Update task status
PATCH http://localhost:3000/api/tasks/task-XXX

# Start a task
POST http://localhost:3000/api/tasks/start

# Get task information
GET http://localhost:3000/api/tasks
```

Subagents should focus on **implementing the task and validating that the result works**. Task status will normally be updated by the orchestrator.

## What to Do

**At Session Start:**
1. Read the full task description
2. Understand the goal and expected outcome
3. Locate the relevant project files

**During Work:**
4. Implement the required changes
5. Test your work locally
6. Verify the feature behaves correctly

**Before Finishing:**
7. Confirm the task objective is satisfied
8. Ensure the project still runs without errors
9. Validate UI behavior if frontend changes were made

## Technical Context

<Tech stack, file locations, API endpoints, etc. specific to this task>

## Files to Modify

- `/path/to/file1` - What to change
- `/path/to/file2` - What to change

## Testing

How to verify your work:

1. Run the project
2. Execute the relevant feature
3. Confirm expected behavior
4. Ensure no regressions were introduced

---

**Important:** Always read the full task description and verify that the implemented solution actually works before ending the session.
```

## Key Points

1. Always include the **full task description**
2. Provide **clear project context**
3. Include **technical details and file locations**
4. Ensure the subagent **tests its implementation**
5. The focus is **building working features**, not managing task state
