# Product Requirements Document: Local-First GPT Creation Platform

<!-- prettier-ignore-start -->

**Document Version:** 2.2
**Original Version:** 1.0 (May 3, 2025)
**Revision Date:** December 29, 2025
**Status:** Implementation-Ready
**Project:** GPT - Local-First AI Assistant Creation Platform

<!-- prettier-ignore-end -->

---

## Document Change Summary

This revision addresses critical gaps identified in PRD v1.0:

| Area | Issue | Resolution |
| --- | --- | --- |
| Storage Architecture | localStorage specified but unsuitable for complex data | IndexedDB with Dexie.js wrapper mandated |
| Security | No API key encryption strategy | Web Crypto API encryption with PBKDF2 key derivation |
| Prioritization | All features implicit "must-have" | MoSCoW prioritization applied |
| Acceptance Criteria | Missing or vague | Given-When-Then format for all requirements |
| AI Quality Metrics | Not defined | Specific LLM quality metrics added |
| Scope Boundaries | Implicit | Explicit out-of-scope section added |
| Data Models | Incomplete vs implementation | Aligned with Zod schemas + extensions |

### v2.1 Changes (December 29, 2025)

| Area | Issue | Resolution |
| --- | --- | --- |
| UI/UX - Settings Access | Settings only accessible from GPT editor | Global settings page with navbar access (FR-22) |
| UI/UX - Layout Consistency | Inconsistent page layouts (header, footer, wrappers) | Unified layout components (FR-23) |
| UI/UX - Visual Consistency | Mixed color systems, light/dark theme gaps | Design token unification (NFR-UX-2) |
| UI/UX - Feature Exposure | Implemented features hidden or not discoverable | All features must have UI entry points (NFR-UX-1) |

---

## 1. Executive Summary

### 1.1 Vision Statement

Create a powerful, user-friendly platform that enables technical users to create, customize, and use AI assistants (GPTs) with complete data sovereignty. The platform mirrors the capabilities of cloud-based GPT creation tools while keeping all data locally controlled, supporting multiple LLM providers, and providing seamless sharing and export options.

### 1.2 Problem Statement

**Current Pain Points:**

1. Cloud-based GPT platforms (ChatGPT, Claude) require sending sensitive data to third parties
2. Users lack control over conversation history and assistant configurations
3. No ability to use local/self-hosted models with the same UX as commercial platforms
4. Vendor lock-in prevents portability of assistant configurations
5. Enterprise users cannot meet data residency requirements with cloud solutions

**Target Solution:** A local-first platform where users own their data, choose their AI providers, and maintain full control over their assistant configurations.

### 1.3 Success Metrics

| Metric             | Target                                              | Measurement Method                      |
| ------------------ | --------------------------------------------------- | --------------------------------------- |
| Offline Capability | 100% core features work offline                     | Automated testing with network disabled |
| Data Sovereignty   | Zero data sent to non-user-selected endpoints       | Network traffic audit                   |
| UX Parity          | ≥4.0/5.0 user satisfaction vs ChatGPT               | User surveys (N≥50)                     |
| Response Latency   | <200ms for local operations                         | Performance monitoring                  |
| Storage Efficiency | <50MB for typical user (20 GPTs, 100 conversations) | Storage profiling                       |
| Provider Support   | ≥3 LLM providers integrated                         | Feature checklist                       |

### 1.4 Scope Boundaries

#### In Scope

- Web application (React SPA)
- Desktop application (Tauri - Phase 4)
- GPT creation, editing, and management
- Multi-provider LLM integration (OpenAI, Anthropic, Ollama)
- Knowledge base management (files, URLs, text)
- Tool integration via MCP protocol
- Local storage with optional sync
- Export/import functionality

#### Explicitly Out of Scope

- Mobile applications (future consideration)
- Server-side deployment / multi-tenant hosting
- Model fine-tuning
- AI agent marketplace
- Real-time collaboration (Phase 5+)
- Payment processing
- User authentication (local-first = no accounts)

---

## 2. Target Audience and User Personas

### 2.1 Primary User Profile

**Demographics:**

