import { resolveProfile } from "../agents/profiles.js";
import { parseCommand, splitFirst } from "../shared/text.js";
import { ownedTasks } from "../tasks/runtime.js";
import { isFileId } from "../resources/identifiers.js";
import { sourceList } from "../resources/context.js";
import { researchText } from "../research/copy.js";

export const helpText = [
    "!research <request> - prepare a research plan",
    "!tasks - list recent tasks",
    "!stop [task-id] - stop active work",
    "!retry <task-id> - retry a failed task",
    "!redeliver <task-id> - resend a saved answer",
    "!sources - list channel documents",
    "!read <file-id> [request] - read a channel document",
].join("\n");

export async function commandReply(command, context, { state, runtime, resources }) {
    const { name, args } = command;
    if (name === "help") return helpText;
    if (name === "sources") return sourceList(await resources.catalog(context.channel, { refresh: true }));
    if (name === "tasks") return ownedTasks(state.snapshot(), context).slice(-10).reverse()
        .map((task) => `${task.id.slice(0, 8)} ${task.status} delivery=${task.delivery}`).join("\n") || "No tasks";
    if (name === "stop") return "Cancellation requested: " + (await runtime.cancel(context, args)).slice(0, 8);
    if (name === "retry") return "Queued retry: " + (await runtime.retry(context, args)).slice(0, 8);
    if (name === "redeliver") {
        await runtime.redeliver(context, args);
        return "Saved answer queued for delivery";
    }
    return null;
}

export function requestedTask(prompt, profiles, route) {
    const command = parseCommand(prompt);
    let fileIds;
    if (command?.name === "research") {
        if (!command.args.trim()) throw Error("Provide a research request");
        prompt = researchText("RESEARCH_COMMAND", { request: command.args });
    } else if (command?.name === "read") {
        const [id, question] = splitFirst(command.args);
        if (!isFileId(id)) throw Error("Use a file ID from !sources");
        fileIds = [id];
        prompt = question || "Summarize the requested Slack file and cite its source link.";
    } else if (command) throw Error("Unknown command. Use !help");
    if (!prompt.trim() || prompt.length > 16000 || prompt.startsWith("!")) throw Error("Provide a task request");
    return { prompt, profile: resolveProfile(profiles, route).id, fileIds };
}
