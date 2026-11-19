# Pulseify: Next.js Spotify Stats, Charts & Analytics Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern Next.js Spotify statistics, monthly listener leaderboard, viral songs chart, regional tracker, artist comparator, personal Spotify vault, detail drawer, and live Spotify embed/preview audio player inspired by Kworb.net with an "Obsidian Pulse" UI.

**Architecture:** Next.js App Router (TypeScript + Tailwind CSS) application powered by a hybrid data and filtering layer (`src/data/spotifyData.ts` + `src/lib/filterEngine.ts` + `src/lib/spotifyAuth.ts`) tested with Node's native test runner (`node --test`). Client components manage multi-dimensional filters, sortable high-density tables and visual cards, an interactive slide-over detail drawer with 30-day SVG trajectory charts, a head-to-head comparison arena, a dual-mode Spotify OAuth 2.0 PKCE + Demo login modal, and a persistent bottom audio player supporting official Spotify Embeds and Web Audio API preview synthesis.

**Tech Stack:** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, Lucide React (`lucide-react`), Node.js native test runner (`tsx --test`).

## Global Constraints

- Color Palette ("Obsidian Pulse"): Canvas `#07080C`, Elevated surface `#10131C`, Accent `#1ED760`, Positive delta `#10B981`, Negative delta `#F43F5E`, Peak highlight `#F59E0B`.
- All artist and song entities must include valid Spotify Track/Artist IDs so official Spotify Embed players (`https://open.spotify.com/embed/track/{id}`) load real playable songs.
- Every table column (`Rank`, `Artist/Song`, `Monthly Listeners / Daily Streams`, `Daily +/-`, `Peak`, `Peak Listeners`, `Followers / Total Streams`) must be sortable ascending and descending.
- All filters (search query, genre pill, country market selector, momentum filter, listener tier, release era, view mode toggle) must combine deterministically and update KPI summary cards in real time.

---

### Task 1: Next.js Project Foundation, Dataset & Filter Engine (with Unit Tests)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/globals.css`
- Create: `src/types/spotify.ts`
- Create: `src/data/spotifyData.ts`
- Create: `src/lib/filterEngine.ts`
- Test: `src/lib/__tests__/filterEngine.test.ts`

**Interfaces:**
- Produces:
  - `ArtistStat`, `SongStat`, `CountryMarket`, `FilterState`, `PersonalVaultData`, `SpotifyUserProfile` in `src/types/spotify.ts`
  - `TOP_ARTISTS: ArtistStat[]`, `TOP_SONGS: SongStat[]`, `COUNTRIES: CountryMarket[]`, `DEMO_VAULT: PersonalVaultData`, `GENRES: string[]` in `src/data/spotifyData.ts`
  - `filterAndSortArtists(artists: ArtistStat[], filters: FilterState): ArtistStat[]`
  - `filterAndSortSongs(songs: SongStat[], filters: FilterState): SongStat[]`
  - `computeArtistKpis(artists: ArtistStat[])`
  - `formatNumber(n: number): string`, `formatDelta(n: number): string` in `src/lib/filterEngine.ts`

