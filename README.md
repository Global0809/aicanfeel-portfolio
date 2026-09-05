# AICANFEEL

A mobile-first CGI/VFX portfolio in near-black navy, with thin film frames, reactive smoked-blue glass folds, and a minimal portrait cinema. The primary project contact is Instagram: https://www.instagram.com/aicanfeel/.

## Development

Use Node.js 22.23.2 (recorded in `.node-version`). Install with `npm ci`, run `npm run dev`, validate with `npm run lint`, and export with `npm run build`. Node 22 avoids a Windows shutdown issue encountered with Node 24 during static export.

The project uses React, Vinext, Three.js, HLS.js, and the supplied Shadcn/Base UI primitives. The 3D runtime and streaming library load separately. Browser preferences, low-powered devices, and WebGL failures are handled with a simpler poster-based presentation.

## Content

`app/films.ts` contains the five film descriptions and their order. Source videos are ads **1, 2, 3, 5, and 6**; ad 4 is intentionally excluded. These are studio concepts and promotional films, not client case studies. No pricing or production-technology claims beyond CGI/VFX are included.

`public/media` contains relative-path VOD HLS packages. Ads 1/2/3/5 preserve their original compressed 1080×1920 60fps video and AAC audio streams. Ad 6 was delivered at 1080×1920 60fps using H.264 CRF18, preserving its original AAC audio stream. All originals remain untouched. Every delivery file is below 25 MiB.

Posters were matched against representative frames. The supplied vortex, romance, and red-prison covers belong to ads 2, 3, and 5 respectively. Ads 1 and 6 use frames extracted from those exact films.

## Playback and accessibility

- No film is requested on the initial portfolio screen. Metadata comes from the validated local media manifest.
- Deliberate selection starts playback with sound enabled. A visible play action handles browser playback restrictions.
- Films stop at the end; the next-film icon opens the next work. Sound settings persist while the player is open.
- Video media loads only when a film opens. A compact spectrum file follows the current film; no microphone permission or Web Audio routing is used.
- Use arrow keys to browse, Enter to enter, Escape to leave, and the controls to seek, adjust volume, or enter fullscreen.
- Motion follows the device reduced-motion setting automatically; data saving and unsupported graphics use the simpler gallery. There is no Help panel or manual viewing-settings feature.
- Ambient particles use one input-transparent canvas, capped at 46 particles on phones and 80 on desktop. Floating frames, breathing light, and particle drift pause during films or dialogs; calm mode stops continuous decorative animation.
- Original burned-in subtitles and booking overlays remain part of the supplied films; separate caption transcripts were not supplied.

## Hosting

The site is configured for static export. Its Sites project is recorded in `.openai/hosting.json`. Deploy the generated static output, including the HLS folders. Do not omit or rename segment files independently of their playlists.

The source contains no credentials. Original local asset paths, temporary audits, generated build output, and dependency directories are not required in a public source repository. The 260K+ follower count and verified status are owner-supplied brand information and should be updated when needed.

## Validation scope

Checks cover desktop and phone-width layouts, real browser playback, original audio-stream preservation, automatic film continuation, mute state, closing and returning, keyboard controls, simple mode, production compilation, and type-aware linting. Device-specific fullscreen and physical multi-touch gestures should also be checked on an actual iPhone and Android phone before a major campaign.

The generated component catalog is kept unchanged and excluded from authored-source linting. Authored application code retains the strict lint rules.

## Audio visualizer

The 32-band spectrum is measured from each delivered film at 20 frames per second, then interpolated against the video clock. It follows seeking, settles when paused or muted, and respects reduced motion. Original soundtrack playback is unchanged, including native HLS browsers.

To regenerate after changing a film, run scripts/generate_spectra.py with Python and NumPy, plus FFmpeg and ffprobe on PATH (or supply --ffmpeg and --ffprobe paths).

The ambient glass uses one sampled material image, with gentle pointer-driven deformation in the existing canvas. The former central ribbon is removed. Playback and dialogs pause gallery animation; reduced motion renders static glass. The cinema and information panels use the same smoked-blue material with restrained pointer lighting.
