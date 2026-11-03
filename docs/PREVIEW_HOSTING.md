# Hosting and deployment

## Architecture

Next.js exports the website to `out/`. `scripts/build-preview.mjs` hashes the exported files and creates a small Cloudflare Worker artifact in `dist/`, plus `.sites-runtime/preview-assets.json`.

The deployed Worker verifies a signed session before serving pages, scripts, fonts, images or videos from private R2 storage. GET, HEAD and single byte ranges are supported, including video streaming. There is no public asset directory bypassing the password gate.

The `.openai/hosting.json` manifest identifies the existing Sites deployment and its `DOPPL_ASSETS` R2 binding. The GitHub repository stores source; it is not an automatic deployment pipeline.

## Runtime configuration

Set these secrets in the hosting environment, never in source control:

| Secret | Purpose |
| --- | --- |
| `DOPPL_PREVIEW_PASSWORD` | Visitor password |
| `DOPPL_PREVIEW_SECRET` | Random session-signing secret |
| `DOPPL_ASSET_UPLOAD_TOKEN` | Separate random deployment-only upload credential |

`.env.example` lists their names with empty values. The session cookie is signed, Secure, HttpOnly and SameSite=Lax, and expires after seven days. Changing the visitor password invalidates existing sessions.

## Publishing the existing site

Use the Sites publishing workflow with access to the existing project:

1. Open and synchronise the Sites source checkout using a fresh source credential.
2. Apply the intended source changes and run the production build and checks.
3. Package, save and deploy the matching source version through Sites.
4. Immediately upload that build's exported files using `node scripts/upload-preview-assets.mjs`.
5. Wait for all assets to upload before sharing the deployed version.

The upload script prompts for JSON through hidden stdin. Its input fields are `url` and `uploadToken`; `bypass` is optional for hosts that also require platform authentication. Credentials must stay out of shell arguments, files and logs. Each upload checks the local SHA-256 and asks storage to validate the checksum.

The Worker and uploaded assets must come from the same build. Deploying the Worker without its matching files leaves that version incomplete. Preserve the current access policy when updating the existing site.

## Other hosting

The `out/` directory can be deployed to a static host that supports directory index files. That deployment will not include the Worker password gate. For protected hosting outside Sites, configure equivalent authentication, the `DOPPL_ASSETS` R2 binding, runtime secrets and an upload process appropriate to the chosen host. The supplied uploader targets Sites URLs.

## Verification

```sh
node --test scripts/preview-auth.test.mjs
```

These tests cover unauthenticated pages and media, wrong passwords, secure cookies, tampered and expired sessions, password changes, byte ranges, cross-origin login, redirect restrictions and missing configuration. Local development and local static export previews are intentionally ungated.
