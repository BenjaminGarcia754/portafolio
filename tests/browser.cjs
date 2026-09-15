/* Run with Node.js and Playwright available. No build or runtime dependencies for the site. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".pdf": "application/pdf" };
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = path.resolve(root, "." + (relative === "/" ? "/index.html" : relative));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});
async function run() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const options = { headless: true };
  if (process.env.BROWSER_CHANNEL) options.channel = process.env.BROWSER_CHANNEL;
  const browser = await chromium.launch(options);
  const errors = [];
  const failedResponses = [];
  let checks = 0;
  const pass = label => { checks++; console.log("PASS " + label); };
  const output = path.join(root, "tmp", "qa");
  fs.mkdirSync(output, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.on("response", response => { if (response.status() >= 400) failedResponses.push(response.url()); });
    await page.goto(base, { waitUntil: "networkidle" });
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    assert.match(await page.locator("h1").innerText(), /Benjamín del Ángel/);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator(".project-card").count(), 4);
    assert.equal(await page.locator(".other-projects article").count(), 4);
    assert.equal(await page.locator(".experience-item").count(), 3);
    pass("Spanish default, one h1, three jobs and all eight projects");

    const missing = await page.evaluate(() => [
      ...document.querySelectorAll("[data-i18n], [data-i18n-aria]")
    ].map(el => el.dataset.i18n || el.dataset.i18nAria).filter(key => !(key in window.portfolioEnglish)));
    assert.deepEqual(missing, []);
    pass("Every translatable label has an English translation");

    const anchorErrors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash));
    assert.deepEqual(anchorErrors, []);
    const duplicateIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map(el => el.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    assert.deepEqual(duplicateIds, []);
    const localLinks = await page.locator('a[href^="./"]').evaluateAll(elements => [...new Set(elements.map(el => el.href))]);
    for (const url of localLinks) assert.equal((await page.request.get(url)).status(), 200, url);
    pass("Internal anchors, unique IDs and local download links");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator(".hero-buttons a[download]").click()
    ]);
    assert.equal(download.suggestedFilename(), "benjamin-cv.pdf");
    assert.equal(await download.failure(), null);
    const downloaded = fs.readFileSync(await download.path());
    assert.deepEqual(downloaded, fs.readFileSync(path.join(root, "media", "benjamin-cv.pdf")));
    pass("CV downloads successfully, byte-for-byte intact");

    const originalSpanish = await page.locator("[data-i18n]").allTextContents();
    await page.getByRole("button", { name: "English", exact: true }).click();
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert.equal(await page.locator("#projects-title").innerText(), "Selected work.");
    assert.equal(await page.locator('meta[property="og:locale"]').getAttribute("content"), "en_US");
    assert.match(await page.locator('meta[name="description"]').getAttribute("content"), /with experience/);
    assert.equal(await page.locator("#navigation").getAttribute("aria-label"), "Main navigation");
    assert.equal(await page.getByRole("button", { name: "English", exact: true }).getAttribute("aria-pressed"), "true");
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    await page.goto(base, { waitUntil: "networkidle" });
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    pass("English switch, metadata, accessibility labels and saved preference");

    await page.goto(base + "/?lang=es", { waitUntil: "networkidle" });
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    assert.deepEqual(await page.locator("[data-i18n]").allTextContents(), originalSpanish);
    await page.getByRole("button", { name: "English", exact: true }).click();
    await page.getByRole("button", { name: "Español", exact: true }).click();
    assert.deepEqual(await page.locator("[data-i18n]").allTextContents(), originalSpanish);
    pass("Shareable language URL and exact Spanish restoration");

    for (const lang of ["es", "en"]) {
      await page.goto(base + "/?lang=" + lang, { waitUntil: "networkidle" });
      for (const width of [320, 375, 580, 768, 820, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
          overflowing: [...document.querySelectorAll("main *")].filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width && (rect.right > innerWidth + 1 || rect.left < -1);
          }).slice(0, 8).map(el => el.className || el.tagName)
        }));
        assert.ok(overflow.content <= overflow.viewport + 1, JSON.stringify({ lang, width, ...overflow }));
        if ([375, 768, 1440].includes(width)) {
          await page.screenshot({ path: path.join(output, lang + "-" + width + ".png"), fullPage: true });
        }
      }
      pass(lang.toUpperCase() + ": no horizontal overflow at seven widths (320–1440px)");
    }

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(base + "/?lang=en", { waitUntil: "networkidle" });
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    assert.equal(await page.locator("#navigation").isVisible(), false);
    await menu.focus();
    await page.keyboard.press("Enter");
    assert.equal(await menu.getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#navigation").isVisible(), true);
    await page.keyboard.press("Escape");
    assert.equal(await menu.getAttribute("aria-expanded"), "false");
    assert.equal(await menu.evaluate(el => el === document.activeElement), true);
    await menu.click();
    await page.getByRole("link", { name: "Projects", exact: true }).click();
    assert.equal(await menu.getAttribute("aria-expanded"), "false");
    await page.waitForFunction(() => location.hash === "#proyectos" && document.activeElement.id === "proyectos");
    assert.equal(await page.locator('#navigation a[href="#proyectos"]').getAttribute("aria-current"), "location");
    pass("Mobile menu: keyboard activation, Escape, focus and active navigation");

    const details = page.locator(".other-projects");
    await details.locator("summary").click();
    assert.equal(await details.getAttribute("open"), "");
    assert.equal(await page.getByRole("heading", { name: "Hangman", exact: true }).isVisible(), true);
    await page.getByRole("button", { name: "Español", exact: true }).click();
    assert.equal(await page.getByRole("heading", { name: "Juego del Ahorcado", exact: true }).isVisible(), true);
    pass("Secondary projects stay accessible and translate while expanded");

    const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    await noJs.goto(base);
    assert.equal(await noJs.locator("#navigation").isVisible(), true);
    assert.equal(await noJs.locator(".language-switch").isVisible(), false);
    assert.equal(await noJs.locator(".menu-toggle").isVisible(), false);
    assert.match(await noJs.locator("#experience-title").innerText(), /Del código/);
    await noJs.locator(".other-projects summary").click();
    assert.equal(await noJs.getByRole("heading", { name: "Juego del Ahorcado", exact: true }).isVisible(), true);
    pass("Without JavaScript: Spanish content, navigation, projects and CV remain available");
    await noJs.close();

    const blockedStorage = await browser.newPage();
    blockedStorage.on("pageerror", error => errors.push(error.message));
    await blockedStorage.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
    });
    await blockedStorage.goto(base);
    await blockedStorage.getByRole("button", { name: "English", exact: true }).click();
    assert.equal(await blockedStorage.locator("html").getAttribute("lang"), "en");
    pass("Language selector works when localStorage is blocked");
    await blockedStorage.close();

    assert.deepEqual(errors, []);
    assert.deepEqual(failedResponses, []);
    pass("No console errors, JavaScript exceptions or failed local requests");
    console.log("\n" + checks + " checks passed. Screenshots: tmp/qa");
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
