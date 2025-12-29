# docs/AGENTS.md

Project documentation and guidelines for the GPT platform.

## Structure

| File                   | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `RULES.md`             | Comprehensive development guidelines (894 lines) |
| `design-system.md`     | UI tokens, patterns, accessibility (416 lines)   |
| `prd.md`               | Product requirements, MoSCoW priorities          |
| `features.md`          | Feature breakdown and status                     |
| `overview.md`          | Project overview                                 |
| `agent-development.md` | Agent/LLM development patterns                   |
| `plan/`                | RFC drafts and planning docs                     |

## Where to Look

| Task                  | File               | Notes                    |
| --------------------- | ------------------ | ------------------------ |
| Coding conventions    | `RULES.md`         | Sections 3-5             |
| UI patterns           | `design-system.md` | Color tokens, components |
| HeroUI specifics      | `RULES.md`         | Section 6                |
| Security requirements | `RULES.md`         | Section 8                |
| Testing standards     | `RULES.md`         | Section 10               |
| Feature priorities    | `prd.md`           | MoSCoW breakdown         |

## Key References

- **RULES.md**: Authoritative source for all coding standards
- **design-system.md**: Referenced by root AGENTS.md for UI work
- **prd.md**: Product vision and acceptance criteria

## Conventions

- Docs are Markdown with YAML frontmatter where applicable
- `RULES.md` versioned (currently v1.2)
- Cross-references use relative paths
- `plan/` contains RFC drafts before promotion to `RFCs/`

## Anti-Patterns

- **Don't duplicate RULES.md content elsewhere** — reference it
- **Don't add new guidelines here** — update RULES.md instead
- **Don't confuse with RFCs/** — RFCs are architecture decisions, docs are guidelines
