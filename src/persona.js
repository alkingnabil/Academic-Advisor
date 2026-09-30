import { readFileSync } from "node:fs";

const KB_FILES = {
  persona: "knowledge/persona.md",
  committee: "knowledge/committee.md",
  regulations: "knowledge/regulations.md",
  faq: "knowledge/faq.md",
  courses: "knowledge/courses.json",
};
const MAX_FACTS_IN_PROMPT = 25;

const knowledge = Object.fromEntries(
  Object.entries(KB_FILES).map(([key, path]) => [key, readFileSync(path, "utf8")]),
);

const courseLines = JSON.parse(knowledge.courses)
  .map((course) => {
    const prereqs = course.prereqs.length ? ` | متطلبات: ${course.prereqs.join("، ")}` : "";
    const gate = course.minHours ? ` | يفتح بعد ${course.minHours} ساعة معتمدة` : "";
    return `${course.code} — ${course.nameAr} / ${course.nameEn} (${course.hours} ساعات)${prereqs}${gate}`;
  })
  .join("\n");

function factsBlock(facts) {
  if (!facts.length) return "";
  const listed = facts.slice(-MAX_FACTS_IN_PROMPT).map((fact) => `- ${fact}`).join("\n");
  return `\n\n# ذاكرة المجموعة (معلومات ثابتة من محادثات الطلاب)\n${listed}`;
}

export function buildSystemPrompt({ isGroup, facts = [] }) {
  const place = isGroup
    ? "أنت الآن في مجموعة الإرشاد الأكاديمي (جروب قسم علوم الحاسب). " +
      "البوت بيزود مناداة الطالب تلقائيًا في أول الرد — ابدأ بالإجابة مباشرة من غير ما تكرر اسمه."
    : "أنت الآن في محادثة خاصة (DM) مع طالب. رد مباشر وودود، ولو الحالة محتاجة الاطلاع على " +
      "سجل أكاديمي أو بيانات شخصية اطلب منها التواصل مع المرشد المسؤول أو شؤون الطلاب.";
  return [
    knowledge.persona,
    `\n\n# مكانك الآن\n${place}`,
    `\n\n# قواعد لجنة الإرشاد الأكاديمي\n${knowledge.committee}`,
    `\n\n# خلاصة اللائحة الدراسية\n${knowledge.regulations}`,
    `\n\n# أسئلة وإجابات حقيقية من مجموعة الإرشاد (نبرة ومحتوى)\n${knowledge.faq}`,
    `\n\n# خريطة المقررات (الكود — الاسم — الساعات — المتطلبات)\n${courseLines}`,
    factsBlock(facts),
  ].join("");
}
