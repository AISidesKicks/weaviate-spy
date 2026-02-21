# API Design

## Overview

Weaviate-Spy provides a RESTful API built with FastAPI. All endpoints use JSON for request/response bodies.

**Base URL:** `http://localhost:7777`

## Authentication

No authentication required by default. Optional Weaviate authentication via:

| Method | Environment Variable |
|--------|---------------------|
| API Key | `WEAVIATE_API_KEY` |
| Bearer Token | `WEAVIATE_BEARER_TOKEN` |

---

## Endpoints

### Health Check

#### `GET /health`

Check API and Weaviate connection status.

**Response:**

```json
{
  "status": "healthy",
  "weaviate": "connected"
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Healthy, connected |
| 503 | Unhealthy, disconnected |

---

### Schema

#### `GET /schema`

List all collections with their configuration.

**Response:**

```json
{
  "Filmy": {
    "name": "Filmy",
    "description": "Sbírka filmů...",
    "properties": [
      {
        "name": "title",
        "data_type": "text",
        "description": "Název filmu"
      }
    ],
    "vectorizer": "text2vec_ollama"
  }
}
```

---

#### `GET /collection/{collection_name}`

Get detailed information about a specific collection.

**Path Parameters:**

| Name | Type | Description |
|------|------|-------------|
| collection_name | string | Collection name |

**Response:**

```json
{
  "name": "Filmy",
  "properties": [
    {
      "name": "title",
      "data_type": "text"
    },
    {
      "name": "description",
      "data_type": "text"
    },
    {
      "name": "genre",
      "data_type": "text"
    },
    {
      "name": "year",
      "data_type": "int"
    }
  ],
  "vectorizer": "text2vec_ollama"
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Collection not found |

---

### Search

#### `POST /class/{class_name}`

Search a collection using semantic (near_text) search or fetch all objects.

**Path Parameters:**

| Name | Type | Description |
|------|------|-------------|
| class_name | string | Collection name |

**Request Body:**

```json
{
  "query": "kultovní tragikomedie",
  "keyword": "kultovní tragikomedie",
  "limit": 20,
  "offset": 0,
  "certainty": 0.65,
  "properties": ["title", "description", "genre"]
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| query | string | No | null | Search query |
| keyword | string | No | null | Alias for query |
| limit | integer | No | 20 | Max results |
| offset | integer | No | 0 | Pagination offset |
| certainty | float | No | 0.65 | Minimum certainty (0-1) |
| properties | string[] | No | all | Properties to return |

**Response:**

```json
{
  "data": [
    {
      "uuid": "00000000-0000-0000-0000-000000000001",
      "key": "00000000-0000-0000-0000-000000000001",
      "title": "Pelíšky",
      "description": "Kultovní tragikomedie...",
      "genre": "Komedie",
      "year": 1999,
      "origin": "Česká republika",
      "certainty": 0.85,
      "distance": 0.15
    }
  ],
  "count": 1,
  "search_type": "semantic"
}
```

---

#### `POST /class/{class_name}/bm25`

Search using BM25 (keyword) search.

**Request Body:**

```json
{
  "query": "Praha",
  "limit": 20,
  "offset": 0,
  "properties": ["title", "description"]
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| query | string | Yes | - | Search query |
| limit | integer | No | 20 | Max results |
| offset | integer | No | 0 | Pagination offset |
| properties | string[] | No | all | Properties to return |

**Response:**

```json
{
  "data": [
    {
      "uuid": "...",
      "key": "...",
      "title": "Pelíšky",
      "score": 3.5,
      "explain_score": "BM25 score explanation..."
    }
  ],
  "count": 1,
  "search_type": "bm25"
}
```

---

#### `POST /class/{class_name}/hybrid`

Search using hybrid search (BM25 + vector).

**Request Body:**

```json
{
  "query": "americký film",
  "alpha": 0.5,
  "limit": 20,
  "offset": 0,
  "properties": ["title", "description"]
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| query | string | Yes | - | Search query |
| alpha | float | No | 0.5 | Balance (0=BM25, 1=vector) |
| limit | integer | No | 20 | Max results |
| offset | integer | No | 0 | Pagination offset |
| properties | string[] | No | all | Properties to return |

**Response:**

```json
{
  "data": [
    {
      "uuid": "...",
      "key": "...",
      "title": "Forrest Gump",
      "score": 0.75,
      "explain_score": "Hybrid score explanation..."
    }
  ],
  "count": 1,
  "search_type": "hybrid",
  "alpha": 0.5
}
```

---

### Generative Search

#### `POST /class/{class_name}/generate`

RAG search with LLM generation.

**Request Body:**

```json
{
  "prompt": "Summarize these movies in Czech",
  "query": "sci-fi film",
  "limit": 10,
  "certainty": 0.65,
  "properties": ["title", "description"]
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| prompt | string | Yes | - | Generation prompt |
| query | string | No | null | Search query (optional) |
| limit | integer | No | 10 | Max objects for context |
| certainty | float | No | 0.65 | Minimum certainty |
| properties | string[] | No | all | Properties to return |

**Response:**

```json
{
  "data": [
    {
      "uuid": "...",
      "key": "...",
      "title": "Interstellar",
      "description": "...",
      "generated": "Sci-fi film o cestování vesmírem..."
    }
  ],
  "count": 1,
  "search_type": "generative"
}
```

---

### Aggregation

#### `POST /class/{class_name}/aggregate`

Aggregate collection data.

**Request Body:**

```json
{
  "group_by": "genre",
  "metric": "count"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| group_by | string | No | null | Property to group by |
| metric | string | No | "count" | Aggregation metric |

**Response (without group_by):**

```json
{
  "total_count": 12
}
```

**Response (with group_by):**

```json
{
  "total_count": 12,
  "grouped_by": "genre",
  "groups": [
    {"value": "Sci-Fi", "count": 3},
    {"value": "Drama", "count": 3},
    {"value": "Komedie", "count": 3}
  ]
}
```

---

## Pydantic Models

### Request Models

```python
class SearchRequest(BaseModel):
    query: str | None = None
    keyword: str | None = None
    limit: int = 20
    offset: int = 0
    certainty: float = 0.65
    properties: list[str] | None = None

class HybridSearchRequest(BaseModel):
    query: str
    alpha: float = 0.5
    limit: int = 20
    offset: int = 0
    properties: list[str] | None = None

class BM25SearchRequest(BaseModel):
    query: str
    limit: int = 20
    offset: int = 0
    properties: list[str] | None = None

class GenerativeRequest(BaseModel):
    prompt: str
    query: str | None = None
    limit: int = 10
    certainty: float = 0.65
    properties: list[str] | None = None

class AggregateRequest(BaseModel):
    group_by: str | None = None
    metric: str = "count"
```

---

## Error Responses

### 404 Not Found

```json
{
  "detail": "Collection not found: NonExistent"
}
```

### 503 Service Unavailable

```json
{
  "status": "unhealthy",
  "weaviate": "disconnected"
}
```

---

## Related Files

- [Architecture](./architecture.md) - System design
- [Search Modes](./search-modes.md) - Search implementations
- [BDD Scenarios](./bdd.md) - Test scenarios for API
