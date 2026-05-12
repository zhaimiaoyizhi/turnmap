# ChatMap 0.1.0 Release Notes

## Scope

ChatMap 0.1.0 is the first local test release for the Edge extension. It focuses on current-conversation mapping, reliable conversation extraction, editable graph workflows, AI-assisted summaries and links, and export/import recovery.

## Included

- Edge side panel for ChatGPT conversations.
- Full-page graph mode linked back to the source ChatGPT tab.
- Floating in-page navigator for quick turn access.
- Full conversation extraction through API, stored data, and DOM/deep-scan fallbacks.
- Turn-based graph with Single-side, Radial, Matrix, and Two-sided layouts.
- Editable nodes, notes, root/header node, user edges, and automatic edges.
- Undo/redo for graph changes.
- Tags, statuses, merge, split, duplicate as note, hide, and reset workflows.
- Search and node focus.
- AI summaries and AI link suggestions with OpenAI, DeepSeek, and compatible custom endpoints.
- Dedicated Settings Page for AI, interface, Float, launcher, and update preferences.
- ChatGPT Floating Launcher on ChatGPT pages. Left-click opens ChatMap; right-click opens settings.
- JSON import/export, Obsidian Canvas export, Markdown export/copy, SVG export, and PNG export.
- Local graph-state persistence per current conversation.

## Planned Before Public Release

- Update Notice for GitHub Release or future store-version awareness.

## Known Risks

- Identical repeated prompts can still reduce jump precision in some conversations.
- Real ChatGPT DOM and backend behavior can change without warning, so extraction fallbacks should be checked periodically.
- Store submission may require PNG extension icons even though the local build accepts the SVG placeholder.
- Custom AI providers depend on their OpenAI-compatible response format and CORS/host permissions.

## Package Command

Run:

```powershell
npm.cmd run package
```

Output:

```text
release/chatmap-v0.1.0.zip
release/README.txt
```
