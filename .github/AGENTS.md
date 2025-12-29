# .github/AGENTS.md

GitHub configuration: CI/CD, repo settings, Renovate.

## Structure

```
.github/
├── actions/setup-pnpm/  # Composite action
├── workflows/           # CI/CD pipelines
├── CODEOWNERS
├── renovate.json5
└── settings.yml
```

## Workflows

| Workflow                  | Trigger  | Purpose                      |
| ------------------------- | -------- | ---------------------------- |
| `main.yaml`               | push/PR  | Lint → Test → Build → Deploy |
| `test-accessibility.yaml` | PR       | WCAG audit                   |
| `test-coverage.yaml`      | PR       | Vitest coverage              |
| `test-performance.yaml`   | PR       | Lighthouse                   |
| `renovate.yaml`           | schedule | Dependency updates           |

## Conventions

- Secrets: `${{ secrets.* }}` only
- Caching: pnpm store via `setup-pnpm`
- Artifacts: Upload test reports

## Anti-Patterns

- Never commit secrets
- Never skip CI without justification
