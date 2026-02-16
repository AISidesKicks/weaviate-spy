/**
 * Weaviate Spy TypeScript Types - v0.2.0
 * Refactored to support new Weaviate v4 features
 */

// Property types
interface Property {
  name: string;
  description: string | null;
  data_type: string;  // Changed from string[] to string - API returns single type like "text", "int", etc.
  index_filterable: boolean;
  index_range_filters: boolean;
  index_searchable: boolean;
  nested_properties: Property[] | null;
  tokenization: string | null;
  vectorizer_config: Record<string, unknown> | null;
  vectorizer: string | null;
}

// Vectorizer configuration
interface VectorizerConfig {
  vectorizer: string;
  model: {
    poolingStrategy: string;
    vectorizeClassName: boolean;
  };
  source_properties: string[] | null;
}

// Vector index configuration
interface VectorIndexConfig {
  quantizer: unknown;
  cleanup_interval_seconds: number;
  distance_metric: string;
  dynamic_ef_min: number;
  dynamic_ef_max: number;
  dynamic_ef_factor: number;
  ef: number;
  ef_construction: number;
  filter_strategy: string;
  flat_search_cutoff: number;
  max_connections: number;
  skip: boolean;
  vector_cache_max_objects: number;
}

// Vector configuration
interface VectorConfig {
  [key: string]: {
    vectorizer: VectorizerConfig;
    vector_index_config: VectorIndexConfig;
  };
}

// Collection schema
interface Collection {
  name: string;
  description: string | null;
  generative_config: Record<string, unknown> | null;
  properties: Property[];
  references: unknown[];
  reranker_config: Record<string, unknown> | null;
  vectorizer_config: Record<string, unknown> | null;
  vectorizer: string | null;
  vector_config: VectorConfig;
}

// Collections response
interface Collections {
  [key: string]: Collection;
}

// Search modes
type SearchMode = 'semantic' | 'keyword' | 'hybrid';

// Search parameters
interface SearchParams {
  mode: SearchMode;
  query: string;
  certainty?: number;  // For semantic search
  alpha?: number;      // For hybrid search (0 = BM25, 1 = vector)
  limit: number;
  offset: number;
  properties?: string[];
}

// Object metadata
interface ObjectMetadata {
  certainty?: number;
  distance?: number;
  score?: number;
  explain_score?: string;
}

// Weaviate object response
interface WeaviateObject {
  uuid: string;
  key: string;
  properties: Record<string, unknown>;
  generated?: string;
  certainty?: number;
  distance?: number;
  score?: number;
  explain_score?: string;
}

// API response wrapper
interface ApiResponse<T> {
  data: T[];
  count: number;
  search_type: SearchMode | 'fetch' | 'generative';
  alpha?: number;
}

// Aggregation response
interface AggregateResponse {
  total_count?: number;
  data?: unknown;
  group_by?: string;
}

// Health check response
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  weaviate?: 'connected' | 'disconnected';
  error?: string;
}

// Collection info response
interface CollectionInfo {
  name: string;
  properties: Array<{
    name: string;
    data_type: string[];
  }>;
  vectorizer: string | null;
}

// Column configuration for tables
interface ColumnConfig {
  title: string;
  dataIndex: string;
  key: string;
  width?: number;
  ellipsis?: boolean;
  fixed?: 'left' | 'right';
  render?: (value: unknown, record: WeaviateObject) => React.ReactNode;
}

// Table pagination
interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  pageSizeOptions?: string[];
}

export type {
  Property,
  VectorizerConfig,
  VectorIndexConfig,
  VectorConfig,
  Collection,
  Collections,
  SearchMode,
  SearchParams,
  ObjectMetadata,
  WeaviateObject,
  ApiResponse,
  AggregateResponse,
  HealthResponse,
  CollectionInfo,
  ColumnConfig,
  PaginationConfig,
};
