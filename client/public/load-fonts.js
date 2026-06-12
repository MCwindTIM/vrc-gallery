(function () {
  var QUERY =
    "family=Klee+One:wght@400;600&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans+TC:wght@400;500;700&display=swap";
  var CN = "https://fonts.loli.net";
  var CN_GSTATIC = "https://gstatic.loli.net";
  var INTL = "https://fonts.googleapis.com";
  var INTL_GSTATIC = "https://fonts.gstatic.com";
  var CN_MAINLAND_TZ = {
    "Asia/Shanghai": 1,
    "Asia/Chongqing": 1,
    "Asia/Urumqi": 1,
    "Asia/Harbin": 1,
  };

  var tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch (_) {}

  var primary = CN_MAINLAND_TZ[tz] ? CN : INTL;
  var fallback = primary === CN ? INTL : CN;

  function gstaticFor(base) {
    return base === CN ? CN_GSTATIC : INTL_GSTATIC;
  }

  function preconnect(origin, crossOrigin) {
    var link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    if (crossOrigin) link.crossOrigin = "";
    document.head.appendChild(link);
  }

  function injectStylesheet(base, allowFallback) {
    preconnect(base);
    preconnect(gstaticFor(base), true);

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = base + "/css2?" + QUERY;
    if (allowFallback) {
      link.onerror = function () {
        link.onerror = null;
        link.href = fallback + "/css2?" + QUERY;
      };
    }
    document.head.appendChild(link);
  }

  injectStylesheet(primary, true);

  // Handwritten kai with full simplified + traditional coverage (VRChat display names, etc.)
  preconnect("https://cdn.jsdelivr.net");
  var wenkai = document.createElement("link");
  wenkai.rel = "stylesheet";
  wenkai.href =
    "https://cdn.jsdelivr.net/npm/lxgw-wenkai-lite-webfont@1.7.0/style.css";
  document.head.appendChild(wenkai);
})();
