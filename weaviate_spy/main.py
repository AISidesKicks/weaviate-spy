"""
Weaviate Spy Backend - v0.2.0
Refactored to leverage Weaviate Client v4 features
Uses JSON body for POST requests
"""

import os
from contextlib import asynccontextmanager
from typing import Any

import weaviate
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from loguru import logger
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

load_dotenv()

# Configuration
WEAVIATE_HOST = os.getenv("WEAVIATE_HOST", "localhost")
WEAVIATE_PORT = int(os.getenv("WEAVIATE_PORT", "8080"))
WEAVIATE_SECURE = os.getenv("WEAVIATE_SECURE", "").lower() in ("true", "1", "yes")
WEAVIATE_GRPC_HOST = os.getenv("WEAVIATE_GRPC_HOST", "localhost")
WEAVIATE_GRPC_PORT = int(os.getenv("WEAVIATE_GRPC_PORT", "50051"))
WEAVIATE_GRPC_SECURE = os.getenv("WEAVIATE_GRPC_SECURE", "").lower() in ("true", "1", "yes")
WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY", None)
WEAVIATE_BEARER_TOKEN = os.getenv("WEAVIATE_BEARER_TOKEN", None)

# Global client reference
client: weaviate.WeaviateClient | None = None


def get_auth_credentials() -> weaviate.auth.AuthCredentials | None:
    """Get authentication credentials from environment variables."""
    if WEAVIATE_API_KEY:
        return weaviate.auth.Auth.api_key(WEAVIATE_API_KEY)
    elif WEAVIATE_BEARER_TOKEN:
        return weaviate.auth.Auth.bearer_token(WEAVIATE_BEARER_TOKEN)
    return None


