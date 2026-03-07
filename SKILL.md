---
name: project-manager
description: "Multi-project task and memory management for OpenClaw agents. Create projects, switch contexts, manage tasks with kanban, and save project-specific memories."
---

# Project Manager Skill

Multi-project task and memory management for OpenClaw agents.

## Purpose

Manage multiple projects simultaneously with isolated context, tasks, and memories. Enables seamless context switching between projects while maintaining full history and learnings for each.

## Installation

This skill lives at: `~/.openclaw/skills/project-manager/`

Available to all agents automatically.

## CLI Commands

All commands use the `pm` CLI.

### Quick Commands

```bash
pm status                    # Show active project + task counts
pm work <project>            # Switch project + show kanban (shortcut)
pm help                      # Show all commands
```

### Project Commands

```bash
pm project list              # List all projects
pm project create <name>     # Create a new project
pm project switch <name>     # Switch to a project (sets as active)
pm project active            # Show active project
pm project info [name]       # Show project details
```

### Task Commands

```bash
pm task add "title" [--project <name>] [--skip-refinement]
pm task list [--project <name>]
pm task move <id> <status>   # status: todo, in-progress, done
pm task complete <id> [--message "summary"]
pm task delete <id>
pm task info <id>
pm task refine <id> [--force]
pm task kanban [--project <name>]
```

**Task Refinement:**
- Tasks with short descriptions (<50 chars) are auto-refined using the LLM
- Use `--skip-refinement` to create quick tasks without refinement
- Use `pm task refine <id>` to manually refine an existing task
- Use `--force` to re-refine an already refined task

### Memory Commands

```bash
pm memory save "content" [--project <name>]
pm memory read [--project <name>]
pm memory context [--project <name>]
```

### Session Commands

```bash
pm session attach <key> [--project <name>]
pm session list [--project <name>]
```

## Workflow

### Starting Work on a Project

```bash
# 1. Switch to the project (auto-shows AGENTS.md context)
pm project switch my-project

# 2. See what needs to be done
pm task kanban

# 3. Start a task (auto-shows AGENTS.md context)
pm task move task-001 in-progress
```

**Note:** Context is shown automatically from `AGENTS.md` (or `context.md` if AGENTS.md doesn't exist). No need to manually read files!

### During Work

```bash
# Save important discoveries
pm memory save "Learned that approach X works better than Y"

# Attach session for tracking
pm session attach <session-key>
```

### Completing Work

```bash
# Mark task done (with optional summary)
pm task complete task-001 --message "Added UI form for task creation"

# Or separately
pm task complete task-001
pm memory save "Completed session detail view with transcript and kill button"
```

**Best Practice:** Always complete your task before ending a session! If you spawned for a specific task, run `pm task complete <id>` as your last action.

### Switching Projects

```bash
# Finish current project work
pm task move task-005 in-progress  # if you left something mid-work

# Switch to different project
pm project switch python-anthemav

# Load context for new project
pm memory context
pm task kanban
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
- Switching to a project (`pm project switch`)
- Starting a task (`pm task move <id> in-progress`)

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

## ⚠️ Task-Queue Skill Conflict (RESOLVED)

**Problem:** The `task-queue` skill (for Tasker agent) was conflicting with project-manager because both use "task" terminology.

**Solution:** The `task-queue` skill has been **disabled** (renamed to `task-queue.DISABLED`).

**If you see confusion:**
- `task-XXX` (lowercase) → Project Manager (THIS skill) ✅
- `TASK-XXX` (uppercase) → Tasker Queue (DISABLED) ❌
- `~/dev/projects/` → Project Manager ✅
- `~/dev/task-agent/` → Tasker Queue ❌

**To re-enable task-queue (not recommended):**
```bash
mv ~/.openclaw/skills/task-queue.DISABLED ~/.openclaw/skills/task-queue
```

But be aware this may cause confusion again!

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
pm project create my-new-app
pm project switch my-new-app
pm task add "Set up project structure"
pm task add "Create README"
pm task kanban
```

### Example 2: Daily Workflow

```bash
# Morning: check what you were working on
pm project active
pm task kanban

# Start working
pm task move task-003 in-progress

# Lunch break - save progress
pm memory save "Implemented user auth, need to add password reset"

# Afternoon: continue
pm task complete task-003
pm task move task-004 in-progress
```

### Example 3: Context Switch

```bash
# Finishing work on a project
pm task move task-010 in-progress
pm session attach <session-key>

# Switch to another project
pm project switch another-project
pm memory context
pm task kanban

# Work on a task
pm task move task-005 in-progress

# Later: switch back
pm project switch my-project
pm task info task-010  # See where you left off
```
