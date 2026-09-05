'use client';

import { useEffect, useRef } from 'react';

type AtmosphereProps = { accent: string; selected: number; calm: boolean; lite: boolean; active: boolean };

export default function Atmosphere(props: AtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef(props);
  const wake = useRef(() => {});
  useEffect(() => { current.current = props; wake.current(); }, [props]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const availableContext = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !host || !availableContext) return;
    const context = availableContext;
    let width = 1, height = 1, frame = 0, previousTime = 0, elapsed = 0;
    let selected = current.current.selected;
    let pointerX = -1000, pointerY = -1000, pointerTime = -10000;
    let pulseX = 0, pulseY = 0, pulseAge = 10;
    let red = 86, green = 123, blue = 169;
    let glassX = 0, glassY = 0, glassReady = false;
    const glass = new Image(); glass.decoding = 'async';
    const random = (seed: number) => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
    const particles = Array.from({ length: 130 }, (_, index) => ({ x: random(index + 1), y: random(index + 201), depth: random(index + 401), phase: random(index + 601) * Math.PI * 2, vx: 0, vy: 0 }));
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
    glass.onload = () => { glassReady = true; canvas.dataset.glassReady = 'true'; schedule(); };
    glass.src = '/dark-glass.png';
    const resize = () => {
      width = host.clientWidth; height = host.clientHeight;
      const density = Math.min(devicePixelRatio, 1.25);
      canvas.width = Math.round(width * density); canvas.height = Math.round(height * density);
      context.setTransform(density, 0, 0, density, 0, 0);
      schedule();
    };
    const point = (event: PointerEvent) => {
      if (current.current.calm || !current.current.active) return;
      const bounds = host.getBoundingClientRect();
      pointerX = event.clientX - bounds.left; pointerY = event.clientY - bounds.top;
      pointerTime = performance.now();
      schedule();
    };
    const pulse = (event: PointerEvent) => { point(event); pulseX = pointerX; pulseY = pointerY; pulseAge = 0; };
    const leave = () => { pointerTime = -10000; };
    const visibility = () => { previousTime = 0; if (!document.hidden) schedule(); };
    function draw(time: number) {
      frame = 0;
      if (document.hidden || !current.current.active) { previousTime = 0; return; }
      const { calm, lite, accent } = current.current;
      const interval = width < 761 || lite ? 1000 / 24 : 1000 / 30;
      if (!calm && previousTime && time - previousTime < interval) { schedule(); return; }
      const delta = previousTime ? Math.min((time - previousTime) / 1000, .08) : 1 / 30;
      previousTime = time;
      if (!calm) { elapsed += delta; pulseAge += delta; }
      if (selected !== current.current.selected) { selected = current.current.selected; pulseX = width * .5; pulseY = height * .44; pulseAge = 0; }
      const color = Number.parseInt(accent.replace('#', ''), 16);
      const ease = calm ? 1 : 1 - Math.exp(-delta * 2.4);
      red += (((color >> 16) & 255) - red) * ease; green += (((color >> 8) & 255) - green) * ease; blue += ((color & 255) - blue) * ease;
      const tint = `${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}`;
      context.clearRect(0, 0, width, height);
      const breath = calm ? .5 : .5 + Math.sin(elapsed * .78) * .5;
      const centerX = width * (.5 + (calm ? 0 : Math.sin(elapsed * .19) * .08));
      const centerY = height * .44;
      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width * .75, 570));
      glow.addColorStop(0, `rgba(${tint}, ${.006 + breath * .006})`); glow.addColorStop(.5, `rgba(${tint}, .004)`); glow.addColorStop(1, `rgba(${tint}, 0)`);
      context.fillStyle = glow; context.fillRect(0, 0, width, height);
      const proximity = calm ? 0 : Math.max(0, 1 - (time - pointerTime) / 1800);
      if (glassReady) {
        // Gently deform sampled glass folds instead of spinning an object over the films.
        const targetX = proximity ? (pointerX / width - .5) * 16 : 0;
        const targetY = proximity ? (pointerY / height - .5) * 8 : 0;
        glassX += ((calm ? 0 : targetX) - glassX) * .1;
        glassY += ((calm ? 0 : targetY) - glassY) * .1;
        const artWidth = Math.max(width * 1.15, 760), artHeight = artWidth * glass.naturalHeight / glass.naturalWidth;
        const left = (width - artWidth) / 2 + glassX;
        const top = height * (width < 761 ? .26 : .015) + glassY;
        const strips = lite ? 24 : 48;
        context.globalCompositeOperation = 'source-over'; context.globalAlpha = 1;
        for (let strip = 0; strip < strips; strip++) {
          const u = strip / strips, screenX = left + u * artWidth;
          const local = Math.exp(-Math.abs(screenX - pointerX) / 180) * proximity;
          const bend = calm ? 0 : Math.sin(elapsed * .35 + u * 5) * 2.5 + Math.sin(elapsed * 1.1 + u * 9) * local * 9;
          context.drawImage(glass, u * glass.naturalWidth, 0, glass.naturalWidth / strips, glass.naturalHeight, screenX, top + bend, artWidth / strips + .5, artHeight);
        }
        const fade = context.createLinearGradient(0, top, 0, top + artHeight);
        fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(.2, 'rgba(0,0,0,.32)');
        fade.addColorStop(.7, 'rgba(0,0,0,.32)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
        context.globalCompositeOperation = 'destination-in'; context.fillStyle = fade;
        context.fillRect(0, 0, width, height);
        context.globalCompositeOperation = 'source-over'; context.globalAlpha = 1;
      }
      const count = Math.round((width < 761 ? 46 : 80) * (lite ? .5 : 1));
      context.fillStyle = `rgb(${tint})`;
      for (let index = 0; index < count; index++) {
        const particle = particles[index];
        let x = particle.x * width, y = particle.y * height;
        const dx = x - pointerX, dy = y - pointerY;
        const distance = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - distance / 140) * proximity;
        if (!calm) {
          const force = influence * influence * 58 / Math.max(distance, 1);
          particle.vx += ((dx - dy * .55) * force - particle.vx) * .12;
          particle.vy += ((dy + dx * .55) * force - particle.vy) * .12;
          x += (Math.sin(elapsed * .32 + particle.phase) * (3 + particle.depth * 4) + particle.vx) * delta;
          y += (-3 - particle.depth * 5 + Math.cos(elapsed * .23 + particle.phase) * 2 + particle.vy) * delta;
          particle.x = ((x / width) + 1) % 1; particle.y = ((y / height) + 1) % 1;
          x = particle.x * width; y = particle.y * height;
        }
        const edge = Math.min(1, x / 24, (width - x) / 24, y / 24, (height - y) / 24);
        const twinkle = calm ? .7 : .67 + Math.sin(elapsed * (1 + particle.depth) + particle.phase) * .33;
        const alpha = (.09 + particle.depth * .27 + influence * .3) * twinkle * edge;
        const size = .55 + particle.depth * .85 + influence * .65;
        context.globalAlpha = Math.min(alpha, .9);
        context.beginPath(); context.arc(x, y, size, 0, Math.PI * 2); context.fill();
        if (particle.depth > .91 || influence > .45) {
          context.globalAlpha = alpha * .12;
          context.beginPath(); context.arc(x, y, size * 3.8, 0, Math.PI * 2); context.fill();
        }
      }
      if (!calm && pulseAge < 1.7) {
        const progress = pulseAge / 1.7;
        const radius = 12 + (1 - (1 - progress) ** 3) * Math.min(width * .55, 260);
        context.strokeStyle = `rgba(${tint}, ${(1 - progress) * .13})`; context.globalAlpha = 1; context.lineWidth = .65;
        context.beginPath(); context.ellipse(pulseX, pulseY, radius, radius * .7, -.25, 0, Math.PI * 2); context.stroke();
      }
      context.globalAlpha = 1;
      if (!calm) schedule();
    }
    wake.current = schedule;
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    host.addEventListener('pointermove', point, { passive: true });
    host.addEventListener('pointerdown', pulse, { passive: true });
    host.addEventListener('pointerleave', leave, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      wake.current = () => {}; glass.onload = null; cancelAnimationFrame(frame); observer.disconnect();
      host.removeEventListener('pointermove', point); host.removeEventListener('pointerdown', pulse); host.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return <canvas className="atmosphere" ref={canvasRef} aria-hidden="true" />;
}
