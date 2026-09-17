import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const externalUrl = process.env.ARCHIVE_TEST_URL;
const baseUrl = externalUrl || 'http://127.0.0.1:3418';
const trackPattern = /\/audio\/[^?]+\.(?:mp3|m4a|ogg)(?:\?|$)/;
const pauseKey = 'cheng.archive-music.paused.v1';
const music = '.archive-music';
const toggle = '.archive-music__toggle:visible';
let browser;
let server;
let serverOutput = '';

before(async () => {
  if (!externalUrl) {
    server = spawn(process.execPath, [
      fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)),
      'start', '--hostname', '127.0.0.1', '--port', '3418',
    ], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const log = chunk => { serverOutput = (serverOutput + chunk).slice(-6000); };
    server.stdout.on('data', log);
    server.stderr.on('data', log);
  }

  const deadline = Date.now() + 60_000;
  while (true) {
    if (server && server.exitCode !== null) {
      throw new Error(`Production server exited. Run the build first.\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/work`, { signal: AbortSignal.timeout(2500) });
      if (response.ok) break;
    } catch { /* Wait for the local production server to listen. */ }
    if (Date.now() > deadline) throw new Error(`Server unavailable at ${baseUrl}.\n${serverOutput}`);
    await delay(200);
  }

  const channel = process.env.ARCHIVE_TEST_BROWSER || (process.platform === 'win32' ? 'chrome' : 'chromium');
  browser = await chromium.launch({
    ...(channel === 'chromium' ? {} : { channel }),
    ...(process.env.ARCHIVE_TEST_PROXY ? { proxy: { server: process.env.ARCHIVE_TEST_PROXY } } : {}),
    headless: true,
    // Preserve the browser's gesture requirement; never grant autoplay to make a test pass.
    args: ['--autoplay-policy=document-user-activation-required',
      '--disable-features=MediaEngagementBypassAutoplayPolicies,PreloadMediaEngagementData'],
  });
}, { timeout: 75_000 });

after(async () => {
  await browser?.close();
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
});

async function newPage(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await page.addInitScript(() => {
    window.__archivePlayCalls = [];
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      if (this instanceof HTMLAudioElement) window.__archivePlayCalls.push({
        activeGesture: navigator.userActivation.isActive,
        envelopePresent: Boolean(document.querySelector('.sealed-entry')),
        time: performance.now(),
      });
      return original.apply(this, args);
    };
  });
  return page;
}

async function connection(page, { saveData = false, effectiveType = '4g' } = {}) {
  await page.addInitScript(settings => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: settings });
  }, { saveData, effectiveType });
}

async function visit(page, pathname = '/') {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
  await page.locator(music).first().waitFor({ state: 'attached' });
  // Wait for hydration through the player's rendered UI, not an arbitrary page sleep.
  await page.locator(toggle).first().waitFor();
}

async function status(page, value) {
  await page.waitForFunction(({ selector, expected }) => {
    const controls = [...document.querySelectorAll(selector)];
    return controls.length > 0 && controls.every(control => control.dataset.status === expected);
  }, { selector: music, expected: value });
}

async function skipEntry(page) {
  await page.locator('.sealed-entry__footer button').click();
  await page.locator('.sealed-entry').waitFor({ state: 'detached' });
  await page.locator('.dossier-site-nav').waitFor();
}

/** Fault injection for races browsers cannot produce on command. Real decoding is tested separately. */
async function mockMedia(page, mode = 'success') {
  await page.addInitScript(initialMode => {
    const nativePlay = HTMLMediaElement.prototype.play;
    const nativePause = HTMLMediaElement.prototype.pause;
    const nativePaused = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'paused').get;
    const pending = [];
    let paused = true;
    window.__archiveMediaMock = {
      mode: initialMode,
      calls: 0,
      latePlaying() {
        paused = false;
        document.querySelector('audio').dispatchEvent(new Event('playing'));
      },
      rejectPending(index = 0) {
        pending[index].reject(new DOMException('Delayed aborted request', 'AbortError'));
      },
    };
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get() { return this instanceof HTMLAudioElement ? paused : nativePaused.call(this); },
    });
    HTMLMediaElement.prototype.pause = function () {
      if (!(this instanceof HTMLAudioElement)) return nativePause.call(this);
      const wasPaused = paused;
      paused = true;
      if (!wasPaused) this.dispatchEvent(new Event('pause'));
    };
    HTMLMediaElement.prototype.play = function (...args) {
      if (!(this instanceof HTMLAudioElement)) return nativePlay.apply(this, args);
      const state = window.__archiveMediaMock;
      state.calls += 1;
      if (state.mode === 'blocked') return Promise.reject(new DOMException('Gesture denied by test', 'NotAllowedError'));
      if (state.mode === 'error') return Promise.reject(new DOMException('Decode failed in test', 'NotSupportedError'));
      paused = false;
      if (state.mode === 'pending') {
        this.dispatchEvent(new Event('waiting'));
        return new Promise((resolve, reject) => pending.push({ resolve, reject }));
      }
      queueMicrotask(() => this.dispatchEvent(new Event('playing')));
      return Promise.resolve();
    };
  }, mode);
}

