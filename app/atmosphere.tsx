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
    let red = 190, green = 218, blue = 209;
    const random = (seed: number) => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
    const particles = Array.from({ length: 130 }, (_, index) => ({ x: random(index + 1), y: random(index + 201), depth: random(index + 401), phase: random(index + 601) * Math.PI * 2, vx: 0, vy: 0 }));
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
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
      glow.addColorStop(0, `rgba(${tint}, ${.035 + breath * .025})`); glow.addColorStop(.5, `rgba(${tint}, .012)`); glow.addColorStop(1, `rgba(${tint}, 0)`);
      context.fillStyle = glow; context.fillRect(0, 0, width, height);
      const proximity = calm ? 0 : Math.max(0, 1 - (time - pointerTime) / 1800);
      const count = Math.round((width < 761 ? 70 : 130) * (lite ? .5 : 1));
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
        const alpha = (.15 + particle.depth * .43 + influence * .4) * twinkle * edge;
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
      wake.current = () => {}; cancelAnimationFrame(frame); observer.disconnect();
      host.removeEventListener('pointermove', point); host.removeEventListener('pointerdown', pulse); host.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return <canvas className="atmosphere" ref={canvasRef} aria-hidden="true" />;
}
