import { readFile } from "node:fs/promises";
import { buildResearchPrompt } from "../research/prompts.js";

const templates = Object.fromEntries(await Promise.all(["worker", "canvas", "history", "research-control"]
    .map(async (name) => [name, await readFile(new URL(`./prompts/${name}.txt`, import.meta.url), "utf8")])));

export function buildPrompt({ profile, route, skill, input }) {
    if (input.researchStage) return buildResearchPrompt({ profile, route, input });
    const values = { profile: profile.instructions, channel: route.instructions || "", skill: skill || "",
        memory: input.context || "", sources: input.sourceContext || "", messages: input.historyContext || "",
        history: templates.history, request: input.prompt, canvas: templates.canvas,
        research: templates["research-control"] };
    return templates.worker.replace(/\{\{([a-z]+)\}\}/g, (_, key) => {
        if (!Object.hasOwn(values, key)) throw Error("Unknown prompt placeholder");
        return values[key];
    });
}