test('metadata warms a byte range without playing or downloading the whole 9 MB track', async t => {
  const page = await newPage(t);
  await connection(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const audioRequests = new Set();
  let bytes = 0;
  let rangeResponses = 0;
  let trackBytes = 0;
  cdp.on('Network.requestWillBeSent', event => {
    if (trackPattern.test(event.request.url)) audioRequests.add(event.requestId);
  });
  cdp.on('Network.dataReceived', event => {
    if (audioRequests.has(event.requestId)) bytes += event.dataLength;
  });
  cdp.on('Network.responseReceived', event => {
    if (audioRequests.has(event.requestId) && event.response.status === 206) {
      rangeResponses += 1;
      const range = Object.entries(event.response.headers).find(([key]) => key.toLowerCase() === 'content-range')?.[1];
      trackBytes = Number(String(range).match(/\/(\d+)$/)?.[1]) || trackBytes;
    }
  });
  await visit(page);
  await page.waitForFunction(() => {
    const audio = document.querySelector('audio');
    return audio.preload === 'metadata' && audio.readyState >= 1 && audio.networkState === 1;
  });
  assert.equal(await page.locator('audio').evaluate(audio => audio.paused), true);
  assert.equal(await page.evaluate(() => window.__archivePlayCalls.length), 0);
  assert.ok(rangeResponses > 0, 'Metadata should use a server byte-range response');
  // Chromium chooses its own metadata chunk size. Check that most of the track remains unfetched.
  assert.ok(trackBytes > 0 && bytes > 0 && bytes < trackBytes / 2,
    `Metadata transferred ${bytes} of ${trackBytes} bytes; expected less than half the track`);
  t.diagnostic(`Metadata bytes received: ${bytes} / ${trackBytes}; partial responses: ${rangeResponses}`);
});

test('opening the envelope calls real play inside the gesture before the reveal completes', async t => {
  const page = await newPage(t, { reducedMotion: 'no-preference' });
  await connection(page, { saveData: true });
  const requests = [];
  page.on('request', request => { if (trackPattern.test(request.url())) requests.push(request); });
  await visit(page);
  await page.waitForFunction(() => [...document.querySelectorAll('.sealed-file img')]
    .every(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator('audio').getAttribute('preload'), 'none');
  assert.equal(requests.length, 0, 'Data-saver visitors should not fetch audio before intent');
  const requested = page.waitForRequest(request => trackPattern.test(request.url()));
  await page.locator('.sealed-file').click();
  await requested;
  const calls = await page.evaluate(() => window.__archivePlayCalls);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].activeGesture, true, 'play() must run synchronously in the trusted click');
  assert.equal(calls[0].envelopePresent, true, 'play() must not wait for the reveal to finish');
  assert.ok(await page.locator('.sealed-entry').count(), 'The media request should begin during the reveal');
  await status(page, 'playing');
  await page.waitForFunction(() => document.querySelector('audio').currentTime > 0.1);
  assert.equal(await page.locator('audio').count(), 1);
  await page.locator(toggle).first().click();
  await status(page, 'paused');
  assert.equal(await page.locator('audio').evaluate(audio => audio.paused), true);
});

test('a 2g connection also defers audio until the visitor opens the archive', async t => {
  const page = await newPage(t);
  await connection(page, { effectiveType: '2g' });
  const requests = [];
  page.on('request', request => { if (trackPattern.test(request.url())) requests.push(request.url()); });
  await visit(page);
  await page.waitForFunction(() => document.querySelector('audio').preload === 'none');
  assert.equal(requests.length, 0);
  await skipEntry(page);
  await status(page, 'playing');
  assert.ok(requests.length > 0);
});

