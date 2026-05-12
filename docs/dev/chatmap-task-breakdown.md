# ChatMap Task Breakdown

## Milestone 0: Project Setup

Goal: create a working Edge extension development project.

Tasks:

- [x] Choose package manager.
- [x] Scaffold Vite + React + TypeScript project.
- [x] Add Manifest V3 extension structure.
- [x] Configure build output for Edge unpacked extension.
- [x] Add React Flow dependency.
- [x] Add lint/typecheck scripts.
- [x] Add basic extension icons/placeholders.
- [x] Document local load instructions for Edge.

Acceptance:

- Extension loads in Edge.
- Side panel opens.
- Build command succeeds.

## Milestone 1: ChatGPT Turn Extraction

Goal: detect user-assistant turns from the current ChatGPT page.

Tasks:

- [x] Add content script entry.
- [x] Add DOM observer with debounced extraction.
- [x] Identify user message blocks.
- [x] Identify assistant message blocks.
- [x] Pair messages into turns.
- [x] Generate stable turn ids.
- [x] Generate text hashes and previews.
- [x] Send extracted turns to side panel/background.
- [x] Add extraction debug view.

Acceptance:

- On a real ChatGPT conversation, extracted turn count matches visible conversation.
- Refreshing the page produces stable turn ids for unchanged turns.
- New messages are detected without manual refresh.

## Milestone 2: Side Panel Graph MVP

Goal: show extracted turns as editable graph nodes.

Tasks:

- [x] Add side panel React app.
- [x] Add message bridge between side panel and content script.
- [x] Convert turns to graph nodes.
- [x] Render React Flow canvas.
- [x] Implement chronological default layout.
- [x] Add node component with title, summary, turn index.
- [x] Add node selection.
- [x] Add drag persistence.

Acceptance:

- Every extracted turn appears as one node.
- Nodes can be dragged.
- Node positions remain after reopening side panel.

## Milestone 3: Jump To Original Conversation

Goal: make node click jump to the source ChatGPT turn.

Tasks:

- [x] Add jump command from side panel to content script.
- [x] Implement source matching by turn index.
- [x] Verify source by text hash/preview.
- [x] Implement fallback text-preview search.
- [x] Implement scroll into view.
- [x] Add temporary highlight.
- [x] Add UI error state when jump fails.

Acceptance:

- Clicking a node scrolls the ChatGPT page to the correct turn.
- Jump works after page refresh.
- Failure state is understandable and recoverable.

## Milestone 4: Manual Editing

Goal: support useful non-AI graph editing.

Tasks:

- [x] Edit node title.
- [x] Edit node summary.
- [x] Add tags.
- [x] Add status: normal, important, todo, summarized.
- [x] Create manual edge by dragging.
- [x] Delete edge.
- [x] Change edge type.
- [x] Render relationship types with distinct colors.
- [x] Support emphasized/important edges with thicker strokes.
- [x] Edit edge label.
- [x] Delete node from map.
- [x] Add undo/redo if implementation cost is acceptable.

Acceptance:

- User can organize a conversation without AI.
- Manual edits persist locally.

## Milestone 5: Local Storage

Goal: persist maps reliably.

Tasks:

- [x] Choose IndexedDB wrapper.
- [x] Store conversations.
- [x] Store turns.
- [x] Store nodes.
- [x] Store edges.
- [x] Store UI preferences.
- [x] Add migration version field.
- [x] Add reset current map action.

Acceptance:

- Map survives side panel close, tab refresh, and browser restart.
- Data model can evolve with migrations.

## Milestone 6: Export

Goal: let users take their learning map out of the extension.

Tasks:

- [x] Export JSON.
- [x] Export Markdown outline.
- [x] Export Markdown edge list.
- [x] Add copy-to-clipboard.
- [x] Add file download.
- [x] Add Obsidian Canvas export.
- [x] Add ChatMap JSON import restore.
- [x] Add SVG export if React Flow viewport allows clean export.
- [x] Add PNG export.

Acceptance:

- JSON export can restore the graph later.
- Markdown export is readable without ChatMap.

## Milestone 7: AI Provider Settings

Goal: support OpenAI, DeepSeek, and custom OpenAI-compatible providers.

Tasks:

- [x] Build settings page/panel.
- [x] Add provider selector.
- [x] Add base URL field.
- [x] Add model field.
- [x] Add API key field.
- [x] Add test connection button.
- [x] Store provider settings locally.
- [x] Add provider abstraction.
- [x] Implement OpenAI-compatible chat completions adapter.

Acceptance:

- User can configure OpenAI.
- User can configure DeepSeek.
- User can configure a custom OpenAI-compatible endpoint.
- Test connection reports success/failure clearly.

## Milestone 8: AI Node Intelligence

Goal: generate useful node titles and summaries.

Tasks:

- [x] Prompt for title generation.
- [x] Prompt for summary generation.
- [x] Add per-node "Summarize" action.
- [x] Add batch summarize action.
- [x] Add auto-summarize setting.
- [x] Add loading/error states.
- [x] Preserve user edits when AI reruns.

Acceptance:

- AI titles are short and useful.
- AI summaries improve scanning.
- User can override AI output.

## Milestone 9: AI Link Suggestions

Goal: make AI the primary way to create semantic links, while keeping manual editing as correction and fallback.

Tasks:

- [x] Define edge suggestion JSON schema.
- [x] Implement candidate node selection.
- [x] Prompt model to classify relationships.
- [x] Let AI generate relationship type, label, reason, confidence, and important-link flag.
- [x] Show pending suggested edges.
- [x] Accept suggestion.
- [x] Reject suggestion.
- [x] Change suggested edge type before accepting.
- [x] Add confidence/reason display.
- [x] Limit suggestions per node.

Acceptance:

- AI suggests useful links between turns as the primary linking workflow.
- Suggestions are easy to accept or reject.
- Manual edge editing remains available for correction and fallback.
- The graph remains readable.

## Milestone 10: Advanced Node Operations

Goal: support deeper manual organization.

Tasks:

- [x] Merge nodes.
- [x] Split node.
- [x] Duplicate node as note.
- [x] Convert edge into node note.
- [x] Bulk select.
- [x] Bulk tag/status update.

Acceptance:

- Users can reshape the map beyond the original conversation structure.
- Source anchors remain understandable after merge/split.

## Milestone 11: Full-Page Mode

Goal: support deep organization on a large canvas.

Tasks:

- [x] Add extension full-page route.
- [x] Reuse graph components.
- [x] Add larger toolbar.
- [x] Add export controls.
- [x] Add layout controls.
- [x] Add search panel.

Acceptance:

- Users can open a full-page map for the current conversation.
- Edits sync with side panel state.

## Milestone 12: Floating Panel

Goal: provide quick navigation inside ChatGPT page.

Tasks:

- [x] Add floating panel injection.
- [x] Add compact map/list view.
- [x] Add collapse/expand.
- [x] Add user setting to enable/disable.
- [x] Avoid overlap with ChatGPT controls.

Acceptance:

- Floating panel is useful but unobtrusive.
- It can be disabled.

## Milestone 13: Quality, Security, and Release

Goal: prepare for real users.

Tasks:

- [x] Test on long conversations.
- [x] Test on regenerated answers.
- [x] Test on branched ChatGPT conversations.
- [x] Test on slow network.
- [x] Test provider failure paths.
- [x] Review permissions.
- [x] Review API key storage warning.
- [x] Add privacy statement.
- [x] Prepare Edge Add-ons listing materials.

Acceptance:

- Core flow is stable across realistic ChatGPT sessions.
- Extension permissions are minimal.
- Users understand what data is local and what is sent to model APIs.
