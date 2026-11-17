// Gera dist/contrib.svg: o gráfico de contribuições do último ano, animado.
// Um gato preto atravessa o gráfico e cada coluna brilha quando ele passa.
// Uso: node scripts/contrib.mjs <usuario> [saida.svg]   (--sample usa dados de exemplo)
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [user = "Gabrielhyds", out = "dist/contrib.svg"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const sample = process.argv.includes("--sample");

async function fetchDays() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  const res = await fetch(`https://github.com/users/${user}/contributions`, { signal: ctrl.signal });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`);
  const html = await res.text();
  const days = [];
  for (const tag of html.match(/<td[^>]*data-date="[^"]+"[^>]*>/g) ?? []) {
    const date = tag.match(/data-date="([^"]+)"/)[1];
    const level = Number(tag.match(/data-level="(\d)"/)?.[1] ?? 0);
    days.push({ date, level });
  }
  const total = Number((html.match(/([\d,.]+)\s+contributions?\s+in the last year/) ?? [, "0"])[1].replace(/[,.]/g, ""));
  if (!days.length) throw new Error("nenhum dia encontrado na página");
  return { days: days.sort((a, b) => a.date.localeCompare(b.date)), total };
}

function sampleDays() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const days = [];
  const end = new Date();
  for (let i = 370; i >= 0; i--) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    const busy = Math.sin(i / 23) + Math.sin(i / 7) * 0.5 + rnd();
    days.push({ date: d.toISOString().slice(0, 10), level: busy < 0.6 ? 0 : Math.min(4, Math.floor(busy * 1.6)) });
  }
  return { days, total: 1234 };
}

const { days, total } = sample ? sampleDays() : await fetchDays();

// posiciona cada dia: coluna = semana, linha = dia da semana (domingo em cima)
const first = new Date(days[0].date + "T00:00:00Z");
const offset = first.getUTCDay();
const cells = days.map((d, i) => ({ ...d, col: Math.floor((i + offset) / 7), row: (i + offset) % 7 }));
const cols = cells.at(-1).col + 1;

const C = 11, G = 3, X0 = 40, Y0 = 46, W = X0 * 2 + cols * (C + G) - G;
const COLORS = ["#161b22", "#0c2d6b", "#1158c7", "#388bfd", "#79c0ff"];
const DUR = 14;            // segundos por volta
const WALK = 0.78;         // fração da volta em que o gato está andando
const PX = 3;              // tamanho de cada pixel do gato

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
let months = "", lastMonth = -1;
for (const c of cells) {
  const m = Number(c.date.slice(5, 7)) - 1;
  if (c.row === 0 && m !== lastMonth && c.col < cols - 2) {
    months += `<text x="${X0 + c.col * (C + G)}" y="${Y0 - 8}" class="lbl">${MESES[m]}</text>`;
    lastMonth = m;
  }
}

// atraso de cada coluna: o instante em que o gato passa por ela
const catStart = X0 - 70, catEnd = W + 10;
const delayOf = (col) => {
  const x = X0 + col * (C + G) + C / 2;
  return ((x - catStart - 40) / (catEnd - catStart)) * WALK * DUR;
};

const rects = cells.map((c) => {
  const x = X0 + c.col * (C + G), y = Y0 + c.row * (C + G);
  const intro = (c.col + c.row) * 0.012;
  return `<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="2" fill="${COLORS[c.level]}" class="c l${c.level}" style="transform-origin:${x + C / 2}px ${y + C / 2}px;animation-delay:${intro.toFixed(3)}s,${delayOf(c.col).toFixed(2)}s"/>`;
}).join("");

// gato preto andando, dois quadros de pernas
const CAT_TOP = [
  "............O..O..",
  "...........OBOOBO.",
  "OO.........OBBBBO.",
  ".OO.OOOOOOOOBEBBBO",
  "..OOBBBBBBBBBBBBPO",
  "...OBBBBBBBBBBBOO.",
  "...OBBBBBBBBBBBO..",
];
const LEGS_A = ["...OBO.OBO.OBO.OBO", "...OBO.OBO.OBO.OBO", "...OO..OO..OO..OO."].map((r) => r.slice(0, 18));
const LEGS_B = ["...OOBOOOOOBOOOBO.", "..OBO..OBO.OBO.OBO", "..OO...OO..OO..OO."];
const PAL = { O: "#4e5460", B: "#222228", E: "#b4c050", P: "#e6788c" };
const sprite = (rows) => rows.flatMap((r, y) => [...r].map((ch, x) => ch === "." ? "" :
  `<rect x="${x * PX}" y="${y * PX}" width="${PX}" height="${PX}" fill="${PAL[ch]}"/>`)).join("");
const catY = Y0 + 7 * (C + G) + 6;
const H = catY + 10 * PX + 14;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
.lbl{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#8b949e}
.ttl{font:600 14px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#f0f6fc}
.c{animation:pop .5s cubic-bezier(.3,1.6,.5,1) both,pass ${DUR}s linear infinite}
@keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes pass{0%{transform:scale(1);filter:none}1.5%{transform:scale(1.45) translateY(-2px);filter:brightness(1.9) drop-shadow(0 0 3px #79c0ff)}5%,100%{transform:scale(1);filter:none}}
.l0{animation-name:pop,pass0}
@keyframes pass0{0%{fill:#161b22}1.5%{fill:#30363d}5%,100%{fill:#161b22}}
.cat{animation:walk ${DUR}s linear infinite}
@keyframes walk{0%{transform:translate(${catStart}px,${catY}px);opacity:1}${(WALK * 100).toFixed(0)}%{transform:translate(${catEnd}px,${catY}px);opacity:1}${(WALK * 100 + 0.1).toFixed(1)}%,100%{transform:translate(${catEnd}px,${catY}px);opacity:0}}
.fa{animation:fa .36s steps(1) infinite}.fb{animation:fb .36s steps(1) infinite}
@keyframes fa{0%{opacity:1}50%{opacity:0}}@keyframes fb{0%{opacity:0}50%{opacity:1}}
</style>
<rect width="100%" height="100%" rx="10" fill="#0d1117"/>
<text x="${X0}" y="22" class="ttl">${total.toLocaleString("pt-BR")} contribuições no último ano</text>
${months}
${rects}
<line x1="${X0}" x2="${W - X0}" y1="${catY + 10 * PX}" y2="${catY + 10 * PX}" stroke="#21262d" stroke-width="2"/>
<g class="cat"><g class="fa">${sprite([...CAT_TOP, ...LEGS_A])}</g><g class="fb">${sprite([...CAT_TOP, ...LEGS_B])}</g></g>
</svg>`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`${out}: ${cells.length} dias, ${total} contribuições`);
