import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { isIP } from 'node:net'
import { networkInterfaces } from 'node:os'
import { isAbsolute, join } from 'node:path'
import process from 'node:process'
import { setTimeout as pause } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { createAuthApi } from './fixtures/auth-api.mjs'

const execute = promisify(execFile)
const docker = process.env.DOCKER_BIN || 'docker'
const runDocker = (...args) => execute(docker, args, { timeout: 30000 })
const image = process.env.SHOPPE_TEST_IMAGE
assert.ok(image, 'Build an image and set SHOPPE_TEST_IMAGE')
const host =
  process.env.SHOPPE_TEST_HOST ||
  Object.values(networkInterfaces())
    .flat()
    .find((address) => address.family === 'IPv4' && !address.internal)?.address
assert.ok(host && isIP(host) === 4 && !host.startsWith('127.'), 'Set a reachable host IPv4')
const module = process.env.PLAYWRIGHT_MODULE || 'playwright'
const { chromium } = await import(isAbsolute(module) ? pathToFileURL(module).href : module)
const output = process.env.FORMS_OUTPUT || '/tmp/shoppe-forms-browser'
const phase = process.env.FORMS_PHASE || 'before'
assert.match(phase, /^[a-z0-9-]+$/i)
await mkdir(output, { recursive: true })

const { server: api, logins } = createAuthApi()
const name = `shoppe-forms-browser-${process.pid}-${Date.now()}`
const geometry = []
let browser
let running = false

