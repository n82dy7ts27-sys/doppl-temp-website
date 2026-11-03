# DOPPL TEMP WEBSITE — V1

DOPPL is a generative AI production studio combining creative expertise, filmmaking and marketing science. This repository contains the V1 company website, its source code and the media needed to run it.

Live website: [doppl-studio.endoendo.chatgpt.site](https://doppl-studio.endoendo.chatgpt.site/). The hosted site uses password-protected access.

## Website

The homepage introduces **Multipliers of Brand Potential**, followed by Studio, How we work, Capabilities, Our work and Contact. It includes a looping opening film, a transparent animated mascot, a spatial section index and subtle optical backgrounds. Four expandable capability cards cover Film & Video, Still Imagery, Brand Worlds and Hybrid Production. They use a two-column desktop grid and stack on mobile.

The site is responsive, with keyboard-accessible controls, reduced-motion support and media suspension when content is off screen. The work section is ready for approved case studies. Enquiries open the visitor's email application at **hello@doppl.studio**.

## Technology

| Area | Implementation |
| --- | --- |
| Framework | Next.js 16.3.5, App Router, static export |
| Language | TypeScript and TSX; JavaScript for build and hosting utilities |
| UI | React 19.3.0, custom CSS, Motion 14 and Lucide icons |
| Typography | Locally bundled DM Sans and IBM Plex Mono via Fontsource |
| Content | JSON copy with stable content IDs |
| Media | MP4 opening film; alpha WebM and Safari MOV mascot, with poster fallbacks |
| Hosting | Cloudflare Worker password gate and private R2 asset storage through Sites |
| Copy handoff | Optional Python utility for Word export and import |

## Run locally

Use Node.js 22 and npm. The lockfile fixes the dependency versions.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. Local development does not require production credentials.

## Validate and build

```sh
npm run build
npm run typecheck
node --test scripts/preview-auth.test.mjs
```

The build writes the static website to `out/`, the protected hosting Worker to `dist/`, and an asset manifest to `.sites-runtime/`. These generated directories are excluded from Git.

To inspect the exported website locally, serve `out/` with a static HTTP server, for example:

```sh
python3 -m http.server 3000 --bind 127.0.0.1 --directory out
```

Use this static server for export previews; Next.js `next start` is not compatible with `output: 'export'`.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Homepage entry point |
| `app/layout.tsx` | Shared document, fonts, metadata and styles |
| `components/direction-page.tsx` | Homepage layout and section composition |
| `components/production-services.tsx` | Expandable capabilities grid |
| `components/hero-mascot.tsx` | Alpha-video playback and persistent canvas display |
| `components/opening-film.tsx` | Opening film loop |
| `components/site-contact.tsx` | Enquiry links and contact interactions |
| `lib/site-copy.json` | Editable website copy |
| `lib/site-media.ts` | Opening film and poster paths |
| `styles/spatial-site.css` | Main homepage layout and responsive styling |
| `styles/production-services.css` | Capability card layout and interactions |
| `public/` | Film, mascot, brand assets, optical backgrounds and licences |
| `worker/preview.mjs` | Password gate and protected media serving |
| `scripts/` | Build, asset upload, verification and content utilities |
| `.openai/hosting.json` | Existing Sites identity and R2 binding |

## Content and media

Edit customer-facing wording in `lib/site-copy.json`, preserving its keys and placeholders. The Word handoff process is documented in [docs/COPY_WORKFLOW.md](docs/COPY_WORKFLOW.md).

Media is included in the repository at its original file paths. Keep both alpha-video formats for browser compatibility and retain their transparency when replacing them. No media conversion is needed to run V1.

## Deployment

The existing live site is hosted separately from this GitHub repository. A GitHub push does not automatically deploy it. See [docs/PREVIEW_HOSTING.md](docs/PREVIEW_HOSTING.md) for the password gate, required secrets and asset upload process. A plain static host will serve the exported site without that gate.

## Release

**V1 / `v1.0.0`** is the initial packaged website release. See [RELEASE_NOTES.md](RELEASE_NOTES.md) for its scope and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency and component attribution.
