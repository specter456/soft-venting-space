# Venting

A tiny safe room in your phone — a private emotional wellness app.

## Getting Started

```bash
bun install
bun run dev
```

## Environment Variables

All URLs use the `VITE_SITE_URL` variable. Set it in your hosting dashboard or `.env`:

```
VITE_SITE_URL=https://venting.app
```

This is used for canonical tags, Open Graph URLs, and sitemap links. It defaults to `https://venting.app` if not set.

## Connecting a Custom Domain

To use your own domain (e.g., `myapp.com`):

1. **In your hosting dashboard** (Vercel, Netlify, Cloudflare Pages, etc.):
   - Go to **Settings → Domains**
   - Add your custom domain

2. **In your DNS provider** (where you bought the domain):
   - **For apex domains** (`myapp.com`): Add an `A` record pointing to your hosting provider's IP
   - **For subdomains** (`www.myapp.com`): Add a `CNAME` record pointing to your hosting provider's domain

3. **Update `VITE_SITE_URL`** in your hosting environment variables to your new domain.

4. **Update `robots.txt` and `sitemap.xml`** in `/public` to reference your new domain.

The app is a single-page application — all routes work via client-side routing. Make sure your hosting provider is configured to serve `index.html` for all routes (SPA fallback).
