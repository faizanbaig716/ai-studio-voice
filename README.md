# Cadence Studio

Text-to-speech voice synthesis studio with single-speaker and dual-speaker dialogue generation, interactive waveform playback, and instant MP3 & WAV downloads.

## Features

- **Single Voice Synthesis**: Convert scripts up to 5,000 characters using five studio voices (`Kore`, `Puck`, `Charon`, `Fenrir`, `Zephyr`) with custom delivery style directions, sample script presets, and expressive vocal cues (`<breath>`, `<laugh>`, `<gasp>`).
- **Dual Dialogue Mode**: Build two-speaker scripts with independent voice and style settings per speaker, turn-by-turn line editing, and natural backchannel cues (`|yeah|`, `|mhm|`).
- **Interactive Waveform Player**: Scrubbable decoded audio waveform, play/pause, restart, and playback speed controls (`0.75x`, `1x`, `1.25x`, `1.5x`).
- **MP3 & WAV Export**: Server-side MP3 encoding (`128`, `192`, or `320` kbps) alongside uncompressed 24 kHz 16-bit PCM WAV downloads, plus per-clip MP3 export from **Export History**.
- **Voice Directory**: Audition every studio voice with one-click playback and sample MP3 download.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Express (`server.ts`), `@google/genai` (`gemini-3.8-flash-lite-tts` & `gemini-3.8-flash-tts`), `@breezystack/lamejs`

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and set your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```

3. **Run in development**:
   ```bash
   npm run dev
   ```
   The app and API server run together at `http://localhost:3000`.

4. **Build and run in production**:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```
