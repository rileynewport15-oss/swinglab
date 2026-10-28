// Lists every drill video and training aid link in src/data/improvements.ts
// that is still a placeholder, as a Markdown checklist.
// Run: npm run links
// (Node 22.6+ can load the TypeScript data file directly.)
import { IMPROVEMENTS } from "../src/data/improvements.ts";

// Shared drills and aids appear under several issues; list each one once.
const videos = new Map();
const aids = new Map();
for (const [key, { drills, aids: issueAids }] of Object.entries(IMPROVEMENTS)) {
  for (const d of drills) if (!d.youtubeId) videos.set(d.name, [...(videos.get(d.name) ?? []), key]);
  for (const a of issueAids) if (!a.url) aids.set(a.name, [...(aids.get(a.name) ?? []), key]);
}

console.log(`## YouTube drill videos (${videos.size})\n`);
for (const [name, keys] of videos) console.log(`- [ ] **${name}**: set \`youtubeId\` (used by ${keys.join(", ")})`);
console.log(`\n## Training aid product links (${aids.size})\n`);
for (const [name, keys] of aids) console.log(`- [ ] **${name}**: set \`url\` (used by ${keys.join(", ")})`);
