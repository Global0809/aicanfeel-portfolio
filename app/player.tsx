'use client';
import { useEffect, useRef, useState } from 'react';
import { SkipForward, ArrowUpRight, Maximize, Minimize, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import AudioSpectrum from './audio-spectrum';
import { trackGlassLight } from './glass-light';
import { Field as BaseField } from '@base-ui/react/field';
import { films, instagram, timecode } from './films';

type Props = { open: boolean; selected: number; muted: boolean; onMute: (muted: boolean) => void; onClose: () => void; onNext: () => void };
export default function Player({ open, selected, muted, onMute, onClose, onNext }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [failure, setFailure] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(1);
  const previousVolume = useRef(1);

  const [fullscreen, setFullscreen] = useState(false);

  const swipe = useRef<{ x: number; y: number } | null>(null);
  const film = films[selected];

  const prefs = useRef({ muted, volume });
  useEffect(() => { prefs.current = { muted, volume }; }, [muted, volume]);
  const play = () => { const video = videoRef.current; if (!video) return; video.play().then(() => { setBlocked(false); }).catch(() => { setBlocked(true); setLoading(false); }); };
  const toggle = () => { const video = videoRef.current; if (!video) return; if (video.paused) play(); else video.pause(); };
  useEffect(() => {
    if (!open) return;
    let destroyed = false;
    let hls: import('hls.js/light').default | undefined;
    let activeVideo: HTMLVideoElement | null = null;
    // Dialog mounts its portal immediately after the parent commit.
    const timer = setTimeout(async () => {
      const video = videoRef.current;
      if (!video || destroyed) return;
      activeVideo = video;
      setFailure(''); setBlocked(false); setLoading(true); setElapsed(0); setPlaying(false);
      video.muted = prefs.current.muted; video.volume = prefs.current.volume;
      const source = `/media/${film.id}/index.m3u8`;
      const start = () => { if (!destroyed) video.play().then(() => { setBlocked(false); }).catch(() => { if (!destroyed) { setBlocked(true); setLoading(false); } }); };
      if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = source; video.load(); start(); }
      else {
        let Hls: typeof import('hls.js/light').default;
        try { Hls = (await import('hls.js/light')).default; }
        catch { if (!destroyed) { setLoading(false); setFailure('The player could not load. Check your connection and try again.'); } return; }
        if (destroyed) return;
        if (!Hls.isSupported()) { setFailure('This browser cannot play this film. Open it in a current browser, or watch our work on Instagram.'); setLoading(false); return; }
        hls = new Hls({ maxBufferLength: 12, maxMaxBufferLength: 20, backBufferLength: 8, startLevel: 0, capLevelToPlayerSize: false });
        hls.loadSource(source); hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, start);
        hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) { setLoading(false); setFailure('The film could not load. Check your connection and try again.'); } });
      }
    }, 0);
    return () => { destroyed = true; clearTimeout(timer); hls?.destroy(); if (activeVideo) { activeVideo.pause(); activeVideo.removeAttribute('src'); activeVideo.load(); } };
  }, [open, film.id, attempt]);
  useEffect(() => { if (videoRef.current) { videoRef.current.muted = muted; videoRef.current.volume = volume; } }, [muted, volume]);

  useEffect(() => {
    if (!open) return;
    const keydown = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.closest('input,button,[role="slider"],[role="switch"]')) return; if (e.code === 'Space') { e.preventDefault(); toggle(); } if (e.key === 'ArrowRight' && videoRef.current) videoRef.current.currentTime = Math.min(film.duration, videoRef.current.currentTime + 5); if (e.key === 'ArrowLeft' && videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5); };
    const hidden = () => { if (document.hidden) videoRef.current?.pause(); };
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('keydown', keydown); document.addEventListener('visibilitychange', hidden); document.addEventListener('fullscreenchange', changed);
    return () => { document.removeEventListener('keydown', keydown); document.removeEventListener('visibilitychange', hidden); document.removeEventListener('fullscreenchange', changed); };
  });
  const full = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (screenRef.current?.requestFullscreen) await screenRef.current.requestFullscreen(); else (videoRef.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.(); } catch { videoRef.current?.setAttribute('controls', ''); } };
  const numeric = (value: number | readonly number[]) => Array.isArray(value) ? value[0] : value as number;
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    <DialogContent className="cinema-dialog" style={{ translate: 'none' }} showCloseButton={false}>
      <div className="cinema" ref={screenRef} onPointerMove={trackGlassLight}>
        <div className="cinema-top"><span className="wordmark">AICANFEEL<span className="brand-dot" /></span><button className="round-control" onClick={onClose} aria-label="Close film"><X /></button></div>
        <div className="cinema-stage">
          <div className="phone-frame">

            <div className="screen" onPointerDown={e => { swipe.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={e => { if (swipe.current && e.clientY - swipe.current.y > 90 && Math.abs(e.clientX - swipe.current.x) < 65) onClose(); swipe.current = null; }}>
              {/* Original films retain their embedded subtitles; no separate transcript was supplied. */}
              {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} poster={film.poster} playsInline preload="metadata" onClick={toggle} onPlay={() => { setPlaying(true); setBlocked(false); }} onPause={() => { setPlaying(false); }} onWaiting={() => setLoading(true)} onPlaying={() => setLoading(false)} onLoadedData={() => setLoading(false)} onTimeUpdate={e => setElapsed(e.currentTarget.currentTime)} onEnded={() => { setPlaying(false); }} onError={() => { setFailure('The film could not load. Please try again.'); setLoading(false); }} aria-label={film.title} />
              {loading && !failure && <output className="player-message"><span className="loading-orbit" /><span>Loading film</span></output>}
              {blocked && !failure && <button className="player-start" onClick={play}><Play /> Play film</button>}
              {failure && <div className="player-message error" role="alert"><p>{failure}</p><button className="watch-button" onClick={() => setAttempt(value => value + 1)}>Try again</button><a href={instagram} target="_blank" rel="noopener noreferrer">Watch on Instagram <ArrowUpRight size={16} /></a></div>}
            </div>
          </div>
          <AudioSpectrum videoRef={videoRef} filmId={film.id} />
        </div>
        <div className="cinema-bottom">
          <div className="cinema-heading"><DialogTitle className="cinema-title">{film.title}</DialogTitle><DialogDescription className="sr-only">Film player. Press Escape or close to return to the portfolio.</DialogDescription><span className="playback-time">{timecode(elapsed)} <span>/ {timecode(film.duration)}</span></span></div>
          <BaseField.Root className="seek-slider"><BaseField.Label className="sr-only">Seek through film</BaseField.Label><Slider aria-label="Seek through film" value={[elapsed]} min={0} max={film.duration} step={.1} onValueChange={value => { if (videoRef.current) videoRef.current.currentTime = numeric(value); }} /></BaseField.Root>
          <div className="playback-controls">
            <button className="round-control play-control" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause /> : <Play />}</button>
            <button className="round-control" onClick={() => { if (muted && volume === 0) setVolume(previousVolume.current); onMute(!muted); }} aria-label={muted ? 'Unmute film' : 'Mute film'}>{muted ? <VolumeX /> : <Volume2 />}</button>
            <BaseField.Root className="volume-slider"><BaseField.Label className="sr-only">Volume</BaseField.Label><Slider aria-label="Volume" value={[muted ? 0 : volume]} min={0} max={1} step={.05} onValueChange={value => { const v = numeric(value); if (v > 0) previousVolume.current = v; setVolume(v); onMute(v === 0); }} /></BaseField.Root>
            <button className="round-control next-control" onClick={onNext} aria-label="Next film"><SkipForward /></button>
            <button className="round-control" onClick={full} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{fullscreen ? <Minimize /> : <Maximize />}</button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
