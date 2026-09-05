'use client';
import type { PointerEvent } from 'react';

export function trackGlassLight(event: PointerEvent<HTMLElement>) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const node = event.currentTarget, bounds = node.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width, y = (event.clientY - bounds.top) / bounds.height;
  node.style.setProperty('--glass-x', `${x * 100}%`);
  node.style.setProperty('--glass-y', `${y * 100}%`);
  node.style.setProperty('--glass-shift', `${(x - .5) * 10}px`);
}
