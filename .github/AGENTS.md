# .github/

GitHub configuration: CI/CD workflows, repo settings, Renovate, CODEOWNERS.

## Structure

```
.github/
├── actions/setup-pnpm/   # Composite action for pnpm setup
├── workflows/            # GitHub Actions CI/CD
├── CODEOWNERS            # Review assignments
├── renovate.json5        # Dependency update config
└── settings.yml          # Repo settings (branch protection, etc.)
```

## Workflows

| Workflow                  | Trigger         | Purpose                                 |
| ------------------------- | --------------- | --------------------------------------- |
| `main.yaml`               | push/PR to main | Lint → Test → Build → Deploy (GH Pages) |
| `test-accessibility.yaml` | PR              | WCAG 2.1 AA audit                       |
| `test-coverage.yaml`      | PR              | Vitest coverage report                  |
| `test-performance.yaml`   | PR              | Lighthouse budgets                      |
| `renovate.yaml`           | schedule        | Dependency updates                      |

## Conventions

- **Secrets**: Use `${{ secrets.* }}` — never hardcode
- **Caching**: pnpm store cached via `actions/setup-pnpm`
- **Artifacts**: Upload test reports for PR review

## Anti-Patterns

- **Never commit secrets** to workflow files
- **Never skip CI checks** (`[skip ci]`) without justification
