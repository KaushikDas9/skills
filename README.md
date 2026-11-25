# skills

My collection of skills for Claude Code. Each skill is one folder in `skills/`.

## Skills

| Skill | What it does |
|---|---|
| [resilience-check](skills/resilience-check) | Checks if your app survives failures (timeouts, retries, double charges, dead cache, crashes) and writes a plain-language report with fixes. |

More skills will be added here.

## Install one skill

```
npx skills add KaushikDas9/skills@<skill-name>
```

Example:

```
# for this project only
npx skills add KaushikDas9/skills@resilience-check

# for all your projects
npx skills add KaushikDas9/skills@resilience-check -g
```

Or copy one skill folder into one of these places:

- `~/.claude/skills/<skill-name>/` for all your projects
- `<your-project>/.claude/skills/<skill-name>/` for one project

## Layout

```
skills/
└── <skill-name>/
    ├── SKILL.md          the steps Claude follows
    ├── README.md         details for people
    ├── references/       extra files Claude reads when needed
    └── evals/            test cases
```

## License

MIT
