import bolt from "@slack/bolt";
import { loadConfig } from "./channels/config.js";
import { PostgresState } from "./storage/postgres.js";
import { createArtifactStore } from "./storage/artifacts.js";
import { TaskRuntime } from "./tasks/runtime.js";
import { createTaskExecutor } from "./tasks/executor.js";
import { createMessageSender, createMessageHandler } from "./slack/messages.js";
import { createThreadTitles } from "./slack/titles.js";
import { createSlackResources } from "./resources/slack.js";
import { createSlackStreams } from "./slack/streams.js";
import { createArxiv } from "./papers/arxiv.js";
import { createLibrary } from "./papers/library.js";
import { createTools } from "./tools/registry.js";
import { createToolServer } from "./tools/server.js";
import { createCanvases } from "./slack/canvases.js";
import { createCanvasWorkspace } from "./slack/canvas-workspace.js";
import { createSlackHistory } from "./slack/history.js";
import { createHistoryContext } from "./slack/history-context.js";
import { createResearchLibrary } from "./research/library.js";
import { createResearch } from "./research/service.js";
import { createResearchSlack } from "./research/slack.js";
import { logFailure } from "./shared/diagnostics.js";

const config = await loadConfig();
const state = await new PostgresState().load();
const quietLogger = {
    debug() {},
    info() {},
    warn(...args) { logFailure(args.find((value) => value && typeof value === "object"),
        { component: "slack" }, console.warn); },
    error(...args) { logFailure(args.find((value) => value && typeof value === "object"),
        { component: "slack" }); },
    setLevel() {},
    getLevel() { return "error"; },
    setName() {},
};

const app = new bolt.App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    logger: quietLogger,
});
const identity = await app.client.auth.test();
if (identity.team_id !== config.team) throw Error("Slack workspace mismatch");

const post = createMessageSender(app.client);
const titles = createThreadTitles({ state, token: process.env.SLACK_BOT_TOKEN });
const files = createArtifactStore({ directory: "/state/artifacts" });
const artifacts = {
    get: files.get,
    async put(data, options) {
        const artifact = await files.put(data, options);
        await state.update((draft) => { draft.artifacts[artifact.id] = artifact; });
        return artifact;
    },
};
const resources = createSlackResources({ token: process.env.SLACK_BOT_TOKEN, artifacts });
const streams = createSlackStreams({ state, token: process.env.SLACK_BOT_TOKEN, post });
const arxiv = createArxiv();
const library = createLibrary({ arxiv, state });
const researchLibrary = createResearchLibrary({ state, artifacts });
const canvasOptions = { token: process.env.SLACK_BOT_TOKEN, state, workspaceUrl: identity.url };
const canvases = createCanvasWorkspace({ ...canvasOptions, resources, create: createCanvases(canvasOptions).create });
const history = createSlackHistory({ token: process.env.SLACK_BOT_TOKEN, workspaceUrl: identity.url });
const historyContext = createHistoryContext({ state, history });
const tools = createTools({ arxiv, library, state, canvases, history, research: researchLibrary,
    researchControl: {
        inspect: (...args) => research.inspect(...args), propose: (...args) => research.propose(...args),
        act: (...args) => research.act(...args), readResult: (...args) => research.readResult(...args),
    } });
const toolServer = createToolServer({ tools, state, config: loadConfig,
    healthy: async () => !runtime.closed && !runtime.broken && await state.healthy() });
const runtime = new TaskRuntime({
    store: state,
    deliver: (task, answer) => streams.deliver(task, answer),
    execute: createTaskExecutor({ state, token: process.env.SLACK_BOT_TOKEN, resources, streams,
        toolServer, historyContext }),
});
const research = createResearch({ state, library: researchLibrary, config: loadConfig, post, canvases,
    execute: createTaskExecutor({ state, token: process.env.SLACK_BOT_TOKEN, resources, toolServer, historyContext }),
});
const researchSlack = createResearchSlack({ client: app.client, state, config: loadConfig, control: research.control });
research.attach(researchSlack);
researchSlack.register(app);
const messages = createMessageHandler({ state, runtime, bot: identity.user_id, post, titles, resources, research });
app.event("app_mention", messages.handle);
app.event("message", messages.handle);
app.event("agent_session_title_changed", titles.changed);
app.error(async () => console.error("Slack event failed"));
await runtime.recover();
runtime.closed = true;
await new Promise((resolve, reject) => {
    toolServer.server.once("error", reject);
    toolServer.server.listen(8081, "0.0.0.0", resolve);
});
await app.start();
await research.recover();
await messages.recover();
runtime.closed = false;
runtime.wake();
console.log("Slack bridge ready");

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
        await research.stop();
        await app.stop();
        await messages.idle();
        runtime.closed = true;
        await runtime.idle();
        await new Promise((resolve) => toolServer.server.close(resolve));
        await state.close();
        process.exit(0);
    });
}
