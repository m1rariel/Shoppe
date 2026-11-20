import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { isIP } from 'node:net'
import { networkInterfaces } from 'node:os'
import { isAbsolute } from 'node:path'
import process from 'node:process'
import { setTimeout as pause } from 'node:timers/promises'
import { pathToFileURL, URL } from 'node:url'
import { promisify } from 'node:util'
import { createProductApi } from './fixtures/product-api.mjs'

const execute = promisify(execFile)
const docker = process.env.DOCKER_BIN || 'docker'
const runDocker = (...args) => execute(docker, args, { timeout: 30000 })
const apiURL = process.env.NUXT_PUBLIC_API_BASE_URL
assert.ok(apiURL, 'Set NUXT_PUBLIC_API_BASE_URL to the real API under test')
const image = process.env.SHOPPE_TEST_IMAGE
assert.ok(image, 'Set SHOPPE_TEST_IMAGE to a freshly built image')
const host =
  process.env.SHOPPE_TEST_HOST ||
  Object.values(networkInterfaces())
    .flat()
    .find((address) => address.family === 'IPv4' && !address.internal)?.address
assert.ok(
  host && isIP(host) === 4 && !host.startsWith('127.'),
  'Set SHOPPE_TEST_HOST to a host IPv4 reachable from Docker and Chromium',
)
let chromium
try {
  const module = process.env.PLAYWRIGHT_MODULE
  ;({ chromium } = await import(
    module && isAbsolute(module) ? pathToFileURL(module).href : module || 'playwright'
  ))
} catch {
  throw new Error('Set PLAYWRIGHT_MODULE to an existing Playwright module with Chromium installed')
}

const name = `shoppe-shop-browser-${process.pid}-${Date.now()}`
let running = false
let browser
let retryApi
let retryRunning = false
const retryName = `${name}-retry`

async function waitReady(origin) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await globalThis.fetch(`${origin}/account`, {
        signal: globalThis.AbortSignal.timeout(1000),
      })
      await response.body?.cancel()
      if (response.status === 200) return
    } catch (error) {
      if (attempt === 29) throw error
    }
    await pause(100)
  }
  throw new Error('Docker SSR server did not become ready')
}

