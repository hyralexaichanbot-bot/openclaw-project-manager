# Task Refinement Prompt Template (Project Manager)

This template is used by the `pm` CLI to automatically refine task descriptions.
Customize this file to match your preferred refinement style.

## Template Variables

- `{{title}}` - Task title
- `{{description}}` - Original description
- `{{project}}` - Project name

## Refinement Instructions

Enrich the task description with clear sections for objective, context, technical approach, files to modify, acceptance criteria, dependencies, and potential pitfalls.

Return the refined description in markdown format with proper section headers.
