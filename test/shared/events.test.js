import test from "node:test";
import assert from "node:assert/strict";
import { logEvent } from "../../src/shared/events.js";

test("private lifecycle logs", () => {
    const lines = [];
    const taskId = "12345678-1234-1234-1234-123456789abc";
    logEvent("task_completed", { taskId,  provider: "codex", status: "completed",
        durationMs: 10, command: "private command", output: "private output", token: "secret-token",
        stage: "secret-token", jobId: "secret-token", code: "secret-token" }, (line) => lines.push(line));
    const record = JSON.parse(lines[0]);
    assert.equal(record.event, "task_completed");
    assert.equal(record.taskId, taskId);
    assert.equal(record.durationMs, 10);
    assert.ok(Number.isFinite(Date.parse(record.at)));
    assert.doesNotMatch(lines[0], /private|secret-token/);
    logEvent("secret-token", {}, (line) => lines.push(line));
    assert.equal(lines.length, 1);
});

test("logging failures", () => {
    assert.doesNotThrow(() => logEvent("task_completed", {}, () => { throw Error("Full sink"); }));
});
