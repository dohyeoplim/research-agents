const events = new Set(["task_started", "task_completed", "tool_rejected"]);
const values = new Set(["codex", "claude", "worker", "tools", "clarify", "explore", "counter", "synthesize",
    "review", "revise", "canvas", "running", "queued", "completed", "failed", "cancelled", "interrupted",
    "limited", "paused", "awaiting_input", "invalid_arguments"]);
const fields = new Set(["id", "query", "days", "limit", "file", "offset", "revision", "action", "title",
    "brief", "questions", "parentId", "url", "text", "coverage", "locator", "claim", "canvasId", "readId"]);

export function logEvent(event, context = {}, sink = console.info) {
    if (!events.has(event)) return;
    const record = { event, at: new Date().toISOString() };
    for (const name of ["taskId", "runId"]) {
        if (typeof context[name] === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(context[name])) {
            record[name] = context[name];
        }
    }
    for (const name of ["component", "provider", "stage", "status"]) {
        if (values.has(context[name])) record[name] = context[name];
    }
    for (const name of ["durationMs"]) {
        if (Number.isSafeInteger(context[name])) record[name] = context[name];
    }
    if (fields.has(context.field)) record.field = context.field;
    try { sink(JSON.stringify(record)); } catch {}
}
