// Route-date store: per stop/city visit date (YYYY-MM-DD), persisted to
// localStorage. Mirrors the SEVisited pattern. Loaded on every page so the
// unified JSON export/import (in visited.js) can include route dates.

(function () {
  const STORAGE_KEY = "se_map_route_v1";
  const bus = new EventTarget();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("SERoute: failed to parse localStorage, resetting.", e);
      return {};
    }
  }

  let state = load();

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    bus.dispatchEvent(new CustomEvent("change"));
  }

  const SERoute = {
    // Returns "" when no date is set for this id.
    getDate(id) {
      return state[id] || "";
    },

    // Pass "" to clear the date.
    setDate(id, dateStr) {
      if (dateStr) state[id] = dateStr;
      else delete state[id];
      persist();
    },

    onChange(callback) {
      bus.addEventListener("change", callback);
      return () => bus.removeEventListener("change", callback);
    },

    // For the unified backup in visited.js.
    dump() {
      return { ...state };
    },

    mergeFrom(obj) {
      if (typeof obj !== "object" || obj === null) return;
      state = { ...state, ...obj };
      persist();
    },
  };

  window.SERoute = SERoute;
})();
