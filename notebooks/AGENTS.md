# notebooks/AGENTS.md

This directory contains exploratory notebooks and notebook templates used to iterate on agent behaviors and documentation-like walkthroughs.

## Scope

- Notebook sources live under `notebooks/`.
- Notebook templates live under `notebooks/templates/`.
- Agent-focused notebook experiments may live under `notebooks/agents/`.

If you are changing product code, use the closest instructions under [../src/AGENTS.md](../src/AGENTS.md) and the project rules in [../docs/RULES.md](../docs/RULES.md).

## Conventions

- Keep notebooks reproducible: avoid relying on local machine state that isn’t checked in.
- Do not paste secrets (API keys, tokens, passphrases) into cells or outputs.
- Prefer short, focused cells; avoid very large embedded outputs and generated artifacts.
- If a notebook output is noisy or non-deterministic, clear outputs before committing.

## Working With Notebooks

- Use VS Code’s Jupyter support (or a Jupyter runtime) to run notebooks.
- If you need to generate a new notebook template, base it on existing patterns in `notebooks/templates/`.

## References

- Project-wide agent guidance: [../AGENTS.md](../AGENTS.md)
- Architecture/security/testing rules: [../docs/RULES.md](../docs/RULES.md)
- Product docs: [../docs/overview.md](../docs/overview.md)
