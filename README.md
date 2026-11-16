<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8c07dee5-bb10-44cd-a732-a3085ae1e3e4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

In development, the site can run without a database and serves the bundled demo catalog
in read-only mode. To use authentication and save changes, configure Supabase or the
PostgreSQL `SQL_*` variables in `.env`. Set strong, unique `AUTH_SECRET` and
`ADMIN_PORTAL_PASSWORD` values in `.env` before enabling authentication. Production still
requires a configured database.