def connect_to_weaviate() -> weaviate.WeaviateClient:
    """Create and return a Weaviate client connection."""
    return weaviate.connect_to_custom(
        http_host=WEAVIATE_HOST,
        http_port=WEAVIATE_PORT,
        http_secure=WEAVIATE_SECURE,
        grpc_host=WEAVIATE_GRPC_HOST,
        grpc_port=WEAVIATE_GRPC_PORT,
        grpc_secure=WEAVIATE_GRPC_SECURE,
        auth_credentials=get_auth_credentials(),
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown."""
    global client
    
    # Startup
    try:
        client = connect_to_weaviate()
        logger.info("Connected to Weaviate successfully")
        
        # Verify connection
        client.collections.list_all()
        logger.info("Weaviate connection verified")
    except Exception as e:
        logger.error(f"Failed to connect to Weaviate: {e}")
        client = None
    
    yield
    
    # Shutdown
    if client:
        client.close()
        logger.info("Weaviate connection closed")


app = FastAPI(
    title="Weaviate Spy API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request/response
class SearchRequest(BaseModel):
    """Base search request model."""
    query: str | None = None
    keyword: str | None = None  # For semantic search
    limit: int = 20
    offset: int = 0
    certainty: float = 0.65
    properties: list[str] | None = None


class HybridSearchRequest(BaseModel):
    """Hybrid search request model."""
    query: str
    alpha: float = 0.5  # Balance between BM25 (0) and vector (1)
    limit: int = 20
    offset: int = 0
    properties: list[str] | None = None


class BM25SearchRequest(BaseModel):
    """BM25 (keyword) search request model."""
    query: str
    limit: int = 20
    offset: int = 0
    properties: list[str] | None = None


class GenerativeRequest(BaseModel):
    """Generative search request model."""
    prompt: str
    query: str | None = None
    limit: int = 10
    certainty: float = 0.65
    properties: list[str] | None = None


class AggregateRequest(BaseModel):
    """Aggregate request model."""
    group_by: str | None = None
    metric: str = "count"


# Helper functions
def get_client() -> weaviate.WeaviateClient:
    """Get the Weaviate client or raise an error if not connected."""
    if client is None:
        raise HTTPException(status_code=503, detail="Weaviate connection not available")
    return client


def extract_properties(obj: Any, property_names: list[str]) -> dict:
    """Extract properties from a Weaviate object."""
    result = {}
    for prop in property_names:
        value = obj.properties.get(prop)
        if isinstance(value, list):
            result[prop] = ", ".join(str(v) for v in value)
        else:
            result[prop] = value
    return result


def format_object(obj: Any, property_names: list[str]) -> dict:
    """Format a Weaviate object for API response."""
    result = extract_properties(obj, property_names)
    result["uuid"] = str(obj.uuid)
    result["key"] = str(obj.uuid)
    
    # Add metadata if available
    if obj.metadata:
        if hasattr(obj.metadata, "certainty"):
            result["certainty"] = obj.metadata.certainty
        if hasattr(obj.metadata, "distance"):
            result["distance"] = obj.metadata.distance
        if hasattr(obj.metadata, "score"):
            result["score"] = obj.metadata.score
        if hasattr(obj.metadata, "explain_score"):
            result["explain_score"] = obj.metadata.explain_score
    
    return result


# Health check endpoint
@app.get("/health")
def health_check():
    """Check the health of the API and Weaviate connection."""
    try:
        c = get_client()
        c.collections.list_all()
        return {"status": "healthy", "weaviate": "connected"}
    except HTTPException:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "weaviate": "disconnected"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )


# Schema endpoints
@app.get("/schema")
def get_schema():
    """List all collections with their properties."""
    c = get_client()
    return c.collections.list_all()


@app.get("/collection/{collection_name}")
def get_collection_info(collection_name: str):
    """Get detailed information about a specific collection."""
    c = get_client()
    try:
        collection = c.collections.get(collection_name)
        config = collection.config.get()
        return {
            "name": collection_name,
            "properties": [
                {"name": p.name, "data_type": p.data_type}
                for p in config.properties
            ],
            "vectorizer": str(config.vectorizer) if config.vectorizer else None,
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Collection not found: {e}")


# Search endpoints
@app.post("/class/{class_name}")
def search_semantic(
    class_name: str,
    request: SearchRequest,
):
    """
    Search a collection using semantic (near_text) search.
    If no keyword/query is provided, fetches objects with pagination.
    """
    c = get_client()
    collection = c.collections.get(class_name)
    
    # Get property names if not provided
    properties = request.properties
    if properties is None:
        config = collection.config.get()
        properties = [p.name for p in config.properties]
    
    paginate = {"limit": request.limit, "offset": request.offset}
    
    # Use keyword or query for search
    search_term = request.keyword or request.query
    
    if search_term:
        # Semantic search
        response = collection.query.near_text(
            query=search_term,
            certainty=request.certainty,
            return_metadata=["certainty", "distance"],
            **paginate,
        )
        count_response = collection.aggregate.near_text(
            query=search_term,
            certainty=request.certainty,
            total_count=True,
        )
    else:
        # Fetch all objects
        response = collection.query.fetch_objects(**paginate)
        count_response = collection.aggregate.over_all(total_count=True)
    
    data = [format_object(obj, properties) for obj in response.objects]
    
    return {
        "data": data,
        "count": count_response.total_count,
        "search_type": "semantic" if search_term else "fetch",
    }


@app.post("/class/{class_name}/bm25")
def search_bm25(
    class_name: str,
    request: BM25SearchRequest,
):
    """
    Search a collection using BM25 (keyword) search.
    Best for exact term matching.
    """
    c = get_client()
    collection = c.collections.get(class_name)
    
    # Get property names if not provided
    properties = request.properties
    if properties is None:
        config = collection.config.get()
        properties = [p.name for p in config.properties]
    
    # Debug logging
    logger.info(f"[BM25] Searching collection: {class_name}")
    logger.info(f"[BM25] Query: {request.query}")
    logger.info(f"[BM25] Properties: {properties}")
    logger.info(f"[BM25] Limit: {request.limit}, Offset: {request.offset}")
    
    response = collection.query.bm25(
        query=request.query,
        limit=request.limit,
        offset=request.offset,
        return_metadata=["score", "explain_score"],
    )
    
    logger.info(f"[BM25] Response objects count: {len(response.objects)}")
    
    # Get total count using over_all aggregate (Weaviate v4 doesn't have aggregate.bm25)
    # Note: This returns total count of all objects in collection, not filtered by BM25 query
    # For accurate BM25 count, we would need to use a larger limit and count manually
    count_response = collection.aggregate.over_all(
        total_count=True,
    )
    
    logger.info(f"[BM25] Total count: {count_response.total_count}")
    
    data = [format_object(obj, properties) for obj in response.objects]
    
    return {
        "data": data,
        "count": len(data),
        "search_type": "bm25",
    }


@app.post("/class/{class_name}/hybrid")
def search_hybrid(
    class_name: str,
    request: HybridSearchRequest,
):
    """
    Search a collection using hybrid search (BM25 + vector).
    Alpha controls the balance: 0 = pure BM25, 1 = pure vector.
    """
    c = get_client()
    collection = c.collections.get(class_name)
    
    # Get property names if not provided
    properties = request.properties
    if properties is None:
        config = collection.config.get()
        properties = [p.name for p in config.properties]
    
    response = collection.query.hybrid(
        query=request.query,
        alpha=request.alpha,
        limit=request.limit,
        offset=request.offset,
        return_metadata=["score", "explain_score"],
    )
    
    # Get total count using over_all aggregate (Weaviate v4 doesn't have aggregate.hybrid)
    # Note: This returns total count of all objects in collection, not filtered by hybrid query
    count_response = collection.aggregate.over_all(
        total_count=True,
    )
    
    data = [format_object(obj, properties) for obj in response.objects]
    
    return {
        "data": data,
        "count": len(data),
        "search_type": "hybrid",
        "alpha": request.alpha,
    }


@app.post("/class/{class_name}/generate")
def generative_search(
    class_name: str,
    request: GenerativeRequest,
):
    """
    Generative search (RAG) - uses an LLM to generate responses based on retrieved objects.
    """
    c = get_client()
    collection = c.collections.get(class_name)
    
    # Get property names if not provided
    properties = request.properties
    if properties is None:
        config = collection.config.get()
        properties = [p.name for p in config.properties]
    
    if request.query:
        # Generative search with semantic query
        response = collection.generate.near_text(
            query=request.query,
            prompt=request.prompt,
            certainty=request.certainty,
            limit=request.limit,
            return_metadata=["certainty", "distance"],
        )
    else:
        # Generative search on all objects
        response = collection.generate.fetch_objects(
            prompt=request.prompt,
            limit=request.limit,
        )
    
    data = []
    for obj in response.objects:
        formatted = format_object(obj, properties)
        if obj.generated:
            formatted["generated"] = obj.generated
        data.append(formatted)
    
    return {
        "data": data,
        "count": len(data),
        "search_type": "generative",
    }


@app.post("/class/{class_name}/aggregate")
def aggregate_collection(
    class_name: str,
    request: AggregateRequest,
):
    """
    Aggregate a collection, optionally grouping by a property.
    """
    c = get_client()
    collection = c.collections.get(class_name)
    
    if request.group_by:
        response = collection.aggregate.group_by_by(
            property=request.group_by,
            total_count=True,
        )
        return {
            "total_count": response.total_count,
            "grouped_by": request.group_by,
            "groups": response.groups if hasattr(response, "groups") else None,
        }
    else:
        response = collection.aggregate.over_all(total_count=True)
        return {
            "total_count": response.total_count,
        }


# Mount static files for frontend
app.mount("/", StaticFiles(directory="static", html=True), name="static")
