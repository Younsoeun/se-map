// City detail page: shows one city's attractions (city.html?country=…&city=…).
// Each attraction is a card with history/intro/tips, a "visited" checkbox, and
// an X/Twitter-style visit-note card (no engagement-icon footer).

(function () {
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

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return ` · ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  function renderAttractionCard(a, country, onVisitChange) {
    const cat = country.categories.find((c) => c.id === a.category);
    const city = country.cities.find((c) => c.id === a.cityId);
    const varRef = cat ? cat.varName : "--tc";

    const details = el("details", {
      class: "attraction-card panel",
      "data-attraction-id": a.id,
      "data-category": a.category,
    });

    const summary = el("summary", {});
    summary.innerHTML = `
      <span class="tag-dot" style="background:var(${varRef})"></span>
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

    const entry = window.SEVisited.get(a.id);
    const visitedRow = el("div", { class: "visited-row" });

    const label = el("label", {});
    const checkbox = el("input", { type: "checkbox" });
    checkbox.checked = entry.visited;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode("방문함"));
    visitedRow.appendChild(label);

    // X/Twitter-style note card (header + editable body only — no footer icons).
    const initial = (a.nameEn || "?").trim().charAt(0).toUpperCase();
    const handle = "@" + (city ? city.nameEn : a.nameEn).toLowerCase().replace(/[^a-z0-9]/g, "");
    const noteCard = el("div", { class: "note-card" });
    noteCard.innerHTML = `
      <div class="note-head">
        <div class="note-avatar" style="background:var(${varRef})">${initial}</div>
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

    const verified = noteCard.querySelector(".note-verified");
    const timeEl = noteCard.querySelector(".note-time");
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
      if (onVisitChange) onVisitChange();
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

    details.addEventListener("toggle", () => { if (details.open) autoGrow(); });

    details.dataset.visited = String(entry.visited);
    body.appendChild(visitedRow);
    details.appendChild(body);
    return details;
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("theme-toggle").addEventListener("click", () => window.SETheme.toggle());

    // Export/import (shares the same unified backup as the map page).
    document.getElementById("export-btn").addEventListener("click", () => window.SEVisited.exportJSON());
    const fileInput = document.getElementById("import-file");
    document.getElementById("import-btn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      window.SEVisited.importJSONFile(file)
        .then(() => location.reload())
        .catch((err) => alert("가져오기에 실패했습니다: " + err.message))
        .finally(() => { fileInput.value = ""; });
    });

    const params = new URLSearchParams(location.search);
    const countryKey = params.get("country");
    const cityId = params.get("city");
    const country = window.SE_MAP_DATA[countryKey];
    const city = country && country.cities.find((c) => c.id === cityId);

    const back = document.getElementById("back-link");
    if (country) {
      back.href = `index.html?country=${encodeURIComponent(countryKey)}`;
      back.textContent = `← ${country.nameKo} 지도로`;
    }

    if (!country || !city) {
      document.getElementById("city-title").textContent = "도시를 찾을 수 없어요";
      const empty = document.getElementById("city-empty");
      empty.hidden = false;
      empty.textContent = "잘못된 주소예요. 지도로 돌아가 다시 선택해 주세요.";
      return;
    }

    document.title = `SE Map — ${city.nameKo}`;
    document.getElementById("city-eyebrow").textContent =
      `${country.nameKo} · ${city.nameEn.toUpperCase()}`;
    document.getElementById("city-title").textContent = city.nameKo;

    const attractions = country.attractions.filter((a) => a.cityId === city.id);
    const statsEl = document.getElementById("city-stats");
    function updateCityStats() {
      const stats = window.SEVisited.getGroupStats(attractions.map((a) => a.id));
      statsEl.innerHTML = `
        <span>${attractions.length}개 명소</span>
        <span class="stat-visited">방문 ${stats.visitedCount}/${stats.total}</span>
      `;
    }
    updateCityStats();

    const grid = document.getElementById("attraction-grid");
    attractions.forEach((a) => grid.appendChild(renderAttractionCard(a, country, updateCityStats)));
  });
})();
