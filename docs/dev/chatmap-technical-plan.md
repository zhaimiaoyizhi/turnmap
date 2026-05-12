# ChatMap Technical Plan

## 1. Product Definition

ChatMap is a Microsoft Edge extension for ChatGPT. It turns the current ChatGPT conversation into an editable mind-map-like graph. Each node represents one question-answer turn. Users can click a node to jump back to the original conversation, edit node content, create links, summarize nodes, merge/split nodes, and export the map.

The map should be organized around a central conversation-title node. Question-answer turn nodes radiate from that center, and ChatMap automatically creates baseline links from the conversation title to each turn. The primary semantic-linking workflow should be AI-assisted: users configure an API key, ChatMap suggests relationship edges, and users review or edit them. Manual linking remains available as a fallback and correction layer.

Primary positioning: personal learning and conversation organization.

Primary scope: current ChatGPT conversation only.

Primary browser: Microsoft Edge, with Chromium-compatible architecture for later Chrome support.

## 2. Core Principles

- The original ChatGPT conversation is the source of truth.
- Every map node must preserve a robust reference back to the original conversation turn.
- Non-disruptive extraction is preferred. ChatMap should avoid visibly scrolling the user's ChatGPT page during normal refresh.
- AI-generated links are suggestions first, not committed graph structure.
- AI-assisted semantic linking is the primary link creation path; manual link editing is the fallback and correction path.
- The graph must be useful without AI, then improved by AI.
- Store locally by default. Upload only when the user triggers AI features or enables automatic AI processing.
- Build provider-agnostic AI integration from the start.

## 3. MVP Outcome

The first usable version should support:

- Load as an unpacked Edge extension.
- Detect ChatGPT conversation turns on `https://chatgpt.com/*`.
- Create one map node per user-assistant turn.
- Create a central node from the conversation title.
- Automatically link the central conversation node to each turn node.
- Show nodes in a side panel using React Flow.
- Click a node and jump to the original conversation turn.
- Drag nodes.
- Rename node title.
- Edit node summary.
- Manually create and delete links.
- Save the map locally.
- Export JSON and Markdown.
- Configure an AI provider with OpenAI, DeepSeek, or a custom OpenAI-compatible endpoint.

## 4. Non-Goals for MVP

- Cross-conversation knowledge graph.
- ChatGPT account session reuse for model calls.
- Firefox support.
- Full XMind file compatibility.
- Cloud sync.
- Team collaboration.
- Fully automatic graph rewriting.
- Complex graph algorithms before manual editing feels good.

## 5. Architecture

### 5.1 Extension Modules

```text
extension/
  manifest.json
  src/
    background/
      service-worker.ts
    content/
      chatgpt-observer.ts
      turn-extractor.ts
      jump-controller.ts
    side-panel/
      App.tsx
      components/
      graph/
    full-page/
      App.tsx
    floating-panel/
      App.tsx
    shared/
      messaging/
      storage/
      ai/
      types/
```

### 5.2 Content Script

The content script runs inside ChatGPT pages.

Responsibilities:

- Observe DOM updates with `MutationObserver`.
- Extract visible user and assistant messages.
- On normal refresh, read already-loaded conversation data without moving the user's viewport.
- Prefer a best-effort current-conversation API fetch when the conversation id is available in the ChatGPT URL.
- Capture ChatGPT backend request headers with `webRequest` in the background worker so the extension can perform a same-session conversation API fetch without moving the page.
- First try structured extraction from ChatGPT conversation-shaped JSON data, such as `mapping -> message -> author.role/content.parts`.
- Use visible page scrolling only as an explicit fallback action, such as "Deep Scan", until a reliable internal conversation data source is implemented.
- Pair messages into turns.
- Produce stable turn identifiers.
- Preserve source anchors for jump-back.
- Receive jump commands from the side panel.
- Scroll the matched conversation turn into view.
- Temporarily highlight the target turn.

### 5.3 Side Panel

The side panel is the default UI.

Responsibilities:

- Render the current conversation map.
- Place the conversation title as the central map node.
- Provide node editing.
- Provide edge editing.
- Show AI suggestions.
- Trigger jump-to-source.
- Trigger export.
- Open full-page mode.
- Open settings.

### 5.4 Full-Page Mode

Full-page mode is for deep organization.

Responsibilities:

- Show a larger graph canvas.
- Support batch editing.
- Support advanced export.
- Support layout changes.

This is P1, not required before validating the core interaction.

### 5.5 Floating Panel

Floating panel is a compact overlay inside the ChatGPT page.

Responsibilities:

- Quick navigation.
- Small graph preview.
- Quick create/link operations.

This is P2 because it has higher risk of clashing with ChatGPT UI.

### 5.6 Background Service Worker

The service worker coordinates extension modules.

Responsibilities:

- Route messages between content script and UI.
- Manage AI provider calls.
- Persist settings.
- Handle export requests where needed.
- Keep extension permissions scoped.

## 6. Data Model

```ts
export type Conversation = {
  id: string;
  url: string;
  chatgptConversationId?: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
};

export type Turn = {
  id: string;
  conversationId: string;
  turnIndex: number;
  userText: string;
  assistantText: string;
  sourceAnchor: SourceAnchor;
  extractedAt: number;
};

export type SourceAnchor = {
  turnIndex: number;
  userHash: string;
  assistantHash: string;
  userPreview: string;
  assistantPreview: string;
};

export type TurnNode = {
  id: string;
  conversationId: string;
  turnId: string;
  turnIndex: number;
  title: string;
  summary: string;
  tags: string[];
  position: { x: number; y: number };
  collapsed: boolean;
  status: "normal" | "important" | "todo" | "summarized";
  sourceAnchor: SourceAnchor;
  createdAt: number;
  updatedAt: number;
};

export type MapEdgeType =
  | "related"
  | "depends_on"
  | "extends"
  | "supports"
  | "contradicts"
  | "duplicates"
  | "references"
  | "todo";

export type MapEdge = {
  id: string;
  conversationId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: MapEdgeType;
  label?: string;
  confidence?: number;
  createdBy: "user" | "ai";
  accepted: boolean;
  createdAt: number;
  updatedAt: number;
};

export type AiProviderConfig = {
  id: string;
  provider: "openai" | "deepseek" | "custom";
  label: string;
  baseUrl: string;
  apiKeyRef: string;
  model: string;
  apiStyle: "openai-chat-completions";
};
```

