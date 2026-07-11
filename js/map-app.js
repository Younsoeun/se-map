// World map + Portugal detail screen: rendering, search/filter, visited
// tracking hooks, smooth-scroll navigation.

(function () {
  const SVGNS = "http://www.w3.org/2000/svg";

  // Countries with authored content ready ("active" on the world map).
  // Extend this when a new country is added (per the geo build pipeline).
  const ACTIVE_COUNTRIES = {
    Portugal: {
      key: "portugal",
      nameKo: "포르투갈",
      // Pill label placed over the open Atlantic, with a leader line
      // pointing at a coastal anchor point on the mainland.
      labelLon: -21,
      labelLat: 44.5,
      anchorLon: -9.3,
      anchorLat: 39.6,
    },
  };

  const state = {
    screen: "world",
    countryKey: null,
    searchText: "",
    activeCategory: "all",
  };

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
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    }
    return node;
  }

  // ---- World screen ----

  function renderWorld() {
    const svg = document.getElementById("world-svg");
    svg.innerHTML = "";
    svg.setAttribute("viewBox", window.SE_MAP_GEO.world.viewBox);

    const countries = window.SE_MAP_GEO.world.countries;
    countries.forEach((c) => {
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

    // Leader lines (drawn in SVG space so they scale with the map).
    Object.values(ACTIVE_COUNTRIES).forEach((active) => {
      const [ax, ay] = window.SEProject.world(active.anchorLon, active.anchorLat);
      const [lx, ly] = window.SEProject.world(active.labelLon, active.labelLat);
      const line = svgEl("line", {
        x1: ax, y1: ay, x2: lx, y2: ly,
        class: "leader-line",
      });
      svg.appendChild(line);
      const dot = svgEl("circle", { cx: ax, cy: ay, r: 3, fill: "var(--tc)" });
      svg.appendChild(dot);
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

  // ---- Country detail screen ----

  function goToCountry(key) {
    state.screen = "country";
    state.countryKey = key;
    state.searchText = "";
    state.activeCategory = "all";
    document.getElementById("world-screen").hidden = true;
    document.getElementById("country-screen").hidden = false;
    renderCountry(key);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function goToWorld() {
    state.screen = "world";
    document.getElementById("country-screen").hidden = true;
    document.getElementById("world-screen").hidden = false;
  }

  function renderCountry(key) {
    const geo = window.SE_MAP_GEO.countries[key];
    const data = window.SE_MAP_DATA[key];

    document.getElementById("country-eyebrow").textContent = data.nameEn.toUpperCase();
    document.getElementById("country-title").textContent = data.nameKo;

    renderCountryMap(geo, data);
    renderFilterPills(data);
    renderCityQuicklinks(data);
    renderCitySections(data);
    updateCountryStats(data);
    applyFilters();
  }

  function renderCountryMap(geo, data) {
    const svg = document.getElementById("country-svg");
    svg.innerHTML = "";
    svg.setAttribute("viewBox", geo.viewBox);

    svg.appendChild(
      svgEl("path", { d: geo.outline, class: "country-outline", "fill-rule": "evenodd" })
    );

    geo.districts.forEach((d) => {
      const path = svgEl("path", { d: d.path, class: "district", "fill-rule": "evenodd" });
      const title = svgEl("title", {});
      title.textContent = d.name;
      path.appendChild(title);
      svg.appendChild(path);
    });

    data.cities.forEach((city) => {
      const attractionIds = data.attractions
        .filter((a) => a.cityId === city.id)
        .map((a) => a.id);
      const [x, y] = window.SEProject.country(data.key, city.lon, city.lat);

      const ring = svgEl("circle", { cx: x, cy: y, r: 7, class: "city-ring", "data-city-marker": city.id });
      const dot = svgEl("circle", { cx: x, cy: y, r: 3.5, class: "city-dot", "data-city-marker": city.id });
      const label = svgEl("text", { x: x + 9, y: y + 3, class: "city-label" });
      label.textContent = city.nameKo;

      [ring, dot].forEach((n) =>
        n.addEventListener("click", () => scrollToCity(city.id))
      );

      svg.appendChild(ring);
      svg.appendChild(dot);
      svg.appendChild(label);

      styleCityMarker(city.id, attractionIds);
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

  function scrollToCity(cityId) {
    const target = document.getElementById(`city-${cityId}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderFilterPills(data) {
    const wrap = document.getElementById("filter-pills");
    wrap.innerHTML = "";
    const all = el("button", { class: "pill active", text: "전체", "data-cat": "all" });
    wrap.appendChild(all);
    data.categories.forEach((cat) => {
      const pill = el("button", {
        class: "pill",
        "data-cat": cat.id,
      });
      pill.innerHTML = `<span class="tag-dot" style="background:var(${cat.varName})"></span>${cat.nameKo}`;
      wrap.appendChild(pill);
    });
    wrap.querySelectorAll(".pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        state.activeCategory = pill.dataset.cat;
        wrap.querySelectorAll(".pill").forEach((p) => p.classList.toggle("active", p === pill));
        applyFilters();
      });
    });
  }

  function renderCityQuicklinks(data) {
    const wrap = document.getElementById("city-quicklinks");
    wrap.innerHTML = "";
    data.cities.forEach((city) => {
      const pill = el("button", { class: "pill", text: city.nameKo });
      pill.addEventListener("click", () => scrollToCity(city.id));
      wrap.appendChild(pill);
    });
  }

  function renderCitySections(data) {
    const wrap = document.getElementById("city-sections");
    wrap.innerHTML = "";

    data.cities.forEach((city) => {
      const attractions = data.attractions.filter((a) => a.cityId === city.id);
      if (attractions.length === 0) return;

      const section = el("section", { class: "city-section", id: `city-${city.id}` });
      const heading = el("h2", {}, [
        el("span", { text: city.nameEn }),
        el("span", { class: "city-name-ko", text: city.nameKo }),
        el("span", { class: "city-progress", id: `city-progress-${city.id}` }),
      ]);
      section.appendChild(heading);

      const grid = el("div", { class: "attraction-grid" });
      attractions.forEach((a) => grid.appendChild(renderAttractionCard(a)));
      section.appendChild(grid);
      wrap.appendChild(section);

      updateCityProgress(city.id, attractions.map((a) => a.id));
    });
  }

  function renderAttractionCard(a) {
    const details = el("details", {
      class: "attraction-card panel",
      "data-attraction-id": a.id,
      "data-category": a.category,
    });
    const cat = window.SE_MAP_DATA.portugal.categories.find((c) => c.id === a.category);

    const summary = el("summary", {});
    summary.innerHTML = `
      <span class="tag-dot" style="background:var(${cat ? cat.varName : "--tc"})"></span>
      <span class="attraction-name">${a.nameKo}</span>
      <span class="attraction-name-en">${a.nameEn}</span>
    `;
    details.appendChild(summary);

    const body = el("div", { class: "attraction-body" });
    body.innerHTML = `
      <p><strong>역사</strong>${a.history}</p>
      <p><strong>소개</strong>${a.intro}</p>
      <p><strong>방문 팁</strong>${a.tip}</p>
    `;

    const visitedRow = el("div", { class: "visited-row" });
    const entry = window.SEVisited.get(a.id);

    const label = el("label", {});
    const checkbox = el("input", { type: "checkbox" });
    checkbox.checked = entry.visited;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode("방문함"));
    visitedRow.appendChild(label);

    // Visit note rendered as an X/Twitter-style post card.
    const city = window.SE_MAP_DATA.portugal.cities.find((c) => c.id === a.cityId);
    const initial = (a.nameEn || "?").trim().charAt(0).toUpperCase();
    const handle = "@" + (city ? city.nameEn : a.nameEn).toLowerCase().replace(/[^a-z0-9]/g, "");

    const noteCard = el("div", { class: "note-card" });
    noteCard.innerHTML = `
      <div class="note-head">
        <div class="note-avatar" style="background:var(${cat ? cat.varName : "--tc"})">${initial}</div>
        <div class="note-id">
          <span class="note-author">${a.nameKo}<span class="note-verified" title="방문함" hidden>✓</span></span>
          <span class="note-handle">${handle}<span class="note-time"></span></span>
        </div>
      </div>
    `;
    const note = el("textarea", {
      class: "note-body",
      placeholder: "이곳에서의 방문 소감을 남겨보세요…",
      rows: "2",
    });
    note.value = entry.note || "";
    noteCard.appendChild(note);
    noteCard.insertAdjacentHTML(
      "beforeend",
      `<div class="note-actions" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M1.75 12a10.25 10.25 0 1 1 4.9 8.73L2 22l1.3-4.6A10.2 10.2 0 0 1 1.75 12z"/></svg>
        <svg viewBox="0 0 24 24"><path d="M4.5 3.5v9a3 3 0 0 0 3 3h9m0 0-3-3m3 3-3 3M19.5 20.5v-9a3 3 0 0 0-3-3h-9m0 0 3 3m-3-3 3-3"/></svg>
        <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 5C19 15.5 12 20 12 20z"/></svg>
        <svg viewBox="0 0 24 24"><path d="M4 20V10M9.3 20V4M14.7 20v-8M20 20V7"/></svg>
      </div>`
    );

    const verified = noteCard.querySelector(".note-verified");
    const timeEl = noteCard.querySelector(".note-time");
    function fmtDate(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      return ` · ${d.getMonth() + 1}월 ${d.getDate()}일`;
    }
    function syncMeta() {
      verified.hidden = !checkbox.checked;
      timeEl.textContent = fmtDate(window.SEVisited.get(a.id).updatedAt);
    }
    function autoGrow() {
      note.style.height = "auto";
      note.style.height = Math.max(note.scrollHeight, 44) + "px";
    }
    syncMeta();

    visitedRow.appendChild(noteCard);

    checkbox.addEventListener("change", () => {
      window.SEVisited.setVisited(a.id, checkbox.checked);
      details.dataset.visited = String(checkbox.checked);
      syncMeta();
    });

    let noteTimer = null;
    note.addEventListener("input", () => {
      autoGrow();
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        window.SEVisited.setNote(a.id, note.value);
        syncMeta();
      }, 400);
    });

    // Size the textarea to its content once the card becomes visible.
    details.addEventListener("toggle", () => {
      if (details.open) autoGrow();
    });

    details.dataset.visited = String(entry.visited);
    body.appendChild(visitedRow);
    details.appendChild(body);
    return details;
  }

  function updateCityProgress(cityId, attractionIds) {
    const stats = window.SEVisited.getGroupStats(attractionIds);
    const label = document.getElementById(`city-progress-${cityId}`);
    if (label) label.textContent = `방문 ${stats.visitedCount}/${stats.total}`;
  }

  function updateCountryStats(data) {
    const allIds = data.attractions.map((a) => a.id);
    const stats = window.SEVisited.getGroupStats(allIds);
    const el = document.getElementById("country-stats");
    el.innerHTML = `
      <span>${data.cities.length}개 도시</span>
      <span>${data.attractions.length}개 명소</span>
      <span>완성도 100%</span>
      <span class="stat-visited">방문 ${stats.visitedCount}/${stats.total} (${Math.round(stats.ratio * 100)}%)</span>
    `;
  }

  // ---- Search + category filter ----

  function applyFilters() {
    const q = state.searchText.trim().toLowerCase();
    const cat = state.activeCategory;
    const data = window.SE_MAP_DATA[state.countryKey];
    if (!data) return;

    document.querySelectorAll(".attraction-card").forEach((card) => {
      const id = card.dataset.attractionId;
      const attraction = data.attractions.find((a) => a.id === id);
      const matchesText =
        !q ||
        attraction.nameKo.toLowerCase().includes(q) ||
        attraction.nameEn.toLowerCase().includes(q);
      const matchesCat = cat === "all" || card.dataset.category === cat;
      card.classList.toggle("is-hidden", !(matchesText && matchesCat));
    });

    document.querySelectorAll(".city-section").forEach((section) => {
      const visibleCards = section.querySelectorAll(".attraction-card:not(.is-hidden)");
      section.classList.toggle("is-hidden", visibleCards.length === 0);
    });
  }

  // ---- Wiring ----

  function refreshVisitedUI() {
    if (state.screen !== "country" || !state.countryKey) return;
    const data = window.SE_MAP_DATA[state.countryKey];

    document.querySelectorAll(".attraction-card").forEach((card) => {
      const id = card.dataset.attractionId;
      const entry = window.SEVisited.get(id);
      card.dataset.visited = String(entry.visited);
      const checkbox = card.querySelector('input[type="checkbox"]');
      const note = card.querySelector(".note-body");
      if (checkbox && checkbox.checked !== entry.visited) checkbox.checked = entry.visited;
      if (note && document.activeElement !== note && note.value !== entry.note) {
        note.value = entry.note || "";
      }
      const verified = card.querySelector(".note-verified");
      if (verified) verified.hidden = !entry.visited;
      const timeEl = card.querySelector(".note-time");
      if (timeEl) {
        timeEl.textContent = entry.updatedAt
          ? ` · ${new Date(entry.updatedAt).getMonth() + 1}월 ${new Date(entry.updatedAt).getDate()}일`
          : "";
      }
    });

    data.cities.forEach((city) => {
      const ids = data.attractions.filter((a) => a.cityId === city.id).map((a) => a.id);
      styleCityMarker(city.id, ids);
      updateCityProgress(city.id, ids);
    });

    updateCountryStats(data);
  }

  function initExportImport() {
    document.getElementById("export-btn").addEventListener("click", () => {
      window.SEVisited.exportJSON();
    });
    const fileInput = document.getElementById("import-file");
    document.getElementById("import-btn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      window.SEVisited.importJSONFile(file)
        .then(() => {
          alert("방문 기록을 가져왔습니다.");
        })
        .catch((err) => {
          alert("가져오기에 실패했습니다: " + err.message);
        })
        .finally(() => {
          fileInput.value = "";
        });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderWorld();

    document.getElementById("back-btn").addEventListener("click", goToWorld);
    document.getElementById("search-input").addEventListener("input", (e) => {
      state.searchText = e.target.value;
      applyFilters();
    });
    document.getElementById("theme-toggle").addEventListener("click", () => window.SETheme.toggle());

    initExportImport();
    window.SEVisited.onChange(refreshVisitedUI);
  });
})();
