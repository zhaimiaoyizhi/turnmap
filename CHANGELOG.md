# Changelog

All notable changes to ChatMap will be documented in this file.

## [0.1.0] - GitHub Preview

### Added

- Edge side panel for ChatGPT conversation mapping.
- Full Page view and Float view.
- Turn-based map with click-to-jump navigation.
- Full conversation extraction through ChatGPT API, structured data, web storage, DOM, and deep-scan fallbacks.
- Editable nodes, notes, tags, statuses, hidden nodes, root/header edits, and relationship links.
- Layouts: Single-side, Radial, Matrix, and Two-sided.
- AI summaries and AI semantic link suggestions.
- OpenAI, DeepSeek, and custom OpenAI-compatible provider settings.
- Dedicated Settings Page for AI, interface, Float, launcher, and update preferences.
- ChatGPT Floating Launcher with left-click open, right-click settings, drag, and saved position.
- ChatMap JSON import/export.
- Obsidian Canvas, Markdown, SVG, and PNG export.
- Lightweight in-app SVG icon system for the side panel and graph toolbar.
- Icon-enhanced header, view menu, layout picker, graph actions, and file menu.
- Theme switcher in Settings with Day, Night, and Eye-care themes.
- Follow browser theme option that resolves to Day or Night from `prefers-color-scheme`.
- Built-in UI language switching for English and Chinese, with Follow browser language detection.
- AI-assisted custom UI translation generation for additional languages, saved locally as reusable language options.
- GitHub README preview screenshot and Chinese social launch copy.

### Changed

- Refined the main header into a clearer app brand block while preserving the light technology style.
- Improved toolbar scanability with consistent icon + label controls and responsive wrapping for narrow side panels.
- Kept Day as the default `0.1.2` theme and persist user theme selection locally.
- Kept language and custom translation text local in extension storage.
- Updated core app chrome, toolbar, Settings, AI settings, layout labels, and relationship labels to use localized UI text.
- Raised the View menu stacking layer so it appears above the graph toolbar.
- Restyled React Flow controls and MiniMap with theme-aware colors so Night mode controls remain visible.
- Updated README roadmap with future multi-AI-site, multi-browser, and broader API provider compatibility plans.
- Restored the Chinese README as readable UTF-8 documentation.

### Known Issues

- Identical repeated prompts can reduce jump precision.
- ChatGPT DOM or backend changes can affect extraction.
- GitHub/unpacked installs require manual updates.
- Store publication requires additional icon and listing assets.

## [0.9.0] - Light Tech UI Preview

### Changed

- Restyled the side panel, full page map UI, graph nodes, toolbar, menus, panels, settings page, floating navigator, and launcher with a brighter minimal technology aesthetic.
- Shifted the visual system from warm beige surfaces to cool white, pale blue, cyan, and teal design tokens.
- Improved focus states, hover states, surface hierarchy, and reduced visual noise while keeping existing interactions unchanged.

## [0.8.0] - Early Preview

### Added

- Release packaging script.

### Version Mapping

- Former local `0.1.0` preview archive is retained as `0.8.0`.
- Former local `0.1.1` UI preview archive is retained as `0.9.0`.
- Former local `0.1.2` work is now the GitHub preview release `0.1.0`.
