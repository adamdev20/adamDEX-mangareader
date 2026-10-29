# AdamDEX — final rebuild

Simple responsive React/Vite manga reader using the MahiruDex API.

## Features
- Manga discovery, search, detail pages, library, reading history and chapter reader.
- Chapter language support limited to English (`en`) and Indonesian (`id`).
- Same-origin Vercel serverless proxy to avoid browser CORS issues when calling MahiruDex and loading covers.
- Responsive layout for mobile, tablet and desktop.

## Deploy to Vercel
1. Upload/replace the project files in your repository.
2. Ensure Vercel uses the Vite framework preset and the default build command `npm run build`.
3. Redeploy.

API documentation: https://mahirudex.vercel.app/

Note: The Vite production build could not be run in this environment because package installation timed out. `api/mangadex.js` passed `node --check`.
