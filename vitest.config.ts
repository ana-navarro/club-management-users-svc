import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig } from 'vitest/config'

// Files marked @wip are skipped and left out of coverage (constitution, Principle III).
const findWipFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return findWipFiles(path)
    return name.endsWith('.ts') && readFileSync(path, 'utf8').includes('@wip') ? [path] : []
  })

const wipFiles = findWipFiles('src').map((path) => relative('.', path).replaceAll('\\', '/'))

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', ...wipFiles],
    // The first run downloads the test database.
    hookTimeout: 180000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/seed.ts', 'src/**/*.test.ts', 'src/**/*.mock.ts', ...wipFiles],
      thresholds: { lines: 90 },
    },
  },
})
