import { setTimeout, clearTimeout } from 'node:timers'
import { createProductApi } from './product-api.mjs'

export function createAuthApi() {
  const server = createProductApi({ delay: 0 })
  const productHandler = server.listeners('request')[0]
  const logins = []
  server.removeAllListeners('request')
  server.on('request', async (request, response) => {
    if (request.url !== '/auth/login') return productHandler(request, response)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    if (request.method === 'OPTIONS') return response.writeHead(204).end()
    if (request.method !== 'POST') return response.writeHead(405).end()
    let body = ''
    for await (const chunk of request) body += chunk
    const { username, password } = JSON.parse(body)
    const login = { username, finished: false }
    logins.push(login)
    if (username === 'slow-old' || username === 'slow-new') {
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 10000)
        login.release = () => {
          clearTimeout(timeout)
          resolve()
        }
      })
    }
    const valid =
      ['synthetic-user', 'slow-old', 'slow-new'].includes(username) && password === 'synthetic-pass'
    response.writeHead(valid ? 200 : 401, { 'Content-Type': 'application/json' })
    response.end(
      JSON.stringify(
        valid
          ? {
              token: username === 'slow-new' ? 'synthetic-new-token' : 'synthetic-same-token',
            }
          : { message: 'Invalid synthetic credentials' },
      ),
    )
    login.finished = true
  })
  return { server, logins }
}
