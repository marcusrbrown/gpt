# RFC-010: Ollama Local Models

| Field            | Value                          |
| ---------------- | ------------------------------ |
| **Status**       | Pending                        |
| **Priority**     | SHOULD                         |
| **Complexity**   | Medium                         |
| **Effort**       | 1.5 weeks                      |
| **Dependencies** | RFC-003 (Provider Abstraction) |

## Summary

Implement Ollama provider integration enabling users to run LLMs locally without API keys or cloud dependencies. This supports the platform's local-first philosophy by allowing completely offline operation.

## Prerequisites

| Prerequisite               | RFC     | Status       |
| -------------------------- | ------- | ------------ |
| Provider Abstraction Layer | RFC-003 | ✅ Completed |

## Features Addressed

| Feature ID | Feature Name        | Coverage |
| ---------- | ------------------- | -------- |
| F-503      | Ollama Local Models | Full     |

## Technical Specification

### Ollama API Overview

Ollama provides a local REST API (default: `http://localhost:11434`) for:

- Model management (list, pull, delete)
- Text generation (streaming and non-streaming)
- Chat completions (multi-turn conversations)
- Embeddings generation

### Zod Schemas

```typescript
import {z} from "zod"

// Ollama connection configuration
export const OllamaConfigSchema = z.object({
  baseUrl: z.string().url().default("http://localhost:11434"),
  timeout: z.number().min(5000).max(600000).default(120000), // Longer default for local inference
  keepAlive: z.string().default("5m"), // How long to keep model loaded
})

// Model information from /api/tags
export const OllamaModelInfoSchema = z.object({
  name: z.string(),
  model: z.string(),
  modified_at: z.string(),
  size: z.number(),
  digest: z.string(),
  details: z.object({
    parent_model: z.string().optional(),
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()).optional(),
    parameter_size: z.string(),
    quantization_level: z.string(),
  }),
})

// Model details from /api/show
export const OllamaModelDetailsSchema = z.object({
  modelfile: z.string(),
  parameters: z.string().optional(),
  template: z.string().optional(),
  details: z.object({
    parent_model: z.string().optional(),
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()).optional(),
    parameter_size: z.string(),
    quantization_level: z.string(),
  }),
  model_info: z.record(z.unknown()).optional(),
})

// Chat message
export const OllamaChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
  images: z.array(z.string()).optional(), // Base64 encoded images for vision models
})

// Thinking mode configuration (for reasoning models like deepseek-r1, qwen3, qwq)
// See RFC-008 for Extended Thinking patterns with Claude models
export const OllamaThinkingConfigSchema = z.object({
  // Enable thinking mode (qwen3: modifies system prompt)
  enabled: z.boolean().default(false),
  // Whether to parse and separate thinking content from response
  parseThinkingBlocks: z.boolean().default(true),
  // Whether to include raw thinking in streamed output
  streamThinking: z.boolean().default(true),
})

// Chat request
export const OllamaChatRequestSchema = z.object({
  model: z.string(),
  messages: z.array(OllamaChatMessageSchema),
  stream: z.boolean().default(true),
  format: z.enum(["json"]).optional(),
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      top_p: z.number().min(0).max(1).optional(),
      top_k: z.number().min(0).optional(),
      num_predict: z.number().optional(), // max tokens
      stop: z.array(z.string()).optional(),
      seed: z.number().optional(),
      num_ctx: z.number().optional(), // context window size
    })
    .optional(),
  keep_alive: z.string().optional(),
  thinking: OllamaThinkingConfigSchema.optional(), // Reasoning model configuration
})

// Chat response (non-streaming)
export const OllamaChatResponseSchema = z.object({
  model: z.string(),
  created_at: z.string(),
  message: OllamaChatMessageSchema,
  done: z.boolean(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
})

// Streaming response chunk
export const OllamaStreamChunkSchema = z.object({
  model: z.string(),
  created_at: z.string(),
  message: z.object({
    role: z.literal("assistant"),
    content: z.string(),
  }),
  done: z.boolean(),
  // Final chunk includes metrics
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
})

// Health check response
export const OllamaHealthSchema = z.object({
  status: z.enum(["ok", "error"]),
  version: z.string().optional(),
})

// Type exports
export type OllamaConfig = z.infer<typeof OllamaConfigSchema>
export type OllamaModelInfo = z.infer<typeof OllamaModelInfoSchema>
export type OllamaModelDetails = z.infer<typeof OllamaModelDetailsSchema>
export type OllamaChatRequest = z.infer<typeof OllamaChatRequestSchema>
export type OllamaChatResponse = z.infer<typeof OllamaChatResponseSchema>
export type OllamaThinkingConfig = z.infer<typeof OllamaThinkingConfigSchema>

// Parsed thinking response (for reasoning models)
export interface OllamaThinkingResponse {
  thinking: string
  response: string
  hasThinking: boolean
}
```

