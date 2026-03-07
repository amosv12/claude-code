# AI Task Manager

A CLI task management app powered by Claude claude-opus-4-6 with adaptive thinking.

## Features

- **CRUD tasks** — add, list, update, and delete tasks with priority, status, due date, and tags
- **AI Prioritisation** — Claude analyses your open tasks and recommends the optimal order to tackle them
- **AI Task Breakdown** — Claude breaks a complex task into 3-6 concrete subtasks (optionally saved)
- **AI Productivity Suggestions** — Claude reviews your full task list and offers actionable advice
- **AI Chat** — free-form conversation about your tasks with full context awareness

## Setup

```bash
cd examples/task-manager
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_key_here
python task_manager.py
```

## How it works

Tasks are stored locally in `~/.task_manager_tasks.json`.

All AI features use `claude-opus-4-6` with `thinking: {type: "adaptive"}` and streaming,
so responses appear incrementally in your terminal.

The chat mode maintains a multi-turn conversation history and always includes your current
task list in the system prompt, so Claude has full context.
