# Search Modes

## Overview

Weaviate-Spy supports 4 search modes leveraging Weaviate v4 client capabilities. Each mode is optimized for different use cases.

## Quick Reference

| Mode | Endpoint | Weaviate Method | Best For |
|------|----------|-----------------|----------|
| Semantic | `POST /class/{name}` | `near_text` | Natural language queries |
| Keyword | `POST /class/{name}/bm25` | `bm25` | Exact term matching |
| Hybrid | `POST /class/{name}/hybrid` | `hybrid` | Combined relevance |
| Generative | `POST /class/{name}/generate` | `generate` | RAG with LLM |

---

## Semantic Search

Uses vector embeddings to find semantically similar content, even without exact keyword matches.

### How It Works

```
Query Text
    │
    ▼
┌─────────────────┐
│ Ollama          │ (granite-embedding:278m)
│ Embedding Model │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vector Search   │ (Weaviate HNSW)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Certainty Filter│ (threshold)
└────────┬────────┘
         │
         ▼
   Results
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| query | string | null | Natural language query |
| keyword | string | null | Alias for query |
| certainty | float | 0.65 | Minimum similarity (0-1) |
| limit | int | 20 | Max results |
| offset | int | 0 | Pagination offset |
| properties | string[] | all | Properties to return |

### When to Use

- ✅ Fuzzy matching ("similar to...")
- ✅ Concept-based search ("sci-fi film")
- ✅ Multi-language queries
- ✅ Finding related content
- ❌ Exact term matching (use BM25)
- ❌ Known keywords (use BM25)

### Example

**Request:**
```json
POST /class/Filmy
{
  "keyword": "kultovní tragikomedie",
  "certainty": 0.65,
  "limit": 10
}
```

**Response:**
```json
{
  "data": [
    {
      "uuid": "...",
      "title": "Pelíšky",
      "description": "Kultovní tragikomedie o dospívání...",
      "certainty": 0.85,
      "distance": 0.15
    }
  ],
  "count": 1,
  "search_type": "semantic"
}
```

### Backend Implementation

```python
response = collection.query.near_text(
    query=query,
    certainty=certainty,
    limit=limit,
    offset=offset,
    return_metadata=["certainty", "distance"],
)
```

---

## Keyword Search (BM25)

Uses BM25 algorithm for traditional full-text search with term frequency scoring.

### How It Works

```
Query Text
    │
    ▼
┌─────────────────┐
│ Tokenization    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BM25 Scoring    │ (term frequency, IDF)
└────────┬────────┘
         │
         ▼
   Ranked Results
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| query | string | required | Keywords/terms |
| limit | int | 20 | Max results |
| offset | int | 0 | Pagination offset |
| properties | string[] | all | Properties to return |

### When to Use

- ✅ Exact term matching
- ✅ Known keywords
- ✅ Specific phrases
- ✅ Quick lookups
- ❌ Fuzzy matching (use semantic)
- ❌ Concept-based search (use semantic)

### Example

**Request:**
```json
POST /class/Filmy/bm25
{
  "query": "Praha český",
  "limit": 10
}
```

**Response:**
```json
{
  "data": [
    {
      "uuid": "...",
      "title": "Pelíšky",
      "description": "...Praze na sklonku 60. let",
      "origin": "Česká republika",
      "score": 3.52,
      "explain_score": "BM25..."
    }
  ],
  "count": 1,
  "search_type": "bm25"
}
```

### Backend Implementation

```python
response = collection.query.bm25(
    query=query,
    limit=limit,
    offset=offset,
    return_metadata=["score", "explain_score"],
)
```

---

## Hybrid Search

Combines BM25 and vector search with configurable balance for best of both worlds.

### How It Works

