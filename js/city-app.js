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

  function fmtKo(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  function renderAttractionCard(a, country, onVisitChange) {
    const cat = country.categories.find((c) => c.id === a.category);
    const city = country.cities.find((c) => c.id === a.cityId);
    const varRef = cat ? cat.varName : "--tc";
    const img = (window.SE_MAP_IMAGES || {})[a.id] || "";
    const entry = window.SEVisited.get(a.id);
    const handle = "@" + (city ? city.nameEn : a.nameEn).toLowerCase().replace(/[^a-z0-9]/g, "");

    const details = el("details", {
      class: "attraction-card panel",
      "data-attraction-id": a.id,
      "data-category": a.category,
    });

    // Collapsed state: a landmark cover photo with a category tag.
    const summary = el("summary", {});
    summary.innerHTML = `
      <div class="ac-cover"${img ? ` style="background-image:url('${img}')"` : ""}>
        ${img ? "" : '<div class="ac-cover-fallback"></div>'}
        <span class="ac-cat" style="background:var(${varRef})">${cat ? cat.nameKo : ""}</span>
      </div>
      <div class="ac-titlebar">
        <span class="attraction-name">${a.nameKo}</span>
        <span class="attraction-name-en">${a.nameEn}</span>
      </div>
    `;
    details.appendChild(summary);

    const body = el("div", { class: "attraction-body" });
    body.innerHTML = `
      <p><strong>역사</strong>${a.history}</p>
      <p><strong>소개</strong>${a.intro}</p>
      <p><strong>방문 팁</strong>${a.tip}</p>
    `;

    // Note card: checkbox where the avatar used to be, then name + a line that
    // shows @handle normally, or the visit date range once dates are set.
    const noteCard = el("div", { class: "note-card" });
    noteCard.innerHTML = `
      <div class="note-head">
        <label class="note-check" title="방문함"><input type="checkbox" /></label>
        <div class="note-id">
          <span class="note-author">${a.nameKo}</span>
          <span class="note-handle"></span>
        </div>
      </div>
    `;
    const checkbox = noteCard.querySelector('input[type="checkbox"]');
    checkbox.checked = entry.visited;
    const handleEl = noteCard.querySelector(".note-handle");

    const note = el("textarea", {
      class: "note-body",
      placeholder: "이곳에서의 방문 소감을 남겨보세요…",
      rows: "2",
    });
    note.value = entry.note || "";
    noteCard.appendChild(note);

    const dates = el("div", { class: "note-dates" });
    dates.innerHTML = `
      <label class="note-date-field"><span>방문 시작</span><input type="date" class="d-start" /></label>
      <span class="note-date-sep">~</span>
      <label class="note-date-field"><span>방문 종료</span><input type="date" class="d-end" /></label>
    `;
    const dStart = dates.querySelector(".d-start");
    const dEnd = dates.querySelector(".d-end");
    dStart.value = entry.visitStart || "";
    dEnd.value = entry.visitEnd || "";
    noteCard.appendChild(dates);

    function updateHandle() {
      const e = window.SEVisited.get(a.id);
      if (e.visitStart || e.visitEnd) {
        const s = fmtKo(e.visitStart);
        const en = fmtKo(e.visitEnd);
        handleEl.textContent = s && en ? `${s} ~ ${en}` : s ? `${s} ~` : `~ ${en}`;
        handleEl.classList.add("is-date");
      } else {
        handleEl.textContent = handle;
        handleEl.classList.remove("is-date");
      }
    }
    function autoGrow() {
      note.style.height = "auto";
      note.style.height = Math.max(note.scrollHeight, 44) + "px";
    }
    updateHandle();

    checkbox.addEventListener("change", () => {
      window.SEVisited.setVisited(a.id, checkbox.checked);
      details.dataset.visited = String(checkbox.checked);
      if (onVisitChange) onVisitChange();
    });

    let noteTimer = null;
    note.addEventListener("input", () => {
      autoGrow();
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => window.SEVisited.setNote(a.id, note.value), 400);
    });

    function onDateChange() {
      window.SEVisited.setDates(a.id, dStart.value, dEnd.value);
      updateHandle();
    }
    dStart.addEventListener("change", onDateChange);
    dEnd.addEventListener("change", onDateChange);

    details.addEventListener("toggle", () => { if (details.open) autoGrow(); });

    details.dataset.visited = String(entry.visited);
    body.appendChild(noteCard);
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
