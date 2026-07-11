// Culture page rendering: country grid + per-country profile sections.

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

  function renderGrid(countries) {
    const grid = document.getElementById("country-culture-grid");
    grid.innerHTML = "";
    countries.forEach((country) => {
      const card = el("button", { class: "culture-card panel" });
      card.innerHTML = `
        <span class="culture-card-flag">${country.flag}</span>
        <span class="culture-card-name">${country.nameKo}</span>
        <span class="culture-card-name-en">${country.nameEn}</span>
        <span class="culture-card-tagline">${country.tagline}</span>
      `;
      card.addEventListener("click", () => {
        document.getElementById(`culture-${country.key}`).scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      grid.appendChild(card);
    });
  }

  function renderProfiles(countries) {
    const wrap = document.getElementById("culture-profiles");
    wrap.innerHTML = "";
    countries.forEach((country) => {
      const profile = el("section", { class: "culture-profile", id: `culture-${country.key}` });

      const header = el("div", { class: "culture-profile-head" });
      header.innerHTML = `
        <span class="culture-profile-flag">${country.flag}</span>
        <div>
          <p class="eyebrow">${country.nameEn.toUpperCase()}</p>
          <h2>${country.nameKo}</h2>
          <p class="culture-profile-tagline">${country.tagline}</p>
        </div>
      `;
      profile.appendChild(header);

      const sectionsWrap = el("div", { class: "culture-sections" });
      country.sections.forEach((section) => {
        const sectionEl = el("div", { class: "culture-section panel" });
        const title = el("p", { class: "culture-section-title", text: section.titleKo });
        sectionEl.appendChild(title);
        section.paragraphs.forEach((p) => {
          sectionEl.appendChild(el("p", { class: "culture-section-body", text: p }));
        });
        sectionsWrap.appendChild(sectionEl);
      });
      profile.appendChild(sectionsWrap);

      wrap.appendChild(profile);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const countries = window.SE_MAP_CULTURE.countries;
    renderGrid(countries);
    renderProfiles(countries);
    document.getElementById("theme-toggle").addEventListener("click", () => window.SETheme.toggle());
  });
})();
