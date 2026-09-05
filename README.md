# AICANFEEL

A mobile-first white-and-red CGI/VFX portfolio with liquid-glass materials, a guided 3D film orbit, and an accessible cinematic player. The primary project contact is Instagram: https://www.instagram.com/aicanfeel/.

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
- Automatic continuation can be disabled; sound settings persist across the sequence.
- Only the following film is prefetched, after eight seconds of viewing, unless data saving is enabled.
- Use arrow keys to browse, Enter to enter, Escape to leave, and the controls to seek, adjust volume, or enter fullscreen.
- Motion follows the device reduced-motion setting automatically; data saving and unsupported graphics use the simpler gallery. There is no Help panel or manual viewing-settings feature.
- Ambient particles use one input-transparent canvas, capped at 70 particles on phones and 130 on desktop. Floating frames, breathing light, and particle drift pause during films or dialogs; calm mode stops continuous decorative animation.
- Original burned-in subtitles and booking overlays remain part of the supplied films; separate caption transcripts were not supplied.

## Hosting

The site is configured for static export. Its Sites project is recorded in `.openai/hosting.json`. Deploy the generated static output, including the HLS folders. Do not omit or rename segment files independently of their playlists.

The source contains no credentials. Original local asset paths, temporary audits, generated build output, and dependency directories are not required in a public source repository. The 260K+ follower count and verified status are owner-supplied brand information and should be updated when needed.

## Validation scope

Checks cover desktop and phone-width layouts, real browser playback, original audio-stream preservation, automatic film continuation, mute state, closing and returning, keyboard controls, simple mode, production compilation, and type-aware linting. Device-specific fullscreen and physical multi-touch gestures should also be checked on an actual iPhone and Android phone before a major campaign.

The generated component catalog is kept unchanged and excluded from authored-source linting. Authored application code retains the strict lint rules.
