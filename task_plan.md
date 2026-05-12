# Task Plan: ChatMap Light Tech UI Preview

## Goal
Create a new non-overwriting ChatMap UI version with a bright, concise, elegant, minimal technology aesthetic, then package it as a new version and record the work in the changelog.

## Current Phase
Phase 9

## Phases

### Phase 1: Requirements & Discovery
- [x] Read requested `ui-ux-pro-max` skill.
- [x] Read requested `planning-with-files` skill.
- [x] Confirm non-overwrite strategy.
- [x] Review current UI CSS.
- **Status:** complete

### Phase 2: Design System & Planning
- [x] Create persistent planning files.
- [x] Document design direction in `findings.md`.
- [x] Identify files to change.
- **Status:** complete

### Phase 3: Implementation
- [x] Create light tech UI in source styles.
- [x] Bump version to a new package version.
- [x] Update changelog.
- **Status:** complete

### Phase 4: Testing & Packaging
- [x] Run `npm.cmd run typecheck`.
- [x] Run `npm.cmd run build`.
- [x] Run `npm.cmd run package`.
- [x] Confirm old `v0.1.0` package remains.
- **Status:** complete

### Phase 5: Delivery
- [x] Summarize files changed.
- [x] Report new package path.
- [x] Note any residual risks.
- **Status:** complete

### Phase 6: 0.1.2 Icon Layout Upgrade
- [x] Re-read requested `ui-ux-pro-max` skill.
- [x] Add a consistent lightweight icon system.
- [x] Add icons to the app header, view menu, graph toolbar, and file menu.
- [x] Preserve the light-first minimal technology direction.
- [x] Bump version to `0.1.2`.
- [x] Run typecheck, build, and package.
- [x] Confirm `release/chatmap-v0.1.2.zip` exists without deleting prior archives.
- **Status:** complete

### Phase 7: 0.1.2 Theme & Layering Polish
- [x] Fix View dropdown stacking above the graph toolbar.
- [x] Add persisted theme setting.
- [x] Add Day, Night, and Eye-care themes.
- [x] Keep Day as the default theme.
- [x] Run typecheck, build, and package.
- [x] Confirm `release/chatmap-v0.1.2.zip` is refreshed.
- **Status:** complete

### Phase 8: 0.1.2 Browser Theme & Localization
- [x] Add Follow browser theme option.
- [x] Add built-in English and Chinese UI dictionaries.
- [x] Add Follow browser language detection.
- [x] Add Settings language selector.
- [x] Add AI-generated custom language translation flow.
- [x] Save custom language options and translated UI labels locally.
- [x] Adjust text wrapping for longer translated labels.
- [x] Run typecheck and build.
- [x] Repackage `release/chatmap-v0.1.2.zip`.
- **Status:** complete

### Phase 9: GitHub 0.1.0 Version Remap
- [x] Re-run current typecheck and build before remapping.
- [x] Rename former local `0.1.0` archive to `0.8.0`.
- [x] Rename former local `0.1.1` archive to `0.9.0`.
- [x] Move former local `0.1.2` archive aside before creating the GitHub release package.
- [x] Set package and manifest version to `0.1.0`.
- [x] Update changelog and release notes for GitHub preview `0.1.0`.
- [x] Rebuild and package latest `release/chatmap-v0.1.0.zip`.
- [x] Check GitHub release readiness.
- **Status:** complete

## Key Questions
1. How do we avoid overwriting the existing release? Use branch `ui-light-tech-preview`, version `0.1.1`, and a new `release/chatmap-v0.1.1.zip`.
2. What should the UI feel like? Light-first, clean, elegant, minimal technology, with low visual noise and strong readability.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use a new Git branch | Keeps the existing `main` and `v0.1.0` release intact. |
| Bump to `0.1.1` | Manifest versions cannot use preview suffixes; numeric version creates a separate package file. |
| Restyle existing components instead of adding a parallel app shell | Lower risk and keeps behavior unchanged. |
| Preserve old release archives in packaging | Avoids overwriting or deleting the existing `v0.1.0` package when building `0.1.1`. |
| Add local lightweight SVG icons for `0.1.2` | No icon dependency is installed in the current package; local SVG paths avoid network/dependency churn while keeping one consistent icon style. |
| Implement themes through CSS variables | Keeps Side Panel, Full Page, and Settings visually consistent without duplicating layouts. |
| Localize with key-value dictionaries | Safer for layout compatibility than runtime DOM text replacement and allows custom AI translations to fall back per key. |
| Publish current full feature set as `0.1.0` | The old `0.1.x` numbers were local preview iterations; GitHub release should start at a clean public preview version. |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| `ui-ux-pro-max` script/data paths are placeholder files and target paths are unavailable | 1 | Use the skill's written UI rules directly and document this in `findings.md`. |
