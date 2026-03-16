# formspec-chat

Pure TypeScript core for conversational form building. Provides session orchestration, AI adapter integration, source tracing, issue tracking, definition diffing, template management, and session persistence. No React or DOM dependencies.

## Install

```bash
npm install formspec-chat
```

## Quick Usage

```typescript
import {
  ChatSession,
  DeterministicAdapter,
  SessionStore,
  TemplateLibrary,
} from 'formspec-chat';

// Create a session with the offline adapter
const session = new ChatSession({ adapter: new DeterministicAdapter() });

// Send a message — generates an initial scaffold on the first call,
// then refines the form on subsequent calls
const reply = await session.sendMessage('I need a patient intake form');

// Access the generated definition
const definition = session.getDefinition();

// Export as JSON
const json = session.exportJSON();

// Persist the session
const store = new SessionStore(localStorage);
store.save(session.toState());

// Restore it later
const state = store.load(session.id);
const restored = ChatSession.fromState(state, new DeterministicAdapter());
```

## Architecture

```
ChatSession          Orchestrates the conversation loop.
  ├── AIAdapter      Interface. Plug in any AI provider.
  │     └── DeterministicAdapter  Offline fallback. Uses templates + heuristics.
  ├── SourceTraceManager  Tracks provenance: which message or upload produced each field.
  ├── IssueQueue     Collects problems (missing config, contradictions, low confidence).
  └── diff()         Computes added/removed/modified keys between two definitions.

TemplateLibrary      Five built-in archetypes (housing intake, grant application,
                     patient intake, compliance checklist, employee onboarding).

SessionStore         Serializes and loads sessions via a StorageBackend interface.
                     Accepts localStorage in the browser or any in-memory map in tests.

validateProviderConfig  Validates a ProviderConfig before passing it to an adapter.
```

## API

### `ChatSession`

```typescript
new ChatSession(options: { adapter: AIAdapter; id?: string })
```

| Method | Returns | Description |
|---|---|---|
| `sendMessage(content)` | `Promise<ChatMessage>` | Send a user turn. Generates a scaffold on the first call; refines on subsequent calls. |
| `startFromTemplate(templateId)` | `Promise<void>` | Initialize from a built-in template. |
| `startFromUpload(attachment)` | `Promise<void>` | Extract structure from an uploaded file, then scaffold. |
| `getDefinition()` | `FormDefinition \| null` | Current form definition. |
| `getLastDiff()` | `DefinitionDiff \| null` | Structural diff from the most recent refinement. |
| `getMessages()` | `ChatMessage[]` | Full message history. |
| `getTraces()` | `SourceTrace[]` | All source traces. |
| `getTracesForElement(path)` | `SourceTrace[]` | Traces for a specific field path. |
| `getIssues()` | `Issue[]` | All issues. |
| `getOpenIssueCount()` | `number` | Count of unresolved issues. |
| `resolveIssue(id)` | `void` | Mark an issue resolved. |
| `deferIssue(id)` | `void` | Mark an issue deferred. |
| `exportJSON()` | `FormDefinition` | Export the current definition. Throws if none exists. |
| `toState()` | `ChatSessionState` | Serialize the full session for storage. |
| `onChange(listener)` | `() => void` | Subscribe to state changes. Returns an unsubscribe function. |
| `ChatSession.fromState(state, adapter)` | `ChatSession` | Restore a session from serialized state. |

### `AIAdapter` interface

Implement this interface to connect any AI provider.

```typescript
interface AIAdapter {
  generateScaffold(request: ScaffoldRequest): Promise<ScaffoldResult>;
  refineForm(messages: ChatMessage[], current: FormDefinition, instruction: string): Promise<ScaffoldResult>;
  extractFromFile(attachment: Attachment): Promise<string>;
  isAvailable(): Promise<boolean>;
}
```

`ScaffoldRequest` is a discriminated union:

```typescript
type ScaffoldRequest =
  | { type: 'template'; templateId: string }
  | { type: 'conversation'; messages: ChatMessage[] }
  | { type: 'upload'; extractedContent: string };
```

### `DeterministicAdapter`

Offline fallback. Always available — no API key required. Matches conversation text to one of five built-in templates using keyword scoring. Cannot meaningfully refine forms; returns an info-level issue when `refineForm` is called.

### `SourceTraceManager`

Tracks which message, upload, or template produced each form element.

```typescript
manager.addTrace(trace)
manager.getTracesForElement(path)     // by field path
manager.getTracesForSource(sourceId)  // by message or attachment ID
manager.removeTracesForElement(path)
manager.toJSON() / SourceTraceManager.fromJSON(data)
```

### `IssueQueue`

Collects and tracks problems found during generation.

```typescript
queue.addIssue({ severity, category, title, description, sourceIds })
queue.resolveIssue(id)
queue.deferIssue(id)
queue.reopenIssue(id)
queue.getOpenIssues()
queue.getIssuesByElement(path)
queue.getIssueCount()   // { open, resolved, deferred }
queue.toJSON() / IssueQueue.fromJSON(data)
```

Issue severities: `'error' | 'warning' | 'info'`
Issue categories: `'missing-config' | 'contradiction' | 'low-confidence' | 'validation'`

### `diff(oldDef, newDef)`

Computes a structural diff between two form definitions.

```typescript
const { added, removed, modified } = diff(previousDefinition, newDefinition);
// added, removed, modified are string[] of item keys
```

### `TemplateLibrary`

```typescript
const library = new TemplateLibrary();
library.getAll()       // Template[]
library.getById(id)    // Template | undefined
```

Built-in template IDs: `housing-intake`, `grant-application`, `patient-intake`, `compliance-checklist`, `employee-onboarding`.

### `SessionStore`

```typescript
const store = new SessionStore(backend);  // backend implements StorageBackend
store.save(state)
store.load(id)    // ChatSessionState | null
store.delete(id)
store.list()      // SessionSummary[], most recent first
```

`StorageBackend` requires only `getItem`, `setItem`, and `removeItem`. Pass `localStorage` in the browser or a `Map`-backed object in tests.

### `validateProviderConfig`

```typescript
const errors = validateProviderConfig({ provider: 'anthropic', apiKey: '...' });
// ProviderValidationError[] — empty means valid
```

Valid providers: `'anthropic' | 'google' | 'openai'`

## Types

All types export from the package root:

```typescript
import type {
  ChatMessage, Attachment,
  SourceTrace, SourceType,
  Issue, IssueSeverity, IssueCategory, IssueStatus,
  ScaffoldResult, ScaffoldRequest,
  AIAdapter,
  ProviderConfig, ProviderType,
  Template,
  ChatSessionState, ChatProjectSnapshot,
  StorageBackend, SessionSummary,
} from 'formspec-chat';
```

## Dependencies

- `formspec-types` — shared Formspec type definitions (peer dependency)

No runtime dependencies beyond `formspec-types`. No React, no DOM.
