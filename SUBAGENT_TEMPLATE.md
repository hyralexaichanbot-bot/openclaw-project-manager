# Subagent Spawn Template for Project Tasks

## When to Use

When spawning a subagent to work on a task from the **Project Manager** system (`~/dev/projects/`).

## Template Structure

```markdown
**Task-XXX:** "<task title>"

**Full Description:**
"<task description from projects.json>"

## Project Context

This task is tracked in the **Project Manager** system at `~/dev/projects/`.

**Project:** <project-name>
**Task ID:** task-XXX
**Location:** /home/azureuser/dev/<project-folder>

## Available Commands

The `pm` (project-manager) CLI is available to you:

```bash
# Check task details
pm task info task-XXX

# View project context (auto-shown when you start)
pm project switch <project-name>

# Attach your session to the task (do this first!)
pm task session attach task-XXX <your-session-key>

# Save learnings during work
pm memory save "Learned that X works better than Y"

# When FINISHED (important!):
pm task complete task-XXX --message "Brief summary of what you built"
```

## What to Do

**At Session Start:**
1. **Attach your session** - Run: `pm task session attach task-XXX <your-session-key>`
   - This links your work to the task for tracking
   - Session will appear in task UI

**During Work:**
2. **Test your work** - Verify it actually works
3. **Save learnings** - Use `pm memory save` for important discoveries

**When Finished:**
4. **Complete the task** - Run: `pm task complete task-XXX --message "summary"`
   - This marks the task as done
   - Saves your summary to project memory
   - Shows task duration and stats
5. **End your session** - You're done!

## Technical Context

<Tech stack, file locations, API endpoints, etc. specific to this task>

## Files to Modify

- `/path/to/file1` - What to change
- `/path/to/file2` - What to change

## Testing

How to verify your work:
1. Step 1
2. Step 2
3. Expected result

---

**Remember:** Always read the full task description before starting. When done, run `pm task complete task-XXX --message "summary"` before ending your session!
```

## Example: Task-004

```markdown

**Task-004:** "Add the ability in the UI to start a task"

**Full Description:**
"The card should allow to start a task in todo. We need to be able to choose the agent that should run the task, and then the agent should wake up and do the task"

## Project Context

This task is tracked in the **Project Manager** system at `~/dev/projects/`.

**Project:** thenexus
**Task ID:** task-004 (lowercase!)
**Location:** /home/azureuser/dev/TheNexus

## Available Commands

The `pm` (project-manager) CLI is available to you:

```bash
# Check task details
pm task info task-004

# View project context (auto-shown when you start)
pm project switch thenexus

# Attach your session to the task (do this first!)
pm task session attach task-004 <your-session-key>

# Save learnings during work
pm memory save "Learned that HTMX is simpler than React for this"

# When FINISHED (important!):
pm task complete task-004 --message "Added agent selection modal and subagent spawning"
```

## What to Do When Finished

1. **Test your work** - Open /projects, click "Start" on a task, select agent, verify subagent spawns
2. **Complete the task** - Run: `pm task complete task-004 --message "Added agent selection and subagent spawning"`
3. **End your session** - You're done!

## Technical Context

- **Runtime:** Node.js with tsx
- **Framework:** Hono (web framework)
- **Frontend:** HTMX (no build step) + Bootstrap Icons
- **Server:** Runs on port 3000
- **API:** POST /api/tasks/start - spawns subagent for task

## Files to Modify

- `public/index.html` - Add agent selection modal/dropdown
- `src/index.ts` - Add /api/tasks/start endpoint

## Testing

1. Open http://localhost:3000/projects
2. Click "Start" on a todo task
3. Select an agent (main, coder, or tasker)
4. Verify subagent spawns with task description
5. Task moves to "In Progress" column

---

**Remember:** Always read the full task description before starting. When done, run `pm task complete task-004 --message "summary"` before ending your session!
```

## Key Points

1. **Always include the FULL task description** - Not just the title
2. **Explain the pm CLI** - Subagents don't automatically know about it
3. **Attach session first** - Subagents should run `pm task session attach` at session start
4. **Tell them to complete the task** - Explicitly state this as the last step
5. **Provide the exact command** - Make it copy-paste easy
6. **Include technical context** - Tech stack, files, APIs, etc.

## ⚠️ Testing Rule

**CRITICAL:** When testing task creation or refinement:
- ✅ **USE:** `testproject` - Created for testing
- ❌ **NEVER USE:** `thenexus` - Production project

```bash
pm project switch testproject  # Before testing
pm task add "Test" --project testproject
pm task delete task-XXX --project testproject  # Clean up
```

This keeps TheNexus dashboard clean!
