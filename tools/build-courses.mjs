import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// docs/raw-data.json holds the course map RAW array as extracted from
// docs/course-map.html. JSON.parse is the gate: malformed input exits non-zero.
const raw = JSON.parse(readFileSync("docs/raw-data.json", "utf8"));

const DEPT_BY_PREFIX = {
  CS: "CS", IS: "IS", IT: "IT", AI: "AI",
  MA: "عام", PH: "عام", EE: "عام", HU: "عام", TR: "عام",
};

const courses = raw.map((c) => ({
  code: c.c,
  nameAr: c.a,
  nameEn: c.e,
  hours: c.cr,
  prereqs: c.p ?? [],
  minHours: c.g ?? null,
  dept: DEPT_BY_PREFIX[String(c.c).replace(/[0-9]/g, "")] ?? "عام",
}));

mkdirSync("knowledge", { recursive: true });
writeFileSync("knowledge/courses.json", JSON.stringify(courses, null, 1), "utf8");

const codes = new Set(courses.map((x) => x.code));
const dangling = courses.flatMap((x) => x.prereqs).filter((p) => !codes.has(p));
const byDept = {};
for (const x of courses) byDept[x.dept] = (byDept[x.dept] || 0) + 1;

console.log("courses:", courses.length);
console.log("byDept:", JSON.stringify(byDept));
console.log("dangling prereqs:", JSON.stringify(dangling));
