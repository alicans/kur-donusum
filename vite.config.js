import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SW_SOURCE = 'src/sw.js'
const SW_OUTPUT = 'sw.js'
const PRECACHE_EXCLUDE = new Set([SW_OUTPUT, 'index.html', '.DS_Store'])

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

// Build sonrası dist/ içeriğinden precache listesi çıkarıp service worker'ı yazar.
// Cache sürümü dosya içeriklerinin hash'idir; her yeni deploy eski cache'i geçersiz kılar.
function serviceWorkerPlugin() {
  let root
  let outDir

  return {
    name: 'kur-service-worker',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = config.build.outDir.startsWith('/') ? config.build.outDir : join(config.root, config.build.outDir)
    },
    closeBundle() {
      const hash = createHash('sha256')
      const urls = ['/']

      for (const file of listFiles(outDir).sort()) {
        const path = relative(outDir, file).split(sep).join('/')
        if (PRECACHE_EXCLUDE.has(path.split('/').pop())) {
          if (path === 'index.html') hash.update(readFileSync(file))
          continue
        }
        urls.push(`/${path}`)
        hash.update(path).update(readFileSync(file))
      }

      const source = readFileSync(join(root, SW_SOURCE), 'utf8')
        .replace('__CACHE_VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__PRECACHE_URLS__', JSON.stringify(urls))
      writeFileSync(join(outDir, SW_OUTPUT), source)
    },
  }
}

export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
})
