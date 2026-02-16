/**
 * Weaviate Spy API Client - v0.2.0
 * Refactored to use JSON body for POST requests
 */

import type {
  Collections,
  ApiResponse,
  WeaviateObject,
  SearchMode,
  AggregateResponse,
  HealthResponse,
  CollectionInfo,
} from './types';

const API_BASE = '';

/**
 * Make an API request with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get all collections/schema
 */
export async function getSchema(): Promise<Collections> {
  return apiRequest<Collections>('/schema');
}

/**
 * Get collection info
 */
export async function getCollectionInfo(collectionName: string): Promise<CollectionInfo> {
  return apiRequest<CollectionInfo>(`/collection/${collectionName}`);
}

/**
 * Health check
 */
export async function healthCheck(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health');
}

/**
 * Search class with specified mode
 */
export async function searchClass(
  collection: string,
  options: {
    offset?: number;
    limit?: number;
    query?: string;
    certainty?: number;
    alpha?: number;
    mode?: SearchMode;
    properties?: string[];
  } = {}
): Promise<ApiResponse<WeaviateObject>> {
  const {
    offset = 0,
    limit = 20,
    query = '',
    certainty = 0.65,
    alpha = 0.5,
    mode = 'semantic',
    properties,
  } = options;

  // Build request body
  const body: Record<string, unknown> = {
    offset,
    limit,
    properties,
  };

  // Determine endpoint based on search mode
  let endpoint = `/class/${collection}`;

  if (query) {
    body.query = query;
    
    if (mode === 'semantic') {
      body.keyword = query;
      body.certainty = certainty;
    } else if (mode === 'hybrid') {
      endpoint = `/class/${collection}/hybrid`;
      body.alpha = alpha;
    } else if (mode === 'keyword') {
      endpoint = `/class/${collection}/bm25`;
    }
  }

  // Debug logging for keyword search
  console.log('[API] searchClass request:', {
    endpoint,
    mode,
    query,
    body,
  });

  return apiRequest<ApiResponse<WeaviateObject>>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Legacy getClass function for backward compatibility
 */
export async function getClass(
  collection: string,
  offset: number = 0,
  limit: number = 20,
  keyword: string = '',
  certainty: number = 0.65,
  properties: string[] = []
): Promise<ApiResponse<WeaviateObject>> {
  return searchClass(collection, {
    offset,
    limit,
    query: keyword,
    certainty,
    mode: 'semantic',
    properties,
  });
}

/**
 * BM25 (keyword) search
 */
export async function bm25Search(
  collection: string,
  query: string,
  options: {
    offset?: number;
    limit?: number;
    properties?: string[];
  } = {}
): Promise<ApiResponse<WeaviateObject>> {
  return searchClass(collection, {
    ...options,
    query,
    mode: 'keyword',
  });
}

/**
 * Hybrid search (BM25 + vector)
 */
export async function hybridSearch(
  collection: string,
  query: string,
  options: {
    offset?: number;
    limit?: number;
    alpha?: number;
    properties?: string[];
  } = {}
): Promise<ApiResponse<WeaviateObject>> {
  return searchClass(collection, {
    ...options,
    query,
    mode: 'hybrid',
  });
}

/**
 * Generative search (RAG)
 */
export async function generativeSearch(
  collection: string,
  prompt: string,
  options: {
    query?: string;
    limit?: number;
    certainty?: number;
    properties?: string[];
  } = {}
): Promise<ApiResponse<WeaviateObject>> {
  const { query, limit = 10, certainty = 0.65, properties } = options;
  
  const body: Record<string, unknown> = {
    prompt,
    limit,
    certainty,
  };
  
  if (query) {
    body.query = query;
  }
  
  if (properties) {
    body.properties = properties;
  }

  return apiRequest<ApiResponse<WeaviateObject>>(`/class/${collection}/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Aggregate collection
 */
export async function aggregateCollection(
  collection: string,
  groupBy?: string
): Promise<AggregateResponse> {
  const body: Record<string, unknown> = {};
  if (groupBy) {
    body.group_by = groupBy;
  }
  
  return apiRequest<AggregateResponse>(`/class/${collection}/aggregate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
