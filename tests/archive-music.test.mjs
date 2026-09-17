import assert from 'node:assert/strict';
import test from 'node:test';
import { createArchiveMusicController, MUSIC_PAUSED_SESSION_KEY } from '../app/archive-music-controller.ts';

class FakeAudio extends EventTarget {
  paused = true;
  volume = 1;
  error = null;
  preloadValue = 'none';
  preloadChanges = [];
  pending = [];
  loadCalls = 0;
  pauseCalls = 0;
  calls = [];
  get preload() { return this.preloadValue; }
  set preload(value) { this.preloadValue = value; this.preloadChanges.push(value); }
  play() {
    this.calls.push('play');
    this.paused = false;
    return new Promise((resolve, reject) => this.pending.push({ resolve, reject }));
  }
  pause() {
    this.pauseCalls += 1;
    const changed = !this.paused;
    this.paused = true;
    if (changed) this.dispatchEvent(new Event('pause'));
  }
  load() { this.loadCalls += 1; this.error = null; }
  resolve(index = this.pending.length - 1) {
    this.paused = false;
    this.dispatchEvent(new Event('playing'));
    this.pending[index].resolve();
  }
  reject(name, index = this.pending.length - 1) {
    this.paused = true;
    this.pending[index].reject(Object.assign(new Error(name), { name }));
  }
}

function session() {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}
function fixture(options = {}) {
  const audio = new FakeAudio();
  const store = options.store ?? session();
  const statuses = [];
  const controller = createArchiveMusicController({ audio, storage: () => store, onStatusChange: status => statuses.push(status), ...options });
  return { audio, store, statuses, controller };
}
const flush = () => Promise.resolve();

test('initial visit only asks for metadata, intent warms once, and never plays automatically', () => {
  const { audio, controller } = fixture();
  assert.equal(audio.preload, 'metadata');
  assert.equal(audio.pending.length, 0);
  controller.prepareFromIntent();
  controller.prepareFromIntent();
  assert.deepEqual(audio.preloadChanges, ['metadata', 'auto']);
  assert.equal(audio.loadCalls, 0, 'reuse existing metadata rather than restarting the request');
  assert.equal(audio.pending.length, 0);
});

test('save-data and slow connections avoid speculative downloads but allow a direct play click', () => {
  for (const connection of [{ saveData: true }, { effectiveType: '2g' }, { effectiveType: 'slow-2g' }]) {
    const { audio, controller } = fixture({ connection });
    controller.prepareFromIntent();
    assert.equal(audio.preload, 'none');
    controller.startFromEntry();
    assert.equal(audio.pending.length, 1);
    assert.equal(controller.getStatus(), 'loading');
  }
});

test('opening starts play on the same call stack before entrance work, without waiting for bytes', () => {
  const { audio, controller } = fixture();
  controller.startFromEntry();
  audio.calls.push('prepare entrance animation');
  assert.deepEqual(audio.calls, ['play', 'prepare entrance animation']);
  assert.equal(controller.getStatus(), 'loading');
  assert.equal(audio.volume, .35);
  controller.startFromEntry();
  assert.equal(audio.pending.length, 1, 'opening and skip cannot double-start the track');
});

test('cancel during loading remains paused after a late playing event and resolved promise', async () => {
  const { audio, store, controller } = fixture();
  controller.startFromEntry();
  controller.toggle();
  assert.equal(controller.getStatus(), 'paused');
  assert.equal(store.getItem(MUSIC_PAUSED_SESSION_KEY), '1');
  audio.resolve(0);
  await flush();
  assert.equal(audio.paused, true);
  assert.equal(controller.getStatus(), 'paused');
  controller.startFromEntry();
  assert.equal(audio.pending.length, 1);
});

test('manual pause survives remount or refresh in this session and explicit play clears it', async () => {
  const store = session();
  const first = fixture({ store });
  first.controller.startFromEntry();
  first.audio.resolve();
  await flush();
  assert.equal(first.controller.getStatus(), 'playing');
  first.controller.toggle();
  first.controller.dispose();
  const second = fixture({ store });
  assert.equal(second.controller.getStatus(), 'paused');
  assert.equal(second.audio.preload, 'none');
  second.controller.prepareFromIntent();
  second.controller.startFromEntry();
  assert.equal(second.audio.pending.length, 0);
  assert.equal(second.audio.preload, 'none');
  second.controller.toggle();
  assert.equal(second.audio.pending.length, 1);
  assert.equal(store.getItem(MUSIC_PAUSED_SESSION_KEY), null);
  second.audio.resolve();
  await flush();
  assert.equal(second.controller.getStatus(), 'playing');
  assert.equal(fixture().controller.getStatus(), 'idle', 'a new session has no inherited pause');
});

test('old rejected promises and queued pause events cannot overwrite a newer manual resume', async () => {
  const { audio, controller } = fixture();
  controller.startFromEntry();
  controller.toggle();
  controller.toggle();
  assert.equal(audio.pending.length, 2);
  audio.pending[0].reject(Object.assign(new Error('old request'), { name: 'AbortError' }));
  audio.dispatchEvent(new Event('pause'));
  await flush();
  assert.equal(controller.getStatus(), 'loading');
  audio.resolve(1);
  await flush();
  assert.equal(controller.getStatus(), 'playing');
});

test('browser policy rejection waits for another explicit click and can then recover', async () => {
  const { audio, controller } = fixture();
  controller.startFromEntry();
  audio.reject('NotAllowedError');
  await flush();
  assert.equal(controller.getStatus(), 'blocked');
  controller.startFromEntry();
  controller.prepareFromIntent();
  assert.equal(audio.pending.length, 1, 'no automatic retry after browser rejection');
  controller.toggle();
  audio.resolve();
  await flush();
  assert.equal(controller.getStatus(), 'playing');
});

test('a network failure is recoverable with a user click and reloads only the failed source', async () => {
  const { audio, controller } = fixture();
  controller.startFromEntry();
  audio.error = { code: 2 };
  audio.dispatchEvent(new Event('error'));
  audio.reject('NotSupportedError');
  await flush();
  assert.equal(controller.getStatus(), 'error');
  controller.toggle();
  assert.equal(audio.loadCalls, 1);
  audio.resolve();
  await flush();
  assert.equal(controller.getStatus(), 'playing');
});

test('storage getter and storage operations may fail without losing the in-memory pause', async () => {
  const unavailable = () => { throw new Error('storage disabled'); };
  for (const storage of [unavailable, () => ({ getItem: unavailable, setItem: unavailable, removeItem: unavailable })]) {
    const { audio, controller } = fixture({ storage });
    controller.startFromEntry();
    controller.toggle();
    controller.startFromEntry();
    assert.equal(audio.pending.length, 1);
    assert.equal(controller.getStatus(), 'paused');
    controller.toggle();
    audio.resolve();
    await flush();
    assert.equal(controller.getStatus(), 'playing');
  }
});

test('buffering permits cancellation; disposal silences any late pending playback', async () => {
  const { audio, statuses, controller } = fixture();
  controller.startFromEntry();
  audio.resolve();
  await flush();
  audio.dispatchEvent(new Event('waiting'));
  assert.equal(controller.getStatus(), 'loading');
  controller.toggle();
  assert.equal(controller.getStatus(), 'paused');
  controller.toggle();
  controller.dispose();
  const before = [...statuses];
  audio.resolve();
  await flush();
  assert.equal(audio.paused, true);
  assert.deepEqual(statuses, before);
});
