# RFCs Master Index

**Version:** 1.0 **Created:** December 20, 2025 **Source:** PRD v2.0, Features List v1.0

---

## Overview

This document serves as the master index for all Request for Comments (RFC) documents for the Local-First GPT Creation Platform. RFCs are organized in **strict sequential implementation order** - each RFC must be fully completed before the next one begins.

## Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: FOUNDATION                              │
│  RFC-001 (Storage) ──► RFC-002 (Security)                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHASE 1: CORE COMPLETION                           │
│  RFC-003 (Provider Abstraction) ──► RFC-004 (GPT Management)            │
│                                           │                             │
│                                           ▼                             │
│                               RFC-005 (Conversations)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: ENHANCED FEATURES                         │
│  RFC-006 (Knowledge Base) ──► RFC-007 (Export/Import)                   │
│                                           │                             │
│                                           ▼                             │
│  RFC-008 (Anthropic) ──► RFC-009 (MCP Tools)                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   PHASE 3-4: ADVANCED CAPABILITIES                      │
│  RFC-010 (Ollama) ──► RFC-011 (Advanced Tools) ──► RFC-012 (Desktop)    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## RFC Summary Table

| RFC ID  | Title                          | Priority | Complexity | Phase | Status    |
| ------- | ------------------------------ | -------- | ---------- | ----- | --------- |
| RFC-001 | IndexedDB Storage Foundation   | MUST     | High       | 1     | Completed |
| RFC-002 | Security Infrastructure        | MUST     | High       | 1     | Completed |
| RFC-003 | Provider Abstraction Layer     | MUST     | Medium     | 1     | Completed |
| RFC-004 | GPT Configuration Management   | MUST     | Medium     | 1     | Pending   |
| RFC-005 | Conversation Management        | MUST     | Medium     | 1     | Pending   |
| RFC-006 | Knowledge Base Enhancement     | SHOULD   | High       | 2     | Pending   |
| RFC-007 | Export/Import System           | MUST     | Medium     | 2     | Pending   |
| RFC-008 | Anthropic Provider Integration | SHOULD   | Medium     | 2     | Pending   |
| RFC-009 | MCP Tool Integration           | SHOULD   | High       | 2     | Pending   |
| RFC-010 | Ollama Local Models            | SHOULD   | Medium     | 3     | Pending   |
| RFC-011 | Advanced Tools & Sandbox       | COULD    | High       | 3     | Pending   |
| RFC-012 | Tauri Desktop Application      | COULD    | High       | 4     | Pending   |

---

## Dependency Graph

```
RFC-001 (Storage)
    │
    ├──► RFC-002 (Security)
    │        │
    │        ├──► RFC-003 (Provider Abstraction)
    │        │        │
    │        │        ├──► RFC-008 (Anthropic)
    │        │        │        │
    │        │        │        └──► RFC-010 (Ollama)
    │        │        │
    │        │        └──► RFC-005 (Conversations)
    │        │
    │        └──► RFC-009 (MCP Tools)
    │                 │
    │                 └──► RFC-011 (Advanced Tools)
    │
    ├──► RFC-004 (GPT Management)
    │        │
    │        └──► RFC-007 (Export/Import)
    │
    ├──► RFC-006 (Knowledge Base)
    │
    └──► RFC-012 (Desktop App)
```

---

## RFC Details

### RFC-001: IndexedDB Storage Foundation

- **Builds Upon:** None (foundation)
- **Required By:** All other RFCs
- **Features Covered:** F-701
- **Description:** Migrate from localStorage to IndexedDB with Dexie.js wrapper for structured data persistence.

### RFC-002: Security Infrastructure

- **Builds Upon:** RFC-001
- **Required By:** RFC-003, RFC-009
- **Features Covered:** F-702, F-703, F-705, F-706
- **Description:** Implement API key encryption, CSP headers, SRI, and session management.

### RFC-003: Provider Abstraction Layer

- **Builds Upon:** RFC-002
- **Required By:** RFC-005, RFC-008, RFC-010
- **Features Covered:** F-501, F-502, F-504
- **Description:** Create unified provider interface, refactor OpenAI implementation to use it.

### RFC-004: GPT Configuration Management

- **Builds Upon:** RFC-001
- **Required By:** RFC-007
- **Features Covered:** F-101, F-102, F-103, F-104, F-105, F-106, F-107
- **Description:** Complete GPT CRUD operations including archive, organize, and version history.

### RFC-005: Conversation Management

- **Builds Upon:** RFC-003
- **Required By:** None
- **Features Covered:** F-401, F-402, F-403, F-404, F-405, F-406, F-407
- **Description:** Enhance chat interface with search, export, edit/regenerate, and starters.

### RFC-006: Knowledge Base Enhancement

- **Builds Upon:** RFC-001
- **Required By:** None
- **Features Covered:** F-201, F-202, F-203, F-204
- **Description:** Improve file upload, URL references, text snippets, and organization.

### RFC-007: Export/Import System

- **Builds Upon:** RFC-004
- **Required By:** None
- **Features Covered:** F-601, F-602, F-603, F-604
- **Description:** GPT configuration portability with multiple formats and backup/restore.

### RFC-008: Anthropic Provider Integration

- **Builds Upon:** RFC-003
- **Required By:** RFC-010
- **Features Covered:** Part of F-501
- **Description:** Implement Anthropic Claude provider using the abstraction layer.

### RFC-009: MCP Tool Integration

- **Builds Upon:** RFC-002
- **Required By:** RFC-011
- **Features Covered:** F-301, F-302, F-303
- **Description:** MCP server connection, tool discovery, and execution visualization.

### RFC-010: Ollama Local Models

- **Builds Upon:** RFC-008
- **Required By:** None
- **Features Covered:** F-503
- **Description:** Integration with locally-running Ollama for private model usage.

### RFC-011: Advanced Tools & Sandbox

- **Builds Upon:** RFC-009
- **Required By:** None
- **Features Covered:** F-304, F-305, F-306, F-704
- **Description:** Custom tool definitions, web search, and code execution sandbox.

### RFC-012: Tauri Desktop Application

- **Builds Upon:** RFC-001 (all Phase 1-3 features recommended)
- **Required By:** None
- **Features Covered:** F-1001, F-1002, F-1003, F-1004, F-1102
- **Description:** Native desktop wrapper with OS integration and enhanced capabilities.

---

## Implementation Guidelines

### Sequential Execution

1. RFCs MUST be implemented in numerical order (001 → 002 → 003 → ...)
2. An RFC is considered complete only when all acceptance criteria pass
3. No RFC may begin until its dependencies are fully complete
4. If blocking issues are found, stop and resolve before continuing

### Quality Gates

Each RFC completion requires:

- [ ] All acceptance criteria verified
- [ ] Unit tests passing (80%+ coverage)
- [ ] E2E tests for critical paths
- [ ] Accessibility audit passing
- [ ] Performance within targets
- [ ] Code review approved

### Documentation

- Update this index when RFC status changes
- Document any deviations from original RFC in implementation notes
- Link to relevant PRs in RFC status updates

---

## Related Documents

- [PRD v2.0](../docs/prd.md) - Full product requirements
- [Features List](../docs/features.md) - Detailed feature breakdown
- [RULES.md](../docs/RULES.md) - Development guidelines
