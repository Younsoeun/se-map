// Fetches a representative photo for each attraction from Wikipedia's REST
// summary API and writes js/images.js (window.SE_MAP_IMAGES = { id: url }).
// Thumbnail URLs are upscaled to ~640px. Re-run to refresh.
//
// Usage: node build/fetch-images.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "js", "images.js");

// Attraction id → explicit Wikipedia (en) title, where the English name
// doesn't resolve directly. Filled in as misses are found.
const WIKI = {
  // Portugal
  "torre-de-belem": "Belém Tower",
  "mosteiro-dos-jeronimos": "Jerónimos Monastery",
  "castelo-de-sao-jorge": "São Jorge Castle",
  "palacio-nacional-da-ajuda": "Ajuda National Palace",
  "se-de-lisboa": "Lisbon Cathedral",
  "palacio-da-pena": "Pena Palace",
  "castelo-dos-mouros": "Castle of the Moors",
  "castelo-de-obidos": "Castle of Óbidos",
  "rua-direita-obidos": "Óbidos, Portugal",
  "praia-do-norte": "Praia do Norte (Nazaré)",
  "sitio-da-nazare": "Nazaré, Portugal",
  "universidade-de-coimbra": "University of Coimbra",
  "se-velha-de-coimbra": "Old Cathedral of Coimbra",
  "convento-de-cristo": "Convent of Christ (Tomar)",
  "ria-de-aveiro": "Aveiro, Portugal",
  "livraria-lello": "Livraria Lello",
  "torre-dos-clerigos": "Clérigos Church",
  "ribeira": "Praça da Ribeira",
  "bom-jesus-do-monte": "Bom Jesus do Monte",
  "se-de-braga": "Braga Cathedral",
  "castelo-de-guimaraes": "Castle of Guimarães",
  "paco-dos-duques-de-braganca": "Palace of the Dukes of Braganza",
  "templo-romano-de-evora": "Roman Temple of Évora",
  "capela-dos-ossos": "Capela dos Ossos",
  "praia-dona-ana": "Praia da Dona Ana",
  // France
  "notre-dame-paris": "Notre-Dame de Paris",
  "musee-orsay": "Musée d'Orsay",
  "sacre-coeur": "Sacré-Cœur, Paris",
  "versailles": "Palace of Versailles",
  "mont-st-michel-abbey": "Mont-Saint-Michel Abbey",
  "monet-giverny": "Giverny",
  "etretat-cliffs": "Étretat",
  "chambord": "Château de Chambord",
  "chenonceau": "Château de Chenonceau",
  "petite-france": "Petite France, Strasbourg",
  "petite-venise": "Colmar",
  "fourviere": "Basilica of Notre-Dame de Fourvière",
  "vieux-lyon": "Vieux Lyon",
  "annecy-lake": "Lake Annecy",
  "palais-des-papes": "Palais des Papes",
  "pont-avignon": "Pont Saint-Bénézet",
  "arles-arena": "Arles Amphitheatre",
  "promenade-anglais": "Promenade des Anglais",
  "vieux-nice": "Nice",
  "cite-carcassonne": "Cité de Carcassonne",
  "place-bourse": "Place de la Bourse",
};

// Explicit image URLs for attractions the pageimages API can't resolve
// (no lead image, or no English article). Sourced via Commons search.
// Special:FilePath?width= reliably generates any width for a given file.
const MANUAL_IMAGES = {
  "universidade-de-coimbra":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Joanina_Library_-_Coimbra_University.jpg?width=640",
  "musee-orsay":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Mus%C3%A9e_d%27Orsay%2C_North-West_view%2C_Paris_7e_140402.jpg?width=640",
  "praia-dona-ana":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Vista_Centro_Hist%C3%B3rico_de_Lagos_%28cropped%29.jpg?width=640",
};

function loadData(rel) {
  const win = { SE_MAP_DATA: {} };
  // eslint-disable-next-line no-new-func
  new Function("window", readFileSyncCache(path.join(ROOT, rel)))(win);
  return win.SE_MAP_DATA;
}

import { readFileSync } from "node:fs";
function readFileSyncCache(p) {
  return readFileSync(p, "utf8");
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileP = promisify(execFile);

const UA = "SE-Map/1.0 (personal travel map; github.com/Younsoeun)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// MediaWiki pageimages API — follows redirects and returns a thumbnail.
// Node's fetch is throttled in this environment, so shell out to curl.
async function thumbFor(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2" +
    "&prop=pageimages&piprop=thumbnail&pithumbsize=640&redirects=1&titles=" +
    encodeURIComponent(title);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { stdout } = await execFileP("curl", ["-s", "-A", UA, "--max-time", "20", url]);
      const json = JSON.parse(stdout);
      const pages = (json.query && json.query.pages) || [];
      for (const p of pages) {
        if (p.thumbnail && p.thumbnail.source) return p.thumbnail.source;
      }
      return null;
    } catch (e) {
      await sleep(500);
    }
  }
  return null;
}

// Convert a pageimages thumbnail URL to a Special:FilePath?width= URL, which
// reliably generates a 640px thumbnail (arbitrary regenerated sizes can 400).
function toFilePath(src) {
  if (!src.includes("/commons/")) return src; // non-commons file: use as-is
  const m = src.match(/\/thumb\/[^/]+\/[^/]+\/([^/]+)\/\d+px-/);
  const file = m ? m[1] : src.split("/").pop();
  return "https://commons.wikimedia.org/wiki/Special:FilePath/" + file + "?width=640";
}

async function main() {
  const data = {};
  Object.assign(data, loadData("js/data-portugal.js"));
  Object.assign(data, loadData("js/data-france.js"));

  const attractions = [];
  for (const country of Object.values(data)) {
    for (const a of country.attractions) attractions.push(a);
  }

  // Resume from any previously fetched images (transient network failures in
  // this sandbox mean it may take a few runs to fill everything in).
  const images = {};
  try {
    const prev = readFileSyncCache(OUT).match(/window\.SE_MAP_IMAGES = (\{[\s\S]*\});/);
    if (prev) Object.assign(images, JSON.parse(prev[1]));
  } catch (e) { /* first run */ }

  Object.assign(images, MANUAL_IMAGES); // explicit overrides always win

  const misses = [];
  for (const a of attractions) {
    if (images[a.id]) continue; // already have it
    const title = WIKI[a.id] || a.nameEn;
    const src = await thumbFor(title);
    if (src) {
      images[a.id] = toFilePath(src);
      console.log(`[ok] ${a.id} ← ${title}`);
    } else {
      misses.push(`${a.id} (tried "${title}")`);
      console.log(`[MISS] ${a.id} ← ${title}`);
    }
    await sleep(150);
  }

  const js =
    "// Generated by build/fetch-images.mjs — landmark photos via Wikipedia.\n" +
    "window.SE_MAP_IMAGES = " + JSON.stringify(images, null, 0) + ";\n";
  await writeFile(OUT, js, "utf8");

  console.log(`\nWrote ${OUT} — ${Object.keys(images).length}/${attractions.length} images.`);
  if (misses.length) console.log("Misses:\n  " + misses.join("\n  "));
}

main().catch((e) => { console.error(e); process.exit(1); });
