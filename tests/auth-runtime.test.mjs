import assert from 'node:assert/strict'
import process from 'node:process'
import { test } from 'node:test'
import { URL } from 'node:url'

const baseURL = process.env.SHOPPE_RUNTIME_URL
const token = 'synthetic-runtime-auth-token'

test(
  'SSR restores cookie auth, redirects account and isolates the next guest request',
  {
    skip: !baseURL && 'Set SHOPPE_RUNTIME_URL to a running production container',
  },
  async () => {
    const request = (path, authenticated = false) =>
      globalThis.fetch(new URL(path, baseURL), {
        redirect: 'manual',
        signal: globalThis.AbortSignal.timeout(5000),
        headers: authenticated ? { Cookie: `authToken=${token}` } : {},
      })

    const guest = await request('/account')
    assert.equal(guest.status, 200)
    assert.match(await guest.text(), /SIGN IN/)

    const account = await request('/account', true)
    assert.equal(account.status, 302)
    assert.equal(account.headers.get('location'), '/')

    const restored = await request('/reset-password', true)
    assert.equal(restored.status, 200)
    assert.match(await restored.text(), /aria-label="Log out"/)

    const nextGuest = await request('/account')
    assert.equal(nextGuest.status, 200)
    const html = await nextGuest.text()
    assert.match(html, /aria-label="My account"/)
    assert.match(html, /SIGN IN/)
    assert.ok(!html.includes(token))

    const reset = await request('/reset-password')
    assert.equal(reset.status, 200)

    const missing = await request('/_nuxt/missing-runtime-asset.js')
    assert.equal(missing.status, 404)
  },
)