## 7. AI Provider Design

### 7.1 Provider Strategy

Do not hard-code OpenAI. Use a provider abstraction.

Built-in providers:

- OpenAI
- DeepSeek
- Custom OpenAI-compatible endpoint

First implementation target:

- Chat Completions-compatible JSON calls.

Future targets:

- Responses API adapter.
- Embedding adapter.
- Local model adapter.

### 7.2 AI Tasks

```ts
export type AiTask =
  | "generate_turn_title"
  | "summarize_turn"
  | "suggest_edges"
  | "merge_nodes"
  | "split_node"
  | "generate_export_summary";
```

### 7.3 Suggested Link Flow

1. A new turn is extracted.
2. A node is created with a fallback title and summary.
3. AI generates a better title and summary if enabled.
4. Candidate existing nodes are selected.
5. AI receives only the new node and candidate nodes.
6. AI returns suggested edges with type, reason, and confidence.
7. AI also marks important/high-signal links when appropriate.
8. Suggested edges are shown as pending.
9. User accepts, rejects, or edits them.

### 7.4 Candidate Selection for MVP

MVP can avoid embeddings.

Candidate strategy:

- Recent N nodes.
- Nodes sharing keywords with the new turn.
- Manually important nodes.
- Nodes already linked to nearby nodes.

Later, add embeddings to improve candidate quality.

## 8. Jump-To-Source Design

This is the most important interaction.

### 8.1 Anchor Strategy

Each node stores multiple source identifiers:

- Turn index.
- User text hash.
- Assistant text hash.
- User preview.
- Assistant preview.

### 8.2 Jump Algorithm

1. Ask content script to jump to `sourceAnchor`.
2. Try exact turn index among extracted turns.
3. Verify text hash if possible.
4. If index mismatch, search visible messages by text preview.
5. If not found, scroll progressively and retry.
6. If still not found, show a recoverable UI state.

### 8.3 Highlighting

After jump:

- Scroll target into view.
- Apply temporary outline/highlight.
- Remove highlight after a short delay.

## 9. Graph UX

### 9.1 Node Design

Each node displays:

- Title.
- Short summary.
- Turn index.
- Status marker.
- Optional tags.

Node actions:

- Jump to source.
- Edit title.
- Edit summary.
- Summarize with AI.
- Split node.
- Merge with selected node.
- Mark important.
- Delete node from map.

Deleting a node does not delete the original ChatGPT conversation.

### 9.2 Edge Design

Manual edges:

- Created by dragging between nodes.
- Default type: `related`.
- User can change type and label.
- Edge relationship types must have visual differentiation. Use distinct colors for relation types, and use thicker strokes for important links.

AI edges:

- Render as suggested/pending.
- User can accept, reject, or change type.

### 9.3 Layouts

MVP:

- Chronological horizontal layout.
- Manual freeform editing.

P1:

- Mind-map left-to-right layout.
- Radial layout.
- Compact tree layout.

## 10. Storage

Use IndexedDB for graph data and conversation data.

Use `chrome.storage.local` for:

- UI preferences.
- Active provider id.
- Feature flags.
- Extension settings.

API keys:

- MVP: store locally with clear warning.
- Production: prefer optional backend proxy or OS/browser secure storage if available.

## 11. Export

MVP export:

- JSON: complete graph data.
- Markdown: readable outline with links and edge list.

P1 export:

- SVG.
- PNG.
- Obsidian Markdown.

P2 export:

- OPML.
- XMind-compatible package, if practical.

## 12. Permissions

Likely extension permissions:

- `sidePanel`
- `storage`
- `activeTab`
- host permission for `https://chatgpt.com/*`

Keep permissions narrow for store review and user trust.

## 13. Risks

### 13.1 ChatGPT DOM Changes

Risk: selectors break.

Mitigation:

- Centralize selectors in `turn-extractor`.
- Prefer semantic text structure over class names.
- Add extraction diagnostics.
- Build fallback matching by text previews and hashes.

### 13.2 Jump Failure

Risk: virtualized or unloaded messages prevent jump.

Mitigation:

- Multi-anchor matching.
- Progressive scroll and retry.
- User-visible recovery action.

### 13.3 AI Link Noise

Risk: too many inaccurate edges.

Mitigation:

- AI suggestions are pending.
- Limit suggestions per node.
- Show reason and confidence.
- Allow easy rejection.

### 13.4 API Key Exposure

Risk: browser extensions cannot fully protect user-provided keys.

Mitigation:

- Explain local storage clearly.
- Support custom providers.
- Later provide backend proxy.

## 14. Development Order

1. Scaffold Edge extension.
2. Build ChatGPT turn extraction.
3. Build side panel shell.
4. Render static React Flow graph.
5. Connect extracted turns to graph nodes.
6. Implement click node to jump source.
7. Add local persistence.
8. Add manual editing.
9. Add export.
10. Add AI provider settings.
11. Add AI title/summary.
12. Add AI suggested links.
13. Add full-page mode.
14. Add floating mode.
