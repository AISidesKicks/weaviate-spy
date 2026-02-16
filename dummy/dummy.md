# Dummy Data Script - Weaviate Filmy Collection

## Overview
This script creates a `Filmy` (Movies) collection in Weaviate with sample Czech movie data for testing the weaviate-spy tool.

## Usage
```bash
python dummy/weaviate_dummy.py
```

**Important:** You must type `YES` when prompted to confirm deletion and recreation of the Filmy collection.

## What the Script Does

### 1. Collection Setup
Creates a `Filmy` collection with the following properties:
- `title` (TEXT) - Název filmu / Movie title
- `description` (TEXT) - Popis filmu / Movie description  
- `genre` (TEXT) - Žánr filmu / Movie genre
- `year` (INT) - Rok vydání / Release year
- `origin` (TEXT) - Země původu / Country of origin

Each property includes a Czech description that is visible in the Weaviate console.

### 2. Vector Configuration
Uses Ollama with the `granite-embedding:278m` model for text vectorization.

### 3. Sample Data
Inserts 12 movies with Czech titles and descriptions:
- **Sci-Fi:** Počátek, Interstellar, Blade Runner 2049
- **Drama:** Vykoupení z věznice Shawshank, Forrest Gump, Zelená míle
- **Komedie:** Pelíšky, Grandhotel Budapešť, Nedotknutelní
- **Thriller:** Mlčení jehňátek, Parazit, Joker

### 4. Test Queries
Runs several hybrid search and RAG queries to demonstrate:
- Genre filtering (Komedie)
- Hybrid search with different alpha values
- RAG/Generation with Ollama (granite4:tiny-h model)
- Czech language responses

## Requirements
- Weaviate running locally or via Docker
- Ollama running with models:
  - `granite-embedding:278m`
  - `granite4:tiny-h`

See `dummy/requirements.txt` for Python dependencies.

## Docker Setup

To run Weaviate and Ollama locally for testing:

```bash
cd dummy
docker compose up -d
```

This starts:
- **Weaviate** (port 8080) - With text2vec-ollama and generative-ollama modules enabled
- **Ollama** (port 11434) - For embeddings and generation

Make sure to pull the required models before running the dummy script:
```bash
docker exec ollama ollama pull granite-embedding:278m
docker exec ollama ollama pull granite4:tiny-h
```

## Ollama Test

To verify Ollama is working correctly, run the test script:

```bash
cd dummy
./ollama_test.sh
```

Or run individual tests:

```bash
# Test granite4:tiny-h model
docker compose exec ollama ollama run granite4:tiny-h "Mluvíš česky?"

# Check if models are loaded in GPU
docker compose exec ollama ollama ps

# Test embedding generation
curl -X POST http://localhost:11434/api/embed \
     -H "Content-Type: application/json" \
     -d '{
        "model": "granite-embedding:278m",
        "input": "Kultovní tragikomedie o dospívání a střetu generací"
     }'
```

**Expected results:**
- granite4:tiny-h should respond in Czech
- granite-embedding:278m should return 768-dimensional embeddings
