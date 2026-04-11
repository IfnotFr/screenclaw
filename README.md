<p align="center">
  <img src="assets/logo.png" alt="Screen Claw" width="200" />
</p>

> [!WARNING]
> This project is under active development and is not ready for production use.

# Screen Claw

NodeJS Screen Automation Agent(s) using custom SKILLS and optimized for local Computer Vision with OpenAI API compatibility (Ollama, LM Studio, LocalAI, vLLM, etc.).

**No cloud subscription needed. Turn your gaming PC into a automated productivity tool for "free".**

Tested with:
* `Qwen3.5-9B` (8gb VRAM)
  - A good balance between performance and quality
* `Qwen3.5-35B-A3B` (24gb VRAM)
  - Powerfull and very fast

## Quick start

```bash
npx screen-claw
```

## Requirements

- **OS**: Linux (X11 and Wayland supported)
- **Node.js**: v20+ (requires `build-essential` for native addon compilation: `sudo apt install -y build-essential`)
- **OpenAI-compatible API**: Ollama, LM Studio, LocalAI, vLLM, etc.

### Hardware
- **Tested Screen resolution**: 1280x720 (recommended), 1920x1080 (slower but works)
- **Tested GPU**: RTX 4060 8GB/16GB, RTX 3090 24GB

## Admin Panel

Once running, open **http://localhost:3010** to access the admin panel to manage missions, skills and logs. You can also do it yourself from the file system.

## Missions

Missions are task instructions that Screen Claw will perform periodically. They are defined in the `missions/<mission-name>/MISSION.md` file. Use natural language for scheduling and mission instructions.

`missions/linkedin-to-gmail/MISSION.md`

```
4 times a day, check the 10 firsts posts from my feed, and send me a summary of the most relevant ones to my.email@gmail.com using gmail.
```

## Skills

Skills are context guides loaded automatically based on what is visible on screen. They are organized in two levels.

### Level 1 Skills — App

At each cycle, Screen Claw detects the active application by matching the screen against all skills in `skills/app/`. The detection guide is `skills/app/SKILL.md`.

`skills/app/browser/SKILL.md`

```
---
description: "A web browser window (Chrome, Brave, Firefox, etc.) displaying websites."
subtype: website
---

Use keyboard alt+left to go back, never use the back button.
```

### Level 2 Skills — Subtype

If a Level 1 skill declares a `subtype` field, Screen Claw runs a second detection pass in the `skills/<subtype>/` category. The detection guide is `skills/<subtype>/SKILL.md`.

`skills/website/google-gmail/SKILL.md`

```
---
description: "Gmail: Left sidebar with 'Compose' button and folders. Central list of emails."
---

## Creating an email
...
```

This system is generic: a `game/some-game` skill could declare `subtype: game-layout` to load layout-specific guides depending on whether the player is in-game or in an inventory menu.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ADMIN_PORT` | `3010` | Port for the admin panel |
| `LLM_SERVER_URL` | `http://localhost:4000` | Base URL of your LLM server (`/v1` is appended automatically) |
| `MODEL_ID` | — | Model name to use (e.g. `qwen3.5-9b`) |
| `SCHEDULER_CRON` | `* * * * *` | Cron expression for the scheduler frequency |

## Development

### Install and run

```bash
# Clone and install
git clone https://github.com/your-org/screen-claw
cd screen-claw
npm install
cd src/admin && npm install && cd ../..

# Copy and fill in your environment
cp .env.example .env

# Start the server
npm run dev

# Or run a single agent from CLI
npm run agent [runner|computer|scheduler] "your prompt"

# Production build
npm run build
```

## License

MIT
