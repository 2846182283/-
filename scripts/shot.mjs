#!/usr/bin/env node
/**
 * Headless screenshot tool (Vite dev server + Playwright Chromium, software GL).
 *
 *   node scripts/shot.mjs --out shots/hero.png
 *   node scripts/shot.mjs --params "only=station,railway&view=platform" --out /tmp/p.png
 *   node scripts/shot.mjs --params "cam=0,20,40&look=0,0,-20&t=30&pause=1" --out a.png --w 1600 --h 900
 *   node scripts/shot.mjs --batch shots.json      # [{ "params": "...", "out": "..." }, ...]
 *
 * Prints build times, renderer stats (draw calls / triangles) and any console
 * errors for each shot.  Exit code 1 if a page error or module build error occurred.
 * Each run uses a random free port, so several agents can run it concurrently.
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

let jobs;
if (opt('batch')) {
  jobs = JSON.parse(fs.readFileSync(opt('batch'), 'utf8'));
} else {
  jobs = [{ params: opt('params', ''), out: opt('out', path.join(root, '.shots', 'shot.png')) }];
}
const W = Number(opt('w', 1280));
const H = Number(opt('h', 720));
const extraWait = Number(opt('wait', 600));
const timeout = Number(opt('timeout', 600000)); // generous: software GL on a shared 4-core box can take >30 s per frame

const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-shot-'));
const server = await createServer({
  root,
  cacheDir, // private dep cache: several shot runs can execute concurrently
  logLevel: 'error',
  server: { port: 0, host: '127.0.0.1', strictPort: false, hmr: false },
  clearScreen: false,
});
await server.listen();
const addr = server.httpServer.address();
const base = `http://127.0.0.1:${addr.port}/`;

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox'],
});

let failed = false;
try {
  for (const job of jobs) {
    const page = await browser.newPage({ viewport: { width: job.w || W, height: job.h || H }, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
    const logs = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`);
    });
    page.on('pageerror', (e) => { logs.push(`[pageerror] ${e.message}`); failed = true; });
    const q = new URLSearchParams(job.params || '');
    q.set('shot', '1');
    if (!q.has('pause')) q.set('pause', '1');
    const url = `${base}?${q.toString()}`;
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    try {
      await page.waitForFunction(() => window.__sceneReady === true, null, { timeout, polling: 250 });
    } catch (e) {
      logs.push(`[timeout] scene not ready after ${timeout}ms`);
      failed = true;
    }
    await page.evaluate((n) => window.__waitFrames && window.__waitFrames(n), Number(job.frames || 3)).catch(() => {});
    await page.waitForTimeout(job.wait ?? extraWait);
    const stats = await page.evaluate(() => (window.__stats ? window.__stats() : null)).catch(() => null);
    // freeze the render loop so capturing doesn't compete with new frames (drawing buffer is preserved in shot mode)
    await page.evaluate(() => window.__stopLoop && window.__stopLoop()).catch(() => {});
    fs.mkdirSync(path.dirname(path.resolve(job.out)), { recursive: true });
    await page.screenshot({ path: job.out, type: job.out.endsWith('.jpg') ? 'jpeg' : 'png', quality: job.out.endsWith('.jpg') ? 88 : undefined, timeout });
    console.log(`\n=== ${job.out}  (${((Date.now() - t0) / 1000).toFixed(1)}s)  params: ${job.params || '(none)'}`);
    if (stats) {
      console.log(`stats: drawCalls=${stats.drawCalls} triangles=${stats.triangles} geometries=${stats.geometries} textures=${stats.textures} programs=${stats.programs} materials=${stats.materials}`);
      console.log(`buildTimes(ms): ${JSON.stringify(stats.buildTimes)}`);
      if (stats.errors && stats.errors.length) {
        failed = true;
        for (const e of stats.errors) console.log(`MODULE ERROR [${e.module}]: ${e.message}`);
      }
    }
    const uniq = [...new Set(logs)];
    if (uniq.length) console.log(uniq.slice(0, 40).join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
  fs.rmSync(cacheDir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
