#!/usr/bin/env python3
"""
AI-powered Task Manager
A CLI task management app that uses Claude to help you prioritize,
break down, and get suggestions for your tasks.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

import anthropic
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table
from rich.text import Text

console = Console()

TASKS_FILE = Path.home() / ".task_manager_tasks.json"


# ── Data layer ─────────────────────────────────────────────────────────────────

def load_tasks() -> list[dict]:
    if TASKS_FILE.exists():
        with open(TASKS_FILE) as f:
            return json.load(f)
    return []


def save_tasks(tasks: list[dict]) -> None:
    with open(TASKS_FILE, "w") as f:
        json.dump(tasks, f, indent=2)


def next_id(tasks: list[dict]) -> int:
    return max((t["id"] for t in tasks), default=0) + 1


# ── Display helpers ────────────────────────────────────────────────────────────

PRIORITY_COLORS = {"high": "red", "medium": "yellow", "low": "green"}
STATUS_ICONS = {"todo": "○", "in_progress": "◑", "done": "●"}


def render_tasks(tasks: list[dict], title: str = "Tasks") -> None:
    if not tasks:
        console.print("[dim]No tasks found.[/dim]")
        return

    table = Table(title=title, show_lines=True, highlight=True)
    table.add_column("ID", style="dim", width=4)
    table.add_column("Status", width=12)
    table.add_column("Priority", width=10)
    table.add_column("Title")
    table.add_column("Due", width=12)
    table.add_column("Tags", width=20)

    for t in tasks:
        color = PRIORITY_COLORS.get(t.get("priority", "medium"), "white")
        icon = STATUS_ICONS.get(t.get("status", "todo"), "○")
        due = t.get("due_date", "")
        tags = ", ".join(t.get("tags", []))
        table.add_row(
            str(t["id"]),
            f"{icon} {t.get('status', 'todo').replace('_', ' ')}",
            Text(t.get("priority", "medium"), style=color),
            t["title"],
            due,
            tags,
        )

    console.print(table)


# ── AI helpers ─────────────────────────────────────────────────────────────────

def build_task_context(tasks: list[dict]) -> str:
    if not tasks:
        return "No tasks currently in the list."
    lines = []
    for t in tasks:
        status = t.get("status", "todo")
        priority = t.get("priority", "medium")
        due = f", due {t['due_date']}" if t.get("due_date") else ""
        desc = f" — {t['description']}" if t.get("description") else ""
        lines.append(
            f"[#{t['id']}] [{priority.upper()} | {status.upper()}{due}] {t['title']}{desc}"
        )
    return "\n".join(lines)


def ai_request(client: anthropic.Anthropic, system: str, user: str) -> str:
    """Stream a Claude response and return the full text."""
    full_text = ""
    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=system,
        messages=[{"role": "user", "content": user}],
    ) as stream:
        for event in stream:
            if (
                event.type == "content_block_delta"
                and event.delta.type == "text_delta"
            ):
                full_text += event.delta.text
                console.print(event.delta.text, end="", markup=False)
    console.print()  # newline after streamed output
    return full_text


SYSTEM_PROMPT = """\
You are an expert productivity coach and task management assistant.
You help users manage their tasks effectively, offering thoughtful advice
on prioritisation, time management, and execution strategies.
Be concise, practical, and encouraging. Use plain text (no markdown headers).\
"""


# ── Commands ───────────────────────────────────────────────────────────────────

def cmd_add(tasks: list[dict]) -> list[dict]:
    console.print(Panel("➕ [bold]Add a new task[/bold]"))
    title = Prompt.ask("Title")
    if not title.strip():
        console.print("[red]Title cannot be empty.[/red]")
        return tasks

    description = Prompt.ask("Description (optional)", default="")
    priority = Prompt.ask("Priority", choices=["high", "medium", "low"], default="medium")
    due_date = Prompt.ask("Due date (YYYY-MM-DD, optional)", default="")
    tags_raw = Prompt.ask("Tags (comma-separated, optional)", default="")
    tags = [t.strip() for t in tags_raw.split(",") if t.strip()]

    task = {
        "id": next_id(tasks),
        "title": title.strip(),
        "description": description.strip(),
        "priority": priority,
        "status": "todo",
        "created_at": datetime.now().isoformat(),
        "due_date": due_date.strip(),
        "tags": tags,
    }
    tasks.append(task)
    save_tasks(tasks)
    console.print(f"[green]✓ Task #{task['id']} added.[/green]")
    return tasks


def cmd_list(tasks: list[dict]) -> list[dict]:
    filter_status = Prompt.ask(
        "Filter by status",
        choices=["all", "todo", "in_progress", "done"],
        default="all",
    )
    filtered = tasks if filter_status == "all" else [t for t in tasks if t.get("status") == filter_status]
    render_tasks(filtered, title=f"Tasks ({filter_status})")
    return tasks


def cmd_update(tasks: list[dict]) -> list[dict]:
    render_tasks([t for t in tasks if t.get("status") != "done"])
    try:
        task_id = int(Prompt.ask("Task ID to update"))
    except ValueError:
        console.print("[red]Invalid ID.[/red]")
        return tasks

    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        console.print(f"[red]Task #{task_id} not found.[/red]")
        return tasks

    console.print(f"Updating: [bold]{task['title']}[/bold]")
    new_status = Prompt.ask(
        "New status",
        choices=["todo", "in_progress", "done"],
        default=task.get("status", "todo"),
    )
    new_priority = Prompt.ask(
        "New priority",
        choices=["high", "medium", "low"],
        default=task.get("priority", "medium"),
    )
    task["status"] = new_status
    task["priority"] = new_priority
    task["updated_at"] = datetime.now().isoformat()
    save_tasks(tasks)
    console.print(f"[green]✓ Task #{task_id} updated.[/green]")
    return tasks


def cmd_delete(tasks: list[dict]) -> list[dict]:
    render_tasks(tasks)
    try:
        task_id = int(Prompt.ask("Task ID to delete"))
    except ValueError:
        console.print("[red]Invalid ID.[/red]")
        return tasks

    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        console.print(f"[red]Task #{task_id} not found.[/red]")
        return tasks

    if Confirm.ask(f"Delete '{task['title']}'?"):
        tasks = [t for t in tasks if t["id"] != task_id]
        save_tasks(tasks)
        console.print(f"[green]✓ Task #{task_id} deleted.[/green]")
    return tasks


def cmd_prioritize(tasks: list[dict], client: anthropic.Anthropic) -> list[dict]:
    open_tasks = [t for t in tasks if t.get("status") != "done"]
    if not open_tasks:
        console.print("[yellow]No open tasks to prioritize.[/yellow]")
        return tasks

    render_tasks(open_tasks, title="Open Tasks")
    context = build_task_context(open_tasks)
    console.print(Panel("🤖 [bold]AI Prioritisation[/bold]", style="blue"))

    ai_request(
        client,
        SYSTEM_PROMPT,
        f"Here are my current tasks:\n\n{context}\n\n"
        "Please suggest an optimal order to tackle these tasks today, "
        "explaining your reasoning briefly for each recommendation.",
    )
    return tasks


def cmd_breakdown(tasks: list[dict], client: anthropic.Anthropic) -> list[dict]:
    render_tasks([t for t in tasks if t.get("status") != "done"])
    try:
        task_id = int(Prompt.ask("Task ID to break down"))
    except ValueError:
        console.print("[red]Invalid ID.[/red]")
        return tasks

    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        console.print(f"[red]Task #{task_id} not found.[/red]")
        return tasks

    console.print(Panel(f"🤖 [bold]Breaking down: {task['title']}[/bold]", style="blue"))
    desc = f" — {task['description']}" if task.get("description") else ""

    subtasks_json = ai_request(
        client,
        SYSTEM_PROMPT + "\nWhen asked to break down a task, respond ONLY with a JSON array of subtask title strings, no other text.",
        f"Break down this task into 3-6 concrete, actionable subtasks:\n\n"
        f"Title: {task['title']}{desc}\n\n"
        f"Respond with a JSON array of subtask titles only.",
    )

    try:
        subtask_titles = json.loads(subtasks_json.strip())
        if isinstance(subtask_titles, list) and Confirm.ask("Add these as new tasks?"):
            for st in subtask_titles:
                new_task = {
                    "id": next_id(tasks),
                    "title": str(st),
                    "description": f"Subtask of #{task_id}: {task['title']}",
                    "priority": task.get("priority", "medium"),
                    "status": "todo",
                    "created_at": datetime.now().isoformat(),
                    "due_date": task.get("due_date", ""),
                    "tags": task.get("tags", []) + [f"parent-{task_id}"],
                }
                tasks.append(new_task)
            save_tasks(tasks)
            console.print(f"[green]✓ {len(subtask_titles)} subtasks added.[/green]")
    except json.JSONDecodeError:
        pass  # AI already streamed a readable response; JSON parse was best-effort

    return tasks


def cmd_suggest(tasks: list[dict], client: anthropic.Anthropic) -> list[dict]:
    context = build_task_context(tasks)
    console.print(Panel("🤖 [bold]AI Suggestions[/bold]", style="blue"))

    ai_request(
        client,
        SYSTEM_PROMPT,
        f"Here is my full task list:\n\n{context}\n\n"
        "Give me 3-5 practical suggestions to improve my productivity and task management, "
        "based specifically on what you see in my task list.",
    )
    return tasks


def cmd_chat(tasks: list[dict], client: anthropic.Anthropic) -> list[dict]:
    context = build_task_context(tasks)
    console.print(Panel("💬 [bold]Chat with AI[/bold] (type 'exit' to stop)", style="blue"))
    messages: list[dict] = []

    task_system = (
        SYSTEM_PROMPT
        + f"\n\nCurrent task list:\n{context}"
    )

    while True:
        user_input = Prompt.ask("[bold cyan]You[/bold cyan]")
        if user_input.lower() in ("exit", "quit", "q"):
            break

        messages.append({"role": "user", "content": user_input})
        console.print("[bold blue]Claude[/bold blue]: ", end="")

        full_response = ""
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=1024,
            system=task_system,
            messages=messages,
        ) as stream:
            for event in stream:
                if (
                    event.type == "content_block_delta"
                    and event.delta.type == "text_delta"
                ):
                    full_response += event.delta.text
                    console.print(event.delta.text, end="", markup=False)
        console.print()
        messages.append({"role": "assistant", "content": full_response})

    return tasks


# ── Main menu ──────────────────────────────────────────────────────────────────

MENU = {
    "1": ("List tasks", cmd_list, False),
    "2": ("Add task", cmd_add, False),
    "3": ("Update task", cmd_update, False),
    "4": ("Delete task", cmd_delete, False),
    "5": ("🤖 AI: Prioritize my tasks", cmd_prioritize, True),
    "6": ("🤖 AI: Break down a task", cmd_breakdown, True),
    "7": ("🤖 AI: Get productivity suggestions", cmd_suggest, True),
    "8": ("🤖 AI: Chat about my tasks", cmd_chat, True),
    "q": ("Quit", None, False),
}


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        console.print("[red]Error: ANTHROPIC_API_KEY environment variable not set.[/red]")
        sys.exit(1)

    ai_client = anthropic.Anthropic(api_key=api_key)
    tasks = load_tasks()

    console.print(
        Panel.fit(
            "[bold cyan]✅ AI Task Manager[/bold cyan]\n"
            "[dim]Powered by Claude claude-opus-4-6[/dim]",
            border_style="cyan",
        )
    )

    while True:
        console.print()
        for key, (label, _, _) in MENU.items():
            console.print(f"  [bold]{key}[/bold]  {label}")

        choice = Prompt.ask("\nChoose an option", choices=list(MENU.keys()))

        if choice == "q":
            console.print("[cyan]Goodbye! 👋[/cyan]")
            break

        label, handler, needs_ai = MENU[choice]
        console.print()

        if needs_ai:
            tasks = handler(tasks, ai_client)
        else:
            tasks = handler(tasks)


if __name__ == "__main__":
    main()
