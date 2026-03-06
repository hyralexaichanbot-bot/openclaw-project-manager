# Project Manager Skill

Multi-project task and memory management for OpenClaw agents.

## Purpose

Manage multiple projects simultaneously with isolated context, tasks, and memories. Enables seamless context switching between projects while maintaining full history and learnings for each.

## Installation

This skill lives at: `~/.openclaw/skills/project-manager/`

Available to all agents automatically.

## CLI Commands

All commands are available via the `project-manager` CLI (symlinked to `pm` for convenience).

### Project Commands

```bash
# List all projects
project list

# Create a new project
project create <name>

# Switch to a project (sets as active)
project switch <name>

# Show active project
project active

# Show project details
project info [name]
```

### Task Commands

```bash
# Add a task
task add "Build login form" [--project <name>]

# List tasks (shows kanban if no status filter)
task list [--project <name>] [--status todo|in-progress|done]

# Move task to different status
task move task-001 in-progress [--project <name>]

# Mark task as complete
task complete task-001 [--project <name>]

# Delete a task
task delete task-001 [--project <name>]

# Show task details
task info task-001 [--project <name>]

# Show kanban board
task kanban [--project <name>]
```

### Memory Commands

```bash
# Save a learning/memory
memory save "Learned that HTMX is simpler than React for this use case" [--project <name>]

# Read project memories
memory read [--project <name>]

# Read project context
memory context [--project <name>]
```

### Session Commands

```bash
# Attach current session to project
session attach <session-key> [--project <name>]

# List attached sessions
session list [--project <name>]
```

## Workflow

### Starting Work on a Project

```bash
# 1. Switch to the project (auto-shows AGENTS.md context)
project switch my-project

# 2. See what needs to be done
task kanban

# 3. Start a task (auto-shows AGENTS.md context)
task move task-001 in-progress
```

**Note:** Context is shown automatically from `AGENTS.md` (or `context.md` if AGENTS.md doesn't exist). No need to manually read files!

### During Work

```bash
# Save important discoveries
memory save "Learned that approach X works better than Y"

# Attach session for tracking
session attach <session-key>
```

### Completing Work

```bash
# Mark task done (with optional summary)
task complete task-001 --message "Added UI form for task creation"

# Or separately
task complete task-001
memory save "Completed session detail view with transcript and kill button"
```

**Best Practice:** Always complete your task before ending a session! If you spawned for a specific task, run `task complete <id>` as your last action.

### Switching Projects

```bash
# Finish current project work
task move task-005 in-progress  # if you left something mid-work

# Switch to different project
project switch python-anthemav

# Load context for new project
memory context
task kanban
```

## Data Structure

### Location

All project data stored in: `~/dev/projects/`

```
~/dev/projects/
├── projects.json           # Master database (tasks, active project)
├── <project-name>/
│   ├── AGENTS.md           # Agent instructions (auto-loaded)
│   ├── context.md          # Project goals, stack, decisions
│   ├── memory.md           # Project-specific learnings (append-only)
│   └── sessions.json       # Attached session history
└── ...
```

**AGENTS.md** is automatically shown when:
- Switching to a project (`project switch`)
- Starting a task (`task move <id> in-progress`)

### projects.json Schema

```json
{
  "projects": {
    "my-project": {
      "name": "my-project",
      "path": "~/dev/projects/my-project",
      "active": true,
      "createdAt": "2026-03-06T08:00:00Z",
      "tasks": [
        {
          "id": "task-001",
          "title": "Build feature",
          "description": "Description here",
          "status": "done",
          "createdAt": "2026-03-06T08:00:00Z",
          "updatedAt": "2026-03-06T20:00:00Z",
          "completedAt": "2026-03-06T20:00:00Z"
        }
      ]
    }
  },
  "activeProject": "my-project"
}
```

## Integration with TheNexus UI

TheNexus dashboard reads from `~/dev/projects/projects.json` to display:

- Project list with task counts
- Kanban board per project
- Task status updates
- Session history

## Best Practices

1. **Always switch projects before working** - Ensures tasks go to right project
2. **Save memories liberally** - Future-you will thank you
3. **Attach sessions** - Track which sessions worked on which projects
4. **Use descriptive task titles** - "Fix login bug" not "Fix bug"
5. **Move tasks promptly** - Keep kanban accurate
6. **Review context when switching** - Refresh your memory on project goals

## Multi-Agent Safety

- ✅ Atomic JSON writes (no race conditions)
- ✅ Auto-incrementing task IDs (per project)
- ✅ Project isolation (no cross-contamination)
- ✅ All agents share same data source

## Spawning Subagents for Tasks

When spawning a subagent to work on a project task, **always include**:

1. **Full task description** (not just title)
2. **Project context** (which project, task ID, location)
3. **pm CLI instructions** (how to complete the task)
4. **Explicit completion reminder** (run `pm task complete` when done)

**Template:** See `SUBAGENT_TEMPLATE.md` for the full spawn template.

**Example:**
```bash
# Spawn subagent for task-004
sessions_spawn --task "
**Task-004:** \"Add the ability in the UI to start a task\"

**Full Description:**
\"The card should allow to start a task in todo. We need to be able to choose the agent that should run the task, and then the agent should wake up and do the task\"

## Project Context
**Project:** thenexus
**Task ID:** task-004

## Available Commands
pm task info task-004
pm task complete task-004 --message \"summary\"

## What to Do When Finished
1. Test your work
2. Run: pm task complete task-004 --message \"summary\"
3. End your session
"
```

**Why this matters:** Subagents don't automatically know about the project-manager skill. They need explicit instructions on how to complete tasks and mark them done.

## Future Enhancements

- [ ] Drag-and-drop kanban in TheNexus UI
- [ ] Task dependencies
- [ ] Time tracking per task
- [ ] GitHub issue sync
- [ ] Automatic session attachment (detect project from cwd)
- [ ] Task templates
- [ ] Export/import projects

## Examples

### Example 1: Start New Project

```bash
project create my-new-app
project switch my-new-app
task add "Set up project structure"
task add "Create README"
task kanban
```

### Example 2: Daily Workflow

```bash
# Morning: check what you were working on
project active
task kanban

# Start working
task move task-003 in-progress

# Lunch break - save progress
memory save "Implemented user auth, need to add password reset"

# Afternoon: continue
task complete task-003
task move task-004 in-progress
```

### Example 3: Context Switch

```bash
# Finishing work on a project
task move task-010 in-progress
session attach <session-key>

# Switch to Home Assistant
project switch another-project
memory context
task kanban

# Work on a task
task move task-005 in-progress

# Later: switch back
project switch my-project
task info task-010  # See where you left off
```
