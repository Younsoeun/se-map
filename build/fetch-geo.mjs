// Downloads Natural Earth GeoJSON, filters to what this app needs, projects
// lon/lat to SVG path data, and writes the static result to js/geo-data.js.
// Re-run this whenever a new country needs to be added (extend COUNTRIES below).
//
// Usage: node build/fetch-geo.mjs

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "data-cache");
const OUT_FILE = path.join(ROOT, "js", "geo-data.js");

const SOURCES = {
  world110: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
  admin0_50m: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
  admin1_10m: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson",
};

// One entry per country we ship detail data for. Extend this array (and
// re-run the script) to add more countries later.
const COUNTRIES = [
  {
    admin: "Portugal",
    key: "portugal",
    // Mainland bounding box in lon/lat, used to drop the Azores/Madeira
    // islands from the admin-0 outline (they use the same ADMIN name).
    mainlandBBox: { minLon: -9.6, maxLon: -6.1, minLat: 36.8, maxLat: 42.2 },
    viewBox: { w: 600, h: 760, pad: 24 },
  },
  {
    admin: "France",
    key: "france",
    // Metropolitan France + Corsica; excludes the far-flung overseas
    // territories (French Guiana, Réunion, etc.) which share the ADMIN name.
    mainlandBBox: { minLon: -5.3, maxLon: 9.7, minLat: 41.2, maxLat: 51.2 },
    viewBox: { w: 680, h: 700, pad: 24 },
  },
  {
    admin: "Spain",
    key: "spain",
    // Iberian peninsula only; drops the Canary Islands (far southwest) and the
    // North-African enclaves (Ceuta/Melilla) which share the ADMIN name.
    // Balearic Islands sit just east of the coast — excluded for a clean shape.
    mainlandBBox: { minLon: -9.6, maxLon: 3.4, minLat: 35.9, maxLat: 43.9 },
    viewBox: { w: 720, h: 620, pad: 24 },
  },
  {
    admin: "Greece",
    key: "greece",
    // Wide bbox on purpose: keep the Aegean/Ionian islands (Santorini, Crete,
    // Rhodes, Corfu, Mykonos, Zakynthos) since they are core destinations.
    mainlandBBox: { minLon: 19.2, maxLon: 28.4, minLat: 34.6, maxLat: 41.8 },
    viewBox: { w: 700, h: 640, pad: 24 },
  },
  {
    admin: "Italy",
    key: "italy",
    // Mainland + Sicily + Sardinia (all core); the tiny far islands (Pantelleria,
    // Lampedusa) fall outside this bbox and are dropped.
    mainlandBBox: { minLon: 6.5, maxLon: 18.6, minLat: 36.5, maxLat: 47.1 },
    viewBox: { w: 560, h: 720, pad: 24 },
  },
  {
    admin: "Morocco",
    key: "morocco",
    // Morocco proper (Western Sahara is a separate ADMIN in the source data).
    mainlandBBox: { minLon: -13.5, maxLon: -0.9, minLat: 27.5, maxLat: 36.1 },
    viewBox: { w: 700, h: 640, pad: 24 },
  },
  {
    admin: "Malta",
    key: "malta",
    // Whole archipelago: Malta + Gozo + Comino.
    mainlandBBox: { minLon: 14.1, maxLon: 14.62, minLat: 35.78, maxLat: 36.10 },
    viewBox: { w: 680, h: 560, pad: 24 },
  },
];

