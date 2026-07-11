// Shared lon/lat -> SVG projection helpers. Must stay in sync with the
// formulas used in build/fetch-geo.mjs so baked paths and runtime-projected
// points (city markers, callouts) line up on the same map.

window.SEProject = {
  world(lon, lat) {
    const x = (lon + 180) * (960 / 360);
    const y = (90 - lat) * (500 / 180);
    return [x, y];
  },

  // countryKey must match a key in SE_MAP_GEO.countries (e.g. "portugal").
  country(countryKey, lon, lat) {
    const geo = window.SE_MAP_GEO.countries[countryKey];
    const p = geo.projection;
    const cos = Math.cos((p.centerLat * Math.PI) / 180);
    const x = lon * cos * p.scale + p.offsetX;
    const y = -lat * p.scale + p.offsetY;
    return [x, y];
  },
};