test('skip starts real audio, client navigation preserves one player, and pause survives refresh', async t => {
  const page = await newPage(t);
  await visit(page);
  await skipEntry(page);
  await status(page, 'playing');
  await page.locator('audio').evaluate(audio => { audio.dataset.testIdentity = 'persistent-player'; });
  await page.locator('.dossier-site-nav').getByRole('link', { name: 'Portfolio', exact: true }).click();
  await page.waitForURL('**/work');
  assert.equal(await page.locator('audio').count(), 1);
  assert.equal(await page.locator('audio').getAttribute('data-test-identity'), 'persistent-player');
  await status(page, 'playing');
  await page.locator(toggle).first().click();
  await status(page, 'paused');
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), pauseKey), '1');
  await page.locator('.dossier-site-nav').getByRole('link', { name: 'Home', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await skipEntry(page);
  await status(page, 'paused');
  assert.equal(await page.evaluate(() => window.__archivePlayCalls.length), 0);
  assert.equal(await page.locator('audio').evaluate(audio => audio.paused), true);
  await page.locator(toggle).first().click();
  await status(page, 'playing');
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), pauseKey), null);
});

test('a direct portfolio link remains silent until its music button is clicked', async t => {
  const page = await newPage(t);
  await visit(page, '/work');
  assert.equal(await page.locator('.sealed-entry').count(), 0);
  assert.equal(await page.evaluate(() => window.__archivePlayCalls.length), 0);
  assert.equal(await page.locator('audio').evaluate(audio => audio.paused), true);
  await page.locator(toggle).first().click();
  await status(page, 'playing');
  const calls = await page.evaluate(() => window.__archivePlayCalls);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].activeGesture, true);
});

test('canceling pending playback rejects late playing and preserves a newer play request', async t => {
  const page = await newPage(t);
  await connection(page, { saveData: true });
  await mockMedia(page, 'pending');
  await visit(page);
  await page.locator('.sealed-file').click();
  await status(page, 'loading');
  await page.getByRole('button', { name: '取消音乐播放', exact: true }).first().click();
  await status(page, 'paused');
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), pauseKey), '1');
  await page.evaluate(() => window.__archiveMediaMock.latePlaying());
  await status(page, 'paused');
  assert.equal(await page.locator('audio').evaluate(audio => audio.paused), true);
  await page.evaluate(() => { window.__archiveMediaMock.mode = 'success'; });
  await page.locator(toggle).first().click();
  await status(page, 'playing');
  await page.evaluate(() => window.__archiveMediaMock.rejectPending());
  await status(page, 'playing');
  assert.equal(await page.locator('audio').evaluate(audio => audio.paused), false);
  assert.equal(await page.evaluate(() => window.__archiveMediaMock.calls), 2);
});

for (const failure of ['blocked', 'error']) {
  test(`${failure} playback offers an explicit retry and resumes after another click`, async t => {
    const page = await newPage(t);
    await connection(page, { saveData: true });
    await mockMedia(page, failure);
    await visit(page);
    await skipEntry(page);
    await status(page, failure);
    const action = page.locator(toggle).first();
    assert.match(await action.getAttribute('aria-label'), /播放/);
    assert.ok(await page.locator('.archive-music__status[role="status"]').textContent());
    assert.equal(await page.evaluate(() => window.__archiveMediaMock.calls), 1);
    await page.evaluate(() => { window.__archiveMediaMock.mode = 'success'; });
    await action.click();
    await status(page, 'playing');
    assert.equal(await page.evaluate(() => window.__archiveMediaMock.calls), 2);
  });
}

test('unavailable session storage does not break opening or manual pause', async t => {
  const page = await newPage(t);
  await mockMedia(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() { throw new DOMException('Storage is unavailable', 'SecurityError'); },
    });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await visit(page);
  await skipEntry(page);
  await status(page, 'playing');
  await page.locator(toggle).first().click();
  await status(page, 'paused');
  assert.deepEqual(errors.filter(message => /Storage is unavailable/.test(message)), []);
});

test('About renders its active navigation, biography and shared music after entry', async t => {
  const page = await newPage(t);
  await mockMedia(page);
  await visit(page);
  await skipEntry(page);
  await page.locator('.dossier-site-nav').getByRole('link', { name: 'About', exact: true }).click();
  await page.waitForURL('**/about');
  await page.getByRole('heading', { name: 'ABOUT ME', exact: true }).waitFor();
  assert.equal(await page.locator('.polaroid-image--default').getAttribute('src'), '/assets/polaroid/pixel-original.jpg');
  assert.equal(await page.locator('.polaroid-image--hover').getAttribute('src'), '/assets/polaroid/torn-frame-v2.png');
  const nav = page.locator('.dossier-site-nav');
  assert.equal(await nav.getByRole('link', { name: 'About', exact: true }).getAttribute('aria-current'), 'page');
  for (const href of ['/#home', '/about', '/work', '/resume']) {
    assert.equal(await nav.locator(`a[href="${href}"]`).first().isVisible(), true, href);
  }
  assert.equal(await page.locator('audio').count(), 1);
  await status(page, 'playing');
  await nav.getByRole('button', { name: '暂停背景音乐', exact: true }).click();
  await status(page, 'paused');
});

