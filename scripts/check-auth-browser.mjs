import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { isIP } from 'node:net'
import { networkInterfaces } from 'node:os'
import { isAbsolute } from 'node:path'
import process from 'node:process'
import { setTimeout as pause } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import { promisify } from 'node:util'
import { createAuthApi } from './fixtures/auth-api.mjs'

const execute = promisify(execFile)
const project = fileURLToPath(new URL('..', import.meta.url))
const docker = process.env.DOCKER_BIN || 'docker'
const runDocker = (...args) => {
  const result = execute(docker, args, {
    cwd: project,
    maxBuffer: 8 * 1024 * 1024,
    timeout: args[0] === 'build' ? 180000 : 30000,
  })
  if (args[0] === 'build') result.child.stderr.pipe(process.stderr)
  return result
}
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
  throw new Error(
    'Playwright is unavailable. Set PLAYWRIGHT_MODULE to an existing Playwright module; this runner does not install dependencies.',
  )
}

const unique = `${process.pid}-${Date.now()}`
const image = process.env.SHOPPE_TEST_IMAGE || `shoppe-auth-browser:${unique}`
const name = `shoppe-auth-browser-${unique}`
const { server: api, logins } = createAuthApi()
let browser
let running = false
let built = false

async function waitUntil(predicate, message) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (predicate()) return
    await pause(25)
  }
  throw new Error(message)
}

