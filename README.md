<div align="center">

<img src="./static/assets/webwaifu3-banner.svg" alt="WEBWAIFU 3 banner" width="100%" />

# WEBWAIFU 3

### Browser-based VRM companion with local/cloud AI, voice, memory, and real-time 3D

<p>
  <a href="#quick-start">Quick Start</a> |
  <a href="#feature-surface">Features</a> |
  <a href="#v2-vs-v3">V2 vs V3</a> |
  <a href="#provider-setup">Provider Setup</a> |
  <a href="#architecture">Architecture</a>
</p>

<p>
  <img src="https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white" alt="SvelteKit 2" />
  <img src="https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white" alt="Svelte 5" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Three.js-0.182-000000?logo=three.js&logoColor=white" alt="Three.js 0.182" />
  <img src="https://img.shields.io/badge/VRM-@pixiv/three--vrm-1f2937" alt="VRM" />
</p>

<p>
  <img src="https://img.shields.io/badge/LLM-Ollama%20%7C%20LM%20Studio%20%7C%20OpenAI%20%7C%20OpenRouter-0f172a" alt="LLM Providers" />
  <img src="https://img.shields.io/badge/TTS-Kokoro%20%7C%20Fish%20Audio-0f172a" alt="TTS Providers" />
  <img src="https://img.shields.io/badge/STT-Whisper%20tiny.en-0f172a" alt="STT" />
  <img src="https://img.shields.io/badge/Storage-IndexedDB-0f172a" alt="IndexedDB" />
</p>

</div>

<h2 align="center" id="what-it-is">What It Is</h2>

