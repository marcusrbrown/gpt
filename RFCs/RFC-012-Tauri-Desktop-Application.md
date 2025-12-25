# RFC-012: Tauri Desktop Application

| Field            | Value                                   |
| ---------------- | --------------------------------------- |
| **Status**       | Pending                                 |
| **Priority**     | COULD                                   |
| **Complexity**   | Very High                               |
| **Effort**       | 6 weeks                                 |
| **Dependencies** | RFC-001 through RFC-005 (Core Platform) |

## Summary

Package the GPT Creation Platform as a native desktop application using Tauri. This enables enhanced security through OS keychain integration, improved performance with optional SQLite storage, and direct filesystem access for knowledge base management. The desktop app maintains full compatibility with the web version while adding platform-native features.

## Prerequisites

| Prerequisite                 | RFC     | Status    |
| ---------------------------- | ------- | --------- |
| IndexedDB Storage Foundation | RFC-001 | Completed |
| Security Infrastructure      | RFC-002 | Completed |
| Provider Abstraction Layer   | RFC-003 | Completed |
| GPT Configuration Management | RFC-004 | Completed |
| Conversation Management      | RFC-005 | Pending   |

## Features Addressed

| Feature ID | Feature Name                | Coverage |
| ---------- | --------------------------- | -------- |
| F-1001     | Desktop Wrapper             | Full     |
| F-1002     | System Keychain Integration | Full     |
| F-1003     | SQLite Backend Option       | Full     |
| F-1004     | Filesystem Knowledge Base   | Full     |

## Technical Specification

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Tauri Application                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   React Frontend                         │   │
│  │  (Existing web app - minimal changes)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                    Tauri IPC Bridge                              │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Rust Backend                          │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────────────┐  │   │
│  │  │ Keychain  │ │  SQLite   │ │   Filesystem Access   │  │   │
│  │  │  Service  │ │  Service  │ │       Service         │  │   │
│  │  └───────────┘ └───────────┘ └───────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Operating System                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────────────────────────┐ │
│  │  Keychain │ │  SQLite   │ │      User Filesystem          │ │
│  │  (native) │ │   (file)  │ │                               │ │
│  └───────────┘ └───────────┘ └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Tauri Configuration

```json
// tauri.conf.json
{
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "GPT Creator",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "dialog": {
        "all": false,
        "open": true,
        "save": true
      },
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "readDir": true,
        "createDir": true,
        "removeFile": true,
        "scope": ["$APPDATA/**", "$DOCUMENT/**", "$DOWNLOAD/**"]
      },
      "path": {
        "all": true
      },
      "os": {
        "all": true
      },
      "notification": {
        "all": true
      },
      "globalShortcut": {
        "all": true
      },
      "clipboard": {
        "all": true
      }
    },
    "bundle": {
      "active": true,
      "category": "Productivity",
      "copyright": "© 2025 GPT Creator",
      "deb": {
        "depends": []
      },
      "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"],
      "identifier": "com.gptcreator.app",
      "longDescription": "A local-first platform for creating and customizing AI assistants",
      "macOS": {
        "entitlements": "./entitlements.plist",
        "exceptionDomain": "",
        "frameworks": [],
        "providerShortName": null,
        "signingIdentity": null
      },
      "resources": [],
      "shortDescription": "GPT Creator",
      "targets": "all",
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    },
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com https://api.anthropic.com http://localhost:11434"
    },
    "systemTray": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true,
      "menuOnLeftClick": false
    },
    "updater": {
      "active": true,
      "endpoints": ["https://releases.gptcreator.app/{{target}}/{{current_version}}"],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 800,
        "resizable": true,
        "title": "GPT Creator",
        "width": 1200,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

### Zod Schemas (Frontend Types)

```typescript
import {z} from "zod"

// Desktop-specific configuration
export const DesktopConfigSchema = z.object({
  storageBackend: z.enum(["indexeddb", "sqlite"]).default("indexeddb"),
  useSystemKeychain: z.boolean().default(true),
  knowledgeBasePath: z.string().optional(), // Custom KB directory
  autoUpdate: z.boolean().default(true),
  minimizeToTray: z.boolean().default(true),
  launchAtStartup: z.boolean().default(false),
  globalShortcuts: z
    .object({
      toggleWindow: z.string().default("CommandOrControl+Shift+G"),
      newChat: z.string().default("CommandOrControl+N"),
    })
    .default({}),
})

