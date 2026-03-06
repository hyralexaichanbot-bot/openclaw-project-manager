# Project Manager Skill

Multi-project task and memory management for OpenClaw agents.

## Purpose

Manage multiple projects simultaneously with isolated context, tasks, and memories. Enables seamless context switching between projects while maintaining full history and learnings for each.

## Installation

This skill lives at: `~/.openclaw/skills/project-manager/`

Available to all agents (coder, main, tasker) automatically.

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
# 1. Switch to the project
project switch thenexus

# 2. Review context and memories
memory context
memory read

# 3. See what needs to be done
task kanban

# 4. Start a task
task move task-001 in-progress
```

### During Work

```bash
# Save important discoveries
memory save "TheNexus uses Hono + HTMX, no build step needed"

# Attach session for tracking
session attach agent:coder:discord:...
```

### Completing Work

```bash
# Mark task done
task complete task-001

# Save final learnings
memory save "Completed session detail view with transcript and kill button"
```

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
├── thenexus/
│   ├── context.md          # Project goals, stack, decisions
│   ├── memory.md           # Project-specific learnings (append-only)
│   └── sessions.json       # Attached session history
├── python-anthemav/
│   └── ...
└── ...
```

### projects.json Schema

```json
{
  "projects": {
    "thenexus": {
      "name": "thenexus",
      "path": "/home/azureuser/dev/projects/thenexus",
      "active": true,
      "createdAt": "2026-03-06T08:00:00Z",
      "tasks": [
        {
          "id": "task-001",
          "title": "Build session detail view",
          "description": "Allow clicking sessions to see transcript",
          "status": "done",
          "createdAt": "2026-03-06T08:00:00Z",
          "updatedAt": "2026-03-06T20:00:00Z",
          "completedAt": "2026-03-06T20:00:00Z"
        }
      ]
    }
  },
  "activeProject": "thenexus"
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
# Finishing TheNexus work
task move task-010 in-progress
session attach agent:coder:discord:...

# Switch to Home Assistant
project switch homeassistant-core
memory context
task kanban

# Work on HA task
task move ha-task-005 in-progress

# Later: switch back
project switch thenexus
task info task-010  # See where you left off
```
