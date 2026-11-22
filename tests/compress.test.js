import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync, brotliDecompressSync } from 'node:zlib'

const compressor = new URL('../compress.js', import.meta.url)
const run = (directory) =>
  spawnSync(process.execPath, [compressor.pathname, directory], {
    encoding: 'utf8',
  })

test('compression CLI preserves nested text originals, decodable variants and binary files on rerun', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'shoppe-compress-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  mkdirSync(join(directory, 'nested'))
  const text = Buffer.from('Compressible fixture content. '.repeat(200))
  const extensions = ['html', 'css', 'js', 'mjs', 'json', 'svg', 'xml', 'txt', 'webmanifest']
  for (const extension of extensions)
    writeFileSync(join(directory, 'nested', `file.${extension}`), text)
  const binary = Buffer.from([0, 255, 10, 128, 42])
  writeFileSync(join(directory, 'image.png'), binary)

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = run(directory)
    assert.equal(result.status, 0, result.stderr)
    for (const extension of extensions) {
      const file = join(directory, 'nested', `file.${extension}`)
      assert.deepEqual(readFileSync(file), text)
      assert.deepEqual(gunzipSync(readFileSync(`${file}.gz`)), text)
      assert.deepEqual(brotliDecompressSync(readFileSync(`${file}.br`)), text)
      assert.equal(existsSync(`${file}.gz.gz`), false)
      assert.equal(existsSync(`${file}.br.br`), false)
    }
    assert.deepEqual(readFileSync(join(directory, 'image.png')), binary)
    assert.equal(existsSync(join(directory, 'image.png.gz')), false)
    assert.equal(existsSync(join(directory, 'image.png.br')), false)
  }
})

test('compression CLI removes stale variants when a changed original is too small to benefit', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'shoppe-compress-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const file = join(directory, 'fixture.txt')
  writeFileSync(file, 'Large old text. '.repeat(200))
  assert.equal(run(directory).status, 0)
  assert.equal(existsSync(`${file}.gz`), true)
  assert.equal(existsSync(`${file}.br`), true)

  writeFileSync(file, 'x')
  assert.equal(run(directory).status, 0)
  assert.equal(readFileSync(file, 'utf8'), 'x')
  assert.equal(existsSync(`${file}.gz`), false)
  assert.equal(existsSync(`${file}.br`), false)
})

test('compression CLI fails clearly for a missing directory', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'shoppe-compress-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const result = run(join(directory, 'missing'))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Ошибка сжатия:/)
  assert.match(result.stderr, /ENOENT/)
})
