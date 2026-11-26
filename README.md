<h3 align="center">
    research-agents
</h3>

<hr />

### Features

- Persistent conversations and memory.
- Slack message search, Canvas editing, and universal document workflows.
- Deep research with independent Codex and Claude reports, Slack controls, and Canvas export.

#### Integrations

- OpenAI Codex
- Claude Code
- Slack API
- arXiv

### Usage

#### Setup

```sh
cp config/routes.example.json config/routes.json
mkdir -p data/gateway data/assistant/codex data/assistant/workspace
```

- Slack app generated using `slack-manifest.json`.
- `.env`: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN` (`connections:write`), and `POSTGRES_PASSWORD`.
- `config/routes.json`: workspace, user, and channel IDs.

#### Build

```sh
docker compose build --pull --no-cache
```

#### Run

```sh
docker compose up -d --build
```