// Keychain entry
export const KeychainEntrySchema = z.object({
  service: z.string(),
  account: z.string(),
  // Value is never exposed to frontend - only set/delete operations
})

// Filesystem knowledge source
export const FilesystemKnowledgeSourceSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("filesystem"),
  path: z.string(), // Absolute path to file or directory
  isDirectory: z.boolean(),
  recursive: z.boolean().default(false), // For directories
  includePatterns: z.array(z.string()).default(["**/*"]),
  excludePatterns: z.array(z.string()).default(["**/node_modules/**", "**/.git/**"]),
  lastSyncedAt: z.string().datetime().optional(),
  fileCount: z.number().optional(),
  totalSizeBytes: z.number().optional(),
})

// File watcher event
export const FileWatchEventSchema = z.object({
  type: z.enum(["create", "modify", "delete", "rename"]),
  path: z.string(),
  timestamp: z.string().datetime(),
})

// SQLite sync status
export const SQLiteSyncStatusSchema = z.object({
  enabled: z.boolean(),
  dbPath: z.string().optional(),
  lastSyncAt: z.string().datetime().optional(),
  pendingChanges: z.number().default(0),
  syncInProgress: z.boolean().default(false),
})

// Type exports
export type DesktopConfig = z.infer<typeof DesktopConfigSchema>
export type FilesystemKnowledgeSource = z.infer<typeof FilesystemKnowledgeSourceSchema>
export type FileWatchEvent = z.infer<typeof FileWatchEventSchema>
export type SQLiteSyncStatus = z.infer<typeof SQLiteSyncStatusSchema>
```

### Rust Backend Commands

```rust
// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod keychain;
mod sqlite;
mod filesystem;
mod updater;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize services
            let handle = app.handle();

            // Set up system tray
            #[cfg(desktop)]
            {
                use tauri::SystemTray;
                let tray = SystemTray::new();
                app.manage(tray);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Keychain commands
            keychain::store_secret,
            keychain::get_secret,
            keychain::delete_secret,
            keychain::has_secret,

            // SQLite commands
            sqlite::init_database,
            sqlite::sync_from_indexeddb,
            sqlite::sync_to_indexeddb,
            sqlite::query,
            sqlite::execute,

            // Filesystem commands
            filesystem::read_directory,
            filesystem::read_file,
            filesystem::write_file,
            filesystem::watch_directory,
            filesystem::unwatch_directory,
            filesystem::get_file_metadata,

            // Updater commands
            updater::check_for_updates,
            updater::install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Keychain Service (Rust)

```rust
// src-tauri/src/keychain.rs
use keyring::Entry;
use serde::{Deserialize, Serialize};

const SERVICE_NAME: &str = "com.gptcreator.app";

#[derive(Debug, Serialize, Deserialize)]
pub struct KeychainResult {
    success: bool,
    error: Option<String>,
}

#[tauri::command]
pub async fn store_secret(account: String, secret: String) -> Result<KeychainResult, String> {
    let entry = Entry::new(SERVICE_NAME, &account)
        .map_err(|e| e.to_string())?;

    entry.set_password(&secret)
        .map_err(|e| e.to_string())?;

    Ok(KeychainResult {
        success: true,
        error: None,
    })
}

#[tauri::command]
pub async fn get_secret(account: String) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, &account)
        .map_err(|e| e.to_string())?;

    match entry.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn delete_secret(account: String) -> Result<KeychainResult, String> {
    let entry = Entry::new(SERVICE_NAME, &account)
        .map_err(|e| e.to_string())?;

    match entry.delete_password() {
        Ok(()) => Ok(KeychainResult { success: true, error: None }),
        Err(keyring::Error::NoEntry) => Ok(KeychainResult { success: true, error: None }),
        Err(e) => Ok(KeychainResult { success: false, error: Some(e.to_string()) }),
    }
}

#[tauri::command]
pub async fn has_secret(account: String) -> Result<bool, String> {
    let entry = Entry::new(SERVICE_NAME, &account)
        .map_err(|e| e.to_string())?;

    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}
```

### SQLite Service (Rust)

```rust
// src-tauri/src/sqlite.rs
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

pub struct SqliteState(pub Mutex<Option<Connection>>);

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    columns: Vec<String>,
    rows: Vec<Vec<serde_json::Value>>,
}

#[tauri::command]
pub async fn init_database(
    state: State<'_, SqliteState>,
    path: String,
) -> Result<(), String> {
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;

    // Create tables matching IndexedDB schema
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS gpts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            instructions TEXT,
            model TEXT NOT NULL,
            provider TEXT NOT NULL,
            capabilities TEXT, -- JSON
            knowledge TEXT, -- JSON
            tools TEXT, -- JSON
            conversation_starters TEXT, -- JSON
            folder_id TEXT,
            is_archived INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            gpt_id TEXT NOT NULL,
            title TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (gpt_id) REFERENCES gpts(id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            tool_calls TEXT, -- JSON
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );

        CREATE TABLE IF NOT EXISTS knowledge_files (
            id TEXT PRIMARY KEY,
            gpt_id TEXT NOT NULL,
            name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            size INTEGER NOT NULL,
            content BLOB,
            extracted_text TEXT,
            source_path TEXT, -- For filesystem-linked files
            uploaded_at TEXT NOT NULL,
            FOREIGN KEY (gpt_id) REFERENCES gpts(id)
        );

        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            color TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_conversations_gpt ON conversations(gpt_id);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_gpt ON knowledge_files(gpt_id);
        "
    ).map_err(|e| e.to_string())?;

    *state.0.lock().unwrap() = Some(conn);

    Ok(())
}

#[tauri::command]
pub async fn sync_from_indexeddb(
    state: State<'_, SqliteState>,
    table: String,
    data: Vec<serde_json::Value>,
) -> Result<u64, String> {
    let conn = state.0.lock().unwrap();
    let conn = conn.as_ref().ok_or("Database not initialized")?;

    let mut count = 0u64;

    for row in data {
        // Dynamic INSERT OR REPLACE based on table
        match table.as_str() {
            "gpts" => {
                conn.execute(
                    "INSERT OR REPLACE INTO gpts (id, name, description, instructions, model, provider, capabilities, knowledge, tools, conversation_starters, folder_id, is_archived, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
                    params![
                        row["id"].as_str(),
                        row["name"].as_str(),
                        row["description"].as_str(),
                        row["instructions"].as_str(),
                        row["model"].as_str(),
                        row["provider"].as_str(),
                        row["capabilities"].to_string(),
                        row["knowledge"].to_string(),
                        row["tools"].to_string(),
                        row["conversationStarters"].to_string(),
                        row["folderId"].as_str(),
                        row["isArchived"].as_bool().unwrap_or(false) as i32,
                        row["createdAt"].as_str(),
                        row["updatedAt"].as_str(),
                    ]
                ).map_err(|e| e.to_string())?;
                count += 1;
            },
            // ... other tables
            _ => return Err(format!("Unknown table: {}", table)),
        }
    }

    Ok(count)
}

#[tauri::command]
pub async fn query(
    state: State<'_, SqliteState>,
    sql: String,
    params: Vec<serde_json::Value>,
) -> Result<QueryResult, String> {
    let conn = state.0.lock().unwrap();
    let conn = conn.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let columns: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

    let rows = stmt
        .query_map([], |row| {
            let mut values = Vec::new();
            for i in 0..columns.len() {
                let value: rusqlite::types::Value = row.get(i)?;
                values.push(match value {
                    rusqlite::types::Value::Null => serde_json::Value::Null,
                    rusqlite::types::Value::Integer(i) => serde_json::json!(i),
                    rusqlite::types::Value::Real(f) => serde_json::json!(f),
                    rusqlite::types::Value::Text(s) => serde_json::json!(s),
                    rusqlite::types::Value::Blob(b) => serde_json::json!(base64::encode(b)),
                });
            }
            Ok(values)
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(QueryResult { columns, rows })
}
```

### Filesystem Service (Rust)

```rust
// src-tauri/src/filesystem.rs
use notify::{Watcher, RecursiveMode, watcher, DebouncedEvent};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{State, Window};

pub struct WatcherState(pub Mutex<HashMap<String, notify::RecommendedWatcher>>);

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    path: String,
    name: String,
    is_directory: bool,
    size: u64,
    modified_at: String,
    mime_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileWatchEvent {
    event_type: String,
    path: String,
    timestamp: String,
}

#[tauri::command]
pub async fn read_directory(path: String, recursive: bool) -> Result<Vec<FileMetadata>, String> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }

    let mut entries = Vec::new();

    fn read_dir_recursive(path: &PathBuf, entries: &mut Vec<FileMetadata>, recursive: bool) -> Result<(), String> {
        for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let file_path = entry.path();

            entries.push(FileMetadata {
                path: file_path.to_string_lossy().to_string(),
                name: entry.file_name().to_string_lossy().to_string(),
                is_directory: metadata.is_dir(),
                size: metadata.len(),
                modified_at: metadata.modified()
                    .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339())
                    .unwrap_or_default(),
                mime_type: if metadata.is_file() {
                    mime_guess::from_path(&file_path)
                        .first()
                        .map(|m| m.to_string())
                } else {
                    None
                },
            });

            if recursive && metadata.is_dir() {
                read_dir_recursive(&file_path, entries, recursive)?;
            }
        }
        Ok(())
    }

    read_dir_recursive(&path, &mut entries, recursive)?;

    Ok(entries)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn watch_directory(
    state: State<'_, WatcherState>,
    window: Window,
    id: String,
    path: String,
) -> Result<(), String> {
    let (tx, rx) = channel();

    let mut watcher = watcher(tx, Duration::from_secs(2))
        .map_err(|e| e.to_string())?;

    watcher
        .watch(&path, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let watch_id = id.clone();
    let window_clone = window.clone();

    std::thread::spawn(move || {
        loop {
            match rx.recv() {
                Ok(event) => {
                    let (event_type, path) = match event {
                        DebouncedEvent::Create(p) => ("create", p),
                        DebouncedEvent::Write(p) => ("modify", p),
                        DebouncedEvent::Remove(p) => ("delete", p),
                        DebouncedEvent::Rename(_, p) => ("rename", p),
                        _ => continue,
                    };

                    let _ = window_clone.emit(&format!("fs-watch-{}", watch_id), FileWatchEvent {
                        event_type: event_type.to_string(),
                        path: path.to_string_lossy().to_string(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                    });
                },
                Err(_) => break,
            }
        }
    });

    state.0.lock().unwrap().insert(id, watcher);

    Ok(())
}

#[tauri::command]
pub async fn unwatch_directory(
    state: State<'_, WatcherState>,
    id: String,
) -> Result<(), String> {
    state.0.lock().unwrap().remove(&id);
    Ok(())
}

#[tauri::command]
pub async fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    let path = PathBuf::from(&path);
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;

    Ok(FileMetadata {
        path: path.to_string_lossy().to_string(),
        name: path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        is_directory: metadata.is_dir(),
        size: metadata.len(),
        modified_at: metadata.modified()
            .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339())
            .unwrap_or_default(),
        mime_type: if metadata.is_file() {
            mime_guess::from_path(&path)
                .first()
                .map(|m| m.to_string())
        } else {
            None
        },
    })
}
```

### Frontend Integration (TypeScript)

```typescript
// src/services/desktop-bridge.ts
import {invoke} from "@tauri-apps/api/tauri"
import {listen} from "@tauri-apps/api/event"
import {appDataDir, join} from "@tauri-apps/api/path"

export const isDesktop = () => "__TAURI__" in window

// Keychain Service
export const keychainService = {
  async store(account: string, secret: string): Promise<void> {
    if (!isDesktop()) throw new Error("Keychain only available in desktop app")
    await invoke("store_secret", {account, secret})
  },

  async get(account: string): Promise<string | null> {
    if (!isDesktop()) throw new Error("Keychain only available in desktop app")
    return invoke("get_secret", {account})
  },

  async delete(account: string): Promise<void> {
    if (!isDesktop()) throw new Error("Keychain only available in desktop app")
    await invoke("delete_secret", {account})
  },

  async has(account: string): Promise<boolean> {
    if (!isDesktop()) throw new Error("Keychain only available in desktop app")
    return invoke("has_secret", {account})
  },
}

// SQLite Service
export const sqliteService = {
  async init(): Promise<void> {
    if (!isDesktop()) return
    const dataDir = await appDataDir()
    const dbPath = await join(dataDir, "gpt-creator.db")
    await invoke("init_database", {path: dbPath})
  },

  async syncFromIndexedDB(table: string, data: unknown[]): Promise<number> {
    if (!isDesktop()) throw new Error("SQLite only available in desktop app")
    return invoke("sync_from_indexeddb", {table, data})
  },

  async query(sql: string, params: unknown[] = []): Promise<{columns: string[]; rows: unknown[][]}> {
    if (!isDesktop()) throw new Error("SQLite only available in desktop app")
    return invoke("query", {sql, params})
  },
}

// Filesystem Service
export const filesystemService = {
  async readDirectory(path: string, recursive = false): Promise<FileMetadata[]> {
    if (!isDesktop()) throw new Error("Filesystem only available in desktop app")
    return invoke("read_directory", {path, recursive})
  },

  async readFile(path: string): Promise<Uint8Array> {
    if (!isDesktop()) throw new Error("Filesystem only available in desktop app")
    return invoke("read_file", {path})
  },

  async writeFile(path: string, contents: Uint8Array): Promise<void> {
    if (!isDesktop()) throw new Error("Filesystem only available in desktop app")
    await invoke("write_file", {path, contents: Array.from(contents)})
  },

  async watchDirectory(id: string, path: string, callback: (event: FileWatchEvent) => void): Promise<() => void> {
    if (!isDesktop()) throw new Error("Filesystem only available in desktop app")

    const unlisten = await listen<FileWatchEvent>(`fs-watch-${id}`, event => {
      callback(event.payload)
    })

    await invoke("watch_directory", {id, path})

    return async () => {
      unlisten()
      await invoke("unwatch_directory", {id})
    }
  },
}

// Conditional encryption service that uses keychain when available
export const createSecureStorage = async () => {
  if (isDesktop()) {
    return {
      async storeApiKey(provider: string, apiKey: string): Promise<void> {
        await keychainService.store(`api-key-${provider}`, apiKey)
      },

      async getApiKey(provider: string): Promise<string | null> {
        return keychainService.get(`api-key-${provider}`)
      },

      async deleteApiKey(provider: string): Promise<void> {
        await keychainService.delete(`api-key-${provider}`)
      },
    }
  }

  // Fall back to web encryption (RFC-002)
  const {encryptionService} = await import("./encryption")
  return encryptionService
}
```

## UI Components

### DesktopSettings

```typescript
interface DesktopSettingsProps {
  config: DesktopConfig
  onChange: (config: DesktopConfig) => void
}

// Features:
// - Storage backend selector (IndexedDB vs SQLite)
// - Keychain toggle (with migration)
// - Knowledge base directory picker
// - Auto-update toggle
// - System tray options
// - Global shortcuts configuration
// - Launch at startup toggle
```

### FilesystemKnowledgeManager

```typescript
interface FilesystemKnowledgeManagerProps {
  gptId: string
  sources: FilesystemKnowledgeSource[]
  onSourceAdd: (source: Omit<FilesystemKnowledgeSource, "id">) => void
  onSourceRemove: (sourceId: string) => void
  onSync: (sourceId: string) => void
}

// Features:
// - Add folder/file picker
// - Show sync status per source
// - Include/exclude pattern editor
// - Manual sync button
// - File count and size display
// - Watch status indicator
```

### SQLiteMigrationWizard

```typescript
interface SQLiteMigrationWizardProps {
  onComplete: () => void
  onCancel: () => void
}

// Steps:
// 1. Explain benefits of SQLite
// 2. Show current IndexedDB data size
// 3. Select migration options
// 4. Progress indicator during migration
// 5. Verification step
// 6. Success/rollback options
```

## Platform-Specific Requirements

### macOS

| Requirement      | Implementation                                    |
| ---------------- | ------------------------------------------------- |
| Keychain Access  | `security-framework` crate                        |
| Notarization     | Apple Developer account + `tauri-plugin-notarize` |
| Code signing     | Developer ID certificate                          |
| Universal binary | Build for both x86_64 and aarch64                 |
| App Sandbox      | Entitlements for keychain, network, files         |

```xml
<!-- entitlements.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.gptcreator.app</string>
    </array>
</dict>
</plist>
```

### Windows

| Requirement        | Implementation                   |
| ------------------ | -------------------------------- |
| Credential Manager | `windows-credentials` crate      |
| Code signing       | EV certificate (for SmartScreen) |
| Installer          | NSIS or WiX via Tauri            |
| Auto-update        | Windows Update mechanism         |

### Linux

| Requirement         | Implementation                 |
| ------------------- | ------------------------------ |
| Secret Service      | `secret-service` crate (D-Bus) |
| Packaging           | .deb, .rpm, AppImage           |
| Desktop integration | .desktop file, icons           |
| Wayland/X11         | Native support via Tauri       |

## Build & Release Pipeline

```yaml
# .github/workflows/desktop-release.yml
name: Desktop Release

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    strategy:
      matrix:
        include:
          - platform: macos-latest
            target: universal-apple-darwin
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
          - platform: windows-latest
            target: x86_64-pc-windows-msvc

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf libsecret-1-dev

      - name: Install frontend dependencies
        run: pnpm install

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
          TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
          # macOS signing
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        with:
          tagName: v__VERSION__
          releaseName: "GPT Creator v__VERSION__"
          releaseBody: "See the assets to download this version and install."
          releaseDraft: true
          prerelease: false
```

## Acceptance Criteria

```gherkin
Feature: Desktop Application

Scenario: Install and launch desktop app
  Given I have downloaded the installer for my platform
  When I run the installer
  Then the application should install successfully
  And I should be able to launch "GPT Creator"
  And the main window should display

Scenario: Store API key in system keychain
  Given I am using the desktop application
  And I am on the provider settings page
  When I enter my OpenAI API key
  And I save the settings
  Then the API key should be stored in the system keychain
  And the API key should not be stored in IndexedDB

Scenario: Retrieve API key from keychain
  Given I have previously stored an API key in the keychain
  When I launch the desktop application
  And I navigate to the provider settings
  Then the API key should be retrieved from the keychain
  And I should be able to make API calls

Feature: SQLite Storage

Scenario: Migrate from IndexedDB to SQLite
  Given I have existing data in IndexedDB
  And I am on the desktop settings page
  When I enable SQLite storage
  And I confirm the migration
  Then all data should be migrated to SQLite
  And the application should use SQLite for queries
  And IndexedDB data should be retained as backup

Feature: Filesystem Knowledge Base

Scenario: Add folder as knowledge source
  Given I am editing a GPT
  And I am on the knowledge configuration section
  When I click "Add Folder"
  And I select a folder from my filesystem
  Then the folder should appear as a knowledge source
  And files in the folder should be indexed

Scenario: File change detection
  Given I have added a folder as a knowledge source
  When I modify a file in that folder
  Then the application should detect the change
  And the knowledge index should be updated
```

## Testing Requirements

| Test Type         | Coverage Target | Focus Areas                             |
| ----------------- | --------------- | --------------------------------------- |
| Unit Tests        | 80%             | Rust backend commands                   |
| Integration Tests | 70%             | IPC bridge, keychain                    |
| E2E Tests         | Key flows       | Install, launch, keychain, SQLite       |
| Platform Tests    | All 3           | macOS, Windows, Linux specific features |

### Critical Test Cases

1. **Keychain**: Store/retrieve/delete secrets on each platform
2. **SQLite**: Migration preserves all data correctly
3. **Filesystem**: Watch events trigger correctly
4. **Updates**: Auto-update downloads and installs correctly
5. **System tray**: Minimize/restore works correctly

## Migration Path

### Web → Desktop Transition

1. **User downloads desktop app** while continuing to use web version
2. **First launch**: Offer to import from web (if same browser)
3. **Data sync**: One-time migration, no ongoing sync (local-first principle)
4. **Keychain migration**: Offer to move API keys from IndexedDB encryption to keychain

### Desktop Settings Detection

```typescript
// Detect desktop features on startup
export async function initDesktopFeatures(): Promise<DesktopCapabilities> {
  if (!isDesktop()) {
    return {keychain: false, sqlite: false, filesystem: false}
  }

  return {
    keychain: (await keychainService.has("test-probe").catch(() => false)) || true,
    sqlite: true,
    filesystem: true,
  }
}
```

## Future Enhancements

| Enhancement   | Description                               | Target  |
| ------------- | ----------------------------------------- | ------- |
| P2P Sync      | Sync between desktop instances via WebRTC | RFC-013 |
| Offline Mode  | Full offline support with background sync | RFC-013 |
| Plugin System | Load third-party extensions               | RFC-014 |
| CLI Interface | Command-line access to GPT functions      | RFC-014 |
| Mobile Apps   | iOS/Android via Capacitor or React Native | RFC-015 |
