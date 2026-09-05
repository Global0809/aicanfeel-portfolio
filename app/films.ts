export const instagram = 'https://www.instagram.com/aicanfeel/';
export const films = [
  { id: 'beyond-the-real', source: 1, title: 'Beyond the real', description: 'Impossible scenes. One unmistakable vision.', category: 'Studio showreel', duration: 39.102, poster: '/posters/beyond-the-real.jpg', accent: '#567ba9' },
  { id: 'through-the-signal', source: 2, title: 'Through the signal', description: 'Lose gravity. Find another dimension inside your song.', category: 'Music-video concept', duration: 33.483, poster: '/posters/through-the-signal.jpg', accent: '#567ba9' },
  { id: 'in-full-bloom', source: 3, title: 'In full bloom', description: 'A love song, flowering into an impossible world.', category: 'Music-video concept', duration: 30.070, poster: '/posters/in-full-bloom.jpg', accent: '#567ba9' },
  { id: 'no-way-out', source: 5, title: 'No way out', description: 'Raw performance. A reality that refuses to hold you.', category: 'Music-video concept', duration: 30.070, poster: '/posters/no-way-out.jpg', accent: '#567ba9' },
  { id: 'chrome-reverie', source: 6, title: 'Chrome reverie', description: 'Chrome, crimson, and a beautiful break from reality.', category: 'Brand-film concept', duration: 39.067, poster: '/posters/chrome-reverie.jpg', accent: '#567ba9' },
] as const;
export type Film = (typeof films)[number];
export const timecode = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
