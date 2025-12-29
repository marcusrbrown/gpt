# RFC-011: Advanced Tools & Sandbox

| Field            | Value                          |
| ---------------- | ------------------------------ |
| **Status**       | Pending                        |
| **Priority**     | COULD                          |
| **Complexity**   | High                           |
| **Effort**       | 4 weeks                        |
| **Dependencies** | RFC-009 (MCP Tool Integration) |

## Summary

Implement built-in tools including web search, code execution sandbox, and calculator. These tools run directly in the browser without requiring external MCP servers, providing immediate utility while maintaining the local-first architecture.

## Prerequisites

| Prerequisite         | RFC     | Status  |
| -------------------- | ------- | ------- |
| MCP Tool Integration | RFC-009 | Pending |

## Features Addressed

| Feature ID | Feature Name           | Coverage |
| ---------- | ---------------------- | -------- |
| F-305      | Web Search Tool        | Full     |
| F-306      | Code Execution Sandbox | Full     |

## Technical Specification

### Built-in Tools Overview

| Tool             | Description                      | Execution   |
| ---------------- | -------------------------------- | ----------- |
| Web Search       | Search the web via API providers | Remote API  |
| Code Sandbox     | Execute Python/JavaScript safely | WebAssembly |
| Calculator       | Evaluate math expressions        | Local       |
| Image Generation | Generate images via DALL-E       | OpenAI API  |

### SDK Integration

Built-in tools are registered as virtual MCP tools, using the same `Tool` type from `@modelcontextprotocol/sdk`. This allows them to be seamlessly mixed with external MCP server tools in the UI and tool selection.

```typescript
// Re-export SDK types for tool definitions
import type {Tool, CallToolResult} from "@modelcontextprotocol/sdk/types.js"
```

### Zod Schemas

```typescript
import {z} from "zod"

// Import SDK schemas where applicable
import {ToolSchema, CallToolResultSchema} from "@modelcontextprotocol/sdk/types.js"

// Tool annotations (MCP 2025-11-25)
export const ToolAnnotationsSchema = z
  .object({
    destructiveHint: z.boolean().optional(),
    idempotentHint: z.boolean().optional(),
    openWorldHint: z.boolean().optional(),
    readOnlyHint: z.boolean().optional(),
    title: z.string().optional(),
  })
  .passthrough()

// Built-in tool extends SDK Tool with app-specific fields
export const BuiltinToolSchema = z.object({
  // MCP SDK Tool fields
  name: z.string().regex(/^[a-zA-Z0-9_.-]{1,128}$/),
  description: z.string().optional(),
  inputSchema: z
    .object({
      type: z.literal("object"),
      properties: z.record(z.unknown()),
      required: z.array(z.string()).optional(),
    })
    .passthrough(),
  outputSchema: z
    .object({
      type: z.literal("object"),
      properties: z.record(z.unknown()),
    })
    .passthrough()
    .optional(),
  annotations: ToolAnnotationsSchema.optional(),

  // App-specific extensions (not sent to LLM)
  id: z.string(), // Internal identifier
  category: z.enum(["search", "code", "math", "image"]),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).optional(),
  icons: z
    .array(
      z.object({
        type: z.enum(["base64", "url"]),
        mediaType: z.string(),
        data: z.string(),
      }),
    )
    .optional(),
})

// Web Search Configuration
export const WebSearchConfigSchema = z.object({
  provider: z.enum(["brave", "serp", "google-custom", "duckduckgo"]),
  apiKey: z.string().optional(), // Encrypted, stored via RFC-002
  maxResults: z.number().min(1).max(20).default(5),
  safeSearch: z.boolean().default(true),
  cacheTTL: z.number().min(0).max(86400).default(3600), // seconds
})

// Web Search Request/Response
export const WebSearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().optional(),
  freshness: z.enum(["day", "week", "month", "any"]).optional(),
})

export const WebSearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  publishedDate: z.string().optional(),
})

export const WebSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(WebSearchResultSchema),
  cached: z.boolean(),
  searchedAt: z.string().datetime(),
})

// Code Sandbox Configuration
export const CodeSandboxConfigSchema = z.object({
  languages: z.array(z.enum(["python", "javascript"])).default(["python", "javascript"]),
  memoryLimitMB: z.number().min(64).max(512).default(256),
  timeoutSeconds: z.number().min(5).max(120).default(30),
  allowedModules: z.record(z.array(z.string())).default({
    python: ["math", "json", "datetime", "random", "statistics", "itertools", "collections"],
    javascript: [], // Built-in only
  }),
})

// Code Execution Request/Response
export const CodeExecutionRequestSchema = z.object({
  language: z.enum(["python", "javascript"]),
  code: z.string().min(1).max(50000),
  stdin: z.string().optional(),
  files: z.record(z.string()).optional(), // Virtual filesystem
})

export const CodeExecutionResponseSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
  returnValue: z.unknown().optional(),
  executionTimeMs: z.number(),
  memoryUsedMB: z.number().optional(),
  files: z.record(z.string()).optional(), // Output files
})

// Calculator Request/Response
export const CalculatorRequestSchema = z.object({
  expression: z.string().min(1).max(1000),
})

export const CalculatorResponseSchema = z.object({
  expression: z.string(),
  result: z.union([z.number(), z.string()]),
  steps: z.array(z.string()).optional(),
})

// Image Generation Request/Response
export const ImageGenerationRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).default("1024x1024"),
  quality: z.enum(["standard", "hd"]).default("standard"),
  style: z.enum(["vivid", "natural"]).default("vivid"),
})

export const ImageGenerationResponseSchema = z.object({
  url: z.string().url(),
  revisedPrompt: z.string().optional(),
  generatedAt: z.string().datetime(),
})

// Type exports
export type BuiltinTool = z.infer<typeof BuiltinToolSchema>
export type WebSearchConfig = z.infer<typeof WebSearchConfigSchema>
export type CodeSandboxConfig = z.infer<typeof CodeSandboxConfigSchema>
export type CodeExecutionRequest = z.infer<typeof CodeExecutionRequestSchema>
export type CodeExecutionResponse = z.infer<typeof CodeExecutionResponseSchema>
```

