# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Docker Host                                          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      weaviate-spy Container                             │ │
│  │                                                                         │ │
│  │  ┌──────────────────┐   ┌──────────────────────────────────────────┐   │ │
│  │  │    Frontend      │   │             Backend                       │   │ │
│  │  │    :7777         │   │             :7777                         │   │ │
│  │  │                  │   │                                          │   │ │
│  │  │  React 18        │◀──│  FastAPI                                 │   │ │
│  │  │  AG Grid         │   │  Weaviate Client v4                      │   │ │
│  │  │  Ant Design 5    │   │  Pydantic                                │   │ │
│  │  │  Vite            │   │  Loguru                                  │   │ │
│  │  │                  │   │                                          │   │ │
│  │  └──────────────────┘   └────────────────┬─────────────────────────┘   │ │
│  │                                          │                              │ │
│  └──────────────────────────────────────────┼──────────────────────────────┘ │
│                                             │                                │
│                    ┌────────────────────────┼────────────────────────┐       │
│                    │                        │                        │       │
│                    ▼                        ▼                        ▼       │
│  ┌─────────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │      Weaviate           │  │       Ollama        │  │    External     │  │
│  │      :8080/:50051       │  │      :11434         │  │    (optional)   │  │
│  │                         │  │                     │  │                 │  │
│  │  Vector Database        │  │  granite-embedding  │  │  Cloud Weaviate │  │
│  │  Collections            │  │  granite4:tiny-h    │  │  API Keys       │  │
│  │  Vectorizers            │  │                     │  │                 │  │
│  │  Generative Config      │  │                     │  │                 │  │
│  │                         │  │                     │  │                 │  │
│  └─────────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
weaviate-spy/
├── weaviate_spy/               # Python backend package
│   ├── __init__.py
│   └── main.py                 # FastAPI application (all endpoints)
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Main app with layout
│   │   ├── api.ts             # API client functions
│   │   ├── types.ts           # TypeScript type definitions
│   │   ├── ClassData.tsx      # Collection browser with AG Grid
│   │   ├── Welcome.tsx        # Welcome/schema page
│   │   ├── customMenu.ts      # Menu configuration
│   │   ├── index.css          # Global styles
│   │   └── assets/
│   ├── dist/                   # Built frontend (served by FastAPI)
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── static/                     # Static files served by FastAPI
├── dummy/                      # Test data and scripts
│   ├── docker-compose.yml     # Weaviate + Ollama test setup
│   ├── weaviate_dummy.py      # Create sample Filmy collection
│   └── ollama_test.sh         # Test Ollama models
├── tests/                      # Test suite
│   └── __init__.py
├── plans/                      # Documentation
│   ├── README.md
│   ├── bdd.md
│   ├── architecture.md
│   └── ...
├── compose.yml                 # Docker Compose for main app
├── Dockerfile                  # Container definition
├── requirements.txt            # Python dependencies
├── main.py                     # Alternative entry point
└── .env.example               # Environment variables template
```

## Component Details

### 1. Backend (FastAPI)

**Responsibilities:**
- REST API for Weaviate operations
- Connection management with lifespan
- Request/response validation with Pydantic
- Error handling and logging

**Key Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/schema` | GET | List all collections |
| `/collection/{name}` | GET | Get collection info |
| `/class/{name}` | POST | Semantic search |
| `/class/{name}/bm25` | POST | Keyword search |
| `/class/{name}/hybrid` | POST | Hybrid search |
| `/class/{name}/generate` | POST | Generative search |
| `/class/{name}/aggregate` | POST | Aggregation |

**Key Libraries:**

| Library | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `weaviate-client` | Weaviate v4 client |
| `pydantic` | Data validation |
| `loguru` | Logging |
| `python-dotenv` | Environment loading |

### 2. Frontend (React + Vite)

**Responsibilities:**
- User interface for schema browsing
- Search configuration and execution
- Results visualization with AG Grid
- Connection status display

