// Shared light/dark theme toggle, used by both index.html and culture.html.
// Light values live in css/style.css :root. Dark values are applied here
// via setProperty rather than duplicated in @media/[data-theme] CSS blocks
// (keeps the stylesheet compact).
(function () {
  const KEY = "se_map_theme";

  const DARK = {
    "--bg": "#15181A",
    "--pn": "#1B1F21",
    "--pb": "#2A2F32",
    "--mf": "#20262A",
    "--mb": "#3A4247",
    "--mbs": "#4C5559",
    "--ink": "#EDEAE1",
    "--is": "#B9B3A4",
    "--if": "#7C776A",
    "--nv": "#6E93BE",
    "--tc": "#E08A5B",
    "--vs": "#8FAE83",
    "--c1": "#C2A278",
    "--c2": "#D3B15C",
    "--c3": "#8CA2C4",
    "--c4": "#6FBBAE",
    "--c5": "#C98CA0",
    "--b1": "rgba(224, 138, 91, 0.14)",
    "--b2": "rgba(110, 147, 190, 0.12)",
    "--b3": "rgba(211, 177, 92, 0.10)",
    "--b4": "rgba(143, 174, 131, 0.10)",
    "--sg": "0 2px 14px rgba(110, 147, 190, 0.15)",
    "--sc": "0 4px 16px rgba(0, 0, 0, 0.3)",
    "color-scheme": "dark",
  };

  function apply(theme) {
    const root = document.documentElement.style;
    if (theme === "dark") {
      for (const [k, v] of Object.entries(DARK)) root.setProperty(k, v);
    } else {
      for (const k of Object.keys(DARK)) root.removeProperty(k);
    }
  }

  function systemPrefersDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function resolve() {
    return localStorage.getItem(KEY) || (systemPrefersDark() ? "dark" : "light");
  }

  apply(resolve());

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem(KEY)) apply(e.matches ? "dark" : "light");
  });

  window.SETheme = {
    toggle() {
      const next = resolve() === "dark" ? "light" : "dark";
      localStorage.setItem(KEY, next);
      apply(next);
    },
  };
})();
