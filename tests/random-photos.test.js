import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'nuxt/app')
      return {
        url: 'data:text/javascript,export const useState=(key,init)=>({value:init()})',
        shortCircuit: true,
      }
    if (specifier === '~/composables/api/useApiFetch')
      return {
        url: 'data:text/javascript,export const useApiFetch=(path,options)=>{globalThis.randomPhotosTest={path,options};return globalThis.randomPhotosResult}',
        shortCircuit: true,
      }
    return nextResolve(specifier, context)
  },
})
const { useGetRandomPhotos } = await import('../composables/useGetRandomPhotos.ts')

test('random photos bounds the Picsum request and disables retries', () => {
  const result = { data: { value: null }, error: { value: new Error('timeout') } }
  globalThis.randomPhotosResult = result

  try {
    assert.equal(useGetRandomPhotos(10), result)
    const { path, options } = globalThis.randomPhotosTest
    assert.equal(path, '/v2/list')
    assert.equal(options.baseURL, 'https://picsum.photos')
    assert.equal(options.params.limit, 10)
    assert.ok(options.timeout >= 3000 && options.timeout <= 5000)
    assert.equal(options.retry, 0)
    assert.deepEqual(options.headers, {})
  } finally {
    delete globalThis.randomPhotosResult
    delete globalThis.randomPhotosTest
  }
})

test('prerendered pages share one random selection across independent SSR requests', async () => {
  const originalRandom = Math.random
  let randomCalls = 0
  Math.random = () => [0.12, 0.67, 0.91][randomCalls++]
  const source = stripTypeScriptTypes(
    readFileSync(
      new URL('../composables/useGetRandomPhotos.ts', import.meta.url),
      'utf8',
    ).replaceAll('import.meta.prerender', 'true'),
    { mode: 'transform' },
  )
  globalThis.randomPhotosResult = { data: { value: [] } }

  try {
    const { useGetRandomPhotos: prerenderPhotos } = await import(
      `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
    )
    prerenderPhotos(10)
    const firstPage = globalThis.randomPhotosTest.options.params.page
    prerenderPhotos(10)
    const secondPage = globalThis.randomPhotosTest.options.params.page

    assert.equal(firstPage, secondPage)
    assert.equal(randomCalls, 1)
  } finally {
    Math.random = originalRandom
    delete globalThis.randomPhotosResult
    delete globalThis.randomPhotosTest
  }
})
