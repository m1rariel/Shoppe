import { spawnSync } from 'node:child_process'
import console from 'node:console'
import process from 'node:process'
import { relative, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const files = process.argv.slice(2).map((file) => relative(root, resolve(file)))
const fullRun = files.some((file) =>
  /^(?:vitest\.config\.ts|nuxt\.config\.ts|package(?:-lock)?\.json|tests\/unit\/setup\.ts|scripts\/test-unit-related\.mjs)$/.test(
    file,
  ),
)

if (files.length > 0) {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)),
      ...(fullRun ? ['run'] : ['related', '--run', ...files]),
      ...(fullRun ? [] : ['--passWithNoTests']),
    ],
    { cwd: root, stdio: 'inherit' },
  )

  if (result.error) console.error(result.error.message)
  process.exit(result.status ?? 1)
}