### Popular Models Reference

> **Note**: Popularity data (pulls) from Ollama library as of late 2024. Models are actively updated—check `ollama.com/library` for latest versions.

#### General Purpose & Reasoning Models

| Model | Parameter Size | Use Case | Context | Pulls | Notes |
| --- | --- | --- | --- | --- | --- |
| **deepseek-r1** | 1.5B-671B (MoE) | Reasoning | 128K | 74.8M | MoE (671B=37B active), MIT license, thinking mode |
| **qwen3** | 0.6B-32B, 235B (MoE) | General, thinking | 40K-256K | 15.5M | Toggleable thinking mode, tool support |
| **llama3.3** | 70B | General, multilingual | 128K | 12.1M | Best Llama for most use cases |
| **llama3.2** | 1B, 3B | Lightweight, fast | 128K | 50.4M | Efficient small models |
| **gemma3** | 1B, 4B, 12B, 27B | General, vision | 32K-128K | 28.7M | Vision on 4B+, based on Gemini 2.0 |
| **phi4** | 14B | STEM, reasoning | 16K | 5.2M | Excellent for math/science QA |
| **qwq** | 32B | Reasoning | 40K | 4.8M | Competitive with o1-mini |
| **mistral** | 7B | General, efficient | 32K | 23.4M | Fast, versatile baseline |
| **mistral-large** | 123B | Code, math, reasoning | 128K | 1.2M | Mistral flagship model |

#### Code-Focused Models

| Model | Parameter Size | Use Case | Context | Pulls | Notes |
| --- | --- | --- | --- | --- | --- |
| **codestral** | 22B | Code generation | 32K | 2.1M | 80+ programming languages |
| **qwen2.5-coder** | 0.5B-72B | Code | 32K | 18.5M | Code specialist, multiple sizes |
| **deepseek-coder-v2** | 16B, 236B | Code | 128K | 3.4M | Legacy, consider deepseek-r1 for new projects |

#### Model Naming Convention

Ollama models use a specific naming pattern for pulling quantized versions:

```bash
# Format: model:size-quantization
ollama pull llama3.3:70b-q4_K_M    # 70B model with Q4_K_M quantization
ollama pull deepseek-r1:14b        # Default quantization
ollama pull gemma3:12b-fp16        # Full precision (requires more VRAM)
ollama pull qwen3:32b-q8_0         # High quality quantization

# Common quantization suffixes:
# q4_0     - 4-bit, fastest, lowest quality
# q4_K_M   - 4-bit with K-quant, balanced (recommended default)
# q5_K_M   - 5-bit with K-quant, better quality
# q8_0     - 8-bit, near full precision
# fp16     - Full 16-bit precision (largest, best quality)
```

### Reasoning Models

Several Ollama models support extended thinking/reasoning modes similar to Claude's Extended Thinking (see [RFC-008](./RFC-008-Anthropic-Provider-Integration.md)). These models expose their chain-of-thought reasoning process, improving accuracy on complex tasks.

#### Supported Reasoning Models

| Model           | Thinking Mode | Activation           | Notes                                             |
| --------------- | ------------- | -------------------- | ------------------------------------------------- |
| **deepseek-r1** | Always on     | Native               | Outputs `<think>...</think>` blocks automatically |
| **qwen3**       | Toggleable    | System prompt config | Enable/disable via configuration                  |
| **qwq**         | Always on     | Native               | Dedicated reasoning model from Qwen               |

#### Thinking Mode Behavior

**DeepSeek-R1 and QwQ**: These models automatically include reasoning in their responses using `<think>` tags. The thinking content appears before the final answer.

**Qwen3**: Thinking mode can be toggled via system prompt modification:

- Enable: Add `/think` instruction to system prompt
- Disable: Add `/no_think` instruction to system prompt

#### Parsing Thinking Output

