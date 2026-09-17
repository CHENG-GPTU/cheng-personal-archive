'use client';

import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { createArchiveMusicController, type ArchiveMusicController, type MusicConnection, type PlaybackStatus } from './archive-music-controller';
import './archive-music.css';

export type ArchiveMusicHandle = { startFromEntry: () => void; prepareFromIntent: () => void };
const TRACK = '/audio/mr-broken-heart-instrumental-web.mp3';
const TRACK_TITLE = 'Mr.“Broken Heart” (Instrumental) — 松下優也';
const MusicContext = createContext<{ status: PlaybackStatus; toggle: () => void; prepare: () => void } | null>(null);

/** The persistent layout owns one player; entrance and navigation share its controls. */
const ArchiveMusic = forwardRef<ArchiveMusicHandle, { children: ReactNode }>(function ArchiveMusic({ children }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const controllerRef = useRef<ArchiveMusicController | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const controller = createArchiveMusicController({
      audio,
      storage: () => window.sessionStorage,
      connection: (navigator as Navigator & { connection?: MusicConnection }).connection,
      onStatusChange: setStatus,
    });
    controllerRef.current = controller;
    return () => { controller.dispose(); controllerRef.current = null; };
  }, []);

  useImperativeHandle(ref, () => ({
    startFromEntry: () => controllerRef.current?.startFromEntry(),
    prepareFromIntent: () => controllerRef.current?.prepareFromIntent(),
  }), []);

  const message = status === 'playing' ? '背景音乐正在播放。'
    : status === 'loading' ? '音乐正在加载，可点击取消。'
    : status === 'paused' ? '背景音乐已暂停，本次访问将保留你的选择。'
    : status === 'blocked' ? '浏览器未允许播放，请点击音乐按钮开始。'
    : status === 'error' ? '音乐暂时无法播放，请点击重试。' : '';

  return <MusicContext.Provider value={{ status, toggle: () => controllerRef.current?.toggle(), prepare: () => controllerRef.current?.prepareFromIntent() }}>
    <audio ref={audioRef} src={TRACK} preload="none" loop />
    {children}
    <span id="archive-music-track-title" className="archive-music__status">{TRACK_TITLE}</span>
    <span className="archive-music__status" role="status" aria-live="polite">{message}</span>
  </MusicContext.Provider>;
});

/** Place immediately before Home inside the navigation. Compact keeps a visible action. */
export function ArchiveMusicControl({ compact = false }: { compact?: boolean }) {
  const music = useContext(MusicContext);
  if (!music) return null;
  const { status, toggle, prepare } = music;
  const active = status === 'playing';
  const loading = status === 'loading';
  const action = active ? '暂停背景音乐' : loading ? '取消音乐播放' : status === 'error' ? '重试播放背景音乐' : '播放背景音乐';
  const label = active ? '暂停' : loading ? '取消' : status === 'error' ? '重试' : '播放';
  return <div className={`archive-music${compact ? ' archive-music--compact' : ''}`} data-status={status}>
    <button type="button" className="archive-music__toggle" onClick={toggle} onPointerEnter={prepare} onFocus={prepare} onPointerDown={prepare}
      aria-label={action} aria-describedby="archive-music-track-title" title={`${action} · ${TRACK_TITLE}`}>
      <span className="archive-music__icon" aria-hidden="true">
        {loading ? <svg className="archive-music__spinner" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 8 8" /></svg>
          : <svg viewBox="0 0 24 24" fill="currentColor">{active ? <path d="M7 5h3v14H7zm7 0h3v14h-3z" /> : <path d="m8 5 11 7-11 7z" />}</svg>}
      </span>
      <span className="archive-music__title" aria-hidden="true"><span className="archive-music__marquee"><span>{TRACK_TITLE}</span><span>{TRACK_TITLE}</span></span></span>
      <span className="archive-music__action" aria-hidden="true">{label}</span>
    </button>
  </div>;
}

export default ArchiveMusic;
