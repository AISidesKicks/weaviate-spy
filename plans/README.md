> **For AI Coding Assistants**
>
> This `plans/` directory serves as the single source of truth for all implementation steps and architectural decisions.
>
> **Purpose:**
> - Keep overview of all implementation phases and progress
> - Enable quick familiarization for any new AI coding assistant joining the project
> - Document which parts are completed, in-progress, or just ideas to discuss with Human Coder
> - Allow experimentation with different tools and approaches while maintaining context
>
> **Guidelines for AI Assistants:**
> - Before starting ANY implementation, read relevant plan documents
> - Check `implementation-phases.md` for current progress status
> - Discuss with Human Coder before starting new phases or making architectural changes
> - After completing tasks, **remind Human Coder** to update relevant plan documents
> - Keep plans synchronized with actual code changes
> - Use status markers: ✅ completed, 🔄 in-progress, 📋 planned, 💡 idea
> - Follow **BDD → TDD approach**: Read BDD scenarios in `bdd.md`, write failing tests first, then implement
>
> **Development Workflow:**
> 1. Read BDD feature/scenario from `bdd.md`
> 2. Write failing test (TDD red phase)
> 3. Implement minimal code to pass (TDD green phase)
> 4. Refactor if needed (TDD refactor phase)
> 5. Update plans and mark completed

---

# 🕵️ Weaviate-Spy

**Web client for exploring local Docker Weaviate vector database**

## What is this?

Weaviate-Spy is a lightweight web UI for exploring, searching, and testing Weaviate vector database collections. It supports multiple search modes including semantic, keyword (BM25), hybrid, and generative (RAG) search with Ollama LLMs.

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| Health Check | ✅ | Monitor Weaviate connection status |
| Schema Browser | ✅ | View all collections and their properties |
| Semantic Search | ✅ | AI-powered near-text with certainty threshold |
| Keyword Search | ✅ | BM25 full-text search |
| Hybrid Search | ✅ | Combine BM25 + vector with alpha parameter |
| Generative Search | ✅ | RAG with Ollama LLMs |
| Aggregations | 📋 | Group and count by property |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.11+, FastAPI, Weaviate Client v4 |
| Frontend | TypeScript, React 18, Vite |
| UI Components | Ant Design 5, AG Grid Community |
| Vector DB | Weaviate (local Docker) |
| LLM | Ollama (granite models) |
| Container | Docker Compose |

## Access Points

| Service | URL |
|---------|-----|
| App | http://localhost:7777 |
| Weaviate REST | http://localhost:8080 |
| Weaviate gRPC | localhost:50051 |
| Ollama | http://localhost:11434 |

## Documentation Index

1. [Architecture](./architecture.md) - System design and components
2. [API Design](./api-design.md) - FastAPI endpoints
3. [Frontend](./frontend.md) - React + AG Grid architecture
4. [Search Modes](./search-modes.md) - Semantic, BM25, Hybrid, RAG
5. [Docker Setup](./docker-setup.md) - Container configuration
6. [BDD Scenarios](./bdd.md) - Behavioral specifications
7. [Implementation Phases](./implementation-phases.md) - Development roadmap

## Quick Start

```bash
# Clone and start
git clone https://github.com/AISidesKicks/weaviate-spy.git
cd weaviate-spy
docker compose up -d --build

# Open http://localhost:7777
```

## Usage

See `compose.yml` and adjust environment variables as needed. By default it connects to a locally hosted (docker) Weaviate on port 8080 (without auth credentials).

## Dummy Data / Testing

See [`dummy/dummy.md`](../dummy/dummy.md) for setting up test data with Weaviate and Ollama.

The dummy directory contains:
- `docker-compose.yml` - Weaviate + Ollama setup on Nvidia (RTX 4060 12GB VRAM)
- `ollama_test.sh` - Script to test Ollama models (embedding and generation)
- `weaviate_dummy.py` - Script to create sample Filmy collection and to test it

## Configuration

Environment variables (see `compose.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| WEAVIATE_HOST | localhost | Weaviate HTTP host |
| WEAVIATE_PORT | 8080 | Weaviate HTTP port |
| WEAVIATE_SECURE | false | Use HTTPS |
| WEAVIATE_GRPC_HOST | localhost | Weaviate gRPC host |
| WEAVIATE_GRPC_PORT | 50051 | Weaviate gRPC port |
| WEAVIATE_GRPC_SECURE | false | Use gRPC over TLS |
| WEAVIATE_API_KEY | None | API key for authentication |
| WEAVIATE_BEARER_TOKEN | None | Bearer token for authentication |

## Project Structure

```
weaviate-spy/
├── weaviate_spy/           # Python backend
│   └── main.py             # FastAPI application
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.tsx         # Main app component
│   │   ├── api.ts          # API client
│   │   ├── types.ts        # TypeScript types
│   │   ├── ClassData.tsx   # Collection browser with AG Grid
│   │   └── Welcome.tsx     # Welcome/schema page
│   └── package.json
├── static/                 # Built frontend (served by FastAPI)
├── dummy/                  # Test data and scripts
├── tests/                  # Test suite
├── compose.yml             # Docker Compose config
├── Dockerfile              # Container definition
└── plans/                  # Documentation
    ├── README.md           # This file
    ├── bdd.md              # BDD scenarios
    └── ...                 # Other plan docs
```

## Disclaimer

⚠️ **No authentication** - Use only in trusted local environments.

---

Inspired by [naaive/weaviate-ui](https://github.com/naaive/weaviate-ui)