try {
  if (!process.env.SHOPPE_TEST_IMAGE) {
    await runDocker('build', '-t', image, '.')
    built = true
  }
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
  const { stdout } = await runDocker('port', name, '80/tcp')
  const origin = `http://${host}:${stdout.split('\n')[0].split(':').at(-1)}`
  let ready = false
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      ready =
        (
          await globalThis.fetch(origin + '/account', {
            signal: globalThis.AbortSignal.timeout(1000),
          })
        ).status === 200
      if (ready) break
    } catch {
      ready = false
    }
    await pause(100)
  }
  assert.ok(ready, 'Docker SSR server did not become ready')
  const runtime = await execute(process.execPath, ['--test', 'tests/auth-runtime.test.mjs'], {
    cwd: project,
    timeout: 30000,
    env: { ...process.env, SHOPPE_RUNTIME_URL: origin },
  })
  process.stdout.write(runtime.stdout)

  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const hydration = []
  const pageErrors = []
  page.on('console', (message) => {
    if (/hydration/i.test(message.text())) hydration.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const cart = JSON.stringify({
    version: 1,
    items: [
      {
        product: {
          id: 1,
          title: 'Synthetic cart item',
          price: 10,
          category: 'test',
          description: 'fixture',
        },
        quantity: 2,
      },
    ],
  })
  const authCookie = async () =>
    (await context.cookies()).find((cookie) => cookie.name === 'authToken')
  const assertCart = async () => {
    await page.waitForFunction(
      () =>
        globalThis.document.querySelector('.mobile-menu__cart-count')?.textContent.trim() === '2',
    )
    assert.equal(await page.evaluate(() => globalThis.localStorage.getItem('cart')), cart)
  }
  const fillLogin = async (username = 'synthetic-user') => {
    await page.getByLabel('Username', { exact: true }).fill(username)
    await page.getByLabel('Password', { exact: true }).fill('synthetic-pass')
  }
  const submit = () => page.getByRole('button', { name: 'SIGN IN', exact: true }).click()
  const guest = () => page.getByRole('button', { name: 'My account', exact: true }).waitFor()
  const authenticated = () => page.getByRole('button', { name: 'Log out', exact: true }).waitFor()

  await page.goto(origin + '/account')
  await page.evaluate((value) => globalThis.localStorage.setItem('cart', value), cart)
  for (const remember of [false, true, false]) {
    await page.goto(origin + '/account')
    await assertCart()
    await fillLogin()
    assert.equal(await page.getByLabel('Remember me').isChecked(), false)
    if (remember) await page.getByLabel('Remember me').check()
    await context.addCookies([
      {
        name: 'authToken',
        value: 'synthetic-same-token',
        url: origin,
        ...(remember ? {} : { expires: Date.now() / 1000 + 30 * 86400 }),
        sameSite: 'Lax',
      },
    ])
    const started = Date.now() / 1000
    await submit()
    await page.waitForURL(origin + '/')
    await authenticated()
    const cookie = await authCookie()
    assert.equal(cookie?.value, 'synthetic-same-token')
    assert.equal(cookie.path, '/')
    assert.equal(cookie.sameSite, 'Lax')
    if (remember) assert.ok(Math.abs(cookie.expires - started - 30 * 86400) < 10)
    else assert.equal(cookie.expires, -1)
    await page.reload()
    await authenticated()
    await assertCart()
    await page.goto(origin + '/account')
    await page.waitForURL(origin + '/')
    await authenticated()
    await page.goto(origin + '/reset-password')
    await page.getByLabel('Email', { exact: true }).waitFor()
    await page.getByRole('link', { name: 'Back to Sign In' }).click()
    await page.waitForURL(origin + '/')
    await authenticated()
    await page.getByRole('button', { name: 'Log out', exact: true }).click()
    await guest()
    assert.equal(await authCookie(), undefined)
    await page.reload()
    await guest()
    await assertCart()
    process.stdout.write(
      `PASS remember=${remember}: same-token lifetime, reload, direct/client redirect, logout, cart\n`,
    )
  }

  await page.goto(origin + '/account')
  await fillLogin('invalid-user')
  await submit()
  await page.getByRole('alert').filter({ hasText: 'Incorrect username or password.' }).waitFor()
  assert.equal(await page.getByLabel('Username', { exact: true }).inputValue(), 'invalid-user')
  assert.equal(await authCookie(), undefined)
  assert.equal(page.url(), origin + '/account')

  const startSlow = async () => {
    await fillLogin('slow-old')
    const index = logins.length
    await submit()
    await waitUntil(() => logins[index], 'Fixture did not receive slow login')
    assert.equal(await page.getByRole('button', { name: 'Signing in…' }).isDisabled(), true)
    return logins[index]
  }
  const cancelled = await startSlow()
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  cancelled.release()
  await waitUntil(() => cancelled.finished, 'Cancelled fixture response did not finish')
  await page.getByText('Registration is currently unavailable.').waitFor()
  assert.equal(await authCookie(), undefined)
  assert.equal(page.url(), origin + '/account')

  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const unmounted = await startSlow()
  await page.getByRole('link', { name: 'Have you forgotten your password?' }).click()
  await page.waitForURL(origin + '/reset-password')
  unmounted.release()
  await waitUntil(() => unmounted.finished, 'Unmounted fixture response did not finish')
  await guest()
  assert.equal(await authCookie(), undefined)
  assert.equal(page.url(), origin + '/reset-password')
  await page.getByRole('link', { name: 'Back to Sign In' }).click()

  const stale = await startSlow()
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await fillLogin('slow-new')
  const nextIndex = logins.length
  await submit()
  await waitUntil(() => logins[nextIndex], 'Fixture did not receive the next login')
  stale.release()
  await waitUntil(() => stale.finished, 'Old fixture response did not finish')
  assert.equal(await page.getByRole('button', { name: 'Signing in…' }).isDisabled(), true)
  assert.equal(await authCookie(), undefined)
  assert.equal(page.url(), origin + '/account')
  logins[nextIndex].release()
  await page.waitForURL(origin + '/')
  await authenticated()
  assert.equal((await authCookie()).value, 'synthetic-new-token')
  await assertCart()
  assert.deepEqual(hydration, [])
  assert.deepEqual(pageErrors, [])
  process.stdout.write(
    'PASS 401, tab/unmount cancellation, old response during new login; hydration warnings=0\n',
  )
} finally {
  try {
    await browser?.close()
  } finally {
    try {
      if (running) await runDocker('stop', name)
    } finally {
      try {
        for (const login of logins) login.release?.()
        if (api.listening) await new Promise((resolve) => api.close(resolve))
      } finally {
        if (built) await runDocker('image', 'rm', image)
      }
    }
  }
}
