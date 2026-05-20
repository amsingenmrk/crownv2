/**
 * Captures sharp @2x portfolio screenshots for the landing page hero.
 *
 *   npm run build && npm run start -- -p 3002
 *   npm run capture:landing-screenshot
 *
 * Light only: CAPTURE_THEME=light npm run capture:landing-screenshot
 * Dark only:  CAPTURE_THEME=dark npm run capture:landing-screenshot
 */
import { execSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, "../public")
const url = process.env.SCREENSHOT_URL ?? "http://localhost:3002/portfolio"
const themeFilter = process.env.CAPTURE_THEME
const viewportWidth = 1152
const viewportHeight = 720
const deviceScaleFactor = 2

const themes =
  themeFilter === "light" || themeFilter === "dark"
    ? [themeFilter]
    : ["light", "dark"]

function ensurePlaywright() {
  try {
    createRequire(import.meta.url).resolve("playwright")
  } catch {
    execSync("npm install --no-save playwright@1.49.1", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    })
  }
}

async function captureTheme(theme) {
  const { chromium } = createRequire(import.meta.url)("playwright")
  const outPath = path.join(
    publicDir,
    `landing-portfolio-screenshot-${theme}.png`
  )

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor,
    colorScheme: theme,
  })
  const page = await context.newPage()

  await page.addInitScript((mode) => {
    window.localStorage.setItem("theme", mode)
  }, theme)

  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 })
  await page.waitForTimeout(2500)

  await page.screenshot({ path: outPath, type: "png", fullPage: false })
  await browser.close()

  console.log(
    `Saved ${outPath} (${viewportWidth * deviceScaleFactor}×${viewportHeight * deviceScaleFactor}px, ${theme})`
  )
}

ensurePlaywright()
for (const theme of themes) {
  await captureTheme(theme)
}