- [ ] **Step 1: Scaffold Next.js configuration & install dependencies**
  Create `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, and `src/app/globals.css`, then install dependencies (`next`, `react`, `react-dom`, `lucide-react`, `tailwindcss`, `@tailwindcss/postcss`, `typescript`, `tsx`, `@types/node`, `@types/react`, `@types/react-dom`).

- [ ] **Step 2: Write failing unit tests for `filterEngine.ts`**
  Create `src/lib/__tests__/filterEngine.test.ts` testing search, genre filter, momentum filter (`gainers`, `losers`, `peak`, `surge`), country multiplier transformation, tier filter, era filter, sorting direction, and KPI computation.

- [ ] **Step 3: Implement `src/types/spotify.ts`, `src/data/spotifyData.ts`, and `src/lib/filterEngine.ts`**
  Populate 35+ top global artists (Bruno Mars, The Weeknd, Rihanna, Justin Bieber, Lady Gaga, Taylor Swift, Ariana Grande, Drake, Coldplay, Michael Jackson, Bad Bunny, Katy Perry, Shakira, Ed Sheeran, David Guetta, Billie Eilish, Maroon 5, Olivia Rodrigo, Lana Del Rey, Eminem, Pitbull, Sia, Calvin Harris, SZA, Kanye West, KAROL G, J Balvin, Dua Lipa, Kendrick Lamar, Post Malone, Sabrina Carpenter, Chappell Roan, Travis Scott, Metro Boomin, Doja Cat, etc.) with real Kworb listener stats, daily deltas, peak rank, peak listeners, 30-day history arrays, city markets, top tracks with real Spotify Track IDs, plus 30+ global chart songs and regional markets.

- [ ] **Step 4: Run unit tests to verify they pass**
  Run: `npx tsx --test src/lib/__tests__/filterEngine.test.ts`
  Expected: PASS (all filter, sort, regional modifier, and KPI tests pass).

- [ ] **Step 5: Commit**
  ```bash
  git add package.json tsconfig.json next.config.ts postcss.config.mjs src/
  git commit -m "feat: add Next.js scaffold, curated Spotify dataset, and tested filter engine"
  ```

---

### Task 2: Spotify OAuth 2.0 PKCE & Live API Client + Login Modal

**Files:**
- Create: `src/lib/spotifyAuth.ts`
- Create: `src/components/LoginModal.tsx`
- Create: `src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `SpotifyUserProfile`, `PersonalVaultData` from `src/types/spotify.ts`
- Produces:
  - `initiateSpotifyPkceLogin(clientId: string): Promise<void>`
  - `handleSpotifyCallback(): Promise<{ profile: SpotifyUserProfile; vault: PersonalVaultData } | null>`
  - `LoginModal` component with 1-Click Instant Demo Login & Real Spotify OAuth 2.0 PKCE setup
  - `Navbar` component with mode switcher tabs (`artists`, `songs`, `countries`, `compare`, `vault`), global search shortcut, and account badge

- [ ] **Step 1: Implement `src/lib/spotifyAuth.ts`**
  Implement browser PKCE code verifier/challenge generation, token exchange against `https://accounts.spotify.com/api/token`, live fetching of `/v1/me`, `/v1/me/top/artists`, `/v1/me/top/tracks`, `/v1/me/player/recently-played`, and local storage persistence.

- [ ] **Step 2: Build `src/components/LoginModal.tsx` and `src/components/Navbar.tsx`**
  Build the glassmorphic Spotify Login screen allowing instant 1-click Demo Login or Real Spotify OAuth PKCE with Client ID configuration, and the top navigation bar.

- [ ] **Step 3: Verify TypeScript compilation**
  Run: `npx tsc --noEmit`
  Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/lib/spotifyAuth.ts src/components/LoginModal.tsx src/components/Navbar.tsx
  git commit -m "feat: add Spotify OAuth PKCE client, Login modal, and Navbar"
  ```

---

### Task 3: KPI Ribbon, Multi-Dimensional Filter Bar, Artist Leaderboard & Song Chart

**Files:**
- Create: `src/components/KpiRibbon.tsx`
- Create: `src/components/FilterBar.tsx`
- Create: `src/components/Sparkline.tsx`
- Create: `src/components/ArtistTable.tsx`
- Create: `src/components/SongTable.tsx`

**Interfaces:**
- Consumes: `ArtistStat`, `SongStat`, `FilterState`, `COUNTRIES`, `GENRES` from `src/types/spotify.ts` & `src/data/spotifyData.ts`
- Produces:
  - `KpiRibbon`: 4 dynamic summary cards (#1 Leader, Top Daily Gainer `+`, Biggest Daily Drop `-`, Total Pool Stats)
  - `FilterBar`: Search input, Genre pills, Country dropdown, Momentum pills (`All`, `Gainers +`, `Losers -`, `At #1 Peak`, `100K+ Surge`), Listener Tier filter, Era filter, Sort controls, Table/Grid toggle, Active filter count & Reset button
  - `ArtistTable`: High-density Kworb-upgraded sortable table + visual card grid with inline listener share bars, 7-day SVG sparklines, Play top track button, Inspect details button, and Add to Compare button
  - `SongTable`: Sortable global & regional songs chart with audio DNA pills, daily streams, daily `+/-`, total streams, one-click Play button, and Song Details trigger

