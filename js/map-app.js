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
      labelLon: -24, labelLat: 33,
      anchorLon: -7, anchorLat: 31.8,
    },
    Malta: {
      key: "malta",
      nameKo: "몰타",
      labelLon: 20, labelLat: 30.5,
      anchorLon: 14.4, anchorLat: 35.9,
    },
    Croatia: {
      key: "croatia",
      nameKo: "크로아티아",
      labelLon: 24, labelLat: 48,
      anchorLon: 16.5, anchorLat: 45.1,
    },
    Netherlands: {
      key: "netherlands",
      nameKo: "네덜란드",
      labelLon: -6, labelLat: 57,
      anchorLon: 5.3, anchorLat: 52.2,
    },
    Germany: {
      key: "germany",
      nameKo: "독일",
      labelLon: 17, labelLat: 55,
      anchorLon: 10.4, anchorLat: 51.2,
    },
    Switzerland: {
      key: "switzerland",
      nameKo: "스위스",
      labelLon: 2, labelLat: 44,
      anchorLon: 8.2, anchorLat: 46.8,
    },
    Norway: {
      key: "norway",
      nameKo: "노르웨이",
      labelLon: -2, labelLat: 64,
      anchorLon: 8.5, anchorLat: 61,
    },
    Sweden: {
      key: "sweden",
      nameKo: "스웨덴",
      labelLon: 22, labelLat: 66,
      anchorLon: 15, anchorLat: 62,
    },
    Finland: {
      key: "finland",
      nameKo: "핀란드",
      labelLon: 33, labelLat: 65,
      anchorLon: 26, anchorLat: 64,
    },
    Denmark: {
      key: "denmark",
      nameKo: "덴마크",
      labelLon: 4, labelLat: 51,
      anchorLon: 9.5, anchorLat: 56,
    },
    Iceland: {
      key: "iceland",
      nameKo: "아이슬란드",
      labelLon: -32, labelLat: 63,
      anchorLon: -19, anchorLat: 64.8,
    },
    Czechia: {
      key: "czechia",
      nameKo: "체코",
      labelLon: 10, labelLat: 53,
      anchorLon: 15.5, anchorLat: 49.8,
    },
    Austria: {
      key: "austria",
      nameKo: "오스트리아",
      labelLon: 12, labelLat: 44.5,
      anchorLon: 14.5, anchorLat: 47.5,
    },
    Hungary: {
      key: "hungary",
      nameKo: "헝가리",
      labelLon: 25, labelLat: 46,
      anchorLon: 19.4, anchorLat: 47.2,
    },
    Poland: {
      key: "poland",
      nameKo: "폴란드",
      labelLon: 27, labelLat: 54,
      anchorLon: 19.5, anchorLat: 52,
    },
    Slovenia: {
      key: "slovenia",
      nameKo: "슬로베니아",
      labelLon: 9, labelLat: 42,
      anchorLon: 14.8, anchorLat: 46.1,
    },
    Slovakia: {
      key: "slovakia",
      nameKo: "슬로바키아",
      labelLon: 22, labelLat: 50.5,
      anchorLon: 19.5, anchorLat: 48.7,
    },
    Romania: {
      key: "romania",
      nameKo: "루마니아",
      labelLon: 31, labelLat: 47,
      anchorLon: 25, anchorLat: 45.9,
    },
    Bulgaria: {
      key: "bulgaria",
      nameKo: "불가리아",
      labelLon: 32, labelLat: 42,
      anchorLon: 25.3, anchorLat: 42.7,
    },
    Estonia: {
      key: "estonia",
      nameKo: "에스토니아",
      labelLon: 33, labelLat: 59.5,
      anchorLon: 25.5, anchorLat: 58.7,
    },
    Latvia: {
      key: "latvia",
      nameKo: "라트비아",
      labelLon: 33, labelLat: 57,
      anchorLon: 24.6, anchorLat: 56.9,
    },
    Lithuania: {
      key: "lithuania",
      nameKo: "리투아니아",
      labelLon: 31, labelLat: 54.5,
      anchorLon: 23.9, anchorLat: 55.2,
    },
    // Canary Islands: no matching world-map polygon (they're clipped out of
    // Spain), so this entry only produces a callout pill to reach the page.
    Canary: {
      key: "canary",
      nameKo: "카나리아 제도",
      labelLon: -34, labelLat: 22,
      anchorLon: -15.6, anchorLat: 28.2,
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

  // ---- World screen (zoomable / pannable map) ----

  const WORLD_W = 960, WORLD_H = 500;
  let WORLD_ASPECT = WORLD_W / WORLD_H;    // set from the default (fitted) view
  let worldView = null;                    // current viewBox window {x,y,w,h}
  let worldEntries = [];                   // [{active, pill, ax, ay, lx, ly, dot}]
  let layoutQueued = false;
  let mapDragMoved = false;

  function projectedBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.values(ACTIVE_COUNTRIES).forEach((a) => {
      [[a.anchorLon, a.anchorLat], [a.labelLon, a.labelLat]].forEach(([lon, lat]) => {
        const [x, y] = window.SEProject.world(lon, lat);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    return { minX, minY, maxX, maxY };
  }

  // Default view fits all active countries (anchors + labels) with padding.
  function defaultWorldView() {
    const b = projectedBounds();
    const padX = (b.maxX - b.minX) * 0.07 + 8;
    const padY = (b.maxY - b.minY) * 0.16 + 12;
    return { x: b.minX - padX, y: b.minY - padY, w: (b.maxX - b.minX) + padX * 2, h: (b.maxY - b.minY) + padY * 2 };
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Keep the aspect fixed (so the map box never changes shape), clamp zoom, and
  // keep the window overlapping the world.
  function clampWorldView(v) {
    const minW = 80, maxW = WORLD_W;
    const w = clamp(v.w, minW, maxW);
    const h = w / WORLD_ASPECT;
    const mX = 30, mY = 30;
    const x = clamp(v.x, -mX, WORLD_W + mX - w);
    const yMin = -mY, yMax = WORLD_H + mY - h;
    const y = yMax < yMin ? (WORLD_H - h) / 2 : clamp(v.y, yMin, yMax);
    return { x, y, w, h };
  }

  function setWorldView(v) {
    worldView = clampWorldView(v);
    const svg = document.getElementById("world-svg");
    svg.setAttribute("viewBox", `${worldView.x} ${worldView.y} ${worldView.w} ${worldView.h}`);
    queueWorldLayout();
  }

  function queueWorldLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => { layoutQueued = false; layoutWorld(); });
  }

  function renderWorld() {
    const svg = document.getElementById("world-svg");
    const wrap = document.getElementById("world-map-wrap");
    svg.innerHTML = "";
    wrap.querySelectorAll(".callout-pill").forEach((n) => n.remove());

    window.SE_MAP_GEO.world.countries.forEach((c) => {
      const active = ACTIVE_COUNTRIES[c.name];
      const path = svgEl("path", {
        d: c.path,
        class: "world-country" + (active ? " active" : ""),
        "fill-rule": "evenodd",
        "vector-effect": "non-scaling-stroke",
      });
      if (active) {
        path.addEventListener("click", () => { if (!mapDragMoved) goToCountry(active.key); });
        const title = svgEl("title", {});
        title.textContent = active.nameKo;
        path.appendChild(title);
      }
      svg.appendChild(path);
    });

    worldEntries = Object.values(ACTIVE_COUNTRIES).map((active) => {
      const [ax, ay] = window.SEProject.world(active.anchorLon, active.anchorLat);
      const [lx, ly] = window.SEProject.world(active.labelLon, active.labelLat);
      const dot = svgEl("circle", { cx: ax, cy: ay, r: 3, fill: "var(--tc)" });
      svg.appendChild(dot);
      const pill = el("button", { class: "pill callout-pill", text: active.nameKo });
      pill.addEventListener("click", (e) => {
        if (mapDragMoved) { e.preventDefault(); return; }
        goToCountry(active.key);
      });
      wrap.appendChild(pill);
      return { active, pill, ax, ay, lx, ly, dot };
    });

    // Establish the fixed aspect from the default fit, then apply the view.
    const def = defaultWorldView();
    WORLD_ASPECT = def.w / def.h;
    setWorldView(worldView || def);
  }

  // Position the label pills over the map for the current view, nudge any that
  // overlap, hide off-screen ones, and draw leader lines to their anchor dots.
  function layoutWorld() {
    if (!worldView) return;
    const svg = document.getElementById("world-svg");
    const wrap = document.getElementById("world-map-wrap");
    const wrapRect = wrap.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    if (!svgRect.width || !svgRect.height) return;

    // Rescale anchor dots so they stay a constant on-screen size while zooming.
    const dotR = worldView.w / 320;
    worldEntries.forEach((e) => e.dot.setAttribute("r", dotR));
    svg.querySelectorAll(".leader-line").forEach((n) => n.remove());

    const offX = svgRect.left - wrapRect.left;
    const offY = svgRect.top - wrapRect.top;
    const pad = 3;

    const items = [];
    worldEntries.forEach((e) => {
      const fx = (e.lx - worldView.x) / worldView.w;
      const fy = (e.ly - worldView.y) / worldView.h;
      // Hide labels whose anchor sits well outside the current window.
      const afx = (e.ax - worldView.x) / worldView.w;
      const afy = (e.ay - worldView.y) / worldView.h;
      const off = afx < -0.05 || afx > 1.05 || afy < -0.05 || afy > 1.05;
      e.pill.style.display = off ? "none" : "";
      if (off) return;
      const cx = offX + fx * svgRect.width;   // pill bottom-center x (in wrap px)
      const by = offY + fy * svgRect.height;  // pill bottom-center y
      e.pill.style.left = cx + "px";
      e.pill.style.top = by + "px";
      const r = e.pill.getBoundingClientRect();
      items.push({ e, cx, by, w: r.width, h: r.height, top: by - r.height, left: cx - r.width / 2 });
    });

    items.sort((a, b) => a.top - b.top);
    const placed = [];
    for (const it of items) {
      let guard = 0, overlap = true;
      while (overlap && guard++ < 200) {
        overlap = false;
        for (const q of placed) {
          const ox = it.left < q.left + q.w + pad && it.left + it.w + pad > q.left;
          const oy = it.top < q.top + q.h + pad && it.top + it.h + pad > q.top;
          if (ox && oy) { it.top = q.top + q.h + pad; overlap = true; }
        }
      }
      it.e.pill.style.top = (it.top + it.h) + "px"; // style anchor = bottom-center
      placed.push(it);
    }

    // Leader lines, in viewBox coords, from anchor dot to final pill.
    for (const it of placed) {
      const bxSvg = it.cx - offX, bySvg = (it.top + it.h) - offY;
      const x2 = worldView.x + (bxSvg / svgRect.width) * worldView.w;
      const y2 = worldView.y + (bySvg / svgRect.height) * worldView.h;
      svg.appendChild(svgEl("line", {
        x1: it.e.ax, y1: it.e.ay, x2, y2,
        class: "leader-line", "vector-effect": "non-scaling-stroke",
      }));
    }
  }

  // ---- Zoom / pan interactions ----

  function zoomAt(factor, clientX, clientY) {
    const svg = document.getElementById("world-svg");
    const r = svg.getBoundingClientRect();
    const fx = (clientX - r.left) / r.width;
    const fy = (clientY - r.top) / r.height;
    const pointX = worldView.x + fx * worldView.w;
    const pointY = worldView.y + fy * worldView.h;
    const newW = clamp(worldView.w / factor, 80, WORLD_W);
    const newH = newW / WORLD_ASPECT;
    setWorldView({ x: pointX - fx * newW, y: pointY - fy * newH, w: newW, h: newH });
  }

  function initWorldZoom() {
    const svg = document.getElementById("world-svg");
    const center = () => {
      const r = svg.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    };
    const on = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener("click", fn); };
    on("zoom-in", () => zoomAt(1.4, ...center()));
    on("zoom-out", () => zoomAt(1 / 1.4, ...center()));
    on("zoom-reset", () => { mapDragMoved = false; setWorldView(defaultWorldView()); });

    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY);
    }, { passive: false });

    const pointers = new Map();
    let panStart = null, pinchStart = null;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    svg.addEventListener("pointerdown", (e) => {
      svg.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      mapDragMoved = false;
      if (pointers.size === 1) {
        panStart = { x: e.clientX, y: e.clientY, view: { ...worldView } };
        pinchStart = null;
      } else if (pointers.size === 2) {
        const p = [...pointers.values()];
        const m = mid(p[0], p[1]);
        pinchStart = { dist: dist(p[0], p[1]), mx: m.x, my: m.y, view: { ...worldView } };
        panStart = null;
      }
    });

    svg.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = svg.getBoundingClientRect();
      if (pinchStart && pointers.size >= 2) {
        const p = [...pointers.values()];
        const d = dist(p[0], p[1]);
        const factor = d / (pinchStart.dist || 1);
        const fx = (pinchStart.mx - r.left) / r.width;
        const fy = (pinchStart.my - r.top) / r.height;
        const pointX = pinchStart.view.x + fx * pinchStart.view.w;
        const pointY = pinchStart.view.y + fy * pinchStart.view.h;
        const newW = clamp(pinchStart.view.w / factor, 80, WORLD_W);
        const newH = newW / WORLD_ASPECT;
        setWorldView({ x: pointX - fx * newW, y: pointY - fy * newH, w: newW, h: newH });
        mapDragMoved = true;
      } else if (panStart) {
        const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) mapDragMoved = true;
        setWorldView({
          x: panStart.view.x - (dx / r.width) * panStart.view.w,
          y: panStart.view.y - (dy / r.height) * panStart.view.h,
          w: panStart.view.w, h: panStart.view.h,
        });
      }
    });

    const endPointer = (e) => {
      pointers.delete(e.pointerId);
      try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 1) {
        const p = [...pointers.values()][0];
        panStart = { x: p.x, y: p.y, view: { ...worldView } };
      } else if (pointers.size === 0) {
        panStart = null;
      }
    };
    svg.addEventListener("pointerup", endPointer);
    svg.addEventListener("pointercancel", endPointer);

    // Keep labels aligned when the container is resized.
    window.addEventListener("resize", queueWorldLayout);
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
    // Re-render so callout de-collision runs with the map actually visible
    // (a deep-linked load renders the world while it's still hidden).
    renderWorld();
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
    initWorldZoom();
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
