import { test } from 'node:test'
import assert from 'node:assert/strict'
const { createProductApi } = await import(
  new URL('../scripts/fixtures/product-api.mjs', import.meta.url)
)

async function start(t) {
  const server = createProductApi({ delay: 1 })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  return (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options)
}

const snapshot = {
  userId: 1,
  date: '2026-11-08',
  products: [
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 1 },
  ],
}
const post = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

test('fixture cart accepts complete and empty snapshots without persistence', async (t) => {
  const request = await start(t)
  for (const products of [snapshot.products, []]) {
    const body = { ...snapshot, products }
    const response = await request('/carts', post(body))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { id: 1, ...body })
  }
  assert.equal((await request('/carts')).status, 405)
  const response = await request('/carts', { method: 'OPTIONS' })
  assert.equal(response.status, 204)
  assert.match(response.headers.get('Access-Control-Allow-Methods'), /POST/)
  assert.match(response.headers.get('Access-Control-Allow-Headers'), /Authorization/)
})

test('fixture cart rejects malformed, invalid and oversized request bodies', async (t) => {
  const request = await start(t)
  assert.equal((await request('/carts', { method: 'POST', body: '{' })).status, 400)
  for (const body of [null, {}, { ...snapshot, products: [{ productId: 1, quantity: 0 }] }]) {
    assert.equal((await request('/carts', post(body))).status, 400)
  }
  assert.equal(
    (await request('/carts', post({ ...snapshot, padding: 'x'.repeat(65536) }))).status,
    413,
  )
})

test('fixture products support category and limit and reject unsupported methods', async (t) => {
  const request = await start(t)
  assert.equal((await (await request('/products')).json()).length, 2)
  assert.equal((await (await request('/products?category=Jewelry&limit=1')).json()).length, 1)
  assert.deepEqual(await (await request('/products?category=unknown')).json(), [])
  assert.deepEqual(await (await request('/products?limit=0')).json(), [])
  assert.equal((await (await request('/products/categories')).json()).categories[0].name, 'Jewelry')
  for (const path of ['/products', '/products/1', '/products/categories']) {
    const response = await request(path, post(snapshot))
    assert.equal(response.status, 405)
    assert.equal(response.headers.get('Allow'), 'GET, OPTIONS')
  }
})

test('fixture product loading scenarios retain their HTTP behavior', async (t) => {
  const request = await start(t)
  assert.equal((await request('/slow/products/1')).status, 200)
  assert.equal((await request('/error/products/1')).status, 503)
  assert.equal((await request('/retry/products/1')).status, 503)
  assert.equal((await request('/retry/products/1')).status, 200)
  assert.equal(await (await request('/empty/products/1')).json(), null)
  assert.equal((await request('/products/999')).status, 404)
})
