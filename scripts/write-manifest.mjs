import { mkdir, writeFile } from "node:fs/promises";
import manifest from "../src/manifest.ts";

await mkdir("dist", { recursive: true });
await writeFile("dist/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

