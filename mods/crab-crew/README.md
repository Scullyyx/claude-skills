# crab-crew

A Claude Code mod that shows what your subagents are doing.

- **A band above the prompt** while helpers are out: `🦀 2/5 helpers done ██████░░░░ 61% · ~$0.42 [ Crew ]`
- **A live panel** (`/crew`, or the band's **Crew** button) listing every subagent with its type, model, task, progress, steps, tool calls, last tool, elapsed time and estimated cost.
- **Pixel crabs.** Each helper gets a crab in its own color. Working crabs walk the beach at the top of the panel, finished crabs rest at the right, and failed or stopped crabs turn grey at the left. The terminal draws them with half-block pixels, and the Desktop app's Code tab draws them as an animated SVG.

The panel opens by itself on the first subagent when the terminal is fullscreen, where it docks beside the transcript. Otherwise open it with `/crew`, which also closes it.

## Where it shows

Only `claude` in a terminal and the Code tab of the Desktop app draw a mod's band and panel. In a cloud session (claude.ai or the mobile app), the VS Code extension's chat panel and `claude -p`, the mod still tracks your helpers, but nothing is drawn. With Remote Control, it draws in the terminal on your machine.

## How the numbers are worked out

- **Progress** is an estimate. Subagents don't report how far along they are, so the bar follows the number of model requests each helper has made: it rises quickly at first, slows down, and stays below 95% until the helper finishes.
- **Cost** is estimated from the token usage of each request (input, output, cache reads and cache writes) at first-party list prices, in `hooks/pricing.ts`. It doesn't account for subscription plans, Bedrock or Vertex pricing, fast mode, or long-context surcharges. Update the table when prices change.

## Install

```
/plugin install crab-crew --marketplace Scullyyx/claude-skills
```

Answer `y` to add the marketplace, then pick a scope. The repository is private, so the machine needs GitHub access to it.

To run it from a checkout while developing:

```bash
claude --plugin-dir ~/src/claude-skills/mods/crab-crew
```

## Develop

```bash
claude plugin validate mods/crab-crew
claude plugin test mods/crab-crew
```
