import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("docs/course-map.html", "utf-8");
const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
const raw = script.match(/const\s+RAW\s*=\s*([\s\S]*?);\s*(?:const|let|var|function|\/\/|\/\*)/);

if (!raw) {
  writeFileSync("docs/raw-head.txt", script.slice(0, 4000), "utf-8");
  console.log("RAW match failed — dumped script head to docs/raw-head.txt");
} else {
  writeFileSync("docs/raw-data.json", raw[1], "utf-8");
  console.log("RAW extracted:", raw[1].length, "chars");
}