```typescript
interface ThinkingResponse {
  thinking: string
  response: string
  hasThinking: boolean
}

function parseThinkingContent(content: string): ThinkingResponse {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/)
  if (thinkMatch) {
    return {
      thinking: thinkMatch[1].trim(),
      response: content.replace(/<think>[\s\S]*?<\/think>/, "").trim(),
      hasThinking: true,
    }
  }
  return {thinking: "", response: content, hasThinking: false}
}
```

#### UI Considerations for Thinking Models

1. **Display thinking separately**: Show thinking content in a collapsible "Reasoning" section
2. **Performance expectations**: Reasoning models are slower but more accurate for complex tasks
3. **Token usage**: Thinking tokens count toward output, affecting generation time
4. **Model selection guidance**: Recommend reasoning models for math, logic, and multi-step problems

### Vision Models

Ollama supports multimodal models that can process both text and images. Vision capabilities are production-ready across several model families.

#### Vision-Capable Models

| Model               | Parameter Size | Context  | Pulls | Notes                                   |
| ------------------- | -------------- | -------- | ----- | --------------------------------------- |
| **qwen3-vl**        | 2B-235B        | 40K-256K | 790K  | Most capable open vision-language model |
| **gemma3**          | 4B, 12B, 27B   | 32K-128K | 28.7M | Vision built-in on 4B+ sizes            |
| **llava**           | 7B, 13B, 34B   | 4K       | 11.9M | Popular, well-tested, good baseline     |
| **llama3.2-vision** | 11B, 90B       | 128K     | 3.3M  | Meta's multimodal Llama                 |
| **minicpm-v**       | 8B             | 32K      | 4.1M  | Efficient vision model                  |

#### Sending Images

Images are sent as base64-encoded strings in the `images` field of the message:

```typescript
const visionRequest: OllamaChatRequest = {
  model: "gemma3:12b", // or qwen3-vl, llava, etc.
  messages: [
    {
      role: "user",
      content: "What's in this image? Describe it in detail.",
      images: [base64ImageData], // Base64 without data URI prefix
    },
  ],
  stream: true,
}
```

#### Image Encoding Helper

```typescript
async function encodeImageForOllama(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] // Remove data URI prefix
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

#### Detecting Vision Support

```typescript
const VISION_MODEL_PREFIXES = ["gemma3", "qwen3-vl", "qwen2.5vl", "llava", "llama3.2-vision", "minicpm-v"]

function supportsVision(modelName: string): boolean {
  return VISION_MODEL_PREFIXES.some(prefix => modelName.toLowerCase().startsWith(prefix))
}
```

### Provider Implementation

```typescript
import {BaseLLMProvider, ProviderError, type CompletionRequest, type CompletionResponse} from "./base-provider"

export class OllamaProvider extends BaseLLMProvider {
  readonly id = "ollama"
  readonly name = "Ollama"
  readonly apiKeyRequired = false
  readonly enabled = true

  private config: OllamaConfig = OllamaConfigSchema.parse({})
  private cachedModels: OllamaModelInfo[] = []
  private lastModelFetch = 0
  private readonly MODEL_CACHE_TTL = 60000 // 1 minute

  configure(config: Partial<OllamaConfig>): void {
    this.config = OllamaConfigSchema.parse({...this.config, ...config})
  }

