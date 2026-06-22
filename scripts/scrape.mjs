import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "oriz-api-bot/0.1 (+https://oriz.in/about)";
const today = new Date().toISOString().slice(0, 10);

const FALLBACK = {
  INR: 83.5, EUR: 0.92, GBP: 0.79, JPY: 150.0,
  AUD: 1.52, CAD: 1.36, CNY: 7.2, AED: 3.67
};

const UPSTREAMS = [
  {
    name: "frankfurter.app",
    url: "https://api.frankfurter.app/latest?from=USD",
    extract: (j) => j.rates
  },
  {
    name: "exchangerate.host",
    url: "https://api.exchangerate.host/latest?base=USD",
    extract: (j) => j.rates
  },
  {
    name: "open.er-api.com",
    url: "https://open.er-api.com/v6/latest/USD",
    extract: (j) => j.rates
  }
];

async function fetchOne(u) {
  try {
    const r = await fetch(u.url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20000)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const rates = u.extract(j);
    if (!rates || typeof rates !== "object") throw new Error("no rates in payload");
    return { name: u.name, ok: true, rates };
  } catch (e) {
    console.warn(`[fx] ${u.name} failed:`, e.message);
    return { name: u.name, ok: false };
  }
}

function median(nums) {
  const s = nums.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function main() {
  const results = await Promise.all(UPSTREAMS.map(fetchOne));
  const ok = results.filter((r) => r.ok && r.rates);
  let rates = FALLBACK;
  if (ok.length > 0) {
    const all = {};
    for (const r of ok) {
      for (const [k, v] of Object.entries(r.rates)) {
        if (typeof v === "number" && isFinite(v)) {
          (all[k] = all[k] || []).push(v);
        }
      }
    }
    rates = Object.fromEntries(
      Object.entries(all).map(([k, arr]) => [k, +median(arr).toFixed(6)])
    );
  }
  const out = {
    source: "aggregate",
    date: today,
    fetchedAt: new Date().toISOString(),
    base: "USD",
    count: Object.keys(rates).length,
    sources: results.map((r) => ({ name: r.name, ok: r.ok })),
    rates
  };
  const dataDir = join(ROOT, "data");
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, `rates-${today}.json`), JSON.stringify(out, null, 2));
  await writeFile(join(dataDir, "latest.json"), JSON.stringify(out, null, 2));
  console.log(`[fx] wrote ${out.count} rates from ${ok.length}/${UPSTREAMS.length} upstreams`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
