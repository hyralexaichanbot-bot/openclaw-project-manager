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

### When Assigned a Task via TheNexus

**Important:** When TheNexus assigns you a task, it does NOT automatically change the task status. **You are responsible for moving the task to in-progress** when you start working.

```bash
# When you receive a task assignment from TheNexus:
# 1. Acknowledge the task
# 2. Move it to in-progress (YOU do this, not TheNexus):
pm task move task-001 in-progress --project <project-name>

# 3. Start working on the task
# 4. When done, complete it:
pm task complete task-001 --project <project-name> --message "Summary of work completed"
```

**Why?** This ensures the agent is truly ready to work before the task status changes. TheNexus only sends the assignment; the agent controls the workflow.

### When Assigned a Refinement Task via TheNexus

**Refinement** is a separate status/column in the kanban board. Tasks flow: `todo` → `refinement` → `todo` → `in-progress` → `done`.

When TheNexus assigns you a **refinement task**, your goal is to **enrich the task description** with context, technical approach, and acceptance criteria - NOT to implement the feature.

```bash
# When you receive a refinement assignment from TheNexus:

# 1. Spawn a subagent in a Discord thread to do the refinement work
#    (TheNexus routes to your Discord session, then you spawn threaded subagent)
# 2. The subagent will:
#    - Move task to refinement: pm task move task-001 refinement --project <project-name>
#    - Gather context and research
#    - Enrich the description with objective, approach, acceptance criteria
#    - Mark complete: pm task refine task-001 --complete
#    - Move back to todo: pm task move task-001 todo --project <project-name>

# 3. Monitor the subagent - it will announce back when complete
```

**Key Principles:**
- **Refinement is about planning/design, NOT implementation**
- Use all available tools (code search, web, docs) to understand the problem
- Ask questions early if requirements are unclear
- Output should be actionable for the next agent
- Keep refinement focused and concise
- **On Discord: Spawn threaded subagents for isolated work (same as task execution)**

**TheNexus UI Changes:**
- Tasks in "refinement" status appear in the Refinement column
- Click "Refine" on a todo task to assign an agent for refinement
- Agent selection dropdown lets you choose which agent handles refinement
- After refinement complete, task moves back to todo with enriched description

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

## Spawning Subagents for Tasks

When spawning a subagent to work on a project task, **always include**:

1. **Full task description** (not just title)
2. **Project context** (which project, task ID, location)
3. **pm CLI instructions** (how to move task to in-progress and complete)
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
pm task move task-004 in-progress --project thenexus
pm task complete task-004 --message \"summary\"

## What to Do
1. Move the task to in-progress: pm task move task-004 in-progress --project thenexus
2. Work on the task
3. When finished, run: pm task complete task-004 --message \"summary\"
4. End your session
"
```

**Why this matters:** Subagents don't automatically know about the project-manager skill. They need explicit instructions on how to:
- Move the task to in-progress when they start working
- Complete the task when they're done

**Note:** TheNexus does NOT automatically move tasks to in-progress. The agent (or subagent) must do this themselves by calling `pm task move <id> in-progress`.

### Discord Thread Binding

**When running on Discord**, spawn subagents with `thread: true` to keep work isolated in a thread:

```typescript
sessions_spawn({
  task: "...",
  thread: true,  // Creates/binds to a Discord thread
  mode: "session",  // Persistent session bound to the thread
  label: "task-004-worker"
})
```

**Benefits:**
- Each task gets its own thread in the Discord channel
- Follow-up messages in the thread route to the same subagent
- Keeps the main channel clean while work happens in threads
- Thread auto-unfocuses after inactivity (configurable via `/session idle`)

**When to use threads:**
- ✅ Task work that may have follow-up questions
- ✅ Long-running work where you want to track progress in-thread
- ✅ Multi-step tasks requiring back-and-forth

**When threads aren't needed:**
- Quick one-shot tasks (use `thread: false`, `mode: "run"`)
- Non-Discord channels (thread binding is Discord-only)

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
