---
name: thenexus
description: "Role-aware TheNexus workflow skill for creating tasks and completing assigned refinement, research, coding, and review stages."
---

# TheNexus Workflow Skill

Use TheNexus as the system of record for project tasks.

Base URL:

```bash
http://localhost:3000/api
```

## Core Rules

1. Create tasks with `POST /api/tasks`.
2. Do not use generic status patches as the normal workflow.
3. When TheNexus assigns you a task, call:
   - `POST /api/tasks/:id/acknowledge`
   - `POST /api/tasks/:id/complete`
   - `POST /api/tasks/:id/fail`
4. `complete` and `fail` always require a concise `summary`.
5. If your stage changes the task description, update the task first with `PUT /api/tasks/:id`, then call `complete`.
6. Research work may create justified follow-up tasks with the same `POST /api/tasks` API used by the UI.

## Health Check

```bash
curl http://localhost:3000/api/health
```

## Shared API

### List tasks

```bash
curl http://localhost:3000/api/tasks
curl "http://localhost:3000/api/tasks?project=my-project"
curl "http://localhost:3000/api/tasks?status=in-progress"
curl http://localhost:3000/api/tasks/task-001
```

### Create task

Use this from the UI path or from any agent that needs to add work.

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Investigate API latency",
    "project": "thenexus",
    "type": "research",
    "description": "Find the cause of the latency spike.",
    "priority": "high",
    "tags": ["api", "latency"]
  }'
```

### Update task details

Use this when refinement changes the description or when task metadata must be corrected.

```bash
curl -X PUT http://localhost:3000/api/tasks/task-001 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Investigate API latency",
    "description": "Refined markdown description here",
    "type": "research",
    "priority": "high",
    "tags": ["api", "latency"],
    "project": "thenexus"
  }'
```

## Explicit Lifecycle API

### Acknowledge assigned work

Call this once you actually begin the assigned stage.

```bash
curl -X POST http://localhost:3000/api/tasks/task-001/acknowledge \
  -H "Content-Type: application/json" \
  -d '{
    "role": "lyra",
    "sessionKey": "agent:lyra:discord:channel:123"
  }'
```

### Complete assigned work

```bash
curl -X POST http://localhost:3000/api/tasks/task-001/complete \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Completed the stage, validated the result, and captured the key outcome."
  }'
```

### Fail assigned work

Use this if you cannot finish the current stage.

```bash
curl -X POST http://localhost:3000/api/tasks/task-001/fail \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Blocked by missing credentials. Review cannot proceed."
  }'
```

## Role Workflows

### Lyra: refinement

When a task is in `todo`, Lyra owns the refinement stage.

Workflow:

1. Read the task.
2. Call `acknowledge` with role `lyra`.
3. Enrich the description only.
4. Save the refined description with `PUT /api/tasks/:id`.
5. Call `complete` with a concise summary.

Refinement means:

- clarify scope
- add technical context
- add acceptance criteria
- make the next stage executable

Do not implement the feature during refinement.

### Lyra: research execution

When a research task moves to `in-progress`, Lyra owns the actual research work.

Workflow:

1. Call `acknowledge` with role `lyra`.
2. Perform the research.
3. Create new tasks with `POST /api/tasks` if the research clearly produces actionable follow-up work.
4. Call `complete` with a concise summary of findings and outcomes.

Research execution means:

- do the actual investigation
- summarize evidence and conclusions
- create justified follow-up tasks when needed

### Coder: coding execution

When a coding task moves to `in-progress`, Coder owns the implementation stage.

Workflow:

1. Call `acknowledge` with role `coder`.
2. Implement the task.
3. Test locally.
4. Update the task description if implementation details materially changed.
5. Call `complete` with a concise summary of the delivered change and validation.

### Marcus: review

When a coding task moves to `review`, Marcus owns the validation stage.

Workflow:

1. Call `acknowledge` with role `marcus`.
2. Review the work and run the relevant checks.
3. If review passes, call `complete` with a concise summary.
4. If review fails, call `fail` with a concise summary of what is wrong.

Review means:

- validate the change
- confirm expected behavior
- reject clearly when the work is not acceptable

## Session Key

Use your actual active session key when acknowledging work.

Get it with:

```bash
openclaw status
```

## Notes

- Do not invent workflow transitions yourself.
- Do not treat `todo`, `refinement`, `in-progress`, `review`, and `done` as a freeform kanban.
- TheNexus advances tasks when you call `complete`.
- If TheNexus already assigned you a task, do not create a duplicate task for the same work.
