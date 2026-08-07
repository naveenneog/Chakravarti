/**
 * Build the bundle Capacitor packages into the APK.
 *
 * Sets VITE_NATIVE so vite.config.ts drops the service worker: everything is
 * already inside the APK, and a precache there only survives upgrades and
 * keeps serving the previous build.
 */
import { spawn } from 'node:child_process'
import process from 'node:process'

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VITE_NATIVE: '1' },
  },
)
child.on('exit', (code) => process.exit(code ?? 1))
