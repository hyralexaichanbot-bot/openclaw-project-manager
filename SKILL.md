---
name: project-manager
description: "Multi-project task and memory management via TheNexus API. Create projects, manage tasks with kanban, and save project-specific memories."
---

# TheNexus - Project Manager Skill

Multi-project task and memory management for OpenClaw agents via TheNexus API.

## Purpose

Manage multiple projects simultaneously with isolated context, tasks, and memories. Enables seamless context switching between projects while maintaining full history and learnings for each.

## Architecture

**TheNexus API:**

All task and project operations use TheNexus API (`http://localhost:3000/api/*`). Data is stored in SQLite with automatic backups.

- **Single Source of Truth:** TheNexus → SQLite database
- **No local files:** All data accessed via API
- **Real-time updates:** WebSocket pushes changes to UI

**TheNexus Server:**
- URL: `http://localhost:3000`
- Health: `http://localhost:3000/api/health`
- Database: `/home/azureuser/dev/TheNexus/nexus.db`

**If API is unavailable:**
```bash
# Check if TheNexus is running
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":12345}

# If connection refused or error:
# "TheNexus API is not running. Start it with: sudo systemctl start thenexus"
```

---

## TheNexus API Reference

### Base URL
```
http://localhost:3000/api
```

### Projects

**List all projects:**
```bash
curl http://localhost:3000/api/projects
```

**Get single project:**
```bash
curl http://localhost:3000/api/projects/<project-name>
```

**Create project:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"my-project","description":"Optional description"}'
```

**Update active project:**
```bash
curl -X PUT http://localhost:3000/api/projects/active \
  -H "Content-Type: application/json" \
  -d '{"name":"my-project"}'
```

### Tasks

**List all tasks (with optional filters):**
```bash
# All tasks
curl http://localhost:3000/api/tasks

# Filter by project
curl "http://localhost:3000/api/tasks?project=thenexus"

# Filter by status
curl "http://localhost:3000/api/tasks?status=in-progress"

# Filter by both
curl "http://localhost:3000/api/tasks?project=thenexus&status=todo"
```

**Get single task:**
```bash
curl http://localhost:3000/api/tasks/task-001
```

**Create task:**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix the bug",
    "description": "Optional detailed description",
    "project": "thenexus",
    "priority": "high",
    "tags": ["bug", "urgent"]
  }'
```

**Update task (full update):**
```bash
curl -X PUT http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "description": "Updated description",
    "priority": "medium",
    "tags": ["bug"],
    "project": "thenexus"
  }'
```

**Attach session to task:**
```bash
curl -X PUT http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{
    "sessionKey": "agent:coder:discord:channel:1476147784477315155",
    "project": "thenexus"
  }'
```

**Delete task:**
```bash
curl -X DELETE http://localhost:3000/api/tasks/task-001
```

### Session Attachment

**Why attach sessions:** Links agent work sessions to specific tasks for tracking and audit trail.

**When to attach:**
- When starting work on a task
- After spawning a subagent for a task

**How to attach:**
```bash
# Get your session key
openclaw status

# Attach to task
curl -X PUT http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{"sessionKey":"agent:coder:discord:channel:1476147784477315155","project":"thenexus"}'
```

**Session key format:** `agent:<agent-id>:<channel-type>:<channel-id>`

Examples:
- `agent:coder:discord:channel:1476147784477315155`
- `agent:main:discord:channel:1474992984247238879`
- `agent:coder:subagent:<uuid>`

### Agents

**List available agents:**
```bash
curl http://localhost:3000/api/agents
```

**Start task with agent (via UI):**
```bash
curl -X POST http://localhost:3000/api/tasks/start \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task-001",
    "agentId": "coder",
    "project": "thenexus"
  }'
```

**Start refinement (explicit):**
```bash
curl -X POST http://localhost:3000/api/tasks/task-001/start-refinement \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "lyra",
    "project": "thenexus"
  }'
```

### Error Responses

**404 Not Found:**
```json
{"error": "Task 'task-999' not found"}
```

**400 Bad Request:**
```json
{"error": "Title and project are required"}
```

