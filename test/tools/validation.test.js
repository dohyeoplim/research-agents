import test from "node:test";
import assert from "node:assert/strict";
import { createTools } from "../../src/tools/registry.js";

test("paper and evidence argument validation", async () => {
    let calls = 0;
    const tools = createTools({ library: { read: () => { calls++; } },
        research: { save: () => { calls++; } } });
    await assert.rejects(tools.call("papers_read", { id: "2401.12345", offset: -1 }, {}), /offset/);
    await assert.rejects(tools.call("papers_read", { id: "not-a-paper" }, {}), /arXiv/);
    await assert.rejects(tools.call("research_source_save", {
        url: "https://example.org/paper", title: "Paper", text: "Evidence", coverage: "summary",
    }, {}), /coverage/);
    await assert.rejects(tools.call("papers_read", { id: "2401.12345", "secret-token": "private" }, {}),
        (error) => !error.message.includes("secret-token") && !error.message.includes("private"));
    assert.equal(calls, 0);
});

test("excluded tools are not registered", async () => {
    const tools = createTools({});
    for (const name of ["remote_exec", "autoresearch_campaign", "weather_forecast", "calendar_events"]) {
        assert.ok(!tools.definitions.some((tool) => tool.name === name));
        await assert.rejects(tools.call(name, {}, {}), /Unknown tool/);
    }
});
