// Combines the multi-file SE_map site into one self-contained HTML file
// suitable for publishing as a Claude Artifact (phone-accessible link).
// The project's real source of truth stays the multi-file version in
// index.html / culture.html / css / js — this is a generated export.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = process.argv[2] || path.join(ROOT, "build", "se-map-artifact.html");

async function read(rel) {
  return readFile(path.join(ROOT, rel), "utf8");
}

function stripThemeToggleWiring(js) {
  return js.replace(
    /document\.getElementById\("theme-toggle"\)\.addEventListener\("click", \(\) => window\.SETheme\.toggle\(\)\);\s*/g,
    ""
  );
}

// The artifact-hosting environment has an (undocumented, empirically found)
// size limit on inline <style> content — plain style.css comfortably clears
// it for a normal web page, but this bundle needs to fit under it. None of
// these cuts change rendered output; they just drop redundant bytes:
// comments, hover states (irrelevant on the touch devices this link targets),
// CSS transitions, the reduced-motion media query, and whitespace.
function minifyCssForArtifact(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/[^{}]+:hover(?:,[^{}]*:hover)*\s*\{[^}]*\}/g, "")
    .replace(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^{}]*\{[^}]*\}[^{}]*\}/g, "")
    .replace(/\s*transition:[^;]+;/g, "")
    .replace(/\s*animation-duration:[^;]+;/g, "")
    .replace(/\s*animation-delay:[^;]+;/g, "")
    .replace(/\s*animation:[^;]+;/g, "")
    .replace(/@keyframes blob-drift\s*\{[^}]*\{[^}]*\}[^}]*\{[^}]*\}[^}]*\{[^}]*\}\s*\}/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .replace(/\{\s*\}/g, "{}")
    .replace(/[^{}]+\{\}/g, "")
    .trim();
}

async function main() {
  const css = minifyCssForArtifact(await read("css/style.css"));
  const geoData = await read("js/geo-data.js");
  const dataPortugal = await read("js/data-portugal.js");
  const cultureData = await read("js/culture-data.js");
  const project = await read("js/project.js");
  const theme = await read("js/theme.js");
  const visited = await read("js/visited.js");
  const mapApp = stripThemeToggleWiring(await read("js/map-app.js"));
  const cultureApp = stripThemeToggleWiring(await read("js/culture-app.js"));

  // Artifact-only: nav is <button> based (single-page section switch)
  // instead of <a href> between two files, so give buttons the same look
  // as the local site's nav links.
  const extraCss = `.nav-links button{font-family:var(--fu);font-size:.85rem;color:var(--is);background:none;border:none;cursor:pointer;padding:8px 18px;border-radius:999px}.nav-links button.active{background:var(--nv);color:var(--pn)}#section-map[hidden],#section-culture[hidden]{display:none}`;

  const html = `<meta charset="utf-8" />
<title>SE Map — 유럽 여행 지도</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
${css}
${extraCss}
</style>

<div class="blob-field">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
  <div class="blob blob-4"></div>
</div>

<div class="app">
  <header class="top-nav">
    <span class="brand"><span class="brand-dot"></span>SE Map</span>
    <nav class="nav-links">
      <button type="button" class="active" data-target="map">지도</button>
      <button type="button" data-target="culture">문화</button>
    </nav>
    <div class="nav-utility">
      <button class="pill icon-btn" id="export-btn" title="방문 기록 내보내기">⇩ 내보내기</button>
      <button class="pill icon-btn" id="import-btn" title="방문 기록 가져오기">⇧ 가져오기</button>
      <input type="file" id="import-file" accept="application/json" hidden />
      <button class="theme-toggle" id="theme-toggle" title="테마 전환">◐</button>
    </div>
  </header>

  <main>
    <div id="section-map">
      <section id="world-screen" class="screen">
        <div class="world-head">
          <p class="eyebrow">유럽 여행 지도</p>
          <h1>발자국을 남길 다음 나라</h1>
          <p class="sub">완성된 국가를 클릭하면 도시와 명소를 볼 수 있어요.</p>
        </div>
        <div class="world-map-wrap panel" id="world-map-wrap">
          <svg id="world-svg" viewBox="0 0 960 500"></svg>
        </div>
      </section>

      <section id="country-screen" class="screen" hidden>
        <div class="back-row">
          <button class="pill" id="back-btn">← 세계지도로</button>
        </div>
        <div class="country-head">
          <p class="eyebrow" id="country-eyebrow"></p>
          <h1 id="country-title"></h1>
          <p class="country-stats" id="country-stats"></p>
        </div>

        <div class="country-layout">
          <div class="country-map-col panel">
            <svg id="country-svg"></svg>
          </div>
          <div class="country-side-col">
            <input type="search" id="search-input" class="search-input" placeholder="명소 이름 검색" />
            <div class="filter-pills" id="filter-pills"></div>
            <div class="city-quicklinks" id="city-quicklinks"></div>
          </div>
        </div>

        <div class="city-sections" id="city-sections"></div>
      </section>
    </div>

    <div id="section-culture" hidden>
      <section class="culture-head">
        <p class="eyebrow">문화 노트</p>
        <h1>나라마다 다른 결</h1>
        <p class="sub">도시가 아니라 나라 단위로 정리하는 여행 문화 노트예요.</p>
      </section>
      <div class="country-culture-grid" id="country-culture-grid"></div>
      <div class="culture-profiles" id="culture-profiles"></div>
    </div>
  </main>
</div>

<script>
${geoData}
${dataPortugal}
${cultureData}
${project}
${theme}
${visited}
${mapApp}
${cultureApp}

(function () {
  function showSection(name) {
    document.getElementById("section-map").hidden = name !== "map";
    document.getElementById("section-culture").hidden = name !== "culture";
    document.querySelectorAll(".nav-links button").forEach((b) => {
      b.classList.toggle("active", b.dataset.target === name);
    });
  }
  document.querySelectorAll(".nav-links button").forEach((b) => {
    b.addEventListener("click", () => showSection(b.dataset.target));
  });
  document.getElementById("theme-toggle").addEventListener("click", () => window.SETheme.toggle());
})();
</script>
`;

  await writeFile(OUT, html, "utf8");
  console.log(`Wrote ${OUT} (${(html.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
