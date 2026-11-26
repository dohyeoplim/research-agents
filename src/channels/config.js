import { readFile } from "node:fs/promises";
import path from "node:path";

export function validate(config) {
    if (
        !config ||
        typeof config !== "object" ||
        typeof config.team !== "string" ||
        !/^T[A-Z0-9]+$/.test(config.team) ||
        !Array.isArray(config.users) ||
        !config.users.length ||
        config.users.some(
            (user) => typeof user !== "string" || !/^[UW][A-Z0-9]+$/.test(user),
        ) ||
        !config.channels ||
        typeof config.channels !== "object" ||
        Array.isArray(config.channels)
    )
        throw Error("Team, users and channels are required");
    for (const [id, route] of Object.entries(config.channels)) {
        if (
            !/^[CG][A-Z0-9]+$/.test(id) ||
            !route ||
            typeof route !== "object" ||
            typeof route.agent !== "string" ||
            !/^[a-z][a-z0-9-]*$/.test(route.agent) ||
            typeof route.cwd !== "string" ||
            !route.cwd ||
            path.isAbsolute(route.cwd) ||
            route.cwd.split("/").some((part) => part === ".." || !part) ||
            (route.name !== undefined &&
                (typeof route.name !== "string" ||
                    !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(route.name))) ||
            (route.enabled !== undefined &&
                typeof route.enabled !== "boolean") ||
            (route.instructions !== undefined &&
                (typeof route.instructions !== "string" ||
                    route.instructions.length > 8000)) ||
            (route.model !== undefined && typeof route.model !== "string") ||
            (route.profile !== undefined &&
                (typeof route.profile !== "string" || !/^[a-z][a-z0-9-]*$/.test(route.profile)))
        )
            throw Error("Invalid route");
    }
    return config;
}

export async function loadConfig(file = "/config/routes.json") {
    return validate(JSON.parse(await readFile(file, "utf8")));
}
