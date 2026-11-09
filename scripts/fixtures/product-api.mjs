import { createServer } from 'node:http'
import { Buffer } from 'node:buffer'
import { pathToFileURL, URL } from 'node:url'
import process from 'node:process'
import console from 'node:console'
import { setTimeout } from 'node:timers'

const maxBodyBytes = 64 * 1024

async function readCart(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size <= maxBodyBytes) chunks.push(chunk)
  }
  if (size > maxBodyBytes) return { status: 413, message: 'Fixture body too large' }
  let cart
  try {
    cart = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return { status: 400, message: 'Invalid JSON' }
  }
  if (
    !cart ||
    !Number.isInteger(cart.userId) ||
    cart.userId <= 0 ||
    typeof cart.date !== 'string' ||
    !cart.date.trim() ||
    !Array.isArray(cart.products) ||
    !cart.products.every(
      (item) =>
        item &&
        Number.isInteger(item.productId) &&
        item.productId > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    )
  ) {
    return { status: 400, message: 'Invalid cart snapshot' }
  }
  return {
    cart: {
      id: 1,
      userId: cart.userId,
      date: cart.date,
      products: cart.products.map(({ productId, quantity }) => ({ productId, quantity })),
    },
  }
}

// Temporary fixtures: rating is illustrative, not a confirmed backend field/shape.
export const products = [
  {
    id: 1,
    title: 'Fixture gold ring',
    price: 25,
    category: 'Jewelry',
    description: 'Local product with an image and an illustrative rating.',
    image: '/image.svg',
    rating: { rate: 4.5, count: 12 },
  },
  {
    id: 2,
    title: 'Fixture silver bracelet',
    price: 40,
    category: 'Jewelry',
    description: 'Local product without an image or rating.',
  },
]

export function createProductApi({ delay = 1500 } = {}) {
  const attempts = new Map()
  return createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.setHeader('Cache-Control', 'no-store')
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end()
      return
    }
    const url = new URL(request.url, 'http://localhost')
    const segments = url.pathname.split('/').filter(Boolean)
    const scenario = ['slow', 'retry', 'error', 'empty'].includes(segments[0])
      ? segments.shift()
      : 'success'
    const send = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(data))
    }
    const methodNotAllowed = (method) => {
      response.setHeader('Allow', `${method}, OPTIONS`)
      return send(405, { message: 'Method not allowed' })
    }
    if (segments.join('/') === 'carts') {
      if (request.method !== 'POST') return methodNotAllowed('POST')
      try {
        const result = await readCart(request)
        return result.cart
          ? send(200, result.cart)
          : send(result.status, { message: result.message })
      } catch {
        return send(400, { message: 'Unable to read cart snapshot' })
      }
    }
    if (segments.join('/') === 'image.svg') {
      if (request.method !== 'GET') return methodNotAllowed('GET')
      response.writeHead(200, { 'Content-Type': 'image/svg+xml' })
      response.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#eee"/><circle cx="200" cy="200" r="100" fill="none" stroke="#a18a68" stroke-width="28"/></svg>',
      )
      return
    }
    if (segments[0] !== 'products') return send(404, { message: 'Not found' })
    if (request.method !== 'GET') return methodNotAllowed('GET')
    if (segments[1] === 'categories') {
      return send(200, { categories: [{ id: 1, name: 'Jewelry' }] })
    }
    if (scenario === 'slow') await new Promise((resolve) => setTimeout(resolve, delay))
    if (scenario === 'error') return send(503, { message: 'Fixture service unavailable' })
    if (scenario === 'retry') {
      const key = segments.join('/')
      const count = attempts.get(key) || 0
      attempts.set(key, count + 1)
      if (count === 0) return send(503, { message: 'Retry this fixture request' })
    }
    if (scenario === 'empty') return send(200, null)
    const origin = `http://${request.headers.host}`
    const available = products.map((product) => ({
      ...product,
      ...(product.image ? { image: `${origin}${product.image}` } : {}),
    }))
    if (!segments[1]) {
      const category = url.searchParams.get('category')
      const limit = Number(url.searchParams.get('limit'))
      const filtered = category
        ? available.filter((product) => product.category === category)
        : available
      return send(
        200,
        url.searchParams.has('limit') && Number.isInteger(limit) && limit >= 0
          ? filtered.slice(0, limit)
          : filtered,
      )
    }
    const product = available.find((entry) => String(entry.id) === segments[1])
    return product ? send(200, product) : send(404, { message: 'Product not found' })
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PRODUCT_API_PORT || 4313)
  createProductApi().listen(port, '127.0.0.1', () => {
    console.log(`Product fixture API: http://127.0.0.1:${port}`)
  })
}
