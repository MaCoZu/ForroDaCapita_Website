import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function lyrics() {
  return {
    name: 'forro-lyrics',
    hooks: {
      'astro:config:setup'() {
        const root = process.cwd()
        const lyricsDir = join(root, 'public', 'lyrics')
        const outFile = join(root, 'src', 'generated-lyrics.js')

        let sources = {}
        try {
          sources = Object.fromEntries(
            readdirSync(lyricsDir)
              .filter((f) => f.toLowerCase().endsWith('.yaml'))
              .map((f) => [f, readFileSync(join(lyricsDir, f), 'utf8')])
          )
        } catch (err) {
          console.warn(`[forro-lyrics] could not read ${lyricsDir}:`, err.message)
        }

        writeFileSync(outFile, `export const lyricsSources = ${JSON.stringify(sources)}\n`)
      },
    },
  }
}