- Technically comfortable users (developer-adjacent)
- Familiar with AI platforms (ChatGPT, Claude, etc.)
- Comfortable managing API keys and configurations
- Privacy-conscious or enterprise-constrained

**Technical Requirements:**

- Modern browser (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- For desktop: macOS 11+, Ubuntu 20.04+, Windows 10+ (Phase 4)
- For local models: Ollama installation with sufficient hardware

### 2.2 User Personas

#### Maya - The Privacy-Conscious Researcher

| Attribute         | Detail                                                   |
| ----------------- | -------------------------------------------------------- |
| Role              | Academic researcher, data scientist                      |
| Primary Goal      | Use AI without exposing research data                    |
| Key Needs         | Knowledge base integration, domain-specific models       |
| Technical Comfort | High - manages own infrastructure                        |
| Success Criteria  | Can create research assistant with proprietary documents |

#### Tomas - The Indie Developer

| Attribute         | Detail                                                 |
| ----------------- | ------------------------------------------------------ |
| Role              | Solo developer, builds tools and apps                  |
| Primary Goal      | Create assistants for development workflows            |
| Key Needs         | API accessibility, tool integration, notebooks         |
| Technical Comfort | Very high - writes code daily                          |
| Success Criteria  | Can integrate GPT with development environment via MCP |

#### Lei - The AI Hobbyist

| Attribute         | Detail                                          |
| ----------------- | ----------------------------------------------- |
| Role              | Prompt engineer, community member               |
| Primary Goal      | Experiment and share assistant configurations   |
| Key Needs         | Multi-model support, easy export/import         |
| Technical Comfort | Medium - uses but doesn't build                 |
| Success Criteria  | Can export GPT and share with community members |

---

## 3. Functional Requirements

### 3.1 GPT Configuration Management

#### FR-1: Create GPT Configuration [MUST HAVE]

**Description:** Users can create new GPT configurations with custom personas.

**Acceptance Criteria:**

```gherkin
Given a user is on the GPT library page
When they click "Create New GPT"
Then they see a configuration form with:
  - Name field (required, 1-100 characters)
  - Description field (optional, 0-500 characters)
  - System prompt editor (required, supports markdown)
  - Model selector (defaults to user's preferred provider)

Given a user has filled required fields
When they click "Save"
Then the GPT is persisted to IndexedDB
And appears in the GPT library immediately
And a success notification is displayed
```

**Data Model (Zod Schema):**

```typescript
const GPTConfigurationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1),
  instructions: z.string().optional(),
  conversationStarters: z.array(z.string()).max(4).optional(),

  // Model configuration
  modelProvider: z.enum(["openai", "anthropic", "ollama", "azure"]),
  modelName: z.string(),
  modelSettings: z.object({
    temperature: z.number().min(0).max(2).default(1),
    topP: z.number().min(0).max(1).default(1),
    maxTokens: z.number().positive().optional(),
    presencePenalty: z.number().min(-2).max(2).default(0),
    frequencyPenalty: z.number().min(-2).max(2).default(0),
  }),

  // Features
  tools: z.array(MCPToolSchema).default([]),
  knowledge: GPTKnowledgeSchema.optional(),
  capabilities: CapabilitiesSchema,

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive().default(1),
  tags: z.array(z.string()).default([]),
  isArchived: z.boolean().default(false),
})
```

#### FR-2: Edit GPT Configuration [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user has an existing GPT
When they open it for editing
Then all current values are pre-populated
And changes are auto-saved after 2 seconds of inactivity
And a version history entry is created on explicit save

Given a user is editing a GPT
When another browser tab has the same GPT open
Then changes are synchronized within 500ms (same device)
```

#### FR-3: Duplicate GPT [SHOULD HAVE]

**Acceptance Criteria:**

```gherkin
Given a user has an existing GPT
When they select "Duplicate"
Then a new GPT is created with:
  - Name: "{original name} (Copy)"
  - All settings copied except id and timestamps
  - Knowledge base references copied (not files)
And the user is navigated to edit the duplicate
```

#### FR-4: Organize GPTs [SHOULD HAVE]

**Acceptance Criteria:**

```gherkin
Given a user has multiple GPTs
When they create a folder/collection
Then they can drag GPTs into the folder
And folders can be nested up to 3 levels
And folder state persists across sessions

Given a user has tagged GPTs
When they filter by tag
Then only matching GPTs are displayed
And filter state is preserved in URL for sharing
```

#### FR-5: Archive/Delete GPT [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user wants to remove a GPT
When they select "Archive"
Then the GPT is hidden from default view
And can be restored from "Archived" filter
And associated conversations are preserved

Given a user wants to permanently delete
When they select "Delete" on an archived GPT
Then a confirmation dialog appears with conversation count
And deletion is irreversible
And associated conversations are deleted
```

### 3.2 Knowledge Base Management

#### FR-6: Upload Knowledge Files [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user is configuring GPT knowledge
When they upload a file
Then the following formats are accepted:
  | Format | Max Size | Processing |
  | PDF    | 20MB     | Text extraction |
  | DOCX   | 10MB     | Text extraction |
  | TXT    | 5MB      | Direct use |
  | MD     | 5MB      | Direct use |
  | JSON   | 5MB      | Formatted display |
And files are stored in IndexedDB as blobs
And progress indicator shows upload status
And error messages are specific (format, size, corruption)

Given a file exceeds browser storage quota
When upload is attempted
Then user sees clear message with:
  - Current storage usage
  - File size
  - Suggestion to use desktop app or remove other files
```

#### FR-7: URL References [SHOULD HAVE]

**Acceptance Criteria:**

```gherkin
Given a user adds a URL reference
When the URL is valid and accessible
Then metadata is fetched (title, description, favicon)
And content is optionally cached locally
And last-fetched timestamp is displayed

Given a URL becomes inaccessible
When the GPT is used in chat
Then cached content is used if available
And a warning indicator shows stale status
```

#### FR-8: Text Snippets [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user creates a text snippet
When they provide name and content
Then the snippet is saved with character count
And can be edited inline
And supports markdown formatting
And maximum size is 100KB per snippet
```

### 3.3 Tool Integration (MCP)

#### FR-9: MCP Server Connection [SHOULD HAVE]

**Acceptance Criteria:**

```gherkin
Given a user configures an MCP server
When they provide server URL (SSE endpoint)
Then connection is tested automatically
And available tools are discovered and listed
And tool schemas are validated against JSON Schema

Given an MCP server requires authentication
When user provides credentials
Then credentials are encrypted before storage
And connection is retested with auth headers
```

#### FR-10: Custom Tool Definition [COULD HAVE]

**Acceptance Criteria:**

```gherkin
Given a user defines a custom tool
When they provide:
  - Name (alphanumeric, 1-50 chars)
  - Description (1-500 chars)
  - JSON Schema for parameters
  - Endpoint URL
Then the tool is validated syntactically
And a test interface allows manual invocation
And execution logs are captured
```

#### FR-11: Built-in Tools [SHOULD HAVE]

**Available Tools:**

| Tool             | Description                        | Priority |
| ---------------- | ---------------------------------- | -------- |
| Web Search       | Search via configurable provider   | SHOULD   |
| Code Execution   | Sandboxed JS/Python execution      | COULD    |
| Image Generation | Via DALL-E or Stable Diffusion API | COULD    |
| File Operations  | Read/write to designated folder    | COULD    |

### 3.4 Chat Interface

#### FR-12: Conversation Flow [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user starts a conversation
When they send a message
Then the message appears immediately in the UI
And a streaming response begins within 2 seconds
And response tokens are displayed as received
And tool calls are visualized with status indicators

Given a response includes code
When rendering completes
Then code blocks have syntax highlighting
And a "Copy" button is available
And language is auto-detected or specified
```

#### FR-13: File Attachments in Chat [SHOULD HAVE]

**Acceptance Criteria:**

```gherkin
Given a user attaches a file to a message
When the file is an image (PNG, JPG, GIF, WebP)
Then it is displayed inline as thumbnail
And sent to vision-capable models appropriately

Given a user attaches a document
When sending the message
Then document content is extracted
And included in context with source attribution
```

#### FR-14: Conversation Management [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user has conversations
When they view conversation list
Then conversations are sorted by last activity
And show title (auto-generated or user-set)
And show message count and last message preview

Given a user searches conversations
When they enter search terms
Then full-text search is performed on messages
And results highlight matching terms
And search is performed locally (no network)
```

#### FR-15: Export Conversation [SHOULD HAVE]

**Acceptance Criteria:**

```gherkin
Given a user exports a conversation
When they select format
Then the following formats are available:
  | Format   | Content |
  | Markdown | Messages with formatting preserved |
  | JSON     | Full conversation with metadata |
  | PDF      | Formatted document (desktop only) |
And file is downloaded to user's device
```

### 3.5 Multi-Model Support

#### FR-16: Provider Configuration [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user configures a provider
When they enter API key for:
  | Provider  | Validation |
  | OpenAI    | Test API call to /models |
  | Anthropic | Test API call to /messages |
  | Azure     | Test with provided endpoint |
  | Ollama    | Connection test to local server |
Then key is encrypted using Web Crypto API
And stored in IndexedDB (never localStorage)
And validation result is displayed immediately

Given an API key is invalid
When validation fails
Then specific error is shown (auth, quota, network)
And key is not persisted
```

#### FR-17: Model Selection [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user selects a provider
When configuring a GPT
Then available models for that provider are listed
And model capabilities are indicated:
  - Context window size
  - Vision support
  - Tool/function calling support
  - Pricing tier (if applicable)
And user can set default model per provider
```

#### FR-18: Ollama Integration [SHOULD HAVE]

**Acceptance Criteria:**

```gherkin
Given Ollama is running locally
When user configures Ollama provider
Then available local models are listed
And model details show:
  - Parameter count
  - Quantization level
  - VRAM requirements
And pull progress is shown for downloading models

Given Ollama is not running
When user attempts to use Ollama model
Then clear error message is displayed
And instructions to start Ollama are provided
```

### 3.6 Data Portability

#### FR-19: Export GPT Configuration [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user exports a GPT
When they select export format
Then the following options are available:
  | Format | Content | Use Case |
  | Native JSON | Full config + knowledge refs | Backup/transfer |
  | OpenAI-compatible | Mapped to GPT Builder format | Platform migration |
  | Minimal JSON | Config only, no knowledge | Sharing templates |
And exported file includes version for migration

Given a GPT has large knowledge base
When exporting with "Include Files" option
Then files are bundled in ZIP archive
And total export size is shown before download
```

#### FR-20: Import GPT Configuration [MUST HAVE]

**Acceptance Criteria:**

```gherkin
Given a user imports a GPT file
When file is valid
Then preview shows:
  - GPT name and description
  - Included knowledge items
  - Required provider/model
  - Potential conflicts with existing GPTs
And user can rename before importing

Given imported GPT references unavailable model
When import completes
Then warning is displayed
And user is prompted to select alternative model
```

#### FR-21: Bulk Operations [COULD HAVE]

**Acceptance Criteria:**

```gherkin
Given a user selects multiple GPTs
When they choose "Export Selected"
Then a single archive is created
And includes manifest of contents

Given a user imports an archive
When archive contains multiple GPTs
Then each is imported with conflict detection
And import report shows success/failure per item
```

### 3.7 UI/UX Requirements

#### FR-22: Global Settings Page [MUST HAVE]

**Description:** Users can access and configure all application settings from a dedicated, globally accessible page.

**Acceptance Criteria:**

```gherkin
Given a user wants to configure API providers
When they click the Settings icon in the navbar
Then they are navigated to /settings
And they see organized sections for:
  - AI Providers (OpenAI, Anthropic, Ollama, Azure)
  - Integrations (MCP servers and tools)
  - Appearance (Theme, reduced motion preferences)
  - Data (Link to Backup/Restore, storage usage)

Given a user has not configured any providers
When they visit the home page
Then they see a prompt to configure settings
And a clear call-to-action links to /settings

Given settings are changed
When the user navigates away
Then changes are auto-saved
And a success indicator confirms the save
```

**Technical Considerations:**

- Settings icon (Cog/Gear) added to Navbar component
- New route `/settings` in App.tsx
- Tab-based or accordion layout for settings categories
- Settings state persisted to IndexedDB via existing storage service

#### FR-23: Consistent Page Layout [SHOULD HAVE]

**Description:** All pages use consistent layout patterns with proper semantic HTML and unified styling.

**Acceptance Criteria:**

```gherkin
Given a user navigates to any page in the application
When the page loads
Then the navbar is visible and consistent
And the footer is visible (where appropriate)
And the main content uses semantic <main> landmark
And page height calculations are consistent

Given the application uses layout components
When a new page is created
Then developers use one of:
  - DefaultLayout: Standard container with padding
  - FullHeightLayout: Full viewport minus header (for editors)
  - SidebarLayout: With collapsible sidebar navigation

Given a user with assistive technology
When they navigate the application
Then ARIA landmarks are properly applied
And heading hierarchy is correct (h1, h2, h3)
And focus management follows logical order
```

**Technical Considerations:**

- Create reusable layout components in `src/components/layouts/`
- Standardize CSS variable usage (`--header-height`, `--footer-height`)
- Migrate route wrappers in App.tsx to use layout components
- Ensure all pages use `<main>` as primary content landmark

#### FR-24: Feature Discoverability [SHOULD HAVE]

**Description:** All implemented features have discoverable UI entry points accessible within 2 clicks from the home page.

**Acceptance Criteria:**

```gherkin
Given the following features are implemented
When a user explores the application
Then each feature is accessible:
  | Feature | Entry Point | Max Clicks |
  | Settings | Navbar icon | 1 |
  | Backup/Restore | Navbar + Settings | 2 |
  | Conversation Search | Home page or GPT test page | 1 |
  | Version History | GPT card menu or editor | 2 |
  | Theme Toggle | Navbar | 1 |
  | Folder Organization | Home page sidebar | 1 |
  | Export/Import GPT | GPT card menu | 2 |

Given a user is new to the application
When they visit for the first time
Then key features are visually highlighted or hinted
And empty states provide guidance on next actions
```

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Requirement             | Target                            | Priority |
| ----------------------- | --------------------------------- | -------- |
| Initial page load       | <3s on 4G connection              | MUST     |
| Time to interactive     | <5s on 4G connection              | MUST     |
| Local operation latency | <100ms                            | MUST     |
| IndexedDB query time    | <50ms for typical queries         | SHOULD   |
| Memory usage            | <500MB with 10 open conversations | SHOULD   |
| Bundle size             | <2MB initial, <5MB total          | SHOULD   |

### 4.2 Security

| Requirement            | Implementation                     | Priority |
| ---------------------- | ---------------------------------- | -------- |
| API key encryption     | AES-GCM via Web Crypto API         | MUST     |
| Key derivation         | PBKDF2 with user passphrase        | MUST     |
| No plaintext secrets   | Keys never in localStorage or logs | MUST     |
| CSP headers            | Strict Content Security Policy     | MUST     |
| Subresource integrity  | SRI for all external scripts       | SHOULD   |
| Tool execution sandbox | Isolated iframe for code execution | SHOULD   |

### 4.3 Reliability

| Requirement            | Target                               | Priority |
| ---------------------- | ------------------------------------ | -------- |
| Offline capability     | 100% core features                   | MUST     |
| Data durability        | Zero data loss on crash/close        | MUST     |
| Auto-save frequency    | Every 2 seconds during edits         | MUST     |
| Error recovery         | Graceful degradation on API failures | MUST     |
| Storage quota handling | Clear warnings before quota exceeded | SHOULD   |

### 4.4 Accessibility

| Requirement           | Standard                       | Priority |
| --------------------- | ------------------------------ | -------- |
| WCAG compliance       | Level AA                       | MUST     |
| Keyboard navigation   | Full app navigable             | MUST     |
| Screen reader support | Semantic HTML + ARIA           | MUST     |
| Color contrast        | 4.5:1 minimum                  | MUST     |
| Focus indicators      | Visible focus rings            | MUST     |
| Reduced motion        | Respect prefers-reduced-motion | SHOULD   |

### 4.5 UI/UX Quality

| Requirement                        | Target                                              | Priority |
| ---------------------------------- | --------------------------------------------------- | -------- |
| Feature discoverability (NFR-UX-1) | All features reachable in ≤2 clicks from home       | MUST     |
| Visual consistency (NFR-UX-2)      | 100% components use semantic design tokens          | SHOULD   |
| Settings accessibility             | Global settings accessible from any page via navbar | MUST     |
| Layout consistency                 | All pages use standardized layout components        | SHOULD   |
| Theme parity                       | Light and dark themes visually equivalent           | SHOULD   |
| Empty state guidance               | All empty states provide next-action hints          | SHOULD   |
| Navigation clarity                 | Current location always visible in UI               | MUST     |

### 4.6 AI/LLM-Specific Quality Metrics

| Metric              | Target                                  | Measurement           |
| ------------------- | --------------------------------------- | --------------------- |
| Response accuracy   | User satisfaction ≥4/5                  | In-app feedback       |
| Context utilization | Knowledge base referenced when relevant | Manual audit          |
| Tool reliability    | 95% successful tool executions          | Error logging         |
| Streaming stability | <1% dropped connections                 | Connection monitoring |
| Token efficiency    | Optimal context window usage            | Token counting        |

---

## 5. Technical Architecture

### 5.1 Storage Architecture

#### Web Platform (Primary)

```
┌─────────────────────────────────────────────────────────────┐
│                      IndexedDB (Dexie.js)                   │
├─────────────────┬─────────────────┬─────────────────────────┤
│ GPT Configs     │ Conversations   │ Knowledge Files         │
│ (structured)    │ (structured)    │ (blobs)                 │
├─────────────────┴─────────────────┴─────────────────────────┤
│                    Encrypted Secrets Store                   │
│              (API keys, auth tokens - AES-GCM)              │
└─────────────────────────────────────────────────────────────┘
```

**IndexedDB Schema:**

```typescript
// Dexie.js database definition
class GPTDatabase extends Dexie {
  gpts!: Table<GPTConfiguration>
  conversations!: Table<Conversation>
  messages!: Table<Message>
  knowledgeFiles!: Table<KnowledgeFile>
  secrets!: Table<EncryptedSecret>
  settings!: Table<UserSetting>

  constructor() {
    super("gpt-platform")
    this.version(1).stores({
      gpts: "id, name, createdAt, updatedAt, *tags",
      conversations: "id, gptId, updatedAt, *tags",
      messages: "id, conversationId, timestamp",
      knowledgeFiles: "id, gptId, name, mimeType",
      secrets: "id, provider",
      settings: "key",
    })
  }
}
```

#### Desktop Platform (Tauri - Phase 4)

```
┌─────────────────────────────────────────────────────────────┐
│                    SQLite (Primary Store)                    │
├─────────────────────────────────────────────────────────────┤
│                    OS Keychain (Secrets)                     │
├─────────────────────────────────────────────────────────────┤
│                  Filesystem (Knowledge Files)                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Security Architecture

#### API Key Encryption Flow

```
User Passphrase
       │
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   PBKDF2     │───▶│  AES-GCM     │───▶│  IndexedDB   │
│ (100k iter)  │    │  Encryption  │    │  (encrypted) │
└──────────────┘    └──────────────┘    └──────────────┘
       │
       ▼
  Session Key (memory only, cleared on tab close)
```

**Implementation Notes:**

- Passphrase never stored; derived key kept in memory only
- Each secret has unique IV (initialization vector)
- Re-encryption required on passphrase change
- Session timeout configurable (default: 30 minutes)

### 5.3 Provider Abstraction Layer

```typescript
interface LLMProvider {
  id: string
  name: string

  // Configuration
  validateCredentials: (config: ProviderConfig) => Promise<ValidationResult>
  listModels: () => Promise<Model[]>

  // Operations
  createCompletion: (request: CompletionRequest) => AsyncIterable<CompletionChunk>
  createEmbedding?: (text: string) => Promise<number[]>

  // Capabilities
  supportsVision: boolean
  supportsTools: boolean
  supportsStreaming: boolean
}
```

### 5.4 Sync Architecture (Phase 4+)

**Strategy:** CRDTs via Yjs for conflict-free synchronization

```
Device A                    Device B
   │                           │
   ▼                           ▼
┌──────┐                   ┌──────┐
│ Yjs  │◄─────────────────▶│ Yjs  │
│ Doc  │   WebRTC / Relay  │ Doc  │
└──────┘                   └──────┘
   │                           │
   ▼                           ▼
IndexedDB                  IndexedDB
```

---

## 6. Development Phases

### Phase 1: Core Platform [Months 1-3] - MUST HAVE

| Deliverable                           | Status         | Dependencies |
| ------------------------------------- | -------------- | ------------ |
| IndexedDB storage layer with Dexie.js | 🔄 Partial     | None         |
| GPT CRUD operations                   | ✅ Complete    | Storage      |
| OpenAI provider integration           | ✅ Complete    | None         |
| Basic chat interface with streaming   | ✅ Complete    | Provider     |
| API key encryption                    | ❌ Not started | Web Crypto   |
| System prompt editor                  | ✅ Complete    | None         |

**Milestone 1 Criteria:**

- [x] Create, edit, delete GPT configurations
- [ ] Encrypted API key storage
- [x] Basic chat with OpenAI streaming
- [x] Data persists across sessions
- [ ] Works fully offline after initial load

### Phase 2: Enhanced Features [Months 4-6] - SHOULD HAVE

| Deliverable                        | Status         | Dependencies         |
| ---------------------------------- | -------------- | -------------------- |
| Knowledge base (files, URLs, text) | 🔄 Partial     | IndexedDB blobs      |
| Anthropic provider                 | ❌ Not started | Provider abstraction |
| Export/import functionality        | ❌ Not started | Serialization        |
| Conversation search                | ❌ Not started | IndexedDB indexing   |
| Tool integration framework         | 🔄 Partial     | MCP client           |

**Milestone 2 Criteria:**

- [ ] Upload and use knowledge files
- [ ] Multiple provider support
- [ ] Export/import GPT configurations
- [ ] Full-text conversation search
- [ ] Basic MCP tool integration

### Phase 3: Advanced Capabilities [Months 7-9] - SHOULD/COULD HAVE

| Deliverable                | Status         | Dependencies           |
| -------------------------- | -------------- | ---------------------- |
| Ollama integration         | ❌ Not started | Local network access   |
| Full MCP server support    | ❌ Not started | MCP specification      |
| Interactive notebook       | ❌ Not started | Code execution sandbox |
| Advanced tool capabilities | ❌ Not started | Tool framework         |
| Performance optimization   | ❌ Not started | Profiling              |

**Milestone 3 Criteria:**

- [ ] Use local models via Ollama
- [ ] Connect to MCP servers
- [ ] Execute code in sandbox
- [ ] <100ms local operation latency

### Phase 4: Desktop and Sync [Months 10-12] - COULD HAVE

| Deliverable               | Status         | Dependencies        |
| ------------------------- | -------------- | ------------------- |
| Tauri desktop application | ❌ Not started | Rust toolchain      |
| OS keychain integration   | ❌ Not started | Tauri plugins       |
| SQLite storage            | ❌ Not started | Tauri plugins       |
| P2P sync via Yjs          | ❌ Not started | CRDT implementation |
| Filesystem knowledge base | ❌ Not started | Tauri fs access     |

**Milestone 4 Criteria:**

- [ ] Native app for macOS and Linux
- [ ] Sync between web and desktop
- [ ] Large knowledge bases via filesystem
- [ ] OS-level security for secrets

---

## 7. Risks and Mitigations

| Risk                           | Probability | Impact | Mitigation                                             |
| ------------------------------ | ----------- | ------ | ------------------------------------------------------ |
| Browser storage quota exceeded | Medium      | High   | Clear warnings, desktop fallback, cloud storage option |
| API provider rate limits       | Medium      | Medium | Retry logic, user-visible quota tracking               |
| MCP specification changes      | Low         | Medium | Version pinning, abstraction layer                     |
| IndexedDB corruption           | Low         | High   | Export backups, integrity checks on load               |
| WebCrypto API limitations      | Low         | Medium | Fallback to session-only storage                       |
| Ollama compatibility issues    | Medium      | Low    | Version detection, compatibility matrix                |

---

## 8. Assumptions and Dependencies

### Assumptions

1. Users have modern browsers with IndexedDB and Web Crypto API support
2. Users can obtain their own API keys from LLM providers
3. For local models, users can install and run Ollama independently
4. Network is available for initial load and API calls (not for local operations)

### External Dependencies

| Dependency    | Version | Purpose           | Fallback             |
| ------------- | ------- | ----------------- | -------------------- |
| Dexie.js      | ^4.0    | IndexedDB wrapper | Direct IndexedDB API |
| OpenAI SDK    | ^4.0    | API client        | Fetch-based client   |
| Anthropic SDK | ^0.20   | API client        | Fetch-based client   |
| Yjs           | ^13.0   | CRDT sync         | Manual export/import |
| Tauri         | ^2.0    | Desktop runtime   | Web-only deployment  |

---

## 9. Quality Assessment

### Original PRD (v1.0) Scores

| Dimension    | Score | Notes                                                         |
| ------------ | ----- | ------------------------------------------------------------- |
| Completeness | 6/10  | Missing acceptance criteria, security details, prioritization |
| Clarity      | 7/10  | Good structure but vague requirements                         |
| Feasibility  | 7/10  | Realistic but lacked technical specificity                    |
| User-Focus   | 8/10  | Strong personas and workflows                                 |

### Improved PRD (v2.0) Scores

| Dimension    | Score | Notes                                                            |
| ------------ | ----- | ---------------------------------------------------------------- |
| Completeness | 9/10  | Comprehensive with acceptance criteria, security, prioritization |
| Clarity      | 9/10  | Given-When-Then format, explicit scope boundaries                |
| Feasibility  | 8/10  | Specific technical architecture, realistic phases                |
| User-Focus   | 8/10  | Maintained persona focus, added metrics                          |

### PRD (v2.1) Scores

| Dimension    | Score  | Notes                                                         |
| ------------ | ------ | ------------------------------------------------------------- |
| Completeness | 9/10   | UI/UX requirements fill remaining gaps in user experience     |
| Clarity      | 9/10   | Maintained Given-When-Then format for new requirements        |
| Feasibility  | 8.5/10 | Practical UI/UX requirements with clear implementation path   |
| User-Focus   | 9/10   | Addresses user pain points (settings access, discoverability) |

---

## 10. Appendix

### A. Glossary

| Term        | Definition                                                            |
| ----------- | --------------------------------------------------------------------- |
| GPT         | Generative Pre-trained Transformer; custom AI assistant configuration |
| MCP         | Model Context Protocol; standard for LLM tool integration             |
| Local-first | Architecture prioritizing local data storage and offline capability   |
| Ollama      | Tool for running LLMs locally on consumer hardware                    |
| CRDT        | Conflict-free Replicated Data Type; enables sync without conflicts    |
| IndexedDB   | Browser API for structured client-side storage                        |
| Dexie.js    | Wrapper library providing cleaner IndexedDB API                       |
| Yjs         | CRDT library for real-time collaboration                              |

### B. Related Documents

- [AGENTS.md](../AGENTS.md) - Development guidelines and conventions
- [Overview](./overview.md) - Project overview
- [Design System](./design-system.md) - UI component guidelines

### C. Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| 1.0 | 2025-05-03 | Original | Initial PRD |
| 2.0 | 2025-12-19 | AI Review | Gap analysis, prioritization, acceptance criteria, security details |
| 2.1 | 2025-12-29 | AI Review | UI/UX requirements (FR-22-24), settings access, layout consistency, visual consistency (NFR-UX-1/2) |
| 2.2 | 2025-12-29 | AI Review | Fix section numbering (4.5→4.6), add v2.1 quality scores, sync Phase 1 milestone checkboxes |
