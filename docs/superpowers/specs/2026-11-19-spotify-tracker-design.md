# Pulseify: Next.js Spotify Stats, Charts & Analytics Tracker — Design Spec

**Date:** 2026-11-19
**Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons

---

## 1. Overview & Goals

Build a high-craft, ultra-responsive Spotify intelligence and chart-tracking web application inspired by Kworb.net's high-signal monthly listener & streaming leaderboards, redesigned with a modern dark glassmorphic UI ("Obsidian Pulse"), multi-dimensional filters, interactive artist/song detail drawer, real song playback, and a Spotify Login experience (supporting both real OAuth 2.0 PKCE and zero-config Demo Mode).

---

## 2. Visual Direction & Layout Architecture

- **Color Palette ("Obsidian Pulse")**:
  - Primary Canvas: `#07080C`
  - Elevated Surface / Cards: `#10131C` with subtle `rgba(255,255,255,0.08)` 1px borders and backdrop blur
  - Primary Accent: Spotify Neon Green `#1ED760`
  - Positive Delta (`Daily +`): Emerald `#10B981`
  - Negative Delta (`Daily -`): Rose `#F43F5E`
  - Peak / Record Highlight: Gold `#F59E0B`
- **Top Navigation & Mode Bar**:
  - Brand logo (`Pulseify // Spotify Intelligence`)
  - Primary View Tabs:
    1. **Artists Leaderboard** (Monthly Listeners, Daily `+/-`, Peak Rank, Peak Listeners, Followers, Total Streams, 7d Sparkline)
    2. **Top Songs & Viral Charts** (Daily Streams, Daily `+/-`, Total Streams, Peak Rank, Release Year, Audio Features)
    3. **Countries & Regional Charts** (Global, US, UK, BR, MX, DE, JP, IN, FR, AU, KR market breakdowns)
    4. **Compare Head-to-Head** (Side-by-side comparison of up to 3 artists with overlaid 30-day listener curves)
    5. **My Spotify Vault** (Personal top artists, top tracks by time range: 4 Weeks / 6 Months / All-Time, recently played, genre & audio DNA)
  - Global instant search input + **Spotify Login / Account Status** button.
- **Dynamic KPI Ribbon**:
  - 4 live summary cards responding to active filters:
    1. **#1 Listener Leader** (with current listener count)
    2. **Top Daily Gainer (`+`)** (highest positive 24h listener/stream delta)
    3. **Biggest Daily Mover (`-`)** (largest 24h drop)
    4. **Filtered Pool Summary** (total combined monthly listeners / daily streams across active filter selection)

---

## 3. Multi-Dimensional Filtering & Sorting System

- **Search Input**: Instant substring filter across Artist Name, Track Title, Album, and Genre tags.
- **Genre Filter Pills**: `All`, `Pop`, `Hip-Hop`, `R&B`, `Latin`, `Rock / Alt`, `Electronic / EDM`, `Country`, `K-Pop`.
- **Country / Market Selector**: `Global`, `US`, `UK`, `BR`, `MX`, `DE`, `JP`, `IN`, `ES`, `KR` — dynamically recalculates regional rank, listener share, and stream numbers.
- **Trend / Momentum Filter**:
  - `All`
  - `🔥 Gainers Only (Daily +)`
  - `📉 Losers Only (Daily -)`
  - `🏆 At Peak (#1 / Peak Rank)`
  - `🚀 Surge (>100K Daily +)`
- **Listener Tier & Era Filters**:
  - Tiers: `All Tiers`, `Mega Icons (90M+)`, `Superstars (70M–90M)`, `Chart Staples (<70M)`
  - Era: `All Eras`, `2020s`, `2010s`, `2000s`, `Classics (<2000)`
- **View Mode Toggle**: Switch between **High-Density Kworb Table View** and **Visual Card Grid View**.
- **Column Sorting**: Click any table header (`Rank`, `Name`, `Listeners / Daily Streams`, `Daily +/-`, `Peak`, `Peak Listeners`, `Total Streams`, `Followers`) to toggle ascending/descending sort, plus quick Reset Filters action.

---

## 4. Interactive Artist & Song Detail Drawer

- Clicking any **Artist** row or card opens a slide-over glassmorphic detail drawer on the right (`480px–540px` wide) containing:
  - Artist Hero Banner, High-Res Avatar, Verified Artist badge, World Rank pill, Genre tags, and **"▶ Play Top Track"** CTA.
  - **6-Card Metrics Grid**: Monthly Listeners, Daily `+/-` change, All-Time Peak Rank, Peak Monthly Listeners, Total Career Streams, Spotify Followers.
  - **30-Day Listener Trajectory Chart**: Interactive SVG area/line chart visualizing daily listener changes over the last 30 days.
  - **Top Listener Cities / Markets**: Horizontal bar breakdown of top global streaming markets for the artist.
  - **Popular Tracks List**: Top songs by the artist with stream counts, daily `+/-`, and one-click `▶ Play` or `Inspect Song` buttons.
