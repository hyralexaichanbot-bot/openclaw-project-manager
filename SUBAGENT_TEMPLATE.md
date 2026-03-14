# TheNexus Subagent Task Template

Use this when spawning a subagent for a task managed in TheNexus.

```markdown
**Task:** <task-id> - <task title>

**Project:** <project-name>
**Type:** <coding|research>
**Current Status:** <todo|refinement|in-progress|review|done>
**Assigned Role:** <lyra|coder|marcus>

## Task Description

<full task description from TheNexus>

## Required Lifecycle

1. Acknowledge the task:

```bash
curl -X POST http://localhost:3000/api/tasks/<task-id>/acknowledge \
  -H "Content-Type: application/json" \
  -d '{
    "role": "<lyra|coder|marcus>",
    "sessionKey": "<your-actual-session-key>"
  }'
```

2. Do the assigned stage only.

3. If your stage changes the task description, update it first:

```bash
curl -X PUT http://localhost:3000/api/tasks/<task-id> \
  -H "Content-Type: application/json" \
  -d '{
    "title": "<task title>",
    "description": "<updated description>",
    "type": "<coding|research>",
    "project": "<project-name>",
    "priority": "<priority-or-null>",
    "tags": ["<tag>"]
  }'
```

4. Complete the stage:

```bash
curl -X POST http://localhost:3000/api/tasks/<task-id>/complete \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Concise summary of what you completed."
  }'
```

5. If you cannot finish the stage, fail it:

```bash
curl -X POST http://localhost:3000/api/tasks/<task-id>/fail \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Concise summary of why the stage failed."
  }'
```

## Follow-up Work

If the assignment is research and you discover clearly actionable new work, create new tasks with:

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "<new task title>",
    "project": "<project-name>",
    "type": "<coding|research>",
    "description": "<why this follow-up is needed>",
    "priority": "<priority>"
  }'
```
```