**500 Server Error:**
```json
{"error": "Database error message"}
```

---

## Workflow

### Starting Work on a Project

**Using TheNexus API:**
```bash
# Switch active project
curl -X PUT http://localhost:3000/api/projects/active \
  -H "Content-Type: application/json" \
  -d '{"name":"my-project"}'

# Get tasks for project
curl "http://localhost:3000/api/tasks?project=my-project"

# Attach your session
curl -X PUT http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{
    "sessionKey": "agent:coder:discord:channel:1476147784477315155",
    "project": "my-project"
  }'
```

### When Assigned a Task via TheNexus

**Important:** When TheNexus assigns you a task, it does NOT automatically change the task status. **You are responsible for moving the task to in-progress** when you start working.

```bash
# When you receive a task assignment from TheNexus:
# 1. Acknowledge the task

# 2. Move it to in-progress:
curl -X PATCH http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{"status":"in-progress"}'

# 3. Attach your session (for tracking)
curl -X PUT http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{
    "sessionKey": "agent:coder:discord:channel:1476147784477315155",
    "project": "thenexus"
  }'

# 4. Start working on the task

# 5. When done, mark complete:
curl -X PATCH http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

**Get your session key:** Run `openclaw status` or check the session context at the top of your conversation.

### When Assigned a Refinement Task via TheNexus

**Refinement** is a separate status/column in the kanban board. Tasks flow: `todo` → `refinement` → `todo` → `in-progress` → `done`.

When TheNexus assigns you a **refinement task**, your goal is to **enrich the task description** with context, technical approach, and acceptance criteria - NOT to implement the feature.

**Automatic Refinement Trigger:**
- **Moving any task to "refinement" status automatically spawns Lyra** (the default refinement agent)
- This happens whether you use the UI, API, or any other method
- The agent will enrich the description and move the task back to "todo" when complete

**Using TheNexus API:**
```bash
# Move task to refinement (automatically spawns Lyra)
curl -X PATCH http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{"status":"refinement"}'

# OR use the dedicated refinement endpoint (specify agent)
curl -X POST http://localhost:3000/api/tasks/task-001/start-refinement \
  -H "Content-Type: application/json" \
  -d '{"agentId":"lyra","project":"thenexus"}'

# After enrichment complete, task moves back to todo automatically
# You can verify with:
curl http://localhost:3000/api/tasks/task-001
```

**Key Principles:**
- **Refinement is about planning/design, NOT implementation**
- Use all available tools (code search, web, docs) to understand the problem
- Ask questions early if requirements are unclear
- Output should be actionable for the next agent
- Keep refinement focused and concise

**TheNexus UI:**
- Tasks in "refinement" status appear in the Refinement column
- Click "Refine" on a todo task to assign an agent for refinement
- Agent selection dropdown defaults to Lyra (Product Manager)
- After refinement complete, task moves back to todo with enriched description

### Completing Work

```bash
# Mark task done
curl -X PATCH http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

**Best Practice:** Always complete your task before ending a session!

---

## Task Flags

Set completion flags instead of changing status:

```bash
# Mark refinement complete (auto-moves to in-progress)
pm task flag <id> refined

# Mark work complete (auto-moves to review)
pm task flag <id> done

# Mark review complete (auto-moves to done)
pm task flag <id> reviewed
```

## Task Types

Create tasks with appropriate type:

```bash
pm task add "Fix bug" --type coding
pm task add "Research API" --type research
```

## Status Changes (Manual)

Only use for backlog management:

```bash
pm task move <id> todo
pm task move <id> refinement
pm task move <id> in-progress
pm task move <id> review
pm task move <id> done
```

**Note:** Status changes clear the worker_agent field.

---

## Data Structure

### TheNexus Storage

**Primary:** SQLite database at `/home/azureuser/dev/TheNexus/nexus.db`

**Tables:**
- `projects` - Project metadata
- `tasks` - All tasks with status, sessions, etc.
- `memories` - Project-specific memories

**Backup:** TheNexus maintains automatic backups. Manual backup:
```bash
cp /home/azureuser/dev/TheNexus/nexus.db /home/azureuser/dev/TheNexus/nexus.db.bak
```

