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

  // Values are { start, end } (YYYY-MM-DD). Legacy values were a plain start
  // string; normalize those on read so old saved data still works.
  function normalize(v) {
    if (!v) return { start: "", end: "" };
    if (typeof v === "string") return { start: v, end: "" };
    return { start: v.start || "", end: v.end || "" };
  }

  const SERoute = {
    getRange(id) {
      return normalize(state[id]);
    },

    // Convenience: the start date (used for sorting). "" when unset.
    getDate(id) {
      return normalize(state[id]).start;
    },

    // Pass empty strings to clear.
    setRange(id, start, end) {
      if (!start && !end) delete state[id];
      else state[id] = { start: start || "", end: end || "" };
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