```
Query Text
    │
    ├──────────────────────┐
    ▼                      ▼
┌─────────┐          ┌─────────┐
│ BM25    │          │ Vector  │
│ Search  │          │ Search  │
└────┬────┘          └────┬────┘
     │                    │
     └────────┬───────────┘
              │
              ▼
       ┌────────────┐
       │ Alpha      │ (weighted fusion)
       │ Fusion     │
       └─────┬──────┘
             │
             ▼
        Ranked Results
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| query | string | required | Search query |
| alpha | float | 0.5 | Balance (0=BM25, 1=vector) |
| limit | int | 20 | Max results |
| offset | int | 0 | Pagination offset |
| properties | string[] | all | Properties to return |

### Alpha Tuning Guide

| Alpha | Behavior | Use Case |
|-------|----------|----------|
| 0.0 | Pure BM25 | Exact matching only |
| 0.3 | Mostly keyword | Keywords with semantic boost |
| 0.5 | Balanced | General purpose |
| 0.7 | Mostly semantic | Semantic with keyword context |
| 1.0 | Pure vector | Semantic matching only |

### When to Use

- ✅ Uncertain which mode works best
- ✅ Complex queries with multiple aspects
- ✅ Best overall relevance
- ✅ Combining exact and fuzzy matching

### Example

**Request:**
```json
POST /class/Filmy/hybrid
{
  "query": "americký film vesmír",
  "alpha": 0.5,
  "limit": 10
}
```

**Response:**
```json
{
  "data": [
    {
      "uuid": "...",
      "title": "Interstellar",
      "description": "Skupina průzkumníků cestuje červí dírou...",
      "origin": "USA",
      "score": 0.78,
      "explain_score": "Hybrid..."
    }
  ],
  "count": 1,
  "search_type": "hybrid",
  "alpha": 0.5
}
```

### Backend Implementation

```python
response = collection.query.hybrid(
    query=query,
    alpha=alpha,
    limit=limit,
    offset=offset,
    return_metadata=["score", "explain_score"],
)
```

---

## Generative Search (RAG)

Retrieves relevant objects and generates a response using an LLM with the context.

### How It Works

```
Query + Prompt
    │
    ▼
┌─────────────────┐
│ Vector Search   │ (retrieve relevant objects)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Context Build   │ (objects + prompt)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ollama LLM      │ (granite4:tiny-h)
│ Generation      │
└────────┬────────┘
         │
         ▼
   Generated Text
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| prompt | string | required | Generation prompt |
| query | string | null | Optional search query |
| limit | int | 10 | Max context objects |
| certainty | float | 0.65 | Minimum relevance |
| properties | string[] | all | Properties to return |

### Requirements

- Collection configured with generative module
- Ollama running with generation model (e.g., granite4:tiny-h)
- Vectorizer configured for retrieval

### When to Use

- ✅ Summarizing results
- ✅ Question answering
- ✅ Extracting insights
- ✅ Natural language reports
- ❌ Simple search (use semantic/BM25)

### Example

**Request:**
```json
POST /class/Filmy/generate
{
  "prompt": "Summarize these movies in Czech, always cite film titles in quotes with year in parentheses",
  "query": "sci-fi film",
  "limit": 5
}
```

**Response:**
```json
{
  "data": [
    {
      "uuid": "...",
      "title": "Interstellar",
      "generated": "Sci-fi filmy v této kategorii zahrnují \"Interstellar\" (2014)..."
    }
  ],
  "count": 1,
  "search_type": "generative"
}
```

### Backend Implementation

```python
if query:
    response = collection.generate.near_text(
        query=query,
        prompt=prompt,
        certainty=certainty,
        limit=limit,
        return_metadata=["certainty", "distance"],
    )
else:
    response = collection.generate.fetch_objects(
        prompt=prompt,
        limit=limit,
    )
```

---

## Score Interpretation

### Semantic Search (Certainty)

| Score | Level | Color | Interpretation |
|-------|-------|-------|----------------|
| >= 0.8 | Excellent | 🟢 Green | Highly relevant match |
| 0.6-0.79 | Good | 🔵 Blue | Relevant match |
| 0.4-0.59 | Fair | 🟠 Orange | Partially relevant |
| < 0.4 | Weak | 🔴 Red | Low relevance |

### BM25/Hybrid (Score)

Relative to highest score in results:

| Relative % | Level | Color | Interpretation |
|------------|-------|-------|----------------|
| >= 80% | Best Match | 🟢 Green | Top result tier |
| 50-79% | Good Match | 🔵 Blue | Strong match |
| 25-49% | Partial Match | 🟠 Orange | Moderate match |
| < 25% | Weak Match | 🔴 Red | Lower relevance |

---

## Comparison Matrix

| Aspect | Semantic | BM25 | Hybrid | Generative |
|--------|----------|------|--------|------------|
| Speed | Fast | Fastest | Fast | Slower |
| Fuzzy matching | ✅ Excellent | ❌ Poor | ✅ Good | ✅ Good |
| Exact matching | ❌ Poor | ✅ Excellent | ✅ Good | ✅ Good |
| Context awareness | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| LLM required | ❌ No | ❌ No | ❌ No | ✅ Yes |
| Output | Results | Results | Results | Results + Text |

---

## Related Files

- [API Design](./api-design.md) - Endpoint specifications
- [Frontend](./frontend.md) - ScoreCellRenderer implementation
- [BDD Scenarios](./bdd.md) - Features 3-6: Search modes