try {
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
  await waitReady(origin)
  const { stdout: connectivity } = await runDocker(
    'exec',
    name,
    'node',
    '--input-type=module',
    '-e',
    `
    const response = await fetch(process.env.NUXT_PUBLIC_API_BASE_URL + '/products', {
      headers: { Authorization: 'amigo' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Container API status ' + response.status);
    const products = await response.json();
    console.log(JSON.stringify({ status: response.status, count: products.length, firstTitle: products[0]?.title }));
  `,
  )
  process.stdout.write(`Container API: ${connectivity}`)
  process.stdout.write(`Browser origin: ${origin}; API: ${apiURL}\n`)

  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.setDefaultTimeout(15000)
  const apiResponses = []
  const apiFailures = []
  const securityOrHydration = []
  const pageErrors = []
  const isApiRequest = (request) =>
    request.url().startsWith(apiURL) && ['fetch', 'xhr'].includes(request.resourceType())

  page.on('response', (response) => {
    if (isApiRequest(response.request()))
      apiResponses.push({ url: response.url(), status: response.status() })
  })
  page.on('requestfailed', (request) => {
    if (isApiRequest(request))
      apiFailures.push({ url: request.url(), failure: request.failure()?.errorText })
  })
  page.on('console', (message) => {
    if (/CORS|Mixed Content|hydration/i.test(message.text()))
      securityOrHydration.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const cards = page.locator('.products-page__content .product-card')
  const ready = async () => {
    await cards.first().waitFor()
    assert.equal(await cards.count(), 6)
    assert.equal(await page.getByRole('alert').count(), 0)
  }

  const direct = await page.goto(origin + '/products')
  assert.equal(direct.status(), 200)
  await ready()
  const initialTitles = await cards.locator('.product-card__title').allTextContents()
  assert.ok(initialTitles.every((title) => title.trim()))
  const ssr = await direct.text()
  const ssrTitle = await page.evaluate(
    (html) =>
      new globalThis.DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector('.product-card__title')
        ?.textContent.trim(),
    ssr,
  )
  assert.equal(
    ssrTitle,
    initialTitles[0].trim(),
    'Product content must be present in server-rendered HTML',
  )
  await page.reload()
  await ready()
  assert.deepEqual(await cards.locator('.product-card__title').allTextContents(), initialTitles)
  await page.goto(origin + '/account')
  await page.getByRole('link', { name: 'Shop', exact: true }).first().click()
  await page.waitForURL(origin + '/products')
  await ready()
  assert.deepEqual(await cards.locator('.product-card__title').allTextContents(), initialTitles)
  assert.ok(
    apiResponses.some((response) => response.url.includes('/products') && response.status === 200),
    'Client navigation must actually fetch products from the configured API',
  )

  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await page.waitForURL(/page=2/)
  assert.equal(
    await page.getByRole('button', { name: 'Page 2', exact: true }).getAttribute('aria-current'),
    'page',
  )
  assert.notDeepEqual(await cards.locator('.product-card__title').allTextContents(), initialTitles)
  await page.getByLabel('Sort products').selectOption('price-minus')
  await page.waitForURL(/sortBy=price-minus/)
  const prices = await cards.locator('.product-card__price').allTextContents()
  const numbers = prices.map((price) => Number(price.replace(/[^\d.]/g, '')))
  assert.deepEqual(
    numbers,
    [...numbers].sort((a, b) => a - b),
  )
  const category = await page
    .getByLabel('Category', { exact: true })
    .locator('option')
    .nth(1)
    .getAttribute('value')
  assert.ok(category)
  const categoryResponse = page.waitForResponse(
    (response) =>
      response.url().startsWith(apiURL) &&
      response.url().includes('category=') &&
      response.status() === 200,
  )
  await page.getByLabel('Category', { exact: true }).selectOption(category)
  await categoryResponse
  await cards.first().waitFor()
  assert.ok(page.url().includes('category='))
  assert.equal(await page.getByLabel('Category', { exact: true }).inputValue(), category)
  await page.reload()
  await cards.first().waitFor()
  await page
    .waitForFunction(
      (expected) =>
        globalThis.document.querySelector('select[aria-label="Category"]')?.value === expected,
      category,
    )
    .catch(async (error) => {
      process.stderr.write(
        JSON.stringify(
          await page.evaluate(() => ({
            url: globalThis.location.href,
            selects: [...globalThis.document.querySelectorAll('select')].map((select) => ({
              label: select.getAttribute('aria-label'),
              value: select.value,
              html: select.outerHTML,
            })),
          })),
        ) + '\n',
      )
      throw error
    })
  assert.equal(await page.getByLabel('Category', { exact: true }).inputValue(), category)
  assert.equal(await page.getByLabel('Sort products').inputValue(), 'price-minus')
  process.stdout.write(
    `Reloaded filters: category=${category}; sort=price-minus; URL=${page.url()}\n`,
  )

  assert.deepEqual(apiFailures, [])
  assert.deepEqual(securityOrHydration, [])
  assert.deepEqual(pageErrors, [])
  process.stdout.write(`Client API responses: ${JSON.stringify(apiResponses)}\n`)
  process.stdout.write(
    'PASS real API: direct Shop, link navigation, reload, pagination, sorting, category; no API network/CORS/mixed-content/hydration failures\n',
  )

  retryApi = createProductApi({ delay: 0 })
  const productHandler = retryApi.listeners('request')[0]
  let failProducts = true
  retryApi.removeAllListeners('request')
  retryApi.on('request', (request, response) => {
    if (
      failProducts &&
      request.method === 'GET' &&
      new URL(request.url, 'http://fixture').pathname === '/products'
    ) {
      response.setHeader('Access-Control-Allow-Origin', '*')
      response.writeHead(503, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ message: 'Controlled catalog failure' }))
      return
    }
    productHandler(request, response)
  })
  await new Promise((resolve) => retryApi.listen(0, '0.0.0.0', resolve))
  const fixtureURL = `http://${host}:${retryApi.address().port}`
  await runDocker(
    'run',
    '-d',
    '--rm',
    '--name',
    retryName,
    '-p',
    '0:80',
    '-e',
    `NUXT_PUBLIC_API_BASE_URL=${fixtureURL}`,
    image,
  )
  retryRunning = true
  const { stdout: retryPorts } = await runDocker('port', retryName, '80/tcp')
  const retryOrigin = `http://${host}:${retryPorts.split('\n')[0].split(':').at(-1)}`
  process.stdout.write(`Controlled retry origin: ${retryOrigin}; fixture API: ${fixtureURL}\n`)
  await waitReady(retryOrigin)
  await page.goto(retryOrigin + '/products')
  await page.getByRole('alert').filter({ hasText: 'Unable to load products' }).waitFor()
  assert.equal(await cards.count(), 0)
  failProducts = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await cards.first().waitFor()
  assert.equal(await cards.count(), 2)
  assert.match(await cards.first().textContent(), /Fixture gold ring/)
  assert.equal(await page.getByRole('alert').count(), 0)
  assert.deepEqual(securityOrHydration, [])
  assert.deepEqual(pageErrors, [])
  process.stdout.write(
    'PASS controlled fixture only: catalog 503 shows an error and Try again recovers\n',
  )
} finally {
  try {
    await browser?.close()
  } finally {
    try {
      if (retryRunning) await runDocker('stop', retryName)
    } finally {
      try {
        if (running) await runDocker('stop', name)
      } finally {
        if (retryApi?.listening) await new Promise((resolve) => retryApi.close(resolve))
      }
    }
  }
}