for (const href of ['/resume', '/work/personal-archive']) {
  test(`${href} keeps a reachable pause control when music continues from Home`, async t => {
    const page = await newPage(t, { viewport: { width: 320, height: 812 } });
    await mockMedia(page);
    await visit(page);
    await skipEntry(page);
    await status(page, 'playing');
    await page.locator(`a[href="${href}"]`).first().click();
    await page.waitForURL(url => url.pathname === href);
    const action = page.getByRole('button', { name: '暂停背景音乐', exact: true });
    await action.waitFor();
    const box = await action.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 321, 'Music control must fit the narrow viewport');
    assert.equal(await page.locator('audio').count(), 1);
    await action.click();
    await status(page, 'paused');
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), pauseKey), '1');
  });
}

for (const width of [1440, 375, 320]) {
  for (const route of ['/', '/work']) {
  test(`${width}px ${route} navigation keeps music before Home and collapses into a visible right-hand dock`, async t => {
    const page = await newPage(t, { viewport: { width, height: 900 } });
    await mockMedia(page);
    await visit(page, route);
    if (route === '/') await skipEntry(page);
    const nav = page.locator('.dossier-site-nav');
    const dock = nav.locator('.dossier-site-nav__dock');
    await page.waitForFunction(() => document.querySelector('.dossier-site-nav').dataset.compact === 'false');
    const order = await nav.evaluate(element => {
      const player = element.querySelector('.archive-music');
      const home = [...element.querySelectorAll('a')].find(link => link.textContent === 'Home');
      return Boolean(player.compareDocumentPosition(home) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.equal(order, true, 'Music belongs before Home in reading and keyboard order');
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.dossier-site-nav').dataset.compact === 'true');
    // Poll geometry while CSS transitions finish, instead of relying on a fixed transition duration.
    await page.waitForFunction(() => {
      const rect = document.querySelector('.dossier-site-nav__dock').getBoundingClientRect();
      return rect.top >= 0 && rect.top < 80;
    });
    const box = await dock.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `Dock outside ${width}px viewport: ${JSON.stringify(box)}`);
    assert.ok(box.x + box.width / 2 >= width / 2, 'Dock should remain aligned toward the right');
    assert.ok(width - box.x - box.width < 100, 'Dock should remain near the right edge');
    for (const control of await dock.locator('a, button').all()) {
      if (!await control.isVisible()) continue;
      const controlBox = await control.boundingBox();
      assert.ok(controlBox.x >= 0 && controlBox.x + controlBox.width <= width + 1,
        `Control outside viewport: ${await control.textContent()}`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
      'The page should not gain horizontal overflow');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.dossier-site-nav').dataset.compact === 'false');
  });
  }
}

test('the song title scrolls during playback and stops while hovered or paused', async t => {
  const page = await newPage(t, { reducedMotion: 'no-preference' });
  await mockMedia(page);
  await visit(page, '/work');
  const marquee = page.locator('.archive-music__marquee').first();
  assert.equal(await marquee.evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
  await page.locator(toggle).first().click();
  await status(page, 'playing');
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.archive-music__marquee')).animationPlayState === 'running');
  const initialTransform = await marquee.evaluate(element => getComputedStyle(element).transform);
  await page.waitForFunction(previous => getComputedStyle(document.querySelector('.archive-music__marquee')).transform !== previous,
    initialTransform);
  await page.locator(toggle).first().hover();
  assert.equal(await marquee.evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
  await page.locator(toggle).first().click();
  await status(page, 'paused');
  await page.mouse.move(0, 0);
  assert.equal(await marquee.evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
});

test('reduced motion disables the scrolling music title while preserving playback controls', async t => {
  const page = await newPage(t, { reducedMotion: 'reduce' });
  await mockMedia(page);
  await visit(page, '/work');
  await page.locator(toggle).first().click();
  await status(page, 'playing');
  const animated = await page.locator(music).first().evaluate(element =>
    element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running')
      .map(animation => animation.animationName || animation.constructor.name));
  assert.deepEqual(animated, [], 'Reduced-motion playback must not animate the song title');
  assert.equal(await page.locator(toggle).first().getAttribute('aria-label'), '暂停背景音乐');
  await page.locator(toggle).first().click();
  await status(page, 'paused');
});