### Task Schema

```json
{
  "id": "task-001",
  "projectName": "thenexus",
  "title": "Build feature",
  "description": "Description here",
  "status": "done",
  "priority": "high",
  "tags": ["feature", "ui"],
  "createdAt": "2026-03-06T08:00:00Z",
  "updatedAt": "2026-03-06T20:00:00Z",
  "startedAt": "2026-03-06T10:00:00Z",
  "completedAt": "2026-03-06T20:00:00Z",
  "refined": true,
  "refinedAt": "2026-03-06T09:00:00Z",
  "refinedBy": "agent:coder:manual-refine",
  "assignedAgent": "coder",
  "sessionKey": "agent:coder:discord:channel:1476147784477315155",
  "refinementSessionKey": null
}
```

---

## Integration with TheNexus UI

**TheNexus Dashboard:** `http://localhost:3000`

TheNexus reads from SQLite database to display:

- Project list with task counts
- Kanban board per project (todo, refinement, in-progress, done columns)
- Task details with sessions attached
- Agent activity and session history
- Real-time updates via WebSocket

**UI Features:**
- Click tasks to view/edit details
- Drag tasks between status columns
- Filter by project, status, tags
- Start tasks with specific agents
- View session transcripts
- Create tasks with refinement option

**API + UI relationship:**
- API → SQLite database
- UI → SQLite database → Real-time display
- Both can be used interchangeably
- Changes via API immediately visible in UI

---

## Best Practices

1. **Always attach sessions** - Track which sessions worked on which projects
2. **Use descriptive task titles** - "Fix login bug" not "Fix bug"
3. **Move tasks promptly** - Keep kanban accurate
4. **Review context when switching** - Refresh your memory on project goals
5. **Check API health if issues occur** - `curl http://localhost:3000/api/health`

---

## Spawning Subagents for Tasks

When spawning a subagent to work on a project task, **always include**:

1. **Full task description** (not just title)
2. **Project context** (which project, task ID, location)
3. **API instructions** (how to move task to in-progress and complete)
4. **Explicit completion reminder** (run status update when done)

**Example:**
```bash
# Spawn subagent with task context
openclaw agent --agent coder --message "
**Task:** task-001 - Fix the bug
**Project:** thenexus

**Instructions:**
1. Move task to in-progress:
   curl -X PATCH http://localhost:3000/api/tasks/task-001 \\
     -H 'Content-Type: application/json' \\
     -d '{\"status\":\"in-progress\"}'

2. Attach your session:
   curl -X PUT http://localhost:3000/api/tasks/task-001 \\
     -H 'Content-Type: application/json' \\
     -d '{\"sessionKey\":\"<your-session-key>\",\"project\":\"thenexus\"}'

3. Work on the task

4. When done, mark complete:
   curl -X PATCH http://localhost:3000/api/tasks/task-001 \\
     -H 'Content-Type: application/json' \\
     -d '{\"status\":\"done\"}'
"
```

---

## Troubleshooting

**TheNexus API not responding:**
```bash
# Check if running
curl http://localhost:3000/api/health

# If connection refused:
sudo systemctl status thenexus
sudo systemctl start thenexus

# Check logs
journalctl -u thenexus --no-pager -n 50
```

**Task not found:**
- Verify task ID is correct (format: `task-XXX`)
- Check task exists: `curl http://localhost:3000/api/tasks/task-XXX`
- Verify project name matches

**Session not attaching:**
- Verify session key format: `agent:<agent-id>:<channel-type>:<channel-id>`
- Get your session: `openclaw status`
- Check task exists before attaching

**Refinement not triggering:**
- Ensure status is exactly `"refinement"` (case-sensitive)
- Check Lyra agent is available: `curl http://localhost:3000/api/agents`
- Review logs: `journalctl -u thenexus --no-pager -n 100`

---

## Environment Variables

**Optional configuration:**

```bash
# Default refinement agent (default: lyra)
REFINEMENT_DEFAULT_AGENT=lyra

# TheNexus URL (default: http://localhost:3000)
THENEXUS_URL=http://localhost:3000
```
