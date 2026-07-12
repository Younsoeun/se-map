// World map + country overview. The world screen lights up countries with
// content; the country screen shows the country map (city markers) and a grid
// of city cards. Clicking a city (marker or card) opens that city's own page
// (city.html?country=…&city=…).

(function () {
  const SVGNS = "http://www.w3.org/2000/svg";

  // Countries with authored content ready ("active" on the world map).
  const ACTIVE_COUNTRIES = {
    Portugal: {
      key: "portugal",
      nameKo: "포르투갈",
      labelLon: -21, labelLat: 44.5,
      anchorLon: -9.3, anchorLat: 39.6,
    },
    France: {
      key: "france",
      nameKo: "프랑스",
      labelLon: -1, labelLat: 56,
      anchorLon: 2.5, anchorLat: 47.2,
    },
    Spain: {
      key: "spain",
      nameKo: "스페인",
      labelLon: -3, labelLat: 32.5,
      anchorLon: -3.7, anchorLat: 40.4,
    },
    Greece: {
      key: "greece",
      nameKo: "그리스",
      labelLon: 33, labelLat: 43,
      anchorLon: 23.7, anchorLat: 38.5,
    },
    Italy: {
      key: "italy",
      nameKo: "이탈리아",
      labelLon: 6, labelLat: 40,
      anchorLon: 12.5, anchorLat: 42.5,
    },
    Morocco: {
      key: "morocco",
      nameKo: "모로코",
      labelLon: -18, labelLat: 27,
      anchorLon: -7, anchorLat: 31.8,
    },
    Malta: {
      key: "malta",
      nameKo: "몰타",
      labelLon: 20, labelLat: 30.5,
      anchorLon: 14.4, anchorLat: 35.9,
    },
  };

  const state = { screen: "world", countryKey: null };

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else node.setAttribute(k, v);
      }
    }
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVGNS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  function cityUrl(countryKey, cityId) {
    return `city.html?country=${encodeURIComponent(countryKey)}&city=${encodeURIComponent(cityId)}`;
  }

  // ---- World screen ----

  function renderWorld() {
    const svg = document.getElementById("world-svg");
    svg.innerHTML = "";
    svg.setAttribute("viewBox", window.SE_MAP_GEO.world.viewBox);

    window.SE_MAP_GEO.world.countries.forEach((c) => {
      const active = ACTIVE_COUNTRIES[c.name];
      const path = svgEl("path", {
        d: c.path,
        class: "world-country" + (active ? " active" : ""),
        "fill-rule": "evenodd",
      });
      if (active) {
        path.addEventListener("click", () => goToCountry(active.key));
        const title = svgEl("title", {});
        title.textContent = active.nameKo;
        path.appendChild(title);
      }
      svg.appendChild(path);
    });

    Object.values(ACTIVE_COUNTRIES).forEach((active) => {
      const [ax, ay] = window.SEProject.world(active.anchorLon, active.anchorLat);
      const [lx, ly] = window.SEProject.world(active.labelLon, active.labelLat);
      svg.appendChild(svgEl("line", { x1: ax, y1: ay, x2: lx, y2: ly, class: "leader-line" }));
      svg.appendChild(svgEl("circle", { cx: ax, cy: ay, r: 3, fill: "var(--tc)" }));
    });

    renderWorldCallouts(svg);
  }

  function renderWorldCallouts(svg) {
    const wrap = document.getElementById("world-map-wrap");
    wrap.querySelectorAll(".callout-pill").forEach((n) => n.remove());
    const vb = svg.viewBox.baseVal;
    Object.values(ACTIVE_COUNTRIES).forEach((active) => {
      const [lx, ly] = window.SEProject.world(active.labelLon, active.labelLat);
      const pill = el("button", { class: "pill callout-pill", text: active.nameKo });
      pill.style.left = `${(lx / vb.width) * 100}%`;
      pill.style.top = `${(ly / vb.height) * 100}%`;
      pill.addEventListener("click", () => goToCountry(active.key));
      wrap.appendChild(pill);
    });
  }

  // ---- Country screen ----

  function goToCountry(key) {
    state.screen = "country";
    state.countryKey = key;
    document.getElementById("world-screen").hidden = true;
    document.getElementById("country-screen").hidden = false;
    renderCountry(key);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function goToWorld() {
    state.screen = "world";
    state.countryKey = null;
    document.getElementById("country-screen").hidden = true;
    document.getElementById("world-screen").hidden = false;
    // Drop any ?country= so a refresh returns to the world map.
    if (location.search) history.replaceState(null, "", location.pathname);
  }

  function renderCountry(key) {
    const geo = window.SE_MAP_GEO.countries[key];
    const data = window.SE_MAP_DATA[key];

    document.getElementById("country-eyebrow").textContent = data.nameEn.toUpperCase();
    document.getElementById("country-title").textContent = data.nameKo;

    renderCountryMap(geo, data);
    renderCityGrid(data);
    updateCountryStats(data);
  }

  function renderCountryMap(geo, data) {
    const svg = document.getElementById("country-svg");
    svg.innerHTML = "";
    svg.setAttribute("viewBox", geo.viewBox);

    svg.appendChild(svgEl("path", { d: geo.outline, class: "country-outline", "fill-rule": "evenodd" }));
    geo.districts.forEach((d) => {
      const path = svgEl("path", { d: d.path, class: "district", "fill-rule": "evenodd" });
      const title = svgEl("title", {});
      title.textContent = d.name;
      path.appendChild(title);
      svg.appendChild(path);
    });

    // Project city points and place labels without overlap.
    const points = data.cities.map((city) => {
      const [x, y] = window.SEProject.country(data.key, city.lon, city.lat);
      return { city, x, y };
    });
    const fs = viewBoxFontSize(geo.viewBox);
    const placements = placeLabels(points, fs);

    points.forEach((p, i) => {
      const attractionIds = data.attractions.filter((a) => a.cityId === p.city.id).map((a) => a.id);

      const ring = svgEl("circle", { cx: p.x, cy: p.y, r: 7, class: "city-ring", "data-city-marker": p.city.id });
      const dot = svgEl("circle", { cx: p.x, cy: p.y, r: 3.5, class: "city-dot", "data-city-marker": p.city.id });

      const pl = placements[i];
      const label = svgEl("text", {
        x: pl.tx, y: pl.ty, class: "city-label", "text-anchor": pl.anchor,
      });
      label.textContent = p.city.nameKo;

      const go = () => { location.href = cityUrl(data.key, p.city.id); };
      [ring, dot, label].forEach((n) => {
        n.style.cursor = "pointer";
        n.addEventListener("click", go);
        const t = svgEl("title", {});
        t.textContent = `${p.city.nameKo} · ${attractionIds.length}개 명소`;
        n.appendChild(t);
      });

      svg.appendChild(ring);
      svg.appendChild(dot);
      svg.appendChild(label);
      styleCityMarker(p.city.id, attractionIds);
    });
  }

  // Font size (in SVG user units) for city labels, scaled to the map size.
  function viewBoxFontSize(viewBox) {
    const w = parseFloat(viewBox.split(" ")[2]) || 680;
    return Math.round((w / 680) * 13);
  }

  function estimateWidth(text, fs) {
    let w = 0;
    for (const ch of text) {
      if (/[가-힣]/.test(ch)) w += fs * 0.98;      // Hangul
      else if (/[A-Za-z0-9]/.test(ch)) w += fs * 0.56;
      else w += fs * 0.5;                                   // space / punctuation
    }
    return w;
  }

  function overlaps(a, b) {
    return !(a.x2 < b.x1 || b.x2 < a.x1 || a.y2 < b.y1 || b.y2 < a.y1);
  }

  // Greedy label placement: for each city dot try right/left/below/above and
  // pick the first position that doesn't collide with placed labels or dots.
  function placeLabels(points, fs) {
    const gap = 9;
    const dotRects = points.map((p) => ({ x1: p.x - 8, y1: p.y - 8, x2: p.x + 8, y2: p.y + 8 }));
    const placed = [];
    return points.map((p) => {
      const w = estimateWidth(p.city.nameKo, fs);
      const cands = [
        { anchor: "start", tx: p.x + gap, ty: p.y + fs * 0.35, box: { x1: p.x + gap, y1: p.y - fs * 0.7, x2: p.x + gap + w, y2: p.y + fs * 0.45 } },
        { anchor: "end", tx: p.x - gap, ty: p.y + fs * 0.35, box: { x1: p.x - gap - w, y1: p.y - fs * 0.7, x2: p.x - gap, y2: p.y + fs * 0.45 } },
        { anchor: "middle", tx: p.x, ty: p.y + gap + fs * 0.85, box: { x1: p.x - w / 2, y1: p.y + gap, x2: p.x + w / 2, y2: p.y + gap + fs } },
        { anchor: "middle", tx: p.x, ty: p.y - gap, box: { x1: p.x - w / 2, y1: p.y - gap - fs, x2: p.x + w / 2, y2: p.y - gap } },
      ];
      const free = cands.find(
        (c) => !placed.some((b) => overlaps(c.box, b)) && !dotRects.some((b) => overlaps(c.box, b))
      );
      const chosen = free || cands[0];
      placed.push(chosen.box);
      return chosen;
    });
  }

  function styleCityMarker(cityId, attractionIds) {
    const stats = window.SEVisited.getGroupStats(attractionIds);
    const svg = document.getElementById("country-svg");
    const ring = svg.querySelector(`.city-ring[data-city-marker="${cityId}"]`);
    const dot = svg.querySelector(`.city-dot[data-city-marker="${cityId}"]`);
    if (!ring || !dot) return;
    if (stats.ratio >= 1 && stats.total > 0) {
      ring.style.stroke = "var(--vs)";
      dot.style.fill = "var(--vs)";
    } else if (stats.ratio > 0) {
      ring.style.stroke = "var(--tc)";
      dot.style.fill = "var(--tc)";
    } else {
      ring.style.stroke = "var(--tc)";
      dot.style.fill = "var(--mf)";
      dot.style.stroke = "var(--tc)";
      dot.style.strokeWidth = "1.2";
    }
  }

  function renderCityGrid(data) {
    const wrap = document.getElementById("city-grid");
    wrap.innerHTML = "";
    const IMAGES = window.SE_MAP_IMAGES || {};
    data.cities.forEach((city) => {
      const cityAttractions = data.attractions.filter((a) => a.cityId === city.id);
      const ids = cityAttractions.map((a) => a.id);
      const stats = window.SEVisited.getGroupStats(ids);
      // Cover = the first of this city's attractions that has a photo.
      const cover = (cityAttractions.find((a) => IMAGES[a.id]) || {});
      const img = IMAGES[cover.id] || "";

      const card = el("a", { class: "city-card", href: cityUrl(data.key, city.id) });
      if (img) card.style.backgroundImage = `url('${img}')`;
      card.innerHTML = `
        <div class="city-card-body">
          <span class="city-card-name">${city.nameKo}</span>
          <span class="city-card-en">${city.nameEn}</span>
          <span class="city-card-meta">${ids.length}개 명소 · 방문 ${stats.visitedCount}/${ids.length}</span>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  function updateCountryStats(data) {
    const stats = window.SEVisited.getGroupStats(data.attractions.map((a) => a.id));
    document.getElementById("country-stats").innerHTML = `
      <span>${data.cities.length}개 도시</span>
      <span>${data.attractions.length}개 명소</span>
      <span>완성도 100%</span>
      <span class="stat-visited">방문 ${stats.visitedCount}/${stats.total} (${Math.round(stats.ratio * 100)}%)</span>
    `;
  }

  // ---- Export / import ----

  function initExportImport() {
    document.getElementById("export-btn").addEventListener("click", () => window.SEVisited.exportJSON());
    const fileInput = document.getElementById("import-file");
    document.getElementById("import-btn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      window.SEVisited.importJSONFile(file)
        .then(() => {
          alert("기록을 가져왔습니다.");
          if (state.screen === "country" && state.countryKey) renderCountry(state.countryKey);
        })
        .catch((err) => alert("가져오기에 실패했습니다: " + err.message))
        .finally(() => { fileInput.value = ""; });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderWorld();
    document.getElementById("back-btn").addEventListener("click", goToWorld);
    document.getElementById("theme-toggle").addEventListener("click", () => window.SETheme.toggle());
    initExportImport();

    // Deep link: index.html?country=france opens that country directly
    // (used by the "back to country" link on city pages).
    const params = new URLSearchParams(location.search);
    const country = params.get("country");
    if (country && window.SE_MAP_DATA[country]) goToCountry(country);
  });
})();
