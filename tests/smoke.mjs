/**
 * Repeatable browser smoke test for the Chakravarti web client.
 *
 * Self-contained: it starts a `vite preview` server against the already-built
 * `docs/` bundle, drives the game with playwright-core + a system Chromium/Edge,
 * asserts the critical path, then tears everything down.
 *
 * Run with `npm run test:smoke` (build the Pages bundle first with
 * `npm run build:pages`). No production cheat hooks are used — the test only
 * clicks the same controls a player would.
 *
 * Exit codes: 0 = pass, 1 = failure, 2 = no usable browser found (skipped).
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { chromium } from 'playwright-core'

const PORT = Number(process.env.SMOKE_PORT ?? 4199)
const BASE = `http://localhost:${PORT}/`

const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const findBrowser = () => BROWSER_CANDIDATES.find((p) => existsSync(p))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const waitForServer = async (url, timeoutMs = 20000) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // not up yet
    }
    await sleep(300)
  }
  return false
}

const checks = []
const check = (name, ok) => {
  checks.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}

const clickByRole = async (page, re) => {
  const btn = page.getByRole('button', { name: re })
  if (await btn.count()) {
    await btn.first().click()
    return true
  }
  return false
}

const enterMission = async (page) => {
  await clickByRole(page, /Enter the district/i) // story intro
  await sleep(900)
  await clickByRole(page, /Start playing/i) // tutorial
  await sleep(1200)
}

async function main() {
  const exe = findBrowser()
  if (!exe) {
    console.log('SMOKE SKIPPED: no Chromium/Edge found (set CHROME_PATH).')
    process.exit(2)
  }

  const server = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', 'preview', '--outDir', 'docs', '--port', String(PORT)],
    { stdio: 'ignore', shell: process.platform === 'win32' },
  )

  let browser
  try {
    const up = await waitForServer(BASE)
    if (!up) throw new Error('preview server did not start')

    browser = await chromium.launch({ executablePath: exe })
    const ctx = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2,
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))

    // 1. Home boots.
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await sleep(800)
    check('home renders a heading', (await page.locator('h1').count()) > 0)

    // 2. Enter the action mission (skip intro + tutorial).
    await enterMission(page)
    check(
      'mission renders a WebGL canvas',
      (await page.locator('canvas').count()) > 0,
    )
    check(
      'touch controls are present',
      (await page.getByRole('button', { name: /Move forward/i }).count()) > 0,
    )

    // 3. Pause works and is dismissable via the overlay's own Resume control.
    const paused = await clickByRole(page, /Pause game/i)
    await sleep(400)
    const overlayShown = (await page.locator('.nanda-pause-overlay').count()) > 0
    check('pause opens the pause overlay', paused && overlayShown)
    await clickByRole(page, /^Resume$/i) // the overlay's Resume button
    await sleep(400)
    check(
      'resume dismisses the pause overlay',
      (await page.locator('.nanda-pause-overlay').count()) === 0,
    )

    // 4. War Council opens and closes repeatedly without breaking the canvas.
    let councilOk = true
    for (let i = 0; i < 3; i += 1) {
      const opened = await clickByRole(page, /Open War Council/i)
      await sleep(300)
      await clickByRole(page, /Continue mission/i)
      await sleep(300)
      if (!opened) councilOk = false
    }
    check('war council opens/closes repeatedly', councilOk)
    check(
      'canvas survives repeated council toggles',
      (await page.locator('canvas').count()) > 0,
    )

    // 5. Media-failure resilience: block mp4s and confirm no crash on reload.
    // First assert the normal-path run produced no errors at all.
    check('no console/page errors on the normal path', errors.length === 0)
    if (errors.length) {
      console.log('PRE-BLOCK ERRORS:', JSON.stringify(errors.slice(0, 12), null, 2))
    }
    const errorsBeforeBlock = errors.length
    // Ignore the deliberate aborted-mp4 resource failures our own route causes.
    const isExpectedMediaError = (text) =>
      text.includes('ERR_FAILED') ||
      text.includes('Failed to load resource') ||
      text.includes('.mp4')

    await ctx.route('**/*.mp4', (route) => route.abort())
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await sleep(1200)
    check(
      'home still renders with video blocked (poster fallback)',
      (await page.locator('h1').count()) > 0,
    )
    await enterMission(page)
    check(
      'mission still boots with video blocked',
      (await page.locator('canvas').count()) > 0,
    )

    // 6. Kalinga chapter: exit to chronicles, open the battle, and confirm the
    // intro cinematic (poster fallback here, since mp4s are blocked) leads into
    // the tactical board.
    await clickByRole(page, /Open War Council/i)
    await sleep(400)
    await clickByRole(page, /Open chronicles/i)
    await sleep(900)
    const kalingaStarted = await clickByRole(page, /Play the Kalinga battle/i)
    await sleep(1400)
    check(
      'Kalinga intro offers "Begin the battle"',
      kalingaStarted &&
        (await page.getByRole('button', { name: /Begin the battle/i }).count()) >
          0,
    )
    await clickByRole(page, /Begin the battle/i)
    await sleep(1000)
    check(
      'Kalinga battle board renders after the intro',
      (await page.locator('.battle-board-card').count()) > 0,
    )

    // With mp4s deliberately blocked, only uncaught page errors (not the
    // expected aborted-media resource failures) should count as regressions.
    const unexpectedAfterBlock = errors
      .slice(errorsBeforeBlock)
      .filter((text) => !isExpectedMediaError(text))
    check(
      'no unexpected errors with video blocked (poster fallback path)',
      unexpectedAfterBlock.length === 0,
    )
    if (unexpectedAfterBlock.length) {
      console.log('ERRORS:', JSON.stringify(unexpectedAfterBlock.slice(0, 12), null, 2))
    }

    await browser.close()
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch {
        // already closed
      }
    }
    server.kill()
  }

  const failed = checks.filter((c) => !c.ok)
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
