/**
 * One-shot: regenerate ads JSON, then commit + push the source exports and
 * generated JSON. Usage: `npm run generate:push` (optionally pass a message:
 * `npm run generate:push -- "Update ads data 2026-10"`).
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONT = path.resolve(__dirname, '..')
const ROOT = path.resolve(FRONT, '..')
const PATHS = ['front/public/ads-data', 'back/storage/app/ads']

const run = (cmd, args, cwd = ROOT) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })

console.log('[1/3] Generating ads data...')
execFileSync(process.execPath, [path.join(__dirname, 'generate-ads-data.mjs')], {
  cwd: FRONT, stdio: 'inherit',
})

run('git', ['add', '-A', '--', ...PATHS])
const staged = run('git', ['diff', '--cached', '--name-only', '--', ...PATHS]).trim()
if (!staged) {
  console.log('[ads-data] no changes to commit.')
  process.exit(0)
}

const message = process.argv[2]
  || `Update ads data (${new Date().toISOString().slice(0, 10)})`

console.log(`[2/3] Committing:\n${staged}`)
run('git', ['commit', '-m', message, '--', ...PATHS])

console.log('[3/3] Pushing...')
execFileSync('git', ['push'], { cwd: ROOT, stdio: 'inherit' })
console.log('[ads-data] done.')