- [ ] **Step 1: Create `src/components/Sparkline.tsx`, `src/components/KpiRibbon.tsx`, and `src/components/FilterBar.tsx`**
  Implement smooth SVG sparklines, dynamic KPI cards, and the multi-row filter & control ribbon.

- [ ] **Step 2: Create `src/components/ArtistTable.tsx` and `src/components/SongTable.tsx`**
  Implement both the high-density Kworb-style sortable table view and the visual card grid view for artists and songs.

- [ ] **Step 3: Verify TypeScript compilation**
  Run: `npx tsc --noEmit`
  Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/components/Sparkline.tsx src/components/KpiRibbon.tsx src/components/FilterBar.tsx src/components/ArtistTable.tsx src/components/SongTable.tsx
  git commit -m "feat: add KPI ribbon, multi-dimensional filter bar, artist leaderboard, and song chart"
  ```

---

### Task 4: Slide-Over Detail Drawer, Sticky Spotify Embed / Audio Player Bar, Countries, Compare & Personal Vault

**Files:**
- Create: `src/components/DetailDrawer.tsx`
- Create: `src/components/PlayerBar.tsx`
- Create: `src/components/CountryView.tsx`
- Create: `src/components/CompareView.tsx`
- Create: `src/components/PersonalVault.tsx`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Interfaces:**
- Consumes: All data, auth, and table components from Tasks 1–3.
- Produces:
  - `DetailDrawer`: Slide-over right inspector for any clicked Artist or Song with 30-day SVG trajectory chart, top global cities, audio feature progress bars, and clickable popular tracks list
  - `PlayerBar`: Sticky bottom bar with toggleable official Spotify Embed iframe (`open.spotify.com/embed/track/{id}`) and custom Web Audio API preview player with animated equalizer, track queue navigation, and scrubber
  - `CountryView`: Regional market explorer comparing streaming volume, top artist, top track, and regional charts across 10+ countries
  - `CompareView`: Head-to-head comparison of up to 3 artists with overlaid 30-day SVG curves and stat winner highlights
  - `PersonalVault`: "My Spotify Vault" showing personal Top Artists & Top Tracks across `4 Weeks`, `6 Months`, and `All-Time`, Recently Played feed, and Audio DNA breakdown

- [ ] **Step 1: Build `src/components/DetailDrawer.tsx` and `src/components/PlayerBar.tsx`**
  Implement the slide-over inspector drawer and persistent bottom Spotify Embed + custom audio player bar.

- [ ] **Step 2: Build `src/components/CountryView.tsx`, `src/components/CompareView.tsx`, and `src/components/PersonalVault.tsx`**
  Implement the regional charts explorer, multi-artist head-to-head comparison view, and personal Spotify vault.

- [ ] **Step 3: Assemble `src/app/layout.tsx` and `src/app/page.tsx`**
  Wire all tabs, filters, detail drawer, comparison state, playback queue, and login modal into the unified dashboard.

- [ ] **Step 4: Run unit tests, typecheck, production build, and live server verification**
  Run:
  - `npx tsx --test src/lib/__tests__/filterEngine.test.ts`
  - `npx tsc --noEmit`
  - `npm run build`
  Expected: All unit tests pass and Next.js production build succeeds cleanly.

- [ ] **Step 5: Commit**
  ```bash
  git add src/
  git commit -m "feat: complete Pulseify Spotify tracker dashboard, detail drawer, player bar, and views"
  ```
