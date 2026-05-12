# Findings: ChatMap Light Tech UI Preview

## Skill Notes

- `ui-ux-pro-max` applies because the task changes visual design, UI structure, and perceived quality.
- The installed skill's `scripts` and `data` entries are placeholder files pointing to unavailable relative targets, so the scripted design-system search cannot be run in this environment.
- We will apply the skill's documented high-priority rules directly:
  - strong contrast and readable text;
  - visible focus states;
  - comfortable 44px-class controls where practical;
  - consistent icon/control styling;
  - stable dimensions for toolbars and nodes;
  - subtle motion only, with `prefers-reduced-motion` support;
  - no decorative blobs or noisy gradients.

## Design Direction

Target aesthetic: light-first, concise, elegant, minimal technology.

Design tokens:

- Background: cool off-white / pale blue surface rather than beige.
- Primary accent: clean cyan-blue.
- Secondary accent: soft teal.
- Text: neutral slate with strong contrast.
- Borders: blue-gray, subtle but crisp.
- Shadows: lower, cooler, less brown than the current release.
- Radius: 8px or less for cards and panels, matching existing product-tool guidance.

## Current UI Observations

- Existing UI is functional but warmer and more beige than the requested direction.
- Header, toolbar, panels, nodes, and settings page share CSS tokens, so a token-led restyle can cover most of the product without behavioral changes.
- Content script floating panel has inline CSS and must be updated separately.

## Files Expected To Change

- `src/side-panel/styles.css`
- `src/side-panel/components/Icon.tsx`
- `src/side-panel/App.tsx`
- `src/side-panel/graph/ChatMapCanvas.tsx`
- `src/settings-page/settings-page.css`
- `src/content/index.ts`
- `package.json`
- `package-lock.json`
- `src/manifest.ts` or generated manifest source if version is duplicated there
- `CHANGELOG.md`
- planning files

## 0.1.2 Icon Layout Notes

- The package does not currently include a dedicated icon library such as Lucide.
- To avoid dependency and network changes, `0.1.2` uses a small local SVG icon component with one stroke style.
- Icon-only controls are avoided in the main toolbar; controls keep text labels for accessibility and scanability.
- Responsive wrapping is kept for narrow Edge side panels so the toolbar remains usable instead of overflowing horizontally.

## 0.1.2 Theme Notes

- Day remains the default theme for existing users and fresh installs.
- Theme settings are stored locally in `chrome.storage.local` under `chatmap.interface.theme`.
- The Settings Page applies theme changes immediately while editing; saving persists the selected theme.
- Side Panel and Full Page read the persisted theme on startup and react to storage changes.

## 0.1.2 Localization Notes

- Built-in English and Chinese dictionaries are key-based and do not modify user conversation content.
- Browser language mode resolves Chinese browser languages to Chinese and other languages to English.
- Custom AI translation sends only ChatMap UI labels and placeholders, not conversation history.
- Custom translations are stored in `chrome.storage.local` under `chatmap.interface.customLanguages`.
- Missing custom translation keys fall back to English labels for layout safety.
- Controls keep text labels and allow wrapping to reduce overflow risk in longer languages.

## GitHub 0.1.0 Version Remap

- The old `0.1.0`, `0.1.1`, and `0.1.2` archives were local development previews, not public GitHub releases.
- For GitHub, the latest full feature set should become the clean public preview `0.1.0`.
- Historical local archives are retained as `0.8.0` and `0.9.0` to avoid losing them while preventing conflict with the public `0.1.0`.
- The temporary `release/chatmap-v0.1.0.previous-dev.zip` safety copy was removed after the final GitHub `0.1.0` package was generated.
