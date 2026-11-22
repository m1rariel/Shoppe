import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { isAbsolute, join } from 'node:path'
import process from 'node:process'
import { setTimeout as pause } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { createProductApi, products } from './fixtures/product-api.mjs'

const execute = promisify(execFile)
const docker = process.env.DOCKER_BIN || 'docker'
const runDocker = (...args) => execute(docker, args, { timeout: 30000 })
const image = process.env.SHOPPE_TEST_IMAGE
assert.ok(image, 'Set SHOPPE_TEST_IMAGE to the current production image')
const host =
  process.env.SHOPPE_TEST_HOST ||
  Object.values(networkInterfaces())
    .flat()
    .find((item) => item.family === 'IPv4' && !item.internal)?.address
assert.ok(host && !host.startsWith('127.'), 'Use reachable host IPv4')
const module = process.env.PLAYWRIGHT_MODULE || 'playwright'
const { chromium } = await import(isAbsolute(module) ? pathToFileURL(module).href : module)
const output = process.env.PRODUCT_OUTPUT || '/tmp/shoppe-product-browser'
await mkdir(output, { recursive: true })
products.push(
  { ...products[0], id: 3, title: 'Fixture pearl necklace' },
  { ...products[0], id: 4, title: 'Fixture copper earrings' },
  {
    ...products[0],
    id: 5,
    title: 'Fixture broken image',
    category: 'Other',
    image: '/missing.svg',
  },
)
const api = createProductApi()
const name = `shoppe-product-browser-${process.pid}-${Date.now()}`
const report = {
  image,
  checks: [],
  screenshots: [],
  limitations: [
    'Headless Chromium; no physical phone swipe/pinch/pan, native OS Share sheet or Safari verification.',
    'Synthetic product/cart API; no email/social intent opened and no publishing.',
    'Pixso visual comparison is performed separately; screenshots alone do not establish pixel equivalence.',
  ],
}
let browser
let running = false
let page
const check = (scenario, evidence) => {
  report.checks.push({ scenario, evidence })
  process.stdout.write(`PASS ${scenario}: ${JSON.stringify(evidence)}\n`)
}
try {
  await new Promise((resolve, reject) => {
    api.once('error', reject)
    api.listen(0, '0.0.0.0', resolve)
  })
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
  Object.assign(report, { origin, apiURL })
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await globalThis.fetch(`${origin}/products/1`, {
        signal: globalThis.AbortSignal.timeout(1000),
      })
      await response.body?.cancel()
      if (response.ok) break
    } catch (error) {
      if (attempt === 29) throw error
    }
    assert.ok(attempt < 29, 'Container readiness')
    await pause(100)
  }
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
  page = await context.newPage()
  page.setDefaultTimeout(12000)
  const errors = []
  const collectErrors = (target) => {
    target.on('pageerror', (error) => errors.push(`${target.url()}: ${error.message}`))
    target.on('console', (message) => {
      if (/hydration|CORS|Mixed Content/i.test(message.text()))
        errors.push(`${target.url()}: ${message.text()}`)
    })
  }
  collectErrors(page)
  const capture = async (label) => {
    await page.evaluate(() => globalThis.document.fonts.ready)
    const path = join(output, `${label}.png`)
    await page.screenshot({
      path,
      fullPage: !(await page.locator('dialog[open]').count()),
      animations: 'disabled',
    })
    report.screenshots.push(path)
    assert.equal(
      await page.evaluate(
        () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
      ),
      false,
      `${label} overflow`,
    )
  }
  const openReviews = async () => {
    const control = page.getByRole(page.viewportSize().width < 768 ? 'button' : 'tab', {
      name: /^Reviews \(/,
    })
    if (
      (await control.getAttribute('aria-expanded')) !== 'true' &&
      (await control.getAttribute('aria-selected')) !== 'true'
    )
      await control.click()
    await page.getByLabel('Your Review*', { exact: true }).waitFor({ state: 'visible' })
  }
  const navigate = async (id) => {
    await page.goto(`${origin}/products/${id}`)
    await page.locator('.product-info__title').waitFor()
    await page.waitForFunction(
      () => !globalThis.document.querySelector('.similar-items[aria-busy="true"]'),
    )
  }
  for (const width of [320, 390, 767, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await navigate(1)
    await capture(`${width}-default`)
    await openReviews()
    await page.getByText('There are no reviews yet.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'SUBMIT', exact: true }).click()
    assert.equal(
      await page
        .getByLabel('Your Review*', { exact: true })
        .evaluate((el) => el === globalThis.document.activeElement),
      true,
    )
    await capture(`${width}-reviews-errors-empty`)
    await page
      .getByLabel('Your Review*', { exact: true })
      .fill('Draft preserved across sections and breakpoints.')
    const description = page.getByRole(width < 768 ? 'button' : 'tab', {
      name: 'Description',
      exact: true,
    })
    await description.click()
    await openReviews()
    assert.equal(
      await page.getByLabel('Your Review*', { exact: true }).inputValue(),
      'Draft preserved across sections and breakpoints.',
    )
    const opener = page
      .locator(width < 768 ? '.product-gallery__mobile-opener' : '.product-gallery__stage')
      .first()
    await opener.scrollIntoViewIfNeeded()
    await opener.focus()
    const scroll = await page.evaluate(() => globalThis.scrollY)
    await opener.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Enlarged product image' })
    await dialog.waitFor({ state: 'visible' })
    assert.equal(await dialog.evaluate((el) => el.matches(':modal')), true)
    await page.locator('.product-info__share').evaluate((el) => el.focus())
    assert.equal(
      await dialog.evaluate((el) => el.contains(globalThis.document.activeElement)),
      true,
      'Native inert blocks background focus',
    )
    for (let index = 0; index < 12; index++) {
      await page.keyboard.press(index < 6 ? 'Tab' : 'Shift+Tab')
      assert.equal(
        await dialog.evaluate(
          (el) =>
            el.contains(globalThis.document.activeElement) ||
            globalThis.document.activeElement === globalThis.document.body,
        ),
        true,
      )
    }
    await page.mouse.wheel(0, 500)
    assert.equal(await page.evaluate(() => globalThis.scrollY), scroll)
    for (let index = 0; index < 6; index++)
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    assert.equal(await page.getByLabel('Image scale').innerText(), '400%')
    assert.equal(
      await page.getByRole('button', { name: 'Zoom in', exact: true }).isDisabled(),
      true,
    )
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
    assert.equal(await page.getByLabel('Image scale').innerText(), '350%')
    const crop = await page
      .getByLabel('Enlarged image, scroll to explore', { exact: true })
      .evaluate((el) => {
        const bounds = el.getBoundingClientRect()
        const image = el.querySelector('img')
        const rect = image.getBoundingClientRect()
        const ratio = image.naturalWidth / image.naturalHeight
        const width = Math.min(rect.width, rect.height * ratio)
        const height = Math.min(rect.height, rect.width / ratio)
        const left = rect.left + (rect.width - width) / 2
        const top = rect.top + (rect.height - height) / 2
        const visibleWidth = Math.max(
          0,
          Math.min(left + width, bounds.right) - Math.max(left, bounds.left),
        )
        const visibleHeight = Math.max(
          0,
          Math.min(top + height, bounds.bottom) - Math.max(top, bounds.top),
        )
        return {
          visibleFraction: (visibleWidth * visibleHeight) / (bounds.width * bounds.height),
          left: el.scrollLeft,
          top: el.scrollTop,
        }
      })
    assert.ok(
      crop.visibleFraction > 0.95,
      `Button zoom retains visible image at ${width}: ${JSON.stringify(crop)}`,
    )
    check(`button zoom visible crop ${width}`, crop)
    await capture(`${width}-viewer`)
    await page.getByLabel('Enlarged image, scroll to explore', { exact: true }).focus()
    await page.keyboard.press('PageDown')
    await page.waitForFunction(
      () => globalThis.document.querySelector('.product-gallery__viewer-scroll').scrollTop > 0,
    )
    await page.getByLabel('Enlarged image, scroll to explore', { exact: true }).evaluate((el) => {
      el.scrollTo((el.scrollWidth - el.clientWidth) / 2, (el.scrollHeight - el.clientHeight) / 2)
    })
    await capture(`${width}-viewer-scrolled`)
    await page.getByRole('button', { name: 'Reset zoom', exact: true }).click()
    assert.equal(await page.getByLabel('Image scale').innerText(), '100%')
    await capture(`${width}-viewer-reset`)
    assert.equal(
      await page.getByRole('button', { name: 'Zoom out', exact: true }).isDisabled(),
      true,
    )
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await opener.evaluate((el) => el === globalThis.document.activeElement), true)
    assert.equal(await page.evaluate(() => globalThis.scrollY), scroll)
    await opener.press('Enter')
    assert.equal(await page.getByLabel('Image scale').innerText(), '100%')
    await page.getByRole('button', { name: 'Close image viewer', exact: true }).click()
    assert.equal(await page.evaluate(() => globalThis.document.body.style.overflow), '')
    if (width >= 768) {
      await opener.hover({ position: { x: 20, y: 30 } })
      await page.waitForFunction(
        () =>
          globalThis.getComputedStyle(
            globalThis.document.querySelector('.product-gallery__active-image'),
          ).transform === 'matrix(2, 0, 0, 2, 0, 0)',
      )
      const first = await page
        .locator('.product-gallery__active-image')
        .evaluate((el) => el.style.transformOrigin)
      await opener.hover({ position: { x: 60, y: 60 } })
      assert.notEqual(
        await page
          .locator('.product-gallery__active-image')
          .evaluate((el) => el.style.transformOrigin),
        first,
      )
      await page.getByRole('button', { name: 'View image 2 of 4' }).click()
      assert.equal(
        await page.getByRole('button', { name: 'View image 2 of 4' }).getAttribute('aria-pressed'),
        'true',
      )
    } else {
      const similar = page.getByRole('region', { name: 'Similar products', exact: true })
      await similar.scrollIntoViewIfNeeded()
      await similar.focus()
      await page.keyboard.press('End')
      await page.keyboard.press('ArrowRight')
      if (width < 432)
        await page.waitForFunction(
          () => globalThis.document.querySelector('.product-list--similar').scrollLeft > 0,
        )
    }
    check(
      `viewport ${width}`,
      'layout/no overflow, empty/error reviews, draft/sections, real modal/inert/focus trap/Escape/scroll restore/reopen, zoom 100–400%; desktop hover/miniatures or mobile similar keyboard scroll',
    )
  }
  await page.setViewportSize({ width: 767, height: 900 })
  await openReviews()
  await page.getByLabel('Your Review*', { exact: true }).fill('Boundary draft stays intact.')
  await page.setViewportSize({ width: 768, height: 900 })
  await openReviews()
  assert.equal(
    await page.getByLabel('Your Review*', { exact: true }).inputValue(),
    'Boundary draft stays intact.',
  )
  await page.setViewportSize({ width: 767, height: 900 })
  await openReviews()
  assert.equal(
    await page.getByLabel('Your Review*', { exact: true }).inputValue(),
    'Boundary draft stays intact.',
  )
  check('767↔768 draft', 'same draft preserved')
  await page.setViewportSize({ width: 390, height: 900 })
  await page.getByLabel('Enter your name*', { exact: true }).fill('LongName'.repeat(10))
  await page.getByLabel('Enter your Email*', { exact: true }).fill('synthetic@example.test')
  await page.getByRole('radio', { name: '5 stars', exact: true }).check()
  await page.getByLabel('Your Review*', { exact: true }).fill('ДлинныйОтзыв'.repeat(150))
  await page.getByRole('checkbox', { name: /Save my name and email/ }).check()
  await page.getByRole('button', { name: 'SUBMIT', exact: true }).click()
  await page.getByText('Your review was saved on this device.', { exact: true }).waitFor()
  for (const width of [320, 390, 767, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await openReviews()
    await capture(`${width}-long-review`)
  }
  await page.reload()
  await openReviews()
  assert.equal(await page.locator('.product-reviews__review').count(), 1)
  assert.equal(
    await page.getByLabel('Enter your name*', { exact: true }).inputValue(),
    'LongName'.repeat(10),
  )
  check(
    'long review persistence/author',
    '1650 characters and 80 character name; all five widths, reload',
  )
  await page.getByRole('button', { name: 'Share product', exact: true }).click()
  const manual = page.getByRole('textbox', { name: 'Product link', exact: true })
  await manual.waitFor()
  assert.equal(await manual.inputValue(), `${origin}/products/1`)
  assert.equal(
    await manual.evaluate(
      (el) =>
        el === globalThis.document.activeElement &&
        el.selectionStart === 0 &&
        el.selectionEnd === el.value.length,
    ),
    true,
  )
  for (const [label, fragment] of [
    ['Share product by email', 'mailto:'],
    ['Share product on Facebook', 'facebook.com/sharer/'],
    ['Share product on Twitter', 'twitter.com/intent/'],
  ]) {
    const href = await page.getByRole('link', { name: label }).getAttribute('href')
    assert.ok(href.includes(fragment) && href.includes(encodeURIComponent(`${origin}/products/1`)))
  }
  await capture('1440-share-manual')
  check(
    'HTTP IP Share fallback',
    await page.evaluate(() => ({
      secure: globalThis.isSecureContext,
      nativeShare: typeof globalThis.navigator.share,
      clipboard: typeof globalThis.navigator.clipboard,
      manualFocusSelection: true,
    })),
  )
  const card = page.locator('.similar-items .product-card').first()
  await card.hover()
  await card.getByRole('button', { name: 'ADD TO CART', exact: true }).click()
  await page.getByText('View bag', { exact: true }).first().waitFor()
  assert.equal(page.url(), `${origin}/products/1`)
  await page.evaluate(() => {
    globalThis.__acceptanceDocument = 'same-document'
  })
  await card.getByRole('link').click()
  await page.waitForURL(`${origin}/products/2`)
  await page
    .getByRole('heading', { name: 'Fixture silver bracelet', exact: true })
    .first()
    .waitFor()
  assert.equal(await page.evaluate(() => globalThis.__acceptanceDocument), 'same-document')
  assert.equal(await manual.count(), 0)
  assert.equal(await page.locator('dialog[open]').count(), 0)
  await openReviews()
  assert.equal(await page.locator('.product-reviews__review').count(), 0)
  assert.equal(await page.getByLabel('Your Review*', { exact: true }).inputValue(), '')
  assert.equal(await page.locator('.product-gallery button[aria-haspopup="dialog"]').count(), 0)
  await page.getByRole('button', { name: 'Share product', exact: true }).click()
  assert.equal(await manual.inputValue(), `${origin}/products/2`)
  await page
    .locator('.similar-items')
    .getByRole('link', { name: 'Fixture gold ring', exact: true })
    .click()
  await page.waitForURL(`${origin}/products/1`)
  await openReviews()
  assert.equal(await page.locator('.product-reviews__review').count(), 1)
  check(
    'similar add/SPA/reset/reentry',
    'add notification without navigation; same document product2 with fresh review/manual/image state; product1 saved review restored',
  )
  await page.locator('.product-gallery__stage').press('Enter')
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.goBack()
  await page.waitForURL(`${origin}/products/2`)
  await page.locator('dialog[open]').waitFor({ state: 'detached' })
  await page
    .getByRole('heading', { name: 'Fixture silver bracelet', exact: true })
    .first()
    .waitFor()
  assert.equal(await page.locator('dialog[open]').count(), 0)
  assert.equal(await page.evaluate(() => globalThis.document.body.style.overflow), '')
  await page.goForward()
  await page.waitForURL(`${origin}/products/1`)
  await page.locator('.product-gallery__stage').press('Enter')
  assert.equal(await page.getByLabel('Image scale').innerText(), '100%')
  await page.keyboard.press('Escape')
  check(
    'open viewer/history navigation',
    'browser Back closes viewer and restores body scrolling; Forward/reopen resets scale',
  )
  await navigate(5)
  try {
    await page
      .locator('.product-gallery__desktop .product-gallery__fallback')
      .waitFor({ timeout: 3000 })
    assert.equal(await page.locator('.product-gallery button[aria-haspopup="dialog"]').count(), 0)
    check('broken/missing image', 'fallback, no opener')
  } catch {
    report.findings = [
      'Direct SSR broken image before hydration leaves active opener without fallback.',
    ]
  }
  assert.equal(await page.locator('.similar-items').count(), 0)
  await capture('1440-broken-image-empty-similar')
  check('empty similar', 'hidden for category with no other products')
  await page.route(`${apiURL}/products?*`, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"message":"controlled similar failure"}',
    }),
  )
  await navigate(1)
  await page.getByText('Unable to load similar items.', { exact: true }).waitFor()
  await capture('1440-similar-error')
  await page.unroute(`${apiURL}/products?*`)
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await page.locator('.similar-items .product-card').first().waitFor()
  await openReviews()
  await page
    .getByLabel('Your Review*', { exact: true })
    .fill('Draft retained after controlled storage failure.')
  await page.getByRole('radio', { name: '4 stars', exact: true }).check()
  await page.evaluate(() => {
    globalThis.__originalStorageSet = globalThis.Storage.prototype.setItem
    globalThis.Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('shoppe:product-reviews:'))
        throw new globalThis.DOMException('Controlled quota', 'QuotaExceededError')
      return globalThis.__originalStorageSet.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: 'SUBMIT', exact: true }).click()
  await page
    .getByText('Unable to save your review. Your draft is kept. Please try again.', { exact: true })
    .waitFor()
  assert.equal(
    await page.getByLabel('Your Review*', { exact: true }).inputValue(),
    'Draft retained after controlled storage failure.',
  )
  await capture('1440-review-storage-error-draft')
  await page.evaluate(() => {
    globalThis.Storage.prototype.setItem = globalThis.__originalStorageSet
  })
  await page.getByRole('button', { name: 'SUBMIT', exact: true }).click()
  await page.getByText('Your review was saved on this device.', { exact: true }).waitFor()
  check(
    'controlled similar/storage failures',
    '503 local error/retry recovery; storage quota draft kept/retry saved',
  )
  assert.deepEqual(errors, [])
  check('browser runtime', 'no page/hydration/CORS errors')
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 900 },
    hasTouch: true,
    isMobile: true,
  })
  const touchPage = await touchContext.newPage()
  collectErrors(touchPage)
  touchPage.setDefaultTimeout(10000)
  await touchPage.goto(`${origin}/products/1`)
  const touchOpener = touchPage.locator('.product-gallery__mobile-opener').first()
  await touchOpener.tap()
  const touchViewer = touchPage.getByRole('dialog', { name: 'Enlarged product image' })
  await touchViewer.waitFor()
  const cdp = await touchContext.newCDPSession(touchPage)
  const touch = async (type, points) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([id, x, y]) => ({ id, x, y })),
    })
  const percent = async () =>
    Number.parseInt(await touchPage.getByLabel('Image scale').innerText(), 10)
  const viewport = touchPage.getByLabel('Enlarged image, scroll to explore', { exact: true })
  const bounds = await viewport.boundingBox()
  await viewport.evaluate((el) => {
    globalThis.__touchEvidence = []
    globalThis.__touchEnded = []
    el.addEventListener('pointerdown', (event) => {
      globalThis.__touchEvidence.push({
        pointerId: event.pointerId,
        trusted: event.isTrusted,
        pointerType: event.pointerType,
      })
    })
    el.addEventListener('pointerup', (event) =>
      globalThis.__touchEnded.push({ pointerId: event.pointerId, trusted: event.isTrusted }),
    )
  })
  const x = bounds.x + 80
  const y = bounds.y + 180
  await touch('touchStart', [[1, x, y]])
  await touch('touchStart', [
    [1, x, y],
    [2, x + 80, y],
  ])
  const captureEvidence = await viewport.evaluate((el) =>
    globalThis.__touchEvidence.map((event) => ({
      ...event,
      captured: el.hasPointerCapture(event.pointerId),
    })),
  )
  assert.ok(
    captureEvidence.length === 2 &&
      captureEvidence.every(
        (event) => event.trusted && event.pointerType === 'touch' && event.captured,
      ),
  )
  await touch('touchMove', [
    [1, x, y],
    [2, x + 220, y],
  ])
  await touchPage.waitForFunction(
    () =>
      Number.parseInt(
        globalThis.document.querySelector('[aria-label="Image scale"]').textContent,
        10,
      ) > 100,
  )
  const pinched = await percent()
  await touch('touchEnd', [[2, x + 220, y]])
  const releaseEvidence = await viewport.evaluate((el) => ({
    ended: globalThis.__touchEnded,
    remaining: globalThis.__touchEvidence.map((event) => el.hasPointerCapture(event.pointerId)),
  }))
  assert.deepEqual(releaseEvidence.remaining, [true, false])
  assert.deepEqual(releaseEvidence.ended, [
    { pointerId: captureEvidence[1].pointerId, trusted: true },
  ])
  const beforePan = await viewport.evaluate((el) => el.scrollLeft)
  await touch('touchMove', [[1, x - 50, y - 50]])
  await touchPage.waitForFunction(
    (previous) =>
      globalThis.document.querySelector('.product-gallery__viewer-scroll').scrollLeft > previous,
    beforePan,
  )
  assert.equal(await percent(), pinched)
  await touch('touchMove', [[1, x - 10000, y - 10000]])
  await touchPage.waitForFunction(() => {
    const el = globalThis.document.querySelector('.product-gallery__viewer-scroll')
    return (
      Math.abs(el.scrollLeft - (el.scrollWidth - el.clientWidth)) <= 1 &&
      Math.abs(el.scrollTop - (el.scrollHeight - el.clientHeight)) <= 1
    )
  })
  await touch('touchMove', [[1, x - 50, y - 50]])
  await touch('touchStart', [
    [1, x - 50, y - 50],
    [2, x + 80, y - 50],
  ])
  await touch('touchMove', [
    [1, x - 50, y - 50],
    [2, x + 80, y - 50],
  ])
  assert.equal(await percent(), pinched, 'one-to-two transition keeps scale')
  await touch('touchCancel', [])
  const position = await viewport.evaluate((el) => ({
    left: el.scrollLeft,
    top: el.scrollTop,
    maxLeft: el.scrollWidth - el.clientWidth,
    maxTop: el.scrollHeight - el.clientHeight,
  }))
  assert.ok(
    position.left >= 0 &&
      position.left <= position.maxLeft &&
      position.top >= 0 &&
      position.top <= position.maxTop,
  )
  await touchPage.getByRole('button', { name: 'Reset zoom', exact: true }).tap()
  assert.equal(await percent(), 100)
  await touchPage.getByRole('button', { name: 'Close image viewer', exact: true }).tap()
  await touchOpener.tap()
  assert.equal(await percent(), 100)
  await touchPage.getByRole('button', { name: 'Close image viewer', exact: true }).tap()
  await touchOpener.scrollIntoViewIfNeeded()
  const slide = await touchOpener.boundingBox()
  const swipeY = slide.y + Math.min(slide.height / 2, 200)
  await touch('touchStart', [[1, slide.x + slide.width - 30, swipeY]])
  for (const distance of [60, 120, 180, 240]) {
    await touch('touchMove', [[1, slide.x + slide.width - 30 - distance, swipeY]])
  }
  await touch('touchEnd', [])
  await touchPage.waitForFunction(
    () => globalThis.document.querySelectorAll('.product-gallery__mobile-opener')[1].tabIndex === 0,
  )
  assert.equal(await touchPage.locator('dialog[open]').count(), 0)
  await touchPage.setViewportSize({ width: 768, height: 900 })
  await touchPage.locator('.product-gallery__stage').click()
  await touchViewer.waitFor()
  assert.equal(await percent(), 100)
  await touchPage.keyboard.press('Escape')
  const touchScreenshot = join(output, '768-cdp-touch-swipe-resize.png')
  await touchPage.screenshot({ path: touchScreenshot, fullPage: true })
  report.screenshots.push(touchScreenshot)
  check('Chromium CDP touch emulation', {
    pinched,
    captureEvidence,
    releaseEvidence,
    position,
    scenarios:
      'trusted browser touch pinch, pan, 2→1/1→2, cancel, reset/close/reopen, gallery swipe, resize desktop click; no physical device claim',
  })
  await touchContext.close()
  assert.deepEqual(errors, [])
  await browser.close()
  const clipboardOrigin = origin.replace(host, 'localhost')
  browser = await chromium.launch({ headless: true })
  const secureContext = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 1440, height: 900 },
  })
  page = await secureContext.newPage()
  collectErrors(page)
  page.setDefaultTimeout(5000)
  await page.goto(`${clipboardOrigin}/products/1`)
  check(
    'clipboard capabilities',
    await page.evaluate(() => ({
      secure: globalThis.isSecureContext,
      clipboard: typeof globalThis.navigator.clipboard,
      share: typeof globalThis.navigator.share,
    })),
  )
  await page.getByRole('button', { name: 'Share product', exact: true }).click()
  await page.getByText('Ссылка скопирована', { exact: true }).waitFor()
  assert.equal(
    await page.evaluate(() => globalThis.navigator.clipboard.readText()),
    `${clipboardOrigin}/products/1`,
  )
  await page.getByRole('button', { name: 'Copy product link for Instagram', exact: true }).click()
  assert.equal(
    await page.evaluate(() => globalThis.navigator.clipboard.readText()),
    `${clipboardOrigin}/products/1`,
  )
  check(
    'real Chromium clipboard',
    'actual writeText/readText with granted permission on localhost trusted context; Share fallback and Instagram; no clipboard mock. Primary acceptance used host IP HTTP.',
  )
  assert.deepEqual(errors, [])
  report.success = !report.findings?.length
  if (!report.success) process.exitCode = 1
} catch (error) {
  report.failure = error.stack
  if (page)
    await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {})
  throw error
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2))
  await browser?.close()
  if (running) await runDocker('stop', name)
  if (api.listening) await new Promise((resolve) => api.close(resolve))
}
