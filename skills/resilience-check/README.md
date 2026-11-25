# resilience-check

A skill for Claude Code. It checks if your app can survive when parts of it break.

Parts always break: a database goes down, an API is slow, a cache dies, a user clicks "pay" twice. This skill reads your code, finds the places where a small fault would become a big failure, and writes a short report in plain language. Each problem has a real-life example, a technology example, and a small fix.

Good for vibe coded apps and small projects.

## What it checks

| # | Check | Question |
|---|---|---|
| 1 | Timeouts | Does every outside call have a time limit? |
| 2 | Retries | Do retries wait, stop after a few tries, and use jitter? |
| 3 | Idempotency | Can a retry or a double click create two orders or two charges? |
| 4 | Database down | Does the app handle a lost database in a clear way? |
| 5 | Optional parts down | Does the app still work if the cache or search is down? |
| 6 | Bad input and overload | Is input checked? Are there limits? |
| 7 | Crash and restart | Does the app come back by itself? Is half-done work safe? |
| 8 | Copies in sync | Are the cache and search index updated when the main data changes? |
| 9 | Backups | Does a backup exist, and was a restore tested? |
| 10 | Visible errors | Are errors logged? Does someone see a real outage? |

The skill picks a risk level (Low, Standard, High) from what the app does. A hobby notes app gets 5 checks. A shop with payments gets all 10.

## Install

With one command:

```
npx skills add KaushikDas9/skills@resilience-check
```

Or copy this folder (`skills/resilience-check`) into one of these places:

- `~/.claude/skills/resilience-check/` for all your projects
- `<your-project>/.claude/skills/resilience-check/` for one project

## Use

Write a normal message in Claude Code. For example:

- "Will my app survive if Redis dies?"
- "Check my vibe coded app before I launch."
- "Review my retries and timeouts."

Or type `/resilience-check`.

## Safety rules

- It only reads your code and writes a report. It does not change your code.
- It never runs fault tests on a live system. If you ask for that, it says no and offers a local or test copy.
- It asks before any test that stops something.
- It never prints secrets.

## What is inside

```
resilience-check/
├── SKILL.md                  the steps Claude follows
├── references/
│   ├── search-hints.md       what to search for, per check and per language
│   └── fixes.md              copy-paste fixes
└── evals/                    3 test cases with small sample apps
```

## Tested

Three test cases were run with and without the skill (small sample apps, one run each). With the skill, all 19 checks passed. Without it, 16 passed. The main difference is the format: a risk level, a scorecard, `file:line` evidence, and real-life examples. This is a small test, not a proof.

## Limits

- It reviews code. It cannot see your hosting, backups, or monitoring unless you tell it.
- It does not cover security or load testing. Use a security review for that.
- It is a draft. Issues and ideas are welcome.

## License

MIT
