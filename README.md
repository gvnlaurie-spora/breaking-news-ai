# Breaking News AI v2.0 — 30-Minute Compilation Pipeline

## What it does
Scrapes 8–10 international news stories every 4 hours, generates AI voiceovers,
fetches real stock footage + AI images, compiles ONE 30-minute video, uploads to YouTube.

**Africa is excluded from all coverage.**

---

## Video Structure
```
[Intro 15s] → [Story 1: 3-4min] → [Transition 5s] → [Story 2] → ... → [Outro 15s]
```

---

## Setup

### 1. Copy env file
```bash
cp .env.example .env
```
Fill in:
- `MISTRAL_API_KEY` — from console.mistral.ai
- `AZURE_SPEECH_KEY` + `AZURE_SPEECH_ENDPOINT` — from Azure portal
- `PEXELS_API_KEY` — free at pexels.com/api (optional but improves quality)
- `PIXABAY_API_KEY` — free at pixabay.com/api (optional)
- YouTube credentials (see below)

### 2. Install dependencies
```bash
npm install
```

### 3. Set up database
```bash
npm run prisma:push
npm run prisma:generate
```

### 4. Get YouTube refresh token (first time only)
```bash
npx tsx src/scripts/getRefreshToken.ts
```
Paste the token into `.env` as `YOUTUBE_REFRESH_TOKEN`.

---

## Running

### Full pipeline (one time)
```bash
npm run auto:once
```

### 4-hour scheduled loop
```bash
npm run auto
```

### Individual steps
```bash
npm run scrape               # Fetch news (Africa excluded)
npm run process-articles     # Generate AI scripts via Mistral
npm run generate-videos      # Compile 30-minute video
npm run upload-videos        # Upload to YouTube
```

### Dry run (test without executing)
```bash
npm run pipeline:dry
```

---

## Media Sources (in priority order)
| Media Type | Source | Key needed? |
|---|---|---|
| Stock footage | Pexels Videos | Yes (free) |
| Stock footage | Pixabay Videos | Yes (free) |
| News footage | Internet Archive | No |
| AI images | Pollinations.ai | No |
| Stock images | Pexels Photos | Yes (free) |
| Fallback | Generated background | No |

---

## File Output
```
backend/
  output/
    videos/     ← final 30-min mp4 files
    audio/      ← cached TTS voiceover files
    media/      ← downloaded images/footage (auto-cleaned)
    tmp/        ← intermediate segments (auto-cleaned)
```