  async validateCredentials(): Promise<boolean> {
    // For Ollama, "credentials" means the server is running
    return this.checkHealth()
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async listModels(): Promise<string[]> {
    const now = Date.now()

    if (this.cachedModels.length > 0 && now - this.lastModelFetch < this.MODEL_CACHE_TTL) {
      return this.cachedModels.map(m => m.name)
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new ProviderError("server", `Ollama returned ${response.status}`)
      }

      const data = await response.json()
      this.cachedModels = z.array(OllamaModelInfoSchema).parse(data.models || [])
      this.lastModelFetch = now

      return this.cachedModels.map(m => m.name)
    } catch (error) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError("network_error", "Failed to connect to Ollama. Is it running?")
    }
  }

  async getModelDetails(model: string): Promise<OllamaModelDetails> {
    const response = await fetch(`${this.config.baseUrl}/api/show`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name: model}),
    })

    if (!response.ok) {
      throw new ProviderError("invalid_request", `Model "${model}" not found`)
    }

    return OllamaModelDetailsSchema.parse(await response.json())
  }

  async createCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const ollamaRequest = this.mapToOllamaRequest(request)
    ollamaRequest.stream = false

    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(ollamaRequest),
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      await this.handleError(response)
    }

    const data = OllamaChatResponseSchema.parse(await response.json())
    return this.mapToCompletionResponse(data)
  }

  async *createCompletionStream(request: CompletionRequest): AsyncGenerator<string, void, unknown> {
    const ollamaRequest = this.mapToOllamaRequest(request)
    ollamaRequest.stream = true

    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(ollamaRequest),
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      await this.handleError(response)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ProviderError("stream_error", "No response body")
    }

    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const {done, value} = await reader.read()
        if (done) break

        buffer += decoder.decode(value, {stream: true})
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const chunk = OllamaStreamChunkSchema.parse(JSON.parse(line))

            if (chunk.message.content) {
              yield chunk.message.content
            }

            if (chunk.done) {
              return
            }
          } catch (e) {
            // Skip malformed chunks
            console.warn("Failed to parse Ollama chunk:", line)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private mapToOllamaRequest(request: CompletionRequest): OllamaChatRequest {
    const messages: OllamaChatMessage[] = request.messages.map(m => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }))

    return {
      model: request.model,
      messages,
      stream: true,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
        stop: request.stop,
      },
      keep_alive: this.config.keepAlive,
    }
  }

  private mapToCompletionResponse(data: OllamaChatResponse): CompletionResponse {
    return {
      id: `ollama-${Date.now()}`,
      content: data.message.content,
      model: data.model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      finishReason: data.done ? "stop" : "length",
      metadata: {
        totalDuration: data.total_duration,
        loadDuration: data.load_duration,
        evalDuration: data.eval_duration,
      },
    }
  }

  private async handleError(response: Response): Promise<never> {
    const body = await response.text()

    switch (response.status) {
      case 404:
        throw new ProviderError("invalid_request", "Model not found. Try: ollama pull <model>")
      case 500:
        throw new ProviderError("server", body || "Ollama server error")
      default:
        throw new ProviderError("unknown", `Ollama error: ${response.status}`)
    }
  }

  // Ollama-specific methods

  async pullModel(model: string, onProgress?: (progress: number) => void): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/pull`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name: model, stream: true}),
    })

    if (!response.ok) {
      throw new ProviderError("server", `Failed to pull model: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const {done, value} = await reader.read()
      if (done) break

      buffer += decoder.decode(value, {stream: true})
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.total && data.completed && onProgress) {
            onProgress(data.completed / data.total)
          }
        } catch {
          // Skip
        }
      }
    }

    // Invalidate model cache
    this.lastModelFetch = 0
  }

  async deleteModel(model: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/delete`, {
      method: "DELETE",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name: model}),
    })

    if (!response.ok) {
      throw new ProviderError("server", `Failed to delete model: ${response.status}`)
    }

    // Invalidate model cache
    this.lastModelFetch = 0
  }

  formatModelSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024)
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`
  }
}
```

### Connection Status Hook

```typescript
import {useState, useEffect} from "react"

interface OllamaStatus {
  connected: boolean
  checking: boolean
  modelCount: number
  error?: string
}