try {
  await new Promise((resolve) => api.listen(0, '0.0.0.0', resolve))
  const apiURL = `http://${host}:${api.address().port}`
  await runDocker(
    'run',
    '-d',
    '--rm',
    '--name',
    name,
    '-p',
    '0:80',
    '-e',
    `NUXT_PUBLIC_API_BASE_URL=${apiURL}`,
    image,
  )
  running = true
  const { stdout: ports } = await runDocker('port', name, '80/tcp')
  const origin = `http://${host}:${ports.split('\n')[0].split(':').at(-1)}`
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await globalThis.fetch(`${origin}/account`, {
        signal: globalThis.AbortSignal.timeout(1000),
      })
      await response.body?.cancel()
      if (response.ok) break
    } catch (error) {
      if (attempt === 29) throw error
    }
    assert.ok(attempt < 29, 'Container did not become ready')
    await pause(100)
  }
  process.stdout.write(`Forms origin: ${origin}; synthetic API: ${apiURL}; image: ${image}\n`)
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 1000 } })
  page.setDefaultTimeout(15000)
  const errors = []
  const warnings = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (/hydration|CORS|Mixed Content/i.test(message.text())) warnings.push(message.text())
  })
  const focused = async (name) => {
    await page.waitForFunction(
      (label) => globalThis.document.activeElement?.getAttribute('aria-label') === label,
      name,
    )
  }
  const capture = async (width, state) => {
    await page.evaluate(() => globalThis.document.fonts.ready)
    await page.screenshot({
      path: join(output, `${phase}-${width}-${state}.png`),
      fullPage: true,
      animations: 'disabled',
    })
    const layout = await page.evaluate(() => {
      const selectors = [
        '.account-panel',
        '.account-panel__title',
        '.account-tabs',
        '.account-form',
        '.account-form__field',
        '.base-input__field',
        '.base-input__error',
        '.account-form__error',
        '.account-form__actions',
        '.account-remember',
        '.account-form__submit',
        '.account-reset-link',
        '.reset-password__description',
        '.reset-password__back',
      ]
      return {
        overflow: globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
        elements: selectors.flatMap((selector) =>
          [...globalThis.document.querySelectorAll(selector)].map((element, index) => {
            const { x, y, width, height } = element.getBoundingClientRect()
            return { selector, index, x, y: y + globalThis.scrollY, width, height }
          }),
        ),
      }
    })
    assert.equal(layout.overflow, false, `Horizontal overflow at ${width}/${state}`)
    geometry.push({ width, state, ...layout })
  }

  for (const width of [320, 390, 767, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(`${origin}/account`)
    const username = page.getByRole('textbox', { name: 'Username', exact: true })
    const password = page.getByLabel('Password', { exact: true })
    const submit = page.getByRole('button', { name: 'SIGN IN', exact: true })
    await username.waitFor()
    await capture(width, 'account-default')
    await username.focus()
    await username.press('Enter')
    await focused('Username')
    await capture(width, 'account-invalid')
    await username.fill('synthetic-user')
    await submit.click()
    await focused('Password')
    if (width < 768) {
      const previousRequests = logins.length
      await page.getByRole('button', { name: 'Clear Username', exact: true }).click()
      await focused('Username')
      assert.equal(await username.inputValue(), '')
      assert.equal(logins.length, previousRequests)
    }
    await username.fill('wrong-user')
    await password.fill('wrong-pass')
    await page.getByLabel('Remember me').check()
    await capture(width, 'account-filled')
    await submit.click()
    await page.getByRole('alert').filter({ hasText: 'Incorrect username or password' }).waitFor()
    await capture(width, 'account-rejected')
    await username.fill('slow-old')
    await password.fill('synthetic-pass')
    await submit.click()
    await page.getByRole('button', { name: 'Signing in…' }).waitFor()
    await capture(width, 'account-loading')
    await page.getByRole('button', { name: 'Register', exact: true }).click()
    assert.equal(await page.locator('.account-form').count(), 0)
    await page.getByText('Registration is currently unavailable.', { exact: true }).waitFor()
    await capture(width, 'account-register')
    logins.filter((login) => !login.finished).forEach((login) => login.release?.())
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await password.fill('')
    await submit.click()
    await focused('Password')
    await page.getByRole('link', { name: 'Have you forgotten your password?' }).click()
    await page.waitForURL(`${origin}/reset-password`)
    await capture(width, 'reset-default')
    await page.getByRole('button', { name: 'RESET PASSWORD', exact: true }).click()
    await focused('Email')
    await capture(width, 'reset-invalid')
    await page.getByRole('link', { name: 'Back to Sign In' }).click()
    await page.waitForURL(`${origin}/account`)
    await submit.click()
    await focused('Username')
    process.stdout.write(
      `PASS forms ${width}: validation focus, mobile clear, rejection, loading, tabs/remount, reset focus\n`,
    )
  }

  await writeFile(
    join(output, `${phase}-geometry.json`),
    JSON.stringify({ origin, apiURL, image, geometry }, null, 2),
  )

  await page.addInitScript(() => {
    const observer = new globalThis.MutationObserver(() => {
      if (!globalThis.document.body) return

      observer.disconnect()
      const unrelatedSlider = globalThis.document.createElement('div')
      unrelatedSlider.id = 'unrelated-slider'
      unrelatedSlider.className = 'swiper'
      globalThis.document.body.prepend(unrelatedSlider)
    })
    observer.observe(globalThis.document, { childList: true, subtree: true })
  })
  await page.route('https://picsum.photos/v2/list?*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: '[]',
    }),
  )
  await page.goto(`${origin}/`)
  try {
    await page.locator('.home-slider .swiper-initialized').waitFor()
  } catch (error) {
    await page.screenshot({ path: join(output, `${phase}-home-failure.png`), fullPage: true })
    process.stderr.write(JSON.stringify({ url: page.url(), errors, warnings }) + '\n')
    throw error
  }
  assert.equal(
    await page.evaluate(() => {
      const element = globalThis.document.querySelector('.home-slider .swiper')
      return element.swiper.el === element && !globalThis.document.querySelector('#unrelated-slider').swiper
    }),
    true,
  )
  const bullets = page.locator('.home-slider .swiper-pagination-bullet')
  assert.equal(await bullets.count(), 10)
  await bullets.nth(2).click()
  await page.waitForFunction(
    () => globalThis.document.querySelector('.home-slider .swiper').swiper.realIndex === 2,
  )
  await page.getByRole('link', { name: 'Shop', exact: true }).first().click()
  await page.waitForURL(`${origin}/products`)
  await page.locator('.products-page').waitFor()
  await page.locator('.home-slider').waitFor({ state: 'detached' })
  await page.goBack()
  await page.locator('.home-slider .swiper-initialized').waitFor()
  await page.waitForFunction(
    () => globalThis.document.querySelectorAll('.home-slider .swiper-pagination-bullet').length === 10,
  )
  assert.equal(await bullets.count(), 10)
  await bullets.nth(1).click()
  await page.waitForFunction(
    () => globalThis.document.querySelector('.home-slider .swiper').swiper.realIndex === 1,
  )
  assert.deepEqual(errors, [])
  assert.deepEqual(warnings, [])
  await writeFile(
    join(output, `${phase}-geometry.json`),
    JSON.stringify({ origin, apiURL, image, geometry }, null, 2),
  )
  process.stdout.write(
    `PASS home: own element despite unrelated .swiper, pagination and SPA reentry; no page/hydration/CORS errors\nArtifacts: ${output}/${phase}-*\n`,
  )
} finally {
  logins.filter((login) => !login.finished).forEach((login) => login.release?.())
  try {
    await browser?.close()
  } finally {
    try {
      if (running) await runDocker('stop', name)
    } finally {
      if (api.listening) await new Promise((resolve) => api.close(resolve))
    }
  }
}
