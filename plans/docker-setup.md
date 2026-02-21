# Docker Setup

## Overview

Weaviate-Spy runs as a single Docker container connecting to external Weaviate and Ollama instances. The setup is optimized for local development with hot-reload support.

## Container Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Host                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │              weaviate-spy Container (:7777)                     ││
│  │                                                                 ││
│  │  ┌─────────────┐     ┌─────────────────────────────────────┐   ││
│  │  │  Frontend   │     │           Backend                   │   ││
│  │  │  (static)   │◄────│  FastAPI + Weaviate Client v4       │   ││
│  │  └─────────────┘     └──────────────────┬──────────────────┘   ││
│  └─────────────────────────────────────────┼──────────────────────┘│
│                                            │                        │
│              ┌─────────────────────────────┼───────────────────┐   │
│              │                             │                   │   │
│              ▼                             ▼                   ▼   │
│  ┌─────────────────────┐     ┌─────────────────────┐              │
│  │    Weaviate         │     │       Ollama        │              │
│  │    :8080 (HTTP)     │     │      :11434         │              │
│  │    :50051 (gRPC)    │     │                     │              │
│  │                     │     │  granite-embedding  │              │
│  │  (external or       │     │  granite4:tiny-h    │              │
│  │   dummy setup)      │     │                     │              │
│  └─────────────────────┘     └─────────────────────┘              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY weaviate_spy/ ./weaviate_spy/
COPY static/ ./static/

# Expose port
EXPOSE 7777

# Run with uvicorn
CMD ["uvicorn", "weaviate_spy.main:app", "--host", "0.0.0.0", "--port", "7777"]
```

---

## Docker Compose

### Main Application (compose.yml)

```yaml
services:
  weaviate-spy:
    image: aisideskicks-weaviate-spy
    container_name: AISidesKicks-weaviate-spy
    command: uvicorn weaviate_spy.main:app --host 0.0.0.0 --port 7777 --reload
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "7777:7777"
    environment:
      - WEAVIATE_HOST=host.docker.internal
      - WEAVIATE_PORT=8080
      - WEAVIATE_SECURE=
      - WEAVIATE_GRPC_HOST=host.docker.internal
      - WEAVIATE_GRPC_PORT=50051
      - WEAVIATE_GRPC_SECURE=
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./weaviate_spy:/app/weaviate_spy
```

### Test Environment (dummy/docker-compose.yml)

For testing with Weaviate + Ollama:

```yaml
services:
  weaviate:
    image: cr.weaviate.io/semitechnologies/weaviate:1.26.6
    ports:
      - "8080:8080"
      - "50051:50051"
    environment:
      - QUERY_DEFAULTS_LIMIT=25
      - AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true
      - PERSISTENCE_DATA_PATH=/var/lib/weaviate
      - ENABLE_API_BASED_MODULES=true
      - CLUSTER_HOSTNAME=node1
    volumes:
      - weaviate_data:/var/lib/weaviate

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

---

## Environment Variables

### Connection Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `WEAVIATE_HOST` | localhost | Weaviate HTTP host |
| `WEAVIATE_PORT` | 8080 | Weaviate HTTP port |
| `WEAVIATE_SECURE` | false | Use HTTPS |
| `WEAVIATE_GRPC_HOST` | localhost | Weaviate gRPC host |
| `WEAVIATE_GRPC_PORT` | 50051 | Weaviate gRPC port |
| `WEAVIATE_GRPC_SECURE` | false | Use gRPC over TLS |

### Authentication (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `WEAVIATE_API_KEY` | None | API key for authentication |
| `WEAVIATE_BEARER_TOKEN` | None | Bearer token for authentication |

### .env.example

```env
# Weaviate Connection
WEAVIATE_HOST=localhost
WEAVIATE_PORT=8080
WEAVIATE_SECURE=

# Weaviate gRPC (for faster queries)
WEAVIATE_GRPC_HOST=localhost
WEAVIATE_GRPC_PORT=50051
WEAVIATE_GRPC_SECURE=

# Authentication (optional)
# WEAVIATE_API_KEY=your-api-key
# WEAVIATE_BEARER_TOKEN=your-bearer-token
```

---

## Host Networking

### Why host.docker.internal?

The container needs to connect to services running on the host machine:

```
Container (weaviate-spy)
    │
    │ HTTP/gRPC
    ▼
host.docker.internal:8080  ──► Weaviate (on host)
host.docker.internal:50051 ──► Weaviate gRPC (on host)
host.docker.internal:11434 ──► Ollama (on host)
```

### Configuration

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

This maps `host.docker.internal` to the host's gateway IP, allowing the container to reach host services.

---

## Development vs Production

### Development Mode

**Features:**
- Hot reload enabled (`--reload`)
- Source code mounted as volume
- Debug logging

```bash
# Start with hot reload
docker compose up -d --build

# View logs
docker compose logs -f

# Rebuild after dependency changes
docker compose up -d --build
```

**Volume Mounts:**
```yaml
volumes:
  - ./weaviate_spy:/app/weaviate_spy  # Live code editing
  # - ./frontend/dist:/app/static     # Custom frontend build
```

### Production Mode

**Features:**
- No hot reload
- No volume mounts
- Optimized image

```bash
# Build optimized image
docker build -t weaviate-spy:latest .

# Run standalone
docker run -d \
  -p 7777:7777 \
  -e WEAVIATE_HOST=weaviate \
  -e WEAVIATE_PORT=8080 \
  --name weaviate-spy \
  weaviate-spy:latest
```

---

## Dependencies

### requirements.txt

```
fastapi>=0.100.0
uvicorn>=0.23.0
weaviate-client>=4.0.0
pydantic>=2.0.0
python-dotenv>=1.0.0
loguru>=0.7.0
```

### Version Compatibility

| Package | Version | Notes |
|---------|---------|-------|
| Python | 3.11+ | Required |
| weaviate-client | 4.x | v4 API |
| FastAPI | 0.100+ | Pydantic v2 |
| Pydantic | 2.x | Data validation |

---

## Common Commands

### Build and Run

```bash
# Build and start
docker compose up -d --build

# Start only (use existing image)
docker compose up -d

# Stop
docker compose down

# Rebuild after Dockerfile changes
docker compose build --no-cache
```

### Logs and Debugging

```bash
# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f weaviate-spy

# Execute command in container
docker compose exec weaviate-spy bash

# Check container status
docker compose ps
```

### Cleanup

```bash
# Stop and remove containers
docker compose down

# Remove volumes
docker compose down -v

# Remove images
docker rmi aisideskicks-weaviate-spy
```

---

## Troubleshooting

### Connection Issues

**Symptom:** "Weaviate connection not available"

**Solutions:**
1. Verify Weaviate is running: `curl http://localhost:8080/v1/.well-known/ready`
2. Check environment variables
3. Verify `host.docker.internal` resolution

### gRPC Connection Issues

**Symptom:** Slow queries or timeouts

**Solutions:**
1. Verify gRPC port is accessible
2. Check `WEAVIATE_GRPC_HOST` and `WEAVIATE_GRPC_PORT`
3. Ensure Weaviate has gRPC enabled

### Ollama Connection Issues

**Symptom:** Generative search fails

**Solutions:**
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check model is pulled: `ollama list`
3. Ensure Weaviate is configured with Ollama endpoint

---

## Related Files

- [Architecture](./architecture.md) - System design
- [API Design](./api-design.md) - Endpoints
- [Search Modes](./search-modes.md) - Ollama integration
