# Pulseify — Next.js Spotify Intelligence & YouTube Music Cinema Studio

> Built while playing around with **Google Antigravity** — a unified **Spotify Analytics Tracker** (inspired by Kworb.net) and **Dual-Engine Spotify + YouTube Music & Video Studio** built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS**.

---

## ✨ Key Features

### 1. Dual-Universe Mode Switcher (`Spotify ⇄ YouTube`)
- **Spotify Universe (Obsidian Emerald `#1ED760`)**:
  - **Artists Leaderboard**: Track 35+ top global artists by Monthly Listeners, 24h `Daily +/-` change, All-Time Peak Rank, Peak Listeners (`PkListeners`), and Followers.
  - **Top Songs & Viral Charts**: Daily & all-time streaming charts with audio DNA metrics (`Danceability`, `Energy`, `Valence`, `Tempo BPM`).
  - **Countries & Regional Markets**: Switch across 10+ global territories (`Worldwide`, `US`, `UK`, `BR`, `MX`, `DE`, `IN`, `JP`, `ES`, `AU`) with dynamic regional scaling and re-ranking.
  - **Head-to-Head Artist Comparison**: Compare up to 3 artists side-by-side with overlaid 30-day SVG listener trajectories.
  - **My Spotify Vault (OAuth 2.0 PKCE + 1-Click Demo Mode)**:
    - View your personal **Top Artists & Top Tracks** across `Last 4 Weeks`, `Last 6 Months`, and `All-Time`.
    - Browse your **Spotify Playlists** (sorted by **Last Played**, with all tracks inside paginated and sorted by **Recently Added First**).
    - Browse and stream your **Liked Songs** and **Recently Played** history.
- **YouTube Universe (Obsidian Crimson `#F43F5E`)**:
  - **Stream Any YouTube Video as a Song**: Searches YouTube in real time, strips noisy video tags (`(Official Video)`, `4K`, `- Topic`), and turns every video into a playable song card.
  - **Google OAuth 2.0 Login + Zero-Setup Playlist URL Importer**: Connect your Google account to sync personal YouTube Playlists & Liked Videos, or paste any YouTube Playlist URL (`https://www.youtube.com/playlist?list=...`) to import it immediately.

### 2. Custom Floating Glassmorphic Bottom Dock & Dual-Bespoke Fullscreen Views
- **Custom Floating Dock**: Powered under the hood by the **Spotify iFrame Controller API** and **YouTube IFrame Player API (`YT.Player`)**, providing millisecond-accurate scrubbing, custom transport controls, and automatic next-track queueing.
- **Spotify Fullscreen ("9:16 Vertical Frosted Glass Canvas Studio")**:
  - Vertical 9:16 Smoked Frosted Glass Canvas looping official music video trailers (`Soft` / `Deep` / `Clear` glass diffusion) paired with real-time timestamp-synced lyrics.
- **YouTube Fullscreen ("16:9 Widescreen Ambilight Cinema Lounge")**:
  - Uncropped 16:9 widescreen cinema frame with a crimson-amber Ambilight halo, floating crimson-glass console, and live synced lyrics pulled from verified LRCLIB & YouTube captions/descriptions.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (Optional for Live OAuth)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your client IDs in `.env.local` (or enter them directly in the in-app Login modal — **1-Click Demo Mode** and **YouTube Search/Playback** work out-of-the-box with zero API keys):
```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```
- **Spotify Developer Dashboard**: Add `http://127.0.0.1:3000` under **Redirect URIs**.
- **Google Cloud Console**: Enable **YouTube Data API v3** and add `http://127.0.0.1:3000` under **Authorized JavaScript origins** and **Authorized redirect URIs**.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

### 4. Run Unit Tests
```bash
npm test
```
