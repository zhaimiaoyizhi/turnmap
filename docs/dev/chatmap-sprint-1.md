# ChatMap Sprint 1 Plan

## Sprint Goal

Build the smallest real prototype:

- Edge extension loads.
- Side panel opens.
- ChatGPT turns are extracted.
- The conversation title appears as the center node.
- Turns appear as React Flow nodes.
- Turn nodes are automatically linked to the center node.
- Clicking a node jumps to the original ChatGPT turn.

## Sprint 1 Scope

Included:

- Project scaffold.
- Manifest V3 extension shell.
- Content script.
- Side panel app.
- Basic turn extraction.
- Basic scroll-harvest extraction for loaded ChatGPT history.
- Basic graph rendering.
- Center-title node and automatic title-to-turn links.
- Basic jump-to-source.

Excluded:

- AI features.
- Export.
- Full-page mode.
- Floating mode.
- Advanced editing.
- Store packaging.

## Proposed File Structure

```text
chatmap/
  package.json
  tsconfig.json
  vite.config.ts
  public/
    manifest.json
    icons/
  src/
    background/
      service-worker.ts
    content/
      index.ts
      chatgpt-observer.ts
      turn-extractor.ts
      jump-controller.ts
    side-panel/
      index.html
      main.tsx
      App.tsx
      graph/
        ChatMapCanvas.tsx
        TurnNode.tsx
    shared/
      types.ts
      messaging.ts
      hash.ts
```

## Key Technical Decisions

- Use React Flow for graph rendering.
- Use one node per question-answer turn.
- Use deterministic fallback titles before AI exists.
- Use message passing between side panel and content script.
- Use in-memory state first, then add persistence in Sprint 2.

## Sprint 1 Acceptance Criteria

- Extension can be loaded unpacked in Edge.
- Opening ChatGPT and then the side panel shows a graph.
- Each visible question-answer turn maps to one node.
- Node title is derived from the user question.
- Clicking a node scrolls to the matching turn.
- Target turn receives a temporary visual highlight.

## Known Unknowns To Resolve During Sprint

- The most stable selectors for ChatGPT user and assistant message blocks.
- Whether all messages remain in DOM on long conversations.
- How reliably turn index survives regenerated answers and branches.
- Whether Edge side panel has any communication quirks compared with Chrome.
