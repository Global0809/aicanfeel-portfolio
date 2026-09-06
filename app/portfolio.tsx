'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Grid2X2, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import Image from 'next/image';
import Link from 'next/link';
import { films, instagram, timecode } from './films';
import World from './world';
import Player from './player';
import { trackGlassLight } from './glass-light';
export default function Portfolio() {
  const [selected, setSelected] = useState(0);
  const [player, setPlayer] = useState(false);
  const [panel, setPanel] = useState<'films' | 'studio' | null>(null);
  const [muted, setMuted] = useState(false);
  const [calm, setCalm] = useState(false);
  const [lite, setLite] = useState(false);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reset, setReset] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const swipeStart = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const film = films[selected];
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const init = requestAnimationFrame(() => {
      setCalm(motion.matches);
      setLite(Boolean(connection?.saveData) || navigator.hardwareConcurrency <= 2);
      setMounted(true);
    });
    const change = () => setCalm(motion.matches);
    motion.addEventListener('change', change);
    return () => { cancelAnimationFrame(init); motion.removeEventListener('change', change); };
  }, []);
  const select = (index: number) => { setSelected(index); setInteracted(true); };
  const enter = (index = selected) => { setSelected(index); setPanel(null); setPlayer(true); setInteracted(true); };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (player || panel || (event.target as HTMLElement).closest('input, textarea, button, a, [role="switch"]')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); select((selected + 1) % 5); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); select((selected + 4) % 5); }
      if (event.key === 'Enter') enter();
      if (event.key === 'Home') { select(0); setReset(value => value + 1); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  return <main className="portfolio" data-calm={calm} data-paused={player || panel !== null}>
    {mounted && !lite && <World selected={selected} calm={calm} playing={player || panel !== null} reset={reset} onSelect={select} onPlay={() => enter()} onReady={setReady} onInteract={() => setInteracted(true)} />}
    <header className="masthead"><Link className="wordmark" href="/" aria-label="AICANFEEL home">AICANFEEL<span className="brand-dot" /></Link><a className="header-contact" href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Start a project on Instagram">Start a project <ArrowUpRight size={17} /></a></header>
    <section className="experience" aria-label="Explore five studio films">
      <div className="intro"><h1>Portfolio<span>.</span></h1><p>CGI &amp; VFX music videos</p></div>

      <div className={`world-frame ${ready && !lite ? 'is-ready' : ''}`}>
        <div className="fallback-world" aria-hidden={ready && !lite} inert={ready && !lite} onPointerDown={event => { swipeStart.current = { x: event.clientX, y: event.clientY, moved: false }; }} onPointerUp={event => { const start = swipeStart.current; if (start && Math.abs(event.clientX - start.x) > 35 && Math.abs(event.clientY - start.y) < 70) { start.moved = true; select((selected + (event.clientX < start.x ? 1 : 4)) % 5); } }} onClickCapture={event => { if (swipeStart.current?.moved) { event.preventDefault(); event.stopPropagation(); swipeStart.current = null; } }}>{films.map((item, index) => { const offset = ((index - selected + 7) % 5) - 2; return <button key={item.id} className={`film-portal ${index === selected ? 'is-current' : ''}`} style={{ '--offset': offset } as CSSProperties} onClick={() => index === selected ? enter(index) : select(index)} aria-label={`${index === selected ? 'Play' : 'Select'} ${item.title}`}><Image unoptimized width={720} height={1280} src={item.poster} alt="" fetchPriority={index === 0 ? 'high' : 'auto'} /><span className="portal-mark">{String(index + 1).padStart(2, '0')}</span></button>; })}</div>
      </div>
      <p className={`mobile-hint ${interacted ? 'hint-dismissed' : ''}`}>Swipe to explore</p><div className="film-caption" key={film.id}><p className="film-number">{String(selected + 1).padStart(2, '0')} / 05</p><h2>{film.title}</h2></div>
      <div className="watch-row"><button className="round-control" onClick={() => select((selected + 4) % 5)} aria-label="Previous film"><ArrowLeft /></button><button className="watch-button" onClick={() => enter()}><Play size={17} fill="currentColor" /> Watch film <span>{timecode(film.duration)}</span></button><button className="round-control" onClick={() => select((selected + 1) % 5)} aria-label="Next film"><ArrowRight /></button></div>
      <div className="world-tools"><button className="quiet-button" onClick={() => setPanel('films')}><Grid2X2 size={16} /> All films <span>05</span></button><span className={`swipe-hint ${interacted ? 'hint-dismissed' : ''}`}>Drag to explore</span></div>
    </section>
    <footer className="site-footer"><button className="quiet-button" onClick={() => setPanel('studio')}>The studio <ArrowDown size={14} /></button><a className="instagram-proof" href={instagram} target="_blank" rel="noopener noreferrer" aria-label="AICANFEEL on Instagram, verified, 260,000-plus followers"><BadgeCheck size={16} /><span>260K+ on Instagram</span><ArrowUpRight size={14} /></a></footer>
    <output className="sr-only" aria-live="polite">Selected film {selected + 1} of 5: {film.title}</output>
    <Dialog open={panel !== null} onOpenChange={value => { if (!value) setPanel(null); }}><DialogContent className="info-dialog" onPointerMove={trackGlassLight}>
      {panel === 'films' && <><p className="eyebrow">THE COLLECTION / 05</p><DialogTitle>Five ways out of the ordinary.</DialogTitle><DialogDescription>Studio concepts and films. Choose a world to enter.</DialogDescription><div className="film-index">{films.map((item, index) => <button key={item.id} onClick={() => enter(index)} className="film-index-row"><span className="index-number">{String(index + 1).padStart(2, '0')}</span><Image unoptimized width={720} height={1280} src={item.poster} alt="" /><span className="index-copy"><strong>{item.title}</strong><span>{item.category}</span></span><span className="index-duration">{timecode(item.duration)}</span><Play size={16} /></button>)}</div></>}
      {panel === 'studio' && <><p className="eyebrow">INDEPENDENT VISION. IMPOSSIBLE WORLDS.</p><DialogTitle>Your music deserves<br />a world of its own.</DialogTitle><DialogDescription>We’re AICANFEEL. We create complete CGI and VFX music videos, from the first idea to the final frame.</DialogDescription><p className="studio-copy">Bring a song, a lyric, a rough idea. We’ll build the story around it — and turn it into a world that could only belong to you.</p><div className="studio-services"><span>Story & creative direction</span><span>CGI & visual effects</span><span>Performance & lip-sync</span><span>Full music-video production</span></div><a className="studio-cta" href={instagram} target="_blank" rel="noopener noreferrer"><span>Let’s talk about your song.<small>Start a project on Instagram</small></span><ArrowUpRight size={24} /></a><div className="studio-proof"><BadgeCheck size={17} /><span>@aicanfeel · Verified · 260K+ followers</span></div><p className="studio-note">The films shown here are studio concepts and promotional work. Project scope, rights, and delivery terms are agreed directly before production.</p><p className="studio-note">© {new Date().getFullYear()} AICANFEEL</p></>}
    </DialogContent></Dialog>
    {player && <Player open={player} selected={selected} muted={muted} onMute={setMuted} onClose={() => setPlayer(false)} onNext={() => setSelected(value => (value + 1) % 5)} />}
  </main>;
}