async function fetchCached(name, url) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, name);
  if (existsSync(cachePath)) {
    console.log(`[cache] ${name}`);
    return JSON.parse(await readFile(cachePath, "utf8"));
  }
  console.log(`[fetch] ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  await writeFile(cachePath, text, "utf8");
  return JSON.parse(text);
}

function round(n, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

// ---- Ring/polygon -> SVG path ----

function ringToPath(ring, project) {
  return ring
    .map(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      return `${i === 0 ? "M" : "L"}${round(x)},${round(y)}`;
    })
    .join(" ") + " Z";
}

function geometryToPath(geometry, project) {
  if (!geometry) return "";
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const parts = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      parts.push(ringToPath(ring, project));
    }
  }
  return parts.join(" ");
}

// ---- World projection (fixed, per spec) ----

function worldProject(lon, lat) {
  const x = (lon + 180) * (960 / 360);
  const y = (90 - lat) * (500 / 180);
  return [x, y];
}

function buildWorld(admin0) {
  // For countries we ship as "active" (filled) on the world map, clip their
  // outline to the mainland bbox so far-flung overseas territories (e.g.
  // French Guiana) don't appear as stray filled blobs.
  const mainlandByAdmin = new Map(
    COUNTRIES.map((c) => [c.admin, c.mainlandBBox])
  );

  const countries = admin0.features
    .map((f) => {
      const name = f.properties.ADMIN || f.properties.NAME;
      let geom = f.geometry;
      const bbox = mainlandByAdmin.get(name);
      if (bbox) geom = filterMainland(geom, bbox);
      const d = geometryToPath(geom, worldProject);
      if (!d) return null;
      return { name, path: d };
    })
    .filter(Boolean);
  return { viewBox: "0 0 960 500", countries };
}

// ---- Local latitude-corrected equirectangular projection for a country ----

function bboxOfRings(rings) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLon, maxLon, minLat, maxLat };
}

function allRings(geometry) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const rings = [];
  for (const polygon of polygons) for (const ring of polygon) rings.push(ring);
  return rings;
}

function bboxOverlaps(b, bbox) {
  return (
    b.maxLon >= bbox.minLon &&
    b.minLon <= bbox.maxLon &&
    b.maxLat >= bbox.minLat &&
    b.minLat <= bbox.maxLat
  );
}

function inMainlandBBox(ring, bbox) {
  // Keep a ring if its own bbox overlaps the mainland bbox (drops islands
  // like Azores/Madeira which sit far outside it).
  return bboxOverlaps(bboxOfRings([ring]), bbox);
}

function featureOverlapsBBox(geometry, bbox) {
  return bboxOverlaps(bboxOfRings(allRings(geometry)), bbox);
}

function filterMainland(geometry, bbox) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const kept = [];
  for (const polygon of polygons) {
    // A polygon's outer ring decides inclusion; keep the whole polygon
    // (outer + holes) if its outer ring overlaps the mainland bbox.
    if (inMainlandBBox(polygon[0], bbox)) kept.push(polygon);
  }
  return { type: "MultiPolygon", coordinates: kept };
}

function makeLocalProjection(rings, viewBoxSpec) {
  const bbox = bboxOfRings(rings);
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const cos = Math.cos((centerLat * Math.PI) / 180);

  // Project all points through the lat-corrected transform first (no
  // scale/offset yet) to find the raw extent.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      const x = lon * cos;
      const y = -lat; // flip so increasing latitude goes up
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const { w, h, pad } = viewBoxSpec;
  const availW = w - pad * 2;
  const availH = h - pad * 2;
  const rawW = maxX - minX;
  const rawH = maxY - minY;
  const scale = Math.min(availW / rawW, availH / rawH);

  // Center the projected shape within the viewBox.
  const shapeW = rawW * scale;
  const shapeH = rawH * scale;
  const offsetX = pad + (availW - shapeW) / 2 - minX * scale;
  const offsetY = pad + (availH - shapeH) / 2 - minY * scale;

  return {
    centerLat,
    scale,
    offsetX,
    offsetY,
    project: (lon, lat) => [lon * cos * scale + offsetX, -lat * scale + offsetY],
  };
}

async function buildCountry(country, admin0_50m, admin1_10m) {
  const outlineFeature = admin0_50m.features.find(
    (f) => f.properties.ADMIN === country.admin
  );
  if (!outlineFeature) throw new Error(`No admin-0 feature for ${country.admin}`);
  const mainlandGeom = filterMainland(outlineFeature.geometry, country.mainlandBBox);

  const districtFeatures = admin1_10m.features.filter(
    (f) =>
      f.properties.admin === country.admin &&
      featureOverlapsBBox(f.geometry, country.mainlandBBox)
  );

  const allProjectionRings = [
    ...allRings(mainlandGeom),
    ...districtFeatures.flatMap((f) => allRings(f.geometry)),
  ];
  const proj = makeLocalProjection(allProjectionRings, country.viewBox);

  const outlinePath = geometryToPath(mainlandGeom, proj.project);
  const districts = districtFeatures.map((f) => ({
    name: f.properties.name,
    path: geometryToPath(f.geometry, proj.project),
  }));

  return {
    key: country.key,
    admin: country.admin,
    viewBox: `0 0 ${country.viewBox.w} ${country.viewBox.h}`,
    projection: {
      centerLat: round(proj.centerLat, 6),
      scale: round(proj.scale, 6),
      offsetX: round(proj.offsetX, 6),
      offsetY: round(proj.offsetY, 6),
    },
    outline: outlinePath,
    districts,
  };
}

async function main() {
  const [world110, admin0_50m, admin1_10m] = await Promise.all([
    fetchCached("ne_110m_admin_0_countries.geojson", SOURCES.world110),
    fetchCached("ne_50m_admin_0_countries.geojson", SOURCES.admin0_50m),
    fetchCached("ne_10m_admin_1_states_provinces.geojson", SOURCES.admin1_10m),
  ]);

  const world = buildWorld(world110);

  const countries = {};
  for (const c of COUNTRIES) {
    console.log(`[project] ${c.admin}`);
    countries[c.key] = await buildCountry(c, admin0_50m, admin1_10m);
  }

  const payload = { world, countries };
  const js = `// Generated by build/fetch-geo.mjs — do not hand-edit.\nwindow.SE_MAP_GEO = ${JSON.stringify(
    payload
  )};\n`;

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, js, "utf8");
  console.log(`Wrote ${OUT_FILE} (${(js.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
