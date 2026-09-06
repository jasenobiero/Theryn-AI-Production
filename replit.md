# AI Hub - The Ultimate AI Command Center

## Overview

A full-stack AI Hub web application that integrates multiple AI providers, ElevenLabs voice synthesis, and a custom agent builder. Built with React + Vite frontend and Express backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/ai-hub)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## AI Integrations

- **OpenAI** (ChatGPT, NanoGPT, Image Generation): via Replit AI Integrations proxy
- **Anthropic** (Claude): via Replit AI Integrations proxy
- **OpenRouter** (Grok x-ai/grok-3, other models): via Replit AI Integrations proxy
- **ElevenLabs** (Text-to-Speech): direct API (requires ELEVENLABS_API_KEY secret)

## Features

1. **AI Chat** - Multi-provider chat interface (ChatGPT, Claude, Grok, NanoGPT) with streaming SSE responses and conversation history
2. **Image Generation** - DALL-E / gpt-image-1 image generation with prompt input
3. **Voice TTS** - Text-to-speech powered by ElevenLabs
4. **Custom Agent Builder** - Create, edit, delete custom AI agents with custom system prompts, names, emojis, models, and providers. Chat with any created agent.

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── ai-hub/           # React + Vite frontend (served at /)
│   └── api-server/       # Express API server (served at /api)
├── lib/
│   ├── api-spec/         # OpenAPI spec + Orval codegen config
│   ├── api-client-react/ # Generated React Query hooks
│   ├── api-zod/          # Generated Zod schemas from OpenAPI
│   ├── db/               # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/    # OpenAI server SDK
│   ├── integrations-openai-ai-react/     # OpenAI React hooks
│   ├── integrations-anthropic-ai/        # Anthropic SDK
│   └── integrations-openrouter-ai/       # OpenRouter SDK
├── scripts/
└── pnpm-workspace.yaml
```

## API Routes

- `GET/POST /api/openai/conversations` — OpenAI conversation management
- `GET/POST /api/openai/conversations/:id/messages` — OpenAI chat (SSE streaming)
- `POST /api/openai/generate-image` — Image generation
- `GET/POST /api/anthropic/conversations` — Anthropic conversation management
- `GET/POST /api/anthropic/conversations/:id/messages` — Claude chat (SSE streaming)
- `GET/POST /api/openrouter/conversations` — OpenRouter conversation management
- `GET/POST /api/openrouter/conversations/:id/messages` — Grok chat (SSE streaming)
- `GET/POST /api/agents` — Custom agent management
- `GET/PUT/DELETE /api/agents/:id` — Agent CRUD
- `POST /api/agents/:id/chat` — Chat with agent (SSE streaming)
- `POST /api/elevenlabs/tts` — Text-to-speech

## Database Schema

- `conversations` — Shared conversation table for all providers
- `messages` — Messages for each conversation
- `agents` — Custom agent definitions
- `agent_conversations` — Conversations with custom agents
- `agent_messages` — Messages in agent conversations

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI proxy URL (auto-set)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI proxy key (auto-set)
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Anthropic proxy URL (auto-set)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Anthropic proxy key (auto-set)
- `AI_INTEGRATIONS_OPENROUTER_BASE_URL` — OpenRouter proxy URL (auto-set)
- `AI_INTEGRATIONS_OPENROUTER_API_KEY` — OpenRouter proxy key (auto-set)
- `ELEVENLABS_API_KEY` — ElevenLabs API key (user must provide for voice)
- `SESSION_SECRET` — Session secret

## Notes on ElevenLabs

ElevenLabs TTS requires the user to add their own `ELEVENLABS_API_KEY` to the environment secrets. The app gracefully handles the missing key with an error message.
