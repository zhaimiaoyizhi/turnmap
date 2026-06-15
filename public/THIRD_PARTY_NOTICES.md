# Third Party Notices

## ophel

TurnMap 0.8.0.1 includes an experimental ChatGPT extraction and navigation path
derived from the ophel project for local testing.

- Project: https://github.com/urzeye/ophel
- Reference commit: 3bb0c469f632a54c6308b498562218e7eac60a77
- Copyright: ophel contributors
- License: GPL-3.0-only

The affected TurnMap implementation is primarily in
`src/content/chatgpt-ophel-navigation.ts`, where the ChatGPT native table of
contents, message id, turn shell cache, target remount wait, and shell revive
ideas are adapted for TurnMap's runtime.

The GPL-3.0-only license text is included at `third_party/ophel/LICENSE`.