**Key Libraries:**

| Library | Purpose |
|---------|---------|
| `react` | UI framework |
| `antd` | UI components (Layout, Menu, etc.) |
| `@ant-design/icons` | Icons |
| `ag-grid-react` | Data grid |
| `ag-grid-community` | Grid functionality |
| `lodash` | Utility functions |

**Components:**

| Component | Purpose |
|-----------|---------|
| `App` | Main layout with sidebar |
| `Welcome` | Schema overview page |
| `ClassData` | Collection browser with search |

### 3. Weaviate Container

**Responsibilities:**
- Vector storage and search
- Text vectorization (Ollama)
- Generative AI integration (Ollama)

**Configuration:**
- HTTP API on port 8080
- gRPC API on port 50051
- Ollama vectorizer integration

### 4. Ollama Container

**Responsibilities:**
- Text embeddings (granite-embedding:278m)
- Text generation (granite4:tiny-h)

**Models Used:**

| Model | Purpose | Size |
|-------|---------|------|
| granite-embedding:278m | Text vectorization | ~278M params |
| granite4:tiny-h | Generative RAG | ~4GB |

## Data Flow

### Search Flow

```
1. User enters query in frontend
   ↓
2. Frontend POST to /class/{name} with query params
   ↓
3. Backend validates request with Pydantic
   ↓
4. Backend calls Weaviate Client v4 method:
   - near_text (semantic)
   - bm25 (keyword)
   - hybrid (combined)
   ↓
5. Weaviate executes search with vectorizer
   ↓
6. Results returned to backend
   ↓
7. Backend formats results with metadata
   ↓
8. Frontend displays in AG Grid
```

### Generative Search Flow

```
1. User enters query + prompt
   ↓
2. Frontend POST to /class/{name}/generate
   ↓
3. Backend calls Weaviate generate method
   ↓
4. Weaviate retrieves relevant objects
   ↓
5. Weaviate sends context to Ollama
   ↓
6. Ollama generates response
   ↓
7. Results + generated text returned
   ↓
8. Frontend displays results with "generated" field
```

## Connection Management

### Backend Lifespan

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to Weaviate
    client = connect_to_weaviate()
    yield
    # Shutdown: Close connection
    client.close()
```

### Connection Configuration

```python
weaviate.connect_to_custom(
    http_host=WEAVIATE_HOST,
    http_port=WEAVIATE_PORT,
    http_secure=WEAVIATE_SECURE,
    grpc_host=WEAVIATE_GRPC_HOST,
    grpc_port=WEAVIATE_GRPC_PORT,
    grpc_secure=WEAVIATE_GRPC_SECURE,
    auth_credentials=get_auth_credentials(),
)
```

## Network Configuration

### Docker Networking

| Service | Internal | External |
|---------|----------|----------|
| weaviate-spy | :7777 | localhost:7777 |
| Weaviate | :8080/:50051 | localhost:8080/:50051 |
| Ollama | :11434 | localhost:11434 |

### Host Resolution

The container uses `host.docker.internal` to connect to services on the host:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

## Security Considerations

| Aspect | Status | Notes |
|--------|--------|-------|
| Authentication | ⚠️ None | No auth in app - rely on network isolation |
| API Keys | Optional | Weaviate API key / Bearer token supported |
| CORS | Open | Allow all origins for local development |
| TLS | Optional | Secure connections configurable |

## Scalability

| Resource | Limit | Notes |
|----------|-------|-------|
| Results | Paginated | Default 20 per page |
| Grid Rows | Client-side | AG Grid handles large datasets |
| Concurrent Users | Single-user | Designed for local development |
| Collection Size | Unlimited | Weaviate handles scaling |

## Related Files

- [API Design](./api-design.md) - Endpoint specifications
- [Frontend](./frontend.md) - React component details
- [Search Modes](./search-modes.md) - Search implementations
- [Docker Setup](./docker-setup.md) - Container configuration
