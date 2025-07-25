---
mode: agent
tools: ['changes', 'codebase', 'editFiles', 'extensions', 'fetch', 'githubRepo', 'openSimpleBrowser', 'problems', 'runTasks', 'search', 'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure', 'usages', 'vscodeAPI', 'sequentialthinking']
---
Use #sequentialthinking to perform a comprehensive code audit of the GPT project codebase with these specific actions:

1. ANALYZE: Evaluate the entire codebase against the project requirements and goals as defined in the [Overview](../../docs/overview.md) and [PRD](../../docs/prd.md).
   - Ensure alignment with local-first architecture principles
   - Verify adherence to TypeScript best practices
   - Check for consistency in component architecture and usage of HeroUI components
   - Confirm proper implementation of lazy loading patterns
   - Assess the integration of AI services and MCP tools

2. IDENTIFY:
   - Code duplication and redundant patterns
   - Potential bugs and edge cases
   - TODO comments requiring resolution
   - Areas misaligned with our TypeScript best practices

3. REFACTOR:
   - Consolidate duplicated functionality
   - Apply TypeScript best practices (strict typing, functional patterns, proper interfaces)
   - Ensure code aligns with local-first architecture goals
   - Maintain backward compatibility with existing functionality

4. VERIFY:
   - Run existing tests to confirm changes don't break functionality
   - Document any changes made and reasoning behind them
   - Suggest additional improvements for future implementation

5. OPTIMIZE:
   - Improve performance where possible
   - Enhance code readability and maintainability
   - Ensure proper error handling throughout

When finished, provide a summary of findings, changes made, and any recommendations for future work. Use the tools available to you to gather information, analyze code, and make edits as necessary. Document your process and decisions clearly for transparency and future reference. Finally, list three key areas, explorations, or experiments for potential future improvements based on your findings as prompts for further development.
