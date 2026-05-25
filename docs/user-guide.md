# TurnMap User Guide

TurnMap turns the current ChatGPT conversation into an editable map.

## Opening TurnMap

Current views:

- Side Panel: compact map beside ChatGPT.
- Full Page: larger map view connected to the source ChatGPT tab.
- Float: compact in-page navigator on ChatGPT.
- ChatGPT Floating Launcher: right-side launcher on ChatGPT pages.

Launcher behavior:

- Left-click opens TurnMap.
- Right-click opens TurnMap settings.
- Drag moves the launcher; the position is saved locally.

## Settings

TurnMap has a dedicated settings page for global settings:

- AI provider, model, API key, and auto summarize.
- Default layout.
- Float default state.
- ChatGPT launcher visibility.
- Update notice preferences.

## Refreshing A Conversation

Use Refresh to read the current ChatGPT conversation. TurnMap tries several extraction methods and falls back to deep scanning when needed.

## Editing The Map

You can:

- Edit node title and summary.
- Drag nodes.
- Add, edit, and delete links.
- Change link type and importance.
- Add notes.
- Merge, split, hide, or tag nodes.
- Switch layouts.

## Organization And AI Features

Analyze Topics runs locally and does not require a configured provider or API key. AI summary, Suggest Links, AI translation, and auto summarize require a configured provider and API key.

- Analyze Topics: preclassifies likely topic-related link candidates from node titles, summaries, tags, distance, and existing links. Candidates appear in the suggestion panel and must be accepted before the graph changes.
- Link suggestions remain editable before acceptance. If there are more suggestions than fit on screen, the suggestion panel scrolls internally.
- Summarize: creates compact titles and summaries.
- Turn nodes keep jump accuracy after AI summary or manual title/summary edits because TurnMap still jumps by stored source anchors, not by display text.
- Deep-research-style folded replies may expose the user message before the full assistant answer. TurnMap can use mapped user-message anchors as a conservative fallback, but it will avoid jumping to an unmapped duplicate prompt.
- Turn-node summary only fills blank or default title/summary fields; it does not overwrite fields you already rewrote by hand.
- Custom note nodes tagged `#AI` can be summarized manually from their tracked source turns.
- `#AI` note summary needs at least one tracked source turn. If a note has no source anchors yet, TurnMap will refuse the summary request instead of inventing unsupported context.
- Suggest Links: asks the configured AI provider to propose strong semantic links between non-adjacent related nodes.
- Suggest Links shows progress in the status bar while requesting, waiting for, filtering, and preparing suggestions for review.

Local topic analysis does not send conversation text to a provider. AI features send selected conversation text to the configured provider.

## Import And Export

Supported formats:

- TurnMap JSON
- Obsidian Canvas
- Markdown
- SVG
- PNG

Use TurnMap JSON when you want to restore and continue editing a map.

## Updates

GitHub/unpacked installs require manual updates. Planned Update Notice will tell users when a new release is available and provide links to the release page or zip package.

Store installs, once available, should update through the browser's extension update system.
