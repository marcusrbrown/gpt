# .github/AGENTS.md

GitHub configuration: CI/CD, repo settings, Renovate.

## Structure

```
.github/
├── actions/setup-pnpm/        # Composite action: pnpm + Node + Playwright
├── agents/                    # Copilot custom agents
│   ├── reviewer.agent.md      # PR review agent
│   └── test-writer.agent.md   # Test authoring agent
├── workflows/                 # CI/CD pipelines
├── copilot-instructions.md    # Global Copilot coding agent instructions
├── CODEOWNERS
├── renovate.json5
└── settings.yml
```

## Workflows

| Workflow                    | Trigger                    | Purpose                                            |
| --------------------------- | -------------------------- | -------------------------------------------------- |
| `main.yaml`                 | push/PR                    | Lint → Test → Build → Deploy                       |
| `test-accessibility.yaml`   | PR                         | WCAG audit                                         |
| `test-coverage.yaml`        | PR                         | Vitest + E2E coverage                              |
| `test-performance.yaml`     | PR/weekly                  | Lighthouse Core Web Vitals                         |
| `visual-tests.yaml`         | PR/dispatch                | Screenshot regression                              |
| `renovate.yaml`             | schedule                   | Dependency updates                                 |
| `update-repo-settings.yaml` | push                       | Sync .github/settings.yml                          |
| `cache-cleanup.yaml`        | PR close/weekly            | GitHub Actions cache cleanup                       |
| `fro-bot.yaml`              | mentions/PR/daily/dispatch | AI agent: reviews, triage, maintenance             |
| `fro-bot-autoheal.yaml`     | daily/dispatch             | AI agent: autohealing (fix PRs, security, quality) |
| `copilot-setup-steps.yaml`  | dispatch/push/PR (self)    | Copilot coding agent environment setup             |

## Conventions

- Secrets: `${{ secrets.* }}` only
- Caching: pnpm store via `setup-pnpm`
- Artifacts: Upload test reports

## Anti-Patterns

- Never commit secrets
- Never skip CI without justification
