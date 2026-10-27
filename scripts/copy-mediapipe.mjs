// Copies MediaPipe's WebAssembly engine files from node_modules into public/
// so the browser can load them from our own site. Runs before `dev` and `build`
// (see package.json), so the files always match the installed package version.
import { cpSync, mkdirSync } from "node:fs";

const from = "node_modules/@mediapipe/tasks-vision/wasm";
const to = "public/mediapipe/wasm";
const files = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

mkdirSync(to, { recursive: true });
for (const file of files) cpSync(`${from}/${file}`, `${to}/${file}`);
console.log(`Copied MediaPipe wasm files to ${to}`);