- Clicking any **Song** row or card either:
  - Plays the track immediately in the Persistent Bottom Player Bar (when clicking the Play button), or
  - Opens the **Song Detail Drawer** showing Track Artwork, Artist(s), Daily Streams, Total Streams, Peak Rank, Release Year, 30-Day Stream Trend Chart, and **Audio Feature Bars** (`Danceability`, `Energy`, `Valence / Mood`, `Acousticness`, `Tempo BPM`).

---

## 5. Persistent Bottom Player Bar

- Docked at the bottom of the viewport across all tabs.
- **Dual Playback Modes**:
  1. **Official Spotify Embed Mode**: Renders the live `https://open.spotify.com/embed/track/{spotifyTrackId}?utm_source=generator&theme=0` player so users can play real Spotify tracks directly inside the app.
  2. **Sleek Custom Player Bar Mode**: Shows Album Art, Track Name, Artist link (clickable to open drawer), Play/Pause with live Web Audio API synthesized preview beat & animated visualizer bars, scrubber progress bar, Previous/Next track cycling through the active chart queue, volume slider, and button to toggle the Spotify Embed iframe or open in Spotify app.

---

## 6. Spotify Login Screen & OAuth / Demo Integration

- Accessible via the **"Connect Spotify"** button in the navbar or inside the **My Spotify Vault** tab.
- **Clean Login Modal / Screen** featuring:
  - **Option A — Instant Demo Account (1-Click)**: Logs in immediately with a realistic power-listener profile ("Alex Rivera • Spotify Premium"), unlocking personalized Top Artists, Top Tracks (Last 4 Weeks, Last 6 Months, All-Time), Recently Played history, Listening Clock, and Audio DNA radar.
  - **Option B — Real Spotify OAuth 2.0 (PKCE Flow)**:
    - Input field for user's Spotify Developer `Client ID` (or reads `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` from `.env.local`) with automatic Redirect URI detection (`http://localhost:3000`).
    - Performs standard PKCE authorization against `https://accounts.spotify.com/authorize` with scopes `user-read-private user-read-email user-top-read user-read-recently-played`.
    - Exchanges code for token and fetches live `/v1/me`, `/v1/me/top/artists`, `/v1/me/top/tracks`, and `/v1/me/player/recently-played`.

---

## 7. Data Architecture & File Structure

```text
src/
├── app/
│   ├── layout.tsx          # Root dark theme layout & metadata
│   ├── page.tsx            # Main unified dashboard controller
│   └── globals.css         # Custom scrollbar, glassmorphism, animations
├── data/
│   └── spotifyData.ts      # Rich curated dataset of 35+ top global artists (Bruno Mars, The Weeknd, Rihanna, Taylor Swift, Kendrick Lamar, etc.) & 30+ top global songs with real Spotify Track/Artist IDs, regional modifiers, 30-day history, and demo user vault data
├── lib/
│   └── spotifyAuth.ts      # Spotify OAuth 2.0 PKCE helpers & live Web API fetcher
└── components/
    ├── Navbar.tsx          # Top navigation, tabs, global search, auth trigger
    ├── KpiRibbon.tsx       # 4 dynamic summary KPI cards
    ├── FilterBar.tsx       # Search, genre pills, country selector, momentum, era, tier, view toggle
    ├── ArtistTable.tsx     # Kworb-inspired modern sortable table & card grid for artists
    ├── SongTable.tsx       # Sortable table & card grid for top tracks
    ├── CountryView.tsx     # Interactive country & regional market leaderboard
    ├── CompareView.tsx     # Head-to-head multi-artist comparison & overlaid SVG chart
    ├── PersonalVault.tsx   # My Spotify Vault (Top artists/tracks by time range, recently played, audio DNA)
    ├── DetailDrawer.tsx    # Slide-over inspector for Artist or Song details + 30d SVG chart
    ├── PlayerBar.tsx       # Sticky bottom Spotify Embed + custom audio player bar
    └── LoginModal.tsx      # Spotify OAuth PKCE + 1-click Demo Login screen
```

---

## 8. Error Handling & Testing

- Graceful fallback if Spotify API token expires or network call fails (switches cleanly to cached/demo data with a non-intrusive toast banner).
- Empty states when a combination of filters matches 0 artists/songs, with a one-click **"Reset All Filters"** button.
- Verification via TypeScript typecheck (`tsc --noEmit`), production build (`next build`), and live local server health probe.
