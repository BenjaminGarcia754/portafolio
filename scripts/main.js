(() => {
  "use strict";

  const english = window.portfolioEnglish;
  const languageButtons = [...document.querySelectorAll("[data-language]")];
  const languageSwitch = document.querySelector(".language-switch");
  const textEntries = [...document.querySelectorAll("[data-i18n]")].map(element => ({
    element,
    key: element.dataset.i18n,
    spanish: element.textContent
  }));
  const ariaEntries = [...document.querySelectorAll("[data-i18n-aria]")].map(element => ({
    element,
    key: element.dataset.i18nAria,
    spanish: element.getAttribute("aria-label")
  }));
  const description = document.querySelector('meta[name="description"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  const spanishDescription = description.content;
  const spanishOgDescription = ogDescription.content;

  // Local storage may be disabled by the browser. The page still works.
  function readLanguage() {
    const requested = new URL(window.location.href).searchParams.get("lang");
    if (requested === "es" || requested === "en") return requested;
    try {
      return localStorage.getItem("portfolio-language") === "en" ? "en" : "es";
    } catch {
      return "es";
    }
  }

  function setLanguage(language, persist = false) {
    const useEnglish = language === "en";
    for (const entry of textEntries) {
      entry.element.textContent = useEnglish ? english[entry.key] ?? entry.spanish : entry.spanish;
    }
    for (const entry of ariaEntries) {
      entry.element.setAttribute("aria-label", useEnglish ? english[entry.key] ?? entry.spanish : entry.spanish);
    }
    document.documentElement.lang = language;
    description.content = useEnglish ? english.metaDescription : spanishDescription;
    ogDescription.content = useEnglish ? english.ogDescription : spanishOgDescription;
    ogLocale.content = useEnglish ? "en_US" : "es_MX";
    document.querySelector('meta[property="og:locale:alternate"]').content = useEnglish ? "es_MX" : "en_US";
    for (const button of languageButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    }
    if (persist) {
      try { localStorage.setItem("portfolio-language", language); } catch { /* Optional preference. */ }
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("lang", language);
        history.replaceState(null, "", url);
      } catch { /* Also works when opened directly as a local file. */ }
    }
    scheduleNavigationUpdate();
  }

  const navigation = document.querySelector("#navigation");
  const menuToggle = document.querySelector(".menu-toggle");
  const header = document.querySelector(".site-header");
  const mobile = window.matchMedia("(max-width: 820px)");
  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => ({ link, section: document.querySelector(link.getAttribute("href")) }));
  let scheduled = false;

  function setMenu(open, restoreFocus = false) {
    navigation.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    if (restoreFocus) menuToggle.focus();
  }

  function updateNavigation() {
    scheduled = false;
    const offset = header.getBoundingClientRect().height + 70;
    let active = null;
    for (const item of sections) {
      if (item.section.getBoundingClientRect().top <= offset) active = item.link;
    }
    for (const link of links) {
      if (link === active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }

  function scheduleNavigationUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateNavigation);
  }

  menuToggle.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });
  for (const link of links) {
    link.addEventListener("click", () => {
      setMenu(false);
      // Move keyboard focus out of the collapsed navigation to the destination.
      const section = document.querySelector(link.getAttribute("href"));
      section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
    });
  }
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenu(false, true);
    }
  });
  document.addEventListener("click", event => {
    if (!header.contains(event.target)) setMenu(false);
  });
  mobile.addEventListener("change", () => {
    const hadNavigationFocus = navigation.contains(document.activeElement);
    setMenu(false, mobile.matches && hadNavigationFocus);
    scheduleNavigationUpdate();
  });
  window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
  window.addEventListener("resize", scheduleNavigationUpdate);
  window.addEventListener("hashchange", scheduleNavigationUpdate);

  // Enhance only after the menu handlers are ready. Static navigation is the fallback.
  document.documentElement.classList.add("js-enabled");
  menuToggle.hidden = false;
  document.querySelector("#year").textContent = String(new Date().getFullYear());

  if (english) {
    for (const button of languageButtons) {
      button.addEventListener("click", () => setLanguage(button.dataset.language, true));
    }
    setLanguage(readLanguage());
    languageSwitch.hidden = false;
  }
  scheduleNavigationUpdate();
})();
