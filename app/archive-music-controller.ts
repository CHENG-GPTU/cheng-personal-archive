export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'error';
export const MUSIC_PAUSED_SESSION_KEY = 'cheng.archive-music.paused.v1';

type SessionStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type MusicConnection = { saveData?: boolean; effectiveType?: string };
type AudioPort = Pick<HTMLAudioElement, 'paused' | 'volume' | 'preload' | 'error' | 'play' | 'pause' | 'load' | 'addEventListener' | 'removeEventListener'>;

/** One controller per audio element. No effect, timer, or promise initiates playback. */
export function createArchiveMusicController({ audio, storage, connection, onStatusChange }: {
  audio: AudioPort;
  storage?: () => SessionStore | undefined;
  connection?: MusicConnection;
  onStatusChange: (status: PlaybackStatus) => void;
}) {
  let manuallyPaused = false;
  try { manuallyPaused = storage?.()?.getItem(MUSIC_PAUSED_SESSION_KEY) === '1'; } catch { /* Private mode can deny storage. */ }
  let status: PlaybackStatus = manuallyPaused ? 'paused' : 'idle';
  let entryAttempted = manuallyPaused;
  let wantsPlayback = false;
  let request = 0;
  let warmed = false;
  let disposed = false;

  const constrained = () => connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
  // The 9 MB track is never eagerly downloaded on an untouched visit.
  audio.preload = constrained() || manuallyPaused ? 'none' : 'metadata';
  audio.volume = 0.35;
  onStatusChange(status);

  function update(next: PlaybackStatus) {
    if (disposed || status === next) return;
    status = next;
    onStatusChange(next);
  }

  function savePause(paused: boolean) {
    manuallyPaused = paused;
    try {
      const session = storage?.();
      if (paused) session?.setItem(MUSIC_PAUSED_SESSION_KEY, '1');
      else session?.removeItem(MUSIC_PAUSED_SESSION_KEY);
    } catch { /* The in-memory choice still applies when storage is unavailable. */ }
  }

  function fail(error: unknown, playbackRequest: number) {
    if (disposed || playbackRequest !== request) return;
    wantsPlayback = false;
    const name = error && typeof error === 'object' && 'name' in error ? error.name : undefined;
    update(name === 'NotAllowedError' ? 'blocked' : 'error');
  }

  function play() {
    if (disposed) return;
    const playbackRequest = ++request;
    wantsPlayback = true;
    update('loading');
    // Reuse buffered ranges; load() is only for a failed source.
    if (audio.error) audio.load();
    try {
      // Keep this on the envelope/button's synchronous user-gesture stack.
      const pending = audio.play();
      void pending.then(() => {
        if (disposed) { audio.pause(); return; }
        if (!wantsPlayback) { audio.pause(); return; }
        if (playbackRequest === request) update('playing');
      }, error => fail(error, playbackRequest));
    } catch (error) { fail(error, playbackRequest); }
  }

  function pause() {
    request += 1;
    wantsPlayback = false;
    savePause(true);
    // Lower the buffering hint when a visitor cancels or pauses.
    audio.preload = constrained() ? 'none' : 'metadata';
    audio.pause();
    update('paused');
  }

  const onPlaying = () => {
    // A pending play may settle after pause. Never revive that request.
    if (!wantsPlayback) { audio.pause(); return; }
    update('playing');
  };
  const onPause = () => {
    // Ignore a queued pause event if a newer click already resumed this element.
    if (!audio.paused || !wantsPlayback) return;
    wantsPlayback = false;
    request += 1;
    update('paused');
  };
  const onWaiting = () => { if (wantsPlayback) update('loading'); };
  const onError = () => {
    if (!wantsPlayback || !audio.error) return;
    request += 1;
    wantsPlayback = false;
    update('error');
  };
  const listeners = { playing: onPlaying, pause: onPause, waiting: onWaiting, error: onError };
  for (const [event, listener] of Object.entries(listeners)) audio.addEventListener(event, listener);

  return {
    startFromEntry() {
      if (disposed || entryAttempted || manuallyPaused) return;
      entryAttempted = true;
      play();
    },
    prepareFromIntent() {
      if (disposed || warmed || manuallyPaused || wantsPlayback || constrained()) return;
      warmed = true;
      // Hover, focus, or touch shows intent. Changing the hint preserves metadata.
      audio.preload = 'auto';
    },
    toggle() {
      if (disposed) return;
      entryAttempted = true;
      if (wantsPlayback || !audio.paused) pause();
      else { savePause(false); play(); }
    },
    getStatus: () => status,
    dispose() {
      disposed = true;
      request += 1;
      wantsPlayback = false;
      for (const [event, listener] of Object.entries(listeners)) audio.removeEventListener(event, listener);
      audio.pause();
    },
  };
}

export type ArchiveMusicController = ReturnType<typeof createArchiveMusicController>;