export function useOllamaStatus(baseUrl: string = "http://localhost:11434"): OllamaStatus {
  const [status, setStatus] = useState<OllamaStatus>({
    connected: false,
    checking: true,
    modelCount: 0,
  })

  useEffect(() => {
    let mounted = true

    const checkStatus = async () => {
      setStatus(s => ({...s, checking: true}))

      try {
        const response = await fetch(`${baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        })

        if (!mounted) return

        if (response.ok) {
          const data = await response.json()
          setStatus({
            connected: true,
            checking: false,
            modelCount: data.models?.length || 0,
          })
        } else {
          setStatus({
            connected: false,
            checking: false,
            modelCount: 0,
            error: `Server returned ${response.status}`,
          })
        }
      } catch (error) {
        if (!mounted) return
        setStatus({
          connected: false,
          checking: false,
          modelCount: 0,
          error: "Cannot connect to Ollama",
        })
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30s

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [baseUrl])

  return status
}
```

## UI Components

### OllamaSettings

```typescript
interface OllamaSettingsProps {
  config: OllamaConfig
  onChange: (config: OllamaConfig) => void
}

// Features:
// - Base URL input with validation
// - Connection status indicator (green/red dot)
// - Test connection button
// - Timeout slider
// - Keep alive duration selector
// - Link to Ollama installation docs
```

### OllamaModelManager

```typescript
interface OllamaModelManagerProps {
  onModelSelect?: (model: string) => void
}

// Features:
// - List installed models with size and family
// - Search/filter models
// - Pull new model (with progress bar)
// - Delete model (with confirmation)
// - View model details (parameters, template)
// - Link to Ollama model library
```

### OllamaModelCard

```typescript
interface OllamaModelCardProps {
  model: OllamaModelInfo
  onSelect?: () => void
  onDelete?: () => void
}

// Displays:
// - Model name
// - Parameter size (e.g., "7B")
// - Quantization (e.g., "Q4_0")
// - Size on disk
// - Model family icon
// - Last modified date
```

### ConnectionStatusBadge

```typescript
interface ConnectionStatusBadgeProps {
  provider: "ollama"
  showDetails?: boolean
}

// Shows:
// - Green/yellow/red indicator
// - "Connected" / "Connecting" / "Disconnected"
// - Model count when connected
// - Click to retry connection
```

## Acceptance Criteria

```gherkin
Feature: Ollama Local Models

Scenario: Connect to Ollama server
  Given Ollama is running on my machine
  When I go to provider settings
  And I select Ollama
  Then I should see a "Connected" status
  And I should see my installed models

Scenario: Use Ollama model in GPT
  Given I have connected to Ollama
  And I have llama3.2 installed
  When I create a new GPT
  And I select Ollama as the provider
  And I select llama3.2 as the model
  Then the GPT should use my local Ollama model

Scenario: Chat with local model
  Given I have a GPT using an Ollama model
  When I send a message
  Then the response should stream from my local Ollama
  And I should see performance metrics (tokens/sec)

Scenario: Handle Ollama not running
  Given Ollama is not running
  When I try to select Ollama as a provider
  Then I should see "Disconnected" status
  And I should see instructions to start Ollama
  And I should be able to retry the connection

Scenario: Pull new model
  Given I am on the Ollama settings page
  When I enter "mistral" in the pull model input
  And I click "Pull"
  Then I should see download progress
  And when complete the model should appear in my list

Scenario: Configure custom Ollama URL
  Given Ollama is running on a different machine
  When I change the base URL to "http://192.168.1.100:11434"
  And I click "Test Connection"
  Then I should connect to the remote Ollama server

Scenario: Use reasoning model with thinking output
  Given I have deepseek-r1 or qwq installed
  When I create a GPT using the reasoning model
  And I send a complex math or logic problem
  Then the response should include thinking content in <think> tags
  And the thinking should be displayed separately from the final answer
  And I should be able to collapse/expand the thinking section

Scenario: Toggle thinking mode on Qwen3
  Given I have qwen3 installed
  And thinking mode is enabled in settings
  When I send a message requiring reasoning
  Then the system prompt should include thinking mode instructions
  And the response should contain reasoning steps

Scenario: Use vision model with image
  Given I have gemma3:12b or another vision model installed
  When I create a GPT using the vision model
  And I attach an image to my message
  Then the image should be base64 encoded and sent to Ollama
  And I should receive a description or analysis of the image

Scenario: Detect vision model capabilities
  Given I am selecting an Ollama model
  When I view the model list
  Then vision-capable models should be marked with a vision indicator
  And non-vision models should not show image upload option

Scenario: Hardware-appropriate model suggestions
  Given Ollama is connected
  When I view available models
  Then models should indicate estimated VRAM requirements
  And models exceeding my available memory should show a warning
```

## Testing Requirements

| Test Type         | Coverage Target | Focus Areas                      |
| ----------------- | --------------- | -------------------------------- |
| Unit Tests        | 90%             | Response parsing, error handling |
| Integration Tests | 80%             | API calls (mocked), streaming    |
| E2E Tests         | Key flows       | Full conversation with Ollama    |

### Key Test Cases

1. **Connection handling**: Detect when Ollama is running/not running
2. **Model listing**: Parse model list correctly
3. **Streaming**: Handle streaming responses and metrics
4. **Timeout**: Long inference requests don't timeout incorrectly
5. **Model pull**: Progress updates work correctly
6. **Error messages**: Clear guidance when things fail

## CORS Configuration

**Important**: Browsers enforce CORS restrictions. To use Ollama from a web browser:

```bash
# Start Ollama with CORS enabled
OLLAMA_ORIGINS="*" ollama serve

# Or set specific origin
OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

For production, users should either:

1. Configure Ollama with the correct origin
2. Use the Tauri desktop app (RFC-012) which bypasses CORS
3. Use a proxy server

## Performance Considerations

### Local Inference Characteristics

| Factor           | Impact                             | Mitigation                       |
| ---------------- | ---------------------------------- | -------------------------------- |
| Model loading    | 5-30s first request                | Keep model loaded (`keep_alive`) |
| Token generation | 10-100 tok/s depending on hardware | Show progress indicator          |
| Memory usage     | 4-32GB depending on model          | Warn about model size            |
| GPU acceleration | 10x faster with GPU                | Detect and recommend             |

### Hardware Recommendations

Select models based on available VRAM (GPU memory) or system RAM for CPU-only inference:

| VRAM  | Recommended Models                           | Quantization   | Notes                                   |
| ----- | -------------------------------------------- | -------------- | --------------------------------------- |
| 4GB   | llama3.2:1b, phi4:q4_0                       | Q4_0, Q4_K_M   | Very limited, small models only         |
| 8GB   | llama3.2:3b, mistral:7b-q4, gemma3:4b        | Q4_K_M, Q5_K_M | Most 7B models with quantization        |
| 16GB  | llama3.3:70b-q4, deepseek-r1:14b, phi4       | Q4_K_M, Q5_K_M | Mid-size models, quantized large models |
| 24GB  | qwen3:32b, deepseek-r1:32b, gemma3:27b       | Q5_K_M, Q8_0   | Full precision medium models            |
| 48GB+ | llama3.3:70b, deepseek-r1:70b, mistral-large | FP16, Q8_0     | Large models at high precision          |

#### Quantization Quality Guide

| Quantization | Quality   | VRAM Usage | Speed   | Use Case                      |
| ------------ | --------- | ---------- | ------- | ----------------------------- |
| Q4_0         | Good      | Lowest     | Fastest | VRAM-constrained environments |
| Q4_K_M       | Better    | Low        | Fast    | **Recommended default**       |
| Q5_K_M       | Very Good | Medium     | Medium  | Quality priority              |
| Q8_0         | Excellent | High       | Slower  | Near full precision           |
| FP16         | Best      | Highest    | Varies  | Maximum quality, research     |

#### VRAM Estimation

```typescript
function estimateVRAMRequired(parameterBillions: number, quantization: string): number {
  const bitsPerParam: Record<string, number> = {
    Q4_0: 4.5,
    Q4_K_M: 4.8,
    Q5_K_M: 5.5,
    Q8_0: 8.5,
    FP16: 16,
  }
  const bits = bitsPerParam[quantization] || 4.8
  // Estimate: params * bits / 8 + ~20% overhead for KV cache
  return Math.ceil(((parameterBillions * bits) / 8) * 1.2)
}

// Examples:
// estimateVRAMRequired(7, "Q4_K_M")  → ~5 GB
// estimateVRAMRequired(70, "Q4_K_M") → ~47 GB
// estimateVRAMRequired(14, "FP16")   → ~34 GB
```

#### CPU-Only Inference

For systems without dedicated GPUs:

- Expect 5-20x slower inference compared to GPU
- System RAM requirements are similar to VRAM requirements
- Recommend Q4_K_M or Q4_0 quantization for acceptable speeds
- Models up to 7B parameters are practical for most systems

### UI Adaptations

1. **Longer timeouts**: Default 120s vs 30s for cloud providers
2. **Loading indicators**: Show "Loading model..." on first request
3. **Performance metrics**: Display tokens/sec, total duration
4. **Model recommendations**: Suggest appropriate models for hardware
5. **VRAM warnings**: Alert users when selected model may exceed available memory

## Future Enhancements

| Enhancement              | Description                                    | Target RFC |
| ------------------------ | ---------------------------------------------- | ---------- |
| Model recommendations UI | Auto-suggest models based on detected hardware | RFC-013    |
| Remote Ollama            | Easy setup for network Ollama instances        | RFC-013    |
| Embedding generation     | Use Ollama for local embeddings                | RFC-006    |
| MoE model optimization   | Better handling of Mixture-of-Experts models   | RFC-013    |
| Thinking mode UI         | Collapsible thinking output display            | RFC-013    |
| Model benchmarking       | Compare model performance on user's hardware   | RFC-013    |
