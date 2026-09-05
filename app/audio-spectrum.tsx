'use client';
import { useEffect, useRef, type RefObject } from 'react';

type SpectrumData = { fps: number; bands: number; duration: number; frames: number[][] };
type Props = { videoRef: RefObject<HTMLVideoElement | null>; filmId: string };

// Samples come from the delivered film's audio, so native HLS stays audible on Safari.
export default function AudioSpectrum({ videoRef, filmId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const availableCanvas = canvasRef.current;
    const availableVideo = videoRef.current;
    const availableContext = availableCanvas?.getContext('2d');
    if (!availableCanvas || !availableVideo || !availableContext) return;
    const canvas = availableCanvas, video = availableVideo, context = availableContext;
    const abort = new AbortController();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let samples: SpectrumData | null = null;
    let frame = 0, previous = 0, width = 200, height = 34;
    const levels = new Float32Array(32);
    const schedule = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(draw); };
    const resize = () => {
      width = canvas.clientWidth; height = canvas.clientHeight;
      const ratio = Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0); schedule();
    };
    function draw(time: number) {
      frame = 0;
      if (document.hidden) return;
      if (time - previous < 40) { schedule(); return; }
      previous = time;
      const reactive = !motion.matches && !video.paused && !video.ended && !video.muted && video.volume > 0 && video.readyState >= 3;
      const position = video.currentTime * (samples?.fps ?? 20);
      const index = Math.floor(position), blend = position - index;
      const first = samples?.frames[index], second = samples?.frames[index + 1] ?? first;
      context.clearRect(0, 0, width, height);
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#34527c'); gradient.addColorStop(.52, '#9ab6d8'); gradient.addColorStop(1, '#34527c');
      context.fillStyle = gradient;
      let energy = 0;
      for (let band = 0; band < 32; band++) {
        const target = reactive && first ? ((first[band] * (1 - blend) + (second?.[band] ?? 0) * blend) / 255) * video.volume : 0;
        levels[band] += (target - levels[band]) * (target > levels[band] ? .75 : .38);
        if (motion.matches) levels[band] = 0;
        energy += levels[band];
        const barHeight = 2 + levels[band] * (height - 4), barWidth = width / 32 - 2;
        context.globalAlpha = .35 + levels[band] * .65;
        context.beginPath(); context.roundRect(band * width / 32, (height - barHeight) / 2, barWidth, barHeight, 2); context.fill();
      }
      context.globalAlpha = 1;
      canvas.dataset.energy = (energy / 32).toFixed(3);
      canvas.dataset.reactive = String(reactive && Boolean(samples));
      if (reactive || energy > .02) schedule();
    }
    fetch(`/spectra/${filmId}.json`, { signal: abort.signal }).then(response => response.ok ? response.json() : null).then(value => {
      if (abort.signal.aborted) return;
      const data = value as SpectrumData | null;
      if (data?.bands === 32 && data.fps > 0 && Array.isArray(data.frames)) { samples = data; schedule(); }
    }).catch(() => {});
    const events = ['play', 'pause', 'seeking', 'seeked', 'timeupdate', 'volumechange', 'ended'] as const;
    events.forEach(event => video.addEventListener(event, schedule));
    motion.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', schedule);
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    return () => {
      abort.abort(); cancelAnimationFrame(frame); observer.disconnect();
      events.forEach(event => video.removeEventListener(event, schedule));
      motion.removeEventListener('change', schedule); document.removeEventListener('visibilitychange', schedule);
    };
  }, [filmId, videoRef]);
  return <canvas ref={canvasRef} className="audio-spectrum" aria-hidden="true" />;
}
