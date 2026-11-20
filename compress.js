import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { gzipSync, brotliCompressSync, constants } from 'node:zlib'

const root = resolve(process.argv[2] ?? '.output/public')
const textFiles = /\.(html|css|js|mjs|json|svg|xml|txt|webmanifest)$/i

function compressFile(file) {
  const original = readFileSync(file)

  const variants = [
    ['gz', gzipSync(original, { level: 9 })],
    [
      'br',
      brotliCompressSync(original, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 9,
        },
      }),
    ],
  ]

  for (const [extension, compressed] of variants) {
    const destination = `${file}.${extension}`

    if (compressed.length >= original.length) {
      rmSync(destination, { force: true })
      continue
    }

    writeFileSync(destination, compressed)

    const saved = Math.round((1 - compressed.length / original.length) * 100)

    console.log(`${relative(root, file)} → .${extension}: −${saved}%`)
  }
}

function compressDirectory(directory) {
  const entries = readdirSync(directory, { withFileTypes: true })

  for (const entry of entries) {
    const file = join(directory, entry.name)

    if (entry.isDirectory()) {
      compressDirectory(file)
    } else if (entry.isFile() && textFiles.test(entry.name)) {
      compressFile(file)
    }
  }
}

try {
  compressDirectory(root)
  console.log('Сжатие завершено.')
} catch (error) {
  console.error('Ошибка сжатия:', error.message)
  process.exitCode = 1
}
