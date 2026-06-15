import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public package and extension branding use TurnMap", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.json", import.meta.url), "utf8"));
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const notices = await readFile(new URL("../public/THIRD_PARTY_NOTICES.md", import.meta.url), "utf8");

  assert.equal(packageJson.name, "turnmap");
  assert.equal(packageJson.version, "0.8.0.1");
  assert.equal(manifest.version, "0.8.0.1");
  assert.equal(manifest.name, "TurnMap");
  assert.equal(manifest.action.default_title, "Open TurnMap");
  assert.match(readme, /^# TurnMap/m);
  assert.match(notices, /urzeye\/ophel/);
  assert.match(notices, /GPL-3\.0-only/);
  assert.match(notices, /3bb0c469f632a54c6308b498562218e7eac60a77/);
});