### Web Search Service

```typescript
export interface IWebSearchService {
  search(request: WebSearchRequest): Promise<WebSearchResponse>
  configure(config: WebSearchConfig): void
  getProviders(): WebSearchProvider[]
}

interface WebSearchProvider {
  id: string
  name: string
  requiresApiKey: boolean
  rateLimit: {requests: number; windowSeconds: number}
}

export class WebSearchService implements IWebSearchService {
  private config: WebSearchConfig
  private cache: Map<string, {response: WebSearchResponse; expiresAt: number}> = new Map()

  constructor(config?: Partial<WebSearchConfig>) {
    this.config = WebSearchConfigSchema.parse(config || {provider: "duckduckgo"})
  }

  async search(request: WebSearchRequest): Promise<WebSearchResponse> {
    const validatedRequest = WebSearchRequestSchema.parse(request)
    const cacheKey = this.getCacheKey(validatedRequest)

    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return {...cached.response, cached: true}
    }

    // Execute search based on provider
    const results = await this.executeSearch(validatedRequest)

    const response: WebSearchResponse = {
      query: validatedRequest.query,
      results,
      cached: false,
      searchedAt: new Date().toISOString(),
    }

    // Cache results
    this.cache.set(cacheKey, {
      response,
      expiresAt: Date.now() + this.config.cacheTTL * 1000,
    })

    return response
  }

  private async executeSearch(request: WebSearchRequest): Promise<WebSearchResult[]> {
    switch (this.config.provider) {
      case "brave":
        return this.searchBrave(request)
      case "serp":
        return this.searchSerp(request)
      case "google-custom":
        return this.searchGoogleCustom(request)
      case "duckduckgo":
        return this.searchDuckDuckGo(request)
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`)
    }
  }

  private async searchBrave(request: WebSearchRequest): Promise<WebSearchResult[]> {
    if (!this.config.apiKey) {
      throw new Error("Brave Search requires an API key")
    }

    const url = new URL("https://api.search.brave.com/res/v1/web/search")
    url.searchParams.set("q", request.query)
    url.searchParams.set("count", String(request.maxResults || this.config.maxResults))
    if (this.config.safeSearch) {
      url.searchParams.set("safesearch", "moderate")
    }

    const response = await fetch(url.toString(), {
      headers: {
        "X-Subscription-Token": this.config.apiKey,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Brave Search failed: ${response.status}`)
    }

    const data = await response.json()

    return (data.web?.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      publishedDate: r.age,
    }))
  }

  private async searchDuckDuckGo(request: WebSearchRequest): Promise<WebSearchResult[]> {
    // DuckDuckGo Instant Answer API (limited but free, no API key)
    const url = new URL("https://api.duckduckgo.com/")
    url.searchParams.set("q", request.query)
    url.searchParams.set("format", "json")
    url.searchParams.set("no_redirect", "1")

    const response = await fetch(url.toString())
    const data = await response.json()

    const results: WebSearchResult[] = []

    // Abstract (main result)
    if (data.Abstract) {
      results.push({
        title: data.Heading || "Result",
        url: data.AbstractURL,
        snippet: data.Abstract,
      })
    }

    // Related topics
    for (const topic of data.RelatedTopics?.slice(0, this.config.maxResults - 1) || []) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(" - ")[0] || topic.Text,
          url: topic.FirstURL,
          snippet: topic.Text,
        })
      }
    }

    return results
  }

  // ... other provider implementations

  getProviders(): WebSearchProvider[] {
    return [
      {id: "brave", name: "Brave Search", requiresApiKey: true, rateLimit: {requests: 2000, windowSeconds: 86400}},
      {id: "serp", name: "SerpAPI", requiresApiKey: true, rateLimit: {requests: 100, windowSeconds: 2592000}},
      {
        id: "google-custom",
        name: "Google Custom Search",
        requiresApiKey: true,
        rateLimit: {requests: 100, windowSeconds: 86400},
      },
      {id: "duckduckgo", name: "DuckDuckGo", requiresApiKey: false, rateLimit: {requests: 50, windowSeconds: 60}},
    ]
  }
}
```

### Code Sandbox Service (WebAssembly)

```typescript
export interface ICodeSandboxService {
  execute(request: CodeExecutionRequest): Promise<CodeExecutionResponse>
  isLanguageSupported(language: string): boolean
  configure(config: CodeSandboxConfig): void
}

export class CodeSandboxService implements ICodeSandboxService {
  private config: CodeSandboxConfig
  private pyodide: any = null
  private quickjs: any = null

  constructor(config?: Partial<CodeSandboxConfig>) {
    this.config = CodeSandboxConfigSchema.parse(config || {})
  }

  async execute(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
    const validatedRequest = CodeExecutionRequestSchema.parse(request)

    const startTime = performance.now()

    try {
      let result: {stdout: string; stderr: string; returnValue?: unknown}

      switch (validatedRequest.language) {
        case "python":
          result = await this.executePython(validatedRequest)
          break
        case "javascript":
          result = await this.executeJavaScript(validatedRequest)
          break
        default:
          throw new Error(`Unsupported language: ${validatedRequest.language}`)
      }

      return {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        returnValue: result.returnValue,
        executionTimeMs: performance.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : "Unknown error",
        executionTimeMs: performance.now() - startTime,
      }
    }
  }

  private async executePython(request: CodeExecutionRequest): Promise<{
    stdout: string
    stderr: string
    returnValue?: unknown
  }> {
    // Lazy load Pyodide
    if (!this.pyodide) {
      // @ts-ignore
      this.pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
      })
    }

    // Capture stdout/stderr
    let stdout = ""
    let stderr = ""

    this.pyodide.setStdout({
      batched: (text: string) => {
        stdout += text + "\n"
      },
    })
    this.pyodide.setStderr({
      batched: (text: string) => {
        stderr += text + "\n"
      },
    })

    // Set up virtual filesystem
    if (request.files) {
      for (const [path, content] of Object.entries(request.files)) {
        this.pyodide.FS.writeFile(path, content)
      }
    }

    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Execution timeout")), this.config.timeoutSeconds * 1000)
    })

    const execPromise = (async () => {
      // Wrap code to capture return value
      const wrappedCode = `
import sys
import io

__result__ = None
try:
    exec('''${request.code.replace(/'/g, "\\'")}''')
except Exception as e:
    print(str(e), file=sys.stderr)
`
      await this.pyodide.runPythonAsync(wrappedCode)
      return this.pyodide.globals.get("__result__")
    })()

    const returnValue = await Promise.race([execPromise, timeoutPromise])

    return {stdout: stdout.trim(), stderr: stderr.trim(), returnValue}
  }

  private async executeJavaScript(request: CodeExecutionRequest): Promise<{
    stdout: string
    stderr: string
    returnValue?: unknown
  }> {
    // Use QuickJS for sandboxed JavaScript execution
    if (!this.quickjs) {
      // @ts-ignore
      const {getQuickJS} = await import("quickjs-emscripten")
      this.quickjs = await getQuickJS()
    }

    const vm = this.quickjs.newContext()

    let stdout = ""
    let stderr = ""

    // Set up console
    const consoleHandle = vm.newObject()

    const logFn = vm.newFunction("log", (...args: any[]) => {
      stdout += args.map(a => vm.dump(a)).join(" ") + "\n"
    })
    vm.setProp(consoleHandle, "log", logFn)
    logFn.dispose()

    const errorFn = vm.newFunction("error", (...args: any[]) => {
      stderr += args.map(a => vm.dump(a)).join(" ") + "\n"
    })
    vm.setProp(consoleHandle, "error", errorFn)
    errorFn.dispose()

    vm.setProp(vm.global, "console", consoleHandle)
    consoleHandle.dispose()

    try {
      // Execute with timeout
      const result = vm.evalCode(request.code, "script.js", {
        memoryLimitBytes: this.config.memoryLimitMB * 1024 * 1024,
      })

      if (result.error) {
        const error = vm.dump(result.error)
        result.error.dispose()
        throw new Error(error)
      }

      const returnValue = vm.dump(result.value)
      result.value.dispose()

      return {stdout: stdout.trim(), stderr: stderr.trim(), returnValue}
    } finally {
      vm.dispose()
    }
  }

  isLanguageSupported(language: string): boolean {
    return this.config.languages.includes(language as any)
  }
}
```

### Calculator Service

```typescript
import * as math from "mathjs"

export class CalculatorService {
  private parser = math.parser()

  evaluate(request: CalculatorRequest): CalculatorResponse {
    const validatedRequest = CalculatorRequestSchema.parse(request)

    try {
      // Sanitize expression (prevent code injection)
      const sanitized = this.sanitize(validatedRequest.expression)

      // Evaluate
      const result = this.parser.evaluate(sanitized)

      return {
        expression: validatedRequest.expression,
        result: typeof result === "object" ? math.format(result) : result,
      }
    } catch (error) {
      return {
        expression: validatedRequest.expression,
        result: `Error: ${error instanceof Error ? error.message : "Invalid expression"}`,
      }
    }
  }

  private sanitize(expression: string): string {
    // Block potentially dangerous constructs
    const blocked = ["import", "eval", "Function", "require"]
    for (const word of blocked) {
      if (expression.includes(word)) {
        throw new Error(`Expression contains blocked keyword: ${word}`)
      }
    }
    return expression
  }
}
```

### Tool Registry Integration

```typescript
import type {Tool} from "@modelcontextprotocol/sdk/types.js"
import type {MCPClientService} from "@/services/mcp-client-service"

// Convert BuiltinTool to SDK Tool format for LLM consumption
function toSDKTool(builtin: BuiltinTool): Tool {
  return {
    name: builtin.name,
    description: builtin.description,
    inputSchema: builtin.inputSchema,
    outputSchema: builtin.outputSchema,
    annotations: builtin.annotations,
  }
}

// Register built-in tools with the MCP tool system
export function registerBuiltinTools(mcpService: MCPClientService): void {
  const builtinTools: BuiltinTool[] = [
    {
      id: "builtin-web-search",
      name: "web_search",
      description:
        "Search the web for current information. Use this when you need up-to-date information or facts you are uncertain about.",
      category: "search",
      enabled: true,
      inputSchema: {
        type: "object",
        properties: {
          query: {type: "string", description: "The search query"},
          maxResults: {type: "number", description: "Maximum number of results (1-10)"},
        },
        required: ["query"],
      },
      outputSchema: {
        type: "object",
        properties: {
          query: {type: "string"},
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: {type: "string"},
                url: {type: "string"},
                snippet: {type: "string"},
              },
            },
          },
          cached: {type: "boolean"},
        },
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true, // Results depend on external web state
        title: "Web Search",
      },
    },
    {
      id: "builtin-code-sandbox",
      name: "execute_code",
      description:
        "Execute Python or JavaScript code in a secure sandbox. Use for calculations, data processing, or demonstrating code.",
      category: "code",
      enabled: true,
      inputSchema: {
        type: "object",
        properties: {
          language: {type: "string", enum: ["python", "javascript"]},
          code: {type: "string", description: "The code to execute"},
        },
        required: ["language", "code"],
      },
      outputSchema: {
        type: "object",
        properties: {
          success: {type: "boolean"},
          stdout: {type: "string"},
          stderr: {type: "string"},
          returnValue: {},
          executionTimeMs: {type: "number"},
        },
      },
      annotations: {
        idempotentHint: false, // Code may have side effects within sandbox
        title: "Code Sandbox",
      },
    },
    {
      id: "builtin-calculator",
      name: "calculate",
      description: "Evaluate mathematical expressions. Supports arithmetic, algebra, calculus, units, and more.",
      category: "math",
      enabled: true,
      inputSchema: {
        type: "object",
        properties: {
          expression: {type: "string", description: "The math expression to evaluate"},
        },
        required: ["expression"],
      },
      outputSchema: {
        type: "object",
        properties: {
          expression: {type: "string"},
          result: {oneOf: [{type: "number"}, {type: "string"}]},
        },
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true, // Same expression always gives same result
        title: "Calculator",
      },
    },
    {
      id: "builtin-image-gen",
      name: "generate_image",
      description: "Generate an image from a text description using DALL-E.",
      category: "image",
      enabled: false, // Requires OpenAI API key
      inputSchema: {
        type: "object",
        properties: {
          prompt: {type: "string", description: "Description of the image to generate"},
          size: {type: "string", enum: ["1024x1024", "1792x1024", "1024x1792"]},
        },
        required: ["prompt"],
      },
      outputSchema: {
        type: "object",
        properties: {
          url: {type: "string"},
          revisedPrompt: {type: "string"},
        },
      },
      annotations: {
        openWorldHint: true, // Generation depends on external API state
        title: "Image Generation",
      },
    },
  ]

  // Register tools with MCP service
  for (const tool of builtinTools) {
    mcpService.registerBuiltinTool(tool, toSDKTool(tool))
  }
}
```

## UI Components

### BuiltinToolSettings

```typescript
interface BuiltinToolSettingsProps {
  tools: BuiltinTool[]
  onUpdate: (toolId: string, enabled: boolean, config?: Record<string, unknown>) => void
}

// Features:
// - Toggle each built-in tool on/off
// - Configure tool-specific settings
// - API key management for web search providers
// - Test each tool
```

### WebSearchSettings

```typescript
interface WebSearchSettingsProps {
  config: WebSearchConfig
  onChange: (config: WebSearchConfig) => void
}

// Features:
// - Provider selector (Brave, SerpAPI, Google, DuckDuckGo)
// - API key input (for providers that require it)
// - Max results slider
// - Safe search toggle
// - Cache TTL setting
// - Test search button
```

### CodeSandboxSettings

```typescript
interface CodeSandboxSettingsProps {
  config: CodeSandboxConfig
  onChange: (config: CodeSandboxConfig) => void
}

// Features:
// - Language toggles (Python, JavaScript)
// - Memory limit slider (64-512 MB)
// - Timeout slider (5-120 seconds)
// - Allowed modules list (Python)
// - Test code execution
```

### CodeExecutionResult

```typescript
interface CodeExecutionResultProps {
  result: CodeExecutionResponse
  language: "python" | "javascript"
}

// Displays:
// - Success/failure indicator
// - Syntax-highlighted code (input)
// - stdout output
// - stderr (if any)
// - Return value
// - Execution time
// - Memory usage
```

### ToolResultViewer

```typescript
interface ToolResultViewerProps {
  tool: string
  result: unknown
}

// Renders tool results appropriately:
// - Web search: List of clickable results
// - Code: Syntax-highlighted output
// - Calculator: Formatted result with expression
// - Image: Generated image preview
```

## Acceptance Criteria

```gherkin
Feature: Web Search Tool

Scenario: Search the web
  Given I have configured a web search provider
  And I am chatting with a GPT that has web search enabled
  When I ask "What happened in tech news today?"
  Then the GPT should use the web_search tool
  And I should see search results in the conversation
  And the GPT should summarize the results

Scenario: Configure web search provider
  Given I am on the tool settings page
  When I select "Brave Search" as the provider
  And I enter my Brave API key
  And I click "Test"
  Then a test search should execute successfully
  And the configuration should be saved

Feature: Code Execution Sandbox

Scenario: Execute Python code
  Given I am chatting with a GPT that has code execution enabled
  When I ask "Calculate the factorial of 10 using Python"
  Then the GPT should use the execute_code tool with Python
  And I should see the code that was executed
  And I should see the output "3628800"

Scenario: Handle code timeout
  Given code execution has a 30 second timeout
  When the GPT executes code with an infinite loop
  Then the execution should timeout
  And I should see a timeout error message
  And the GPT should acknowledge the timeout

Scenario: Execute JavaScript code
  Given I am chatting with a GPT that has code execution enabled
  When I ask "Sort this array: [3,1,4,1,5,9,2,6]"
  Then the GPT should use the execute_code tool with JavaScript
  And I should see the sorted array result

Feature: Calculator Tool

Scenario: Evaluate math expression
  Given I am chatting with a GPT that has calculator enabled
  When I ask "What is the derivative of x^3 + 2x^2?"
  Then the GPT should use the calculate tool
  And I should see the result "3x^2 + 4x"
```

## Testing Requirements

| Test Type         | Coverage Target | Focus Areas                       |
| ----------------- | --------------- | --------------------------------- |
| Unit Tests        | 90%             | Expression parsing, API mapping   |
| Integration Tests | 80%             | Sandbox execution, search caching |
| E2E Tests         | Key flows       | Full tool execution in chat       |

### Key Test Cases

1. **Web search**: Results parsed correctly from each provider
2. **Code sandbox**: Timeout and memory limits enforced
3. **Code sandbox**: Dangerous operations blocked
4. **Calculator**: Complex expressions evaluated correctly
5. **Tool formatting**: Results formatted correctly for each LLM provider

## Security Considerations

### Code Sandbox Security

| Threat            | Mitigation                       |
| ----------------- | -------------------------------- |
| Infinite loops    | Execution timeout (configurable) |
| Memory exhaustion | Memory limit via WebAssembly     |
| Network access    | No network APIs in sandbox       |
| Filesystem access | Virtual filesystem only          |
| Code injection    | Sandboxed via WebAssembly VM     |

### Web Search Security

| Threat           | Mitigation                  |
| ---------------- | --------------------------- |
| API key exposure | Encrypted storage (RFC-002) |
| Result injection | Content sanitization        |
| Rate limit abuse | Per-provider rate limiting  |
| Cost overrun     | Daily request limits        |

## Dependencies

### npm Packages

```json
{
  "@modelcontextprotocol/sdk": "^1.12.0",
  "pyodide": "^0.25.0",
  "quickjs-emscripten": "^0.29.0",
  "mathjs": "^12.0.0",
  "zod": "^3.25.0"
}
```

### Bundle Size Impact

| Package            | Size (gzipped) | Load Strategy                       |
| ------------------ | -------------- | ----------------------------------- |
| pyodide            | ~10 MB         | Lazy load on first Python execution |
| quickjs-emscripten | ~500 KB        | Lazy load on first JS execution     |
| mathjs             | ~170 KB        | Lazy load when calculator used      |

## Performance Considerations

### Cold Start Times

| Tool               | First Use         | Subsequent          |
| ------------------ | ----------------- | ------------------- |
| Python sandbox     | 3-5 seconds       | <100ms              |
| JavaScript sandbox | 500ms             | <50ms               |
| Calculator         | 200ms             | <10ms               |
| Web search         | Network dependent | Cached if TTL valid |

### Optimization Strategies

1. **Preload on GPT selection**: If GPT has code tools enabled, preload sandboxes
2. **Worker threads**: Run sandboxes in Web Workers to avoid blocking UI
3. **Result caching**: Cache web search results, calculator evaluations
4. **Streaming output**: Stream code execution output for long-running scripts

## Future Enhancements

| Enhancement          | Description                        | Target RFC |
| -------------------- | ---------------------------------- | ---------- |
| More languages       | Rust, Go, Ruby via WebAssembly     | RFC-014    |
| File I/O             | Read/write virtual files           | RFC-014    |
| Plotting             | Matplotlib/Chart.js output         | RFC-014    |
| Package installation | Install Python packages in sandbox | RFC-014    |
