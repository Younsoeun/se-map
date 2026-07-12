// Route page: recommended trip route where each country (stop) and city has a
// visit-date input. Undated items stay in the recommended order; once a date
// is entered the item is "fixed" and the list re-sorts by date ascending.

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

  // A stop's effective date for sorting: its own date if set, else the
  // earliest of its cities' dates, else null (undated).
  function stopEffectiveDate(stop) {
    const own = window.SERoute.getDate(stop.id);
    const cityDates = stop.cities
      .map((c) => window.SERoute.getDate(c.id))
      .filter(Boolean);
    const candidates = [own, ...cityDates].filter(Boolean);
    if (candidates.length === 0) return null;
    return candidates.sort()[0]; // ISO YYYY-MM-DD sorts lexicographically
  }

  // Split into dated (sorted ascending) + undated (original order preserved).
  function partitionSorted(items, dateOf) {
    const dated = [];
    const undated = [];
    items.forEach((item, index) => {
      const d = dateOf(item);
      if (d) dated.push({ item, d, index });
      else undated.push({ item, index });
    });
    dated.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.index - b.index));
    return { dated: dated.map((x) => x.item), undated: undated.map((x) => x.item) };
  }

  // Two date inputs (start, end) bound to one route item.
  function dateInputs(id, onChange) {
    const r = window.SERoute.getRange(id);
    const start = el("input", { type: "date", class: "route-date" });
    const end = el("input", { type: "date", class: "route-date" });
    start.value = r.start || "";
    end.value = r.end || "";
    function commit() {
      window.SERoute.setRange(id, start.value, end.value);
      onChange();
    }
    [start, end].forEach((inp) => {
      inp.addEventListener("change", commit);
      inp.addEventListener("click", (e) => e.stopPropagation());
    });
    return { start, end };
  }

  function renderCity(city, rerender, countryKey) {
    const dated = !!window.SERoute.getDate(city.id);
    const row = el("div", { class: "route-city" + (dated ? " is-fixed" : "") });

    const left = el("div", { class: "route-city-label" });
    if (dated) left.appendChild(el("span", { class: "route-pin", text: "📌" }));
    // Link to the city's detail page when one exists.
    const nameNode =
      countryKey && city.cityId
        ? el("a", {
            class: "route-city-name route-link",
            href: `city.html?country=${encodeURIComponent(countryKey)}&city=${encodeURIComponent(city.cityId)}`,
            title: `${city.nameKo} 상세 페이지로`,
            text: city.nameKo,
          })
        : el("span", { class: "route-city-name", text: city.nameKo });
    left.appendChild(nameNode);
    left.appendChild(el("span", { class: "route-city-en", text: city.nameEn }));
    row.appendChild(left);

    const { start, end } = dateInputs(city.id, rerender);
    const dwrap = el("div", { class: "route-city-dates" }, [
      start,
      el("span", { class: "route-date-sep", text: "~" }),
      end,
    ]);
    row.appendChild(dwrap);
    return row;
  }

  function renderStop(stop, rerender) {
    const dated = !!stopEffectiveDate(stop);
    const card = el("section", {
      class: "route-stop panel" + (dated ? " is-fixed" : ""),
    });

    const head = el("div", { class: "route-stop-head" });

    const title = el("div", { class: "route-stop-title" });
    title.appendChild(el("span", { class: "route-flag", text: stop.flag }));
    const titleText = el("div", {});
    const nameRow = el("div", { class: "route-stop-name-row" });
    // Link the country name to its overview map when a detail page exists.
    nameRow.appendChild(
      stop.countryKey
        ? el("a", {
            class: "route-stop-name route-link",
            href: `index.html?country=${encodeURIComponent(stop.countryKey)}`,
            title: `${stop.nameKo} 지도 보기`,
            text: stop.nameKo,
          })
        : el("span", { class: "route-stop-name", text: stop.nameKo })
    );
    if (dated) nameRow.appendChild(el("span", { class: "route-badge fixed", text: "확정" }));
    if (stop.optional) nameRow.appendChild(el("span", { class: "route-badge optional", text: "선택" }));
    titleText.appendChild(nameRow);
    titleText.appendChild(
      el("span", { class: "route-stop-meta", text: `${stop.season} · ${stop.hint}` })
    );
    title.appendChild(titleText);
    head.appendChild(title);

    const { start, end } = dateInputs(stop.id, rerender);
    const dateWrap = el("div", { class: "route-stop-dates" }, [
      el("label", { class: "route-date-field" }, [
        el("span", { class: "route-date-label", text: "방문 시작일" }),
        start,
      ]),
      el("label", { class: "route-date-field" }, [
        el("span", { class: "route-date-label", text: "방문 종료일" }),
        end,
      ]),
    ]);
    head.appendChild(dateWrap);

    card.appendChild(head);

    // Cities: dated ones ascending on top, undated in recommended order below.
    const { dated: datedCities, undated: undatedCities } = partitionSorted(
      stop.cities,
      (c) => window.SERoute.getDate(c.id)
    );
    const cityWrap = el("div", { class: "route-cities" });
    [...datedCities, ...undatedCities].forEach((c) =>
      cityWrap.appendChild(renderCity(c, rerender, stop.countryKey))
    );
    card.appendChild(cityWrap);

    return card;
  }

  function render() {
    const list = document.getElementById("route-list");
    list.innerHTML = "";

    const stops = window.SE_MAP_ROUTE.stops;
    const { dated, undated } = partitionSorted(stops, stopEffectiveDate);

    if (dated.length) {
      list.appendChild(
        el("p", { class: "route-section-label", text: "확정 일정 · 날짜순" })
      );
      dated.forEach((s) => list.appendChild(renderStop(s, render)));
    }

    list.appendChild(
      el("p", {
        class: "route-section-label muted",
        text: dated.length ? "추천 순서 · 날짜 미정" : "추천 순서 (방문일을 입력하면 위로 고정돼요)",
      })
    );
    undated.forEach((s) => list.appendChild(renderStop(s, render)));
  }

  function initExportImport() {
    const exportBtn = document.getElementById("export-btn");
    const importBtn = document.getElementById("import-btn");
    const fileInput = document.getElementById("import-file");
    if (!exportBtn || !importBtn || !fileInput) return;

    exportBtn.addEventListener("click", () => window.SEVisited.exportJSON());
    importBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      window.SEVisited
        .importJSONFile(file)
        .then(() => {
          alert("기록을 가져왔습니다.");
          render();
        })
        .catch((err) => alert("가져오기에 실패했습니다: " + err.message))
        .finally(() => {
          fileInput.value = "";
        });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    initExportImport();
    document.getElementById("theme-toggle").addEventListener("click", () => window.SETheme.toggle());
    window.SERoute.onChange(() => {
      /* re-render handled by explicit rerender callbacks; this keeps other
         tabs/pages consistent if the store changes elsewhere. */
    });
  });
})();
