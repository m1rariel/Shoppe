import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { request } from 'node:http'
import { networkInterfaces, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { test } from 'node:test'
import { setTimeout as pause } from 'node:timers/promises'
import { fileURLToPath, URL } from 'node:url'
import { promisify } from 'node:util'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { createProductApi } from '../scripts/fixtures/product-api.mjs'

const execute = promisify(execFile)
const project = fileURLToPath(new URL('..', import.meta.url))
const docker = process.env.DOCKER_BIN || 'docker'
const runDocker = (...args) => execute(docker, args, { maxBuffer: 8 * 1024 * 1024 })
const localPaths = new Set([
  'node_modules',
  'dist',
  '.nuxt',
  '.output',
  '.git',
  '.scratch',
  '.codex',
  '.agents',
  '.vscode',
  '.idea',
  'coverage',
])

function rawRequest(url, encoding = 'identity') {
  return new Promise((resolve, reject) => {
    const req = request(url, { headers: { 'Accept-Encoding': encoding } }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () =>
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks),
        }),
      )
      response.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(5000, () => req.destroy(new Error('Runtime HTTP request timed out')))
    req.end()
  })
}

test(
  'clean Docker build requires runtime API config and serves SSR plus encoded assets',
  {
    timeout: 240000,
  },
  async (t) => {
    const context = await mkdtemp(join(tmpdir(), 'shoppe-docker-context-'))
    t.after(() => rm(context, { recursive: true, force: true }))
    const { stdout: tracked } = await execute(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { cwd: project },
    )
    for (const file of new Set(tracked.split('\0').filter(Boolean))) {
      const parts = file.split('/')
      if (
        parts.some(
          (part) =>
            localPaths.has(part) ||
            part.startsWith('.env') ||
            part === '.DS_Store' ||
            part.endsWith('.log'),
        )
      )
        continue
      const destination = join(context, file)
      await mkdir(dirname(destination), { recursive: true })
      await cp(join(project, file), destination)
    }
    const image = `shoppe-runtime-test:${process.pid}-${Date.now()}`
    let containerName
    t.after(async () => {
      if (containerName) await runDocker('stop', containerName)
      await runDocker('image', 'rm', image)
    })
    await runDocker('build', '-t', image, context)

    for (const value of [undefined, '', '   ']) {
      const args = ['run', '--rm']
      if (value !== undefined) args.push('-e', `NUXT_PUBLIC_API_BASE_URL=${value}`)
      await assert.rejects(runDocker(...args, image), (error) => {
        assert.equal(error.code, 1)
        assert.match(error.stderr, /NUXT_PUBLIC_API_BASE_URL is required/)
        return true
      })
    }

    const host =
      process.env.SHOPPE_TEST_HOST ||
      Object.values(networkInterfaces())
        .flat()
        .find((address) => address.family === 'IPv4' && !address.internal)?.address
    assert.ok(host, 'Set SHOPPE_TEST_HOST to an IP reachable from Docker and the host')
    const api = createProductApi({ delay: 0 })
    const requests = []
    api.on('request', (req) => requests.push(req.url))
    await new Promise((resolve) => api.listen(0, '0.0.0.0', resolve))
    t.after(() => new Promise((resolve) => api.close(resolve)))
    const apiURL = `http://${host}:${api.address().port}`
    const name = `shoppe-runtime-test-${process.pid}-${Date.now()}`
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
    containerName = name
    const { stdout: published } = await runDocker('port', name, '80/tcp')
    const port = published.split('\n')[0].split(':').at(-1)
    const origin = `http://${host}:${port}`
    let ready = false
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        ready = (await rawRequest(`${origin}/account`)).status === 200
        if (ready) break
      } catch {
        ready = false
      }
      await pause(100)
    }
    assert.ok(ready, 'SSR container did not become ready')

    const products = await rawRequest(`${origin}/products`)
    assert.equal(products.status, 200)
    const html = products.body.toString('utf8')
    assert.match(html, /Fixture gold ring/)
    assert.ok(
      requests.some((path) => path.startsWith('/products')),
      'SSR must call the configured fixture API',
    )
    assert.ok(html.includes(apiURL), 'Runtime API URL must reach the client config in HTML')

    const resource = [...html.matchAll(/href="([^"]+\.css)"/g)][0]?.[1]
    assert.ok(resource)
    const identity = await rawRequest(origin + resource)
    assert.equal(identity.status, 200)
    assert.equal(identity.headers['content-encoding'], undefined)
    assert.match(identity.headers['content-type'], /text\/css/)
    assert.match(identity.headers.vary, /Accept-Encoding/i)
    for (const encoding of ['gzip', 'br']) {
      const response = await rawRequest(origin + resource, encoding)
      assert.equal(response.status, 200)
      assert.equal(response.headers['content-encoding'], encoding)
      assert.match(response.headers['content-type'], /text\/css/)
      assert.match(response.headers.vary, /Accept-Encoding/i)
      assert.equal(Number(response.headers['content-length']), response.body.length)
      assert.deepEqual(
        encoding === 'gzip' ? gunzipSync(response.body) : brotliDecompressSync(response.body),
        identity.body,
      )
    }
    const missing = await rawRequest(`${origin}/_nuxt/does-not-exist.js`)
    assert.equal(missing.status, 404)
    assert.ok(!missing.body.toString('utf8').includes('Fixture gold ring'))
  },
)
