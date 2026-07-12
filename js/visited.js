// Visited-state store: per-attraction visited flag + short note, persisted
// to localStorage (no backend). Also handles JSON export/import so the
// record can be carried between browsers/devices manually.

(function () {
  const STORAGE_KEY = "se_map_visited_v1";
  const bus = new EventTarget();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("SEVisited: failed to parse localStorage, resetting.", e);
      return {};
    }
  }

  let state = load();

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    bus.dispatchEvent(new CustomEvent("change"));
  }

  const DEFAULT = { visited: false, note: "", visitStart: "", visitEnd: "" };

  const SEVisited = {
    get(attractionId) {
      return { ...DEFAULT, ...(state[attractionId] || {}) };
    },

    setVisited(attractionId, visited) {
      const entry = state[attractionId] || { ...DEFAULT };
      entry.visited = !!visited;
      entry.updatedAt = new Date().toISOString();
      state[attractionId] = entry;
      persist();
    },

    setNote(attractionId, note) {
      const entry = state[attractionId] || { ...DEFAULT };
      entry.note = note;
      entry.updatedAt = new Date().toISOString();
      state[attractionId] = entry;
      persist();
    },

    // start/end are "YYYY-MM-DD" strings ("" clears).
    setDates(attractionId, start, end) {
      const entry = state[attractionId] || { ...DEFAULT };
      entry.visitStart = start || "";
      entry.visitEnd = end || "";
      entry.updatedAt = new Date().toISOString();
      state[attractionId] = entry;
      persist();
    },

    // ratio in [0,1], plus raw counts.
    getGroupStats(attractionIds) {
      const total = attractionIds.length;
      const visitedCount = attractionIds.filter((id) => this.get(id).visited).length;
      return { total, visitedCount, ratio: total ? visitedCount / total : 0 };
    },

    onChange(callback) {
      bus.addEventListener("change", callback);
      return () => bus.removeEventListener("change", callback);
    },

    exportJSON() {
      const payload = {
        app: "SE_map",
        exportedAt: new Date().toISOString(),
        visited: state,
        // Route dates live in a separate store (route.js). Include them so a
        // single backup file covers both visit records and trip dates.
        route: window.SERoute ? window.SERoute.dump() : {},
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `se-map-visited-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },

    importJSONFile(file) {
      return file.text().then((text) => {
        const parsed = JSON.parse(text);
        const incoming = parsed.visited || parsed; // tolerate a raw map too
        if (typeof incoming !== "object" || incoming === null) {
          throw new Error("가져오기 파일 형식이 올바르지 않습니다.");
        }
        state = { ...state, ...incoming };
        persist();
        // Restore route dates too, if the backup includes them.
        if (parsed.route && window.SERoute) {
          window.SERoute.mergeFrom(parsed.route);
        }
      });
    },
  };

  window.SEVisited = SEVisited;
})();
