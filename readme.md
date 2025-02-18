# <div align="center">GPT</div>

<div align="center">

![GPT Project Banner](https://placehold.co/1200x300/0d1117/ffffff?text=GPT+Research+and+Development)

Research and development of LLM-powered AI agents and assistants.

[Overview](#overview) • [Tech Stack](#tech-stack) • [Development](#development) • [Notebooks](#notebooks) • [References](#references)

</div>

---

## Overview

GPT is a research project for creating and experimenting with LLM-powered AI agents and assistants. Inspired by ChatGPT's GPT feature and the OpenAI Assistant API, the project supports multiple AI platforms including Ollama, Anthropic, and Azure OpenAI Service.

Key focus areas:

- Development and testing of AI agents and assistants
- Experimentation with LLM architectures and capabilities
- Research into advanced AI interaction patterns

## Tech Stack

The project combines modern AI frameworks with web technologies to create a flexible development environment:

- [LangChain](https://js.langchain.com/) and [LangGraph](https://langchain-ai.github.io/langgraphjs/) for building AI applications
- [Jupyter Notebooks](https://docs.deno.com/runtime/reference/cli/jupyter/) with Deno for TypeScript development
- React-based web interface using [HeroUI](https://www.heroui.com/) components
- GitHub Pages for hosting and GitHub Actions for CI/CD

## Development

### Getting Started

1. Clone the repository
2. Install Deno for notebook development
3. Run the development server:
   ```bash
   pnpm install
   pnpm dev
   ```

For production builds:

```bash
pnpm build
```

## Notebooks

| Notebook                                      | Title         | Description                                 |
| --------------------------------------------- | ------------- | ------------------------------------------- |
| `notebooks/agents/01-repo-ranger.ipynb`       | Repo Ranger   | Code analysis and security checking agent   |
| `notebooks/assistants/01-gpt-architect.ipynb` | GPT Architect | Assistant development and optimization tool |
| `notebooks/assistants/01-baroque-bitch.ipynb` | Baroque Bitch | Art generation and style transfer assistant |

## References

### Technologies

- [OpenAI GPT Platform](https://openai.com/index/introducing-gpts/)
- [Ollama](https://ollama.com/)
- [HeroUI Components](https://www.heroui.com/blog/introducing-heroui)
- [Deno Jupyter Kernel](https://docs.deno.com/runtime/reference/cli/jupyter/)

## License

[MIT](license.md)
