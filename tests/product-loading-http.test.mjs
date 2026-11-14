import { test } from 'node:test'
import process from 'node:process'
import { URL } from 'node:url'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { setTimeout as pause } from 'node:timers/promises'
import { createProductApi } from '../scripts/fixtures/product-api.mjs'

async function freePort() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

test(
  'built product page returns actual HTTP statuses and visible fixture data',
  { timeout: 60000 },
  async (t) => {
    const api = createProductApi({ delay: 150 })
    await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve))
    t.after(() => api.close())
    const apiUrl = `http://127.0.0.1:${api.address().port}`

    for (const scenario of ['', '/empty', '/error', '/retry', '/slow']) {
      await t.test(scenario || 'success and HTTP404', async (t) => {
        const port = await freePort()
        let output = ''
        const server = spawn(process.execPath, ['.output/server/index.mjs'], {
          cwd: new URL('..', import.meta.url),
          env: {
            ...process.env,
            HOST: '127.0.0.1',
            PORT: String(port),
            NUXT_PUBLIC_API_BASE_URL: `${apiUrl}${scenario}`,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        server.stdout.on('data', (data) => {
          output += data
        })
        server.stderr.on('data', (data) => {
          output += data
        })
        t.after(async () => {
          if (server.exitCode === null) {
            const exited = new Promise((resolve) => server.once('exit', resolve))
            server.kill('SIGTERM')
            await exited
          }
        })
        const origin = `http://127.0.0.1:${port}`
        let ready = false
        for (let attempt = 0; attempt < 100; attempt++) {
          if (server.exitCode !== null) assert.fail(output)
          try {
            await globalThis.fetch(`${origin}/favicon.ico`)
            ready = true
            break
          } catch {
            await pause(100)
          }
        }
        assert.ok(ready, output)
        const started = Date.now()
        const response = await globalThis.fetch(`${origin}/products/1`)
        const html = await response.text()
        if (scenario === '/empty') {
          assert.equal(response.status, 404)
          assert.match(html, /Product not found/)
          assert.match(html, /href="\/products"[^>]*>Continue shopping/)
        } else if (scenario === '/error' || scenario === '/retry') {
          assert.equal(response.status, 200)
          assert.match(html, /Unable to load product/)
          assert.match(html, /Try again/)
          assert.doesNotMatch(html, /<h1[^>]*>Product not found/)
          if (scenario === '/retry') {
            const retried = await globalThis.fetch(`${origin}/products/1`)
            assert.equal(retried.status, 200)
            assert.match(await retried.text(), /Fixture gold ring/)
          }
        } else {
          assert.equal(response.status, 200)
          assert.match(html, /Fixture gold ring/)
          assert.match(html, /Local product with an image/)
          if (scenario === '/slow') assert.ok(Date.now() - started >= 150)
          const second = await globalThis.fetch(`${origin}/products/2`)
          assert.equal(second.status, 200)
          assert.match(await second.text(), /Fixture silver bracelet/)
          const missing = await globalThis.fetch(`${origin}/products/999`)
          assert.equal(missing.status, 404)
          const missingHtml = await missing.text()
          assert.match(missingHtml, /Product not found/)
          assert.match(missingHtml, /href="\/products"[^>]*>Continue shopping/)
        }
      })
    }
  },
)