WEBWAIFU 3 is a complete rewrite of [WEBWAIFU V2](https://github.com/xsploit/WEBWAIFUV2). Same concept — a browser-based AI companion with a 3D avatar — but rebuilt from scratch with a proper framework, typed codebase, and a more focused feature set.

V2 was vanilla JS with no build system, supported both VRM and Live2D, used Edge TTS, and ran on Netlify. V3 drops the cruft, picks better defaults, and ships as a real SvelteKit app.

Primary routes:

- `/` main companion UI
- `/manager` provider config, memory controls, voice management, and data tools

<h2 align="center" id="v2-vs-v3">What Changed from V2</h2>

| | V2 | V3 |
|---|---|---|
| **Framework** | Vanilla JS, no build | SvelteKit 2 + Vite 7 + TypeScript |
| **Avatar** | VRM + Live2D (Pixi.js) | VRM only — deeper Three.js integration, post-processing, animation sequencer |
| **TTS** | Edge TTS (free) + Fish Audio | Kokoro (local, runs on WebGPU/WASM) + Fish Audio (realtime PCM streaming) |
| **LLM** | Gemini, OpenAI, OpenRouter, Ollama | OpenAI, OpenRouter, Ollama, LM Studio — all via Vercel AI SDK Responses API |
| **STT** | Whisper tiny | Whisper tiny with silence trimming + transcript sanitization |
| **Memory** | Embeddings + summarization | Same core but proper Web Worker isolation, hybrid mode, configurable summarization LLM |
| **Lip sync** | Phoneme (Edge TTS) + amplitude (Fish) | Approximate phoneme mapping + PCM amplitude analysis (both providers) |
| **Deploy** | Netlify serverless | Vercel (adapter-vercel) |
| **State** | localStorage + IndexedDB | Svelte 5 runes + IndexedDB (StorageManager singleton) |
| **Persistence** | Partial | Full — every setting, conversation, VRM binary, voice list persisted |

**Dropped**: Live2D, Gemini, Edge TTS, DistilBERT, Pixi.js, Netlify functions.
**Added**: Kokoro local TTS, LM Studio, realtime Fish PCM streaming, post-processing pipeline, animation sequencer, character system, TTS formatting rules auto-injection, semantic memory with vector search.

<h2 align="center" id="feature-surface">Feature Surface</h2>

### AI chat

- Providers: `ollama`, `lmstudio`, `openai`, `openrouter`
- Streaming token output wired into TTS sentence accumulator
- Per-request Ollama tuning: `num_ctx`, `flash_attn`, `kv_cache_type`
- Character-based system prompts with user nickname support
- Auto-injected TTS formatting rules when voice is enabled (no emojis, spoken prose, proper punctuation)

### Text-to-speech

- **Kokoro**: local TTS via Web Worker, runs on WebGPU with WASM fallback, configurable device + precision (fp32/fp16/q8/q4/q4f16)
- **Fish Audio**: cloud TTS with realtime PCM streaming over WebSocket, configurable latency mode
- Sentence accumulator splits LLM output into natural TTS chunks
- Fish voice model operations from manager UI: list, search, create, delete

### Speech-to-text

- Whisper model: `Xenova/whisper-tiny.en` in a Web Worker
- Silence trimming before transcription to reduce hallucinations
- Transcript sanitization (filters repeated-char artifacts)
- Push-to-talk with optional auto-send and mic permission pre-check

### Semantic memory

- Embeddings model: `Xenova/all-MiniLM-L6-v2` (384-dim) in a Web Worker
- Modes: `auto-prune`, `auto-summarize`, `hybrid` (default)
- Cosine similarity search injects relevant history into prompt context
- Optional summarization LLM with separate provider/model/key configuration
- Model can be loaded/unloaded on demand to free GPU memory

### 3D avatar and rendering

- VRM load from built-in asset or user upload (binary persisted in IndexedDB)
- Animation playlist/sequencer with crossfade controls
- Realistic material toggle (PBR path)
- Post-processing: bloom, chromatic aberration, film grain, glitch, FXAA/SMAA/TAA, bleach bypass, color correction, outline
- Adjustable key/fill/rim/hemi/ambient lighting
- Lip sync driven from both HTMLAudioElement (Kokoro) and PCM AudioBufferSourceNode (Fish) playback paths

### Persistence and management

- All settings saved in IndexedDB via StorageManager singleton
- Provider defaults, visual settings, active tab, conversation state, Fish voice lists all persisted
- Conversation auto-save on every user + assistant message
- Conversation export (`JSON`, `TXT`)
- Data tools in manager: export all, import, clear history, factory reset
- Custom VRM binary persisted in IndexedDB

<h2 align="center" id="quick-start">Quick Start</h2>

### Requirements

- Node.js (current LTS recommended)
- npm
- Modern browser with WebGL + WebAudio support
- WebGPU recommended for Kokoro TTS (falls back to WASM automatically)
- At least one chat backend:
  - Local (`Ollama` or `LM Studio`)
  - Cloud (`OpenAI` or `OpenRouter`)

### Install and run

```bash
npm install
npm run dev
```

Dev URL: `https://localhost:5173`
Note: HTTPS in development is provided by `@vitejs/plugin-basic-ssl`.

<h2 align="center" id="provider-setup">Provider Setup</h2>

### Ollama

1. Install Ollama and pull a model (example: `ollama pull llama3.2`).
2. Enable "Allow through network" in Ollama settings.
3. Set CORS origins so the browser can access Ollama.

Mac/Linux:

```bash
OLLAMA_ORIGINS=* ollama serve
```

Windows:

1. Add system environment variable `OLLAMA_ORIGINS=*`.
2. Restart Ollama.

### LM Studio

1. Download a model.
2. Start local server (default `http://localhost:1234`).
3. Enable CORS in LM Studio server settings.

### OpenAI / OpenRouter

1. Open `/manager`.
2. Add API key.
3. Select provider and model defaults.

### Fish Audio

1. Add Fish API key in `/manager`.
2. Fish requests are proxied through server routes:
   - `POST /api/tts/fish` (single request)
   - `POST /api/tts/fish-stream` (realtime WebSocket streaming, PCM)

<h2 align="center" id="model-and-runtime-notes">Model and Runtime Notes</h2>

On first use, browser-side model downloads may occur and be cached:

| Model | Size | Purpose | Runtime |
|-------|------|---------|---------|
| Kokoro 82M ONNX | ~86 MB | Local TTS | WebGPU / WASM |
| Whisper tiny.en | ~40 MB | Local STT | Web Worker |
| MiniLM-L6-v2 | ~23 MB | Embeddings / memory | Web Worker |

Models are loaded on demand — Whisper and embeddings only init when you use them. Kokoro inits automatically when TTS is enabled with the Kokoro provider.

<h2 align="center" id="security">Security</h2>

- Keys are stored in browser IndexedDB only
- Keys are sent only to selected providers and required proxy endpoints
- API key inputs use CSS text-security masking to prevent browser password manager interference
- Fish TTS requires API key transit through your deployed SvelteKit server route
- Use scoped keys and provider spending limits for production

<h2 align="center" id="scripts">Scripts</h2>

```bash
npm run dev       # Dev server with HTTPS
npm run build     # Production build
npm run preview   # Preview production build
npm run check     # Svelte type checking
```

<h2 align="center" id="architecture">Architecture</h2>

- Frontend: SvelteKit 2, Svelte 5 runes, TypeScript
- 3D: `three`, `@pixiv/three-vrm`
- LLM: Vercel AI SDK (`ai`, `@ai-sdk/openai`) — Responses API
- STT/Memory models: `@huggingface/transformers` in Web Workers
- TTS: `kokoro-js` (local WebGPU/WASM), `fish-audio` (cloud WebSocket)
- Persistence: IndexedDB via `src/lib/storage/index.ts`
- Analytics: Vercel Web Analytics

<h2 align="center" id="deployment">Deployment</h2>

Current project config uses `@sveltejs/adapter-vercel` (`svelte.config.js`).

If you deploy to a different target, switch adapters and ensure the Fish API routes (`src/routes/api/tts/`) are deployed server-side.

Live: [webwaifu3.vercel.app](https://webwaifu3.vercel.app/)

<h2 align="center" id="license">License</h2>

This repository currently does not include a `LICENSE` file. Add one before public distribution.
