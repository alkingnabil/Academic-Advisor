import { readFileSync, writeFileSync } from "node:fs";

const cfg = JSON.parse(readFileSync("C:/Users/KinGO/.zcode/v2/provider_config.json", "utf8"));
const rules = cfg.config.providerConfigRules.providerRules;
const candidates = rules.filter((p) => p.enabled !== false && p.config?.api?.baseUrl && p.config?.access?.apiKey);
const order = ["SailResearch", "xKiro", "UnoRouter", "Nvidia-glm-5.3-flash", "Nvidia-glm-5.3", "Atria", "Atria CN", "dahl", "NaraRouter", "Nvidia-kimi-k3"];
const rank = (name) => { const i = order.indexOf(name); return i === -1 ? 99 : i; };
candidates.sort((a, b) => rank(a.providerName) - rank(b.providerName));

for (const p of candidates) {
  for (const model of (p.config.personalModelIds ?? []).slice(0, 3)) {
    const url = p.config.api.baseUrl.replace(/\/+$/, "") + "/chat/completions";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.config.access.apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "رد بكلمة واحدة فقط: جاهز" }],
          max_tokens: 100,
          temperature: 0,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) { console.log("fail:", p.providerName, "|", model, "|", res.status); continue; }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) { console.log("empty:", p.providerName, "|", model); continue; }
      console.log("WORKS:", p.providerName, "|", model, "|", JSON.stringify(content.slice(0, 40)));

      const envPath = ".env";
      const lines = readFileSync(envPath, "utf8").split("\n").filter((l) => l.trim());
      const kept = lines.filter((l) => !l.startsWith("LLM_") && !l.startsWith("# dahl-prev:"));
      const dahlPrev = lines.filter((l) => l.startsWith("LLM_")).map((l) => "# dahl-prev " + l);
      writeFileSync(envPath, [...kept, ...dahlPrev,
        `LLM_BASE_URL=${p.config.api.baseUrl.replace(/\/+$/, "")}`,
        `LLM_API_KEY=${p.config.access.apiKey}`,
        `LLM_MODEL=${model}`,
        ""].join("\n"));
      console.log("ENV UPDATED →", p.providerName, "|", model);
      process.exit(0);
    } catch (e) {
      console.log("fail:", p.providerName, "|", model, "|", e.name);
    }
  }
}
console.log("NO PROVIDER WITH CONTENT");
process.exit(1);
