# Frontend Architecture

## Overview

Weaviate-Spy frontend is built with React 18, Vite, Ant Design 5, and AG Grid Community. It provides a clean interface for browsing Weaviate collections and executing various search modes.

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI framework |
| Build | Vite 6 | Fast bundler with SWC |
| UI Library | Ant Design 5 | Components (Layout, Menu, Input, etc.) |
| Icons | @ant-design/icons | Icon library |
| Data Grid | AG Grid Community 35 | Results display with filtering |
| Utilities | lodash | Utility functions |
| JSON View | @microlink/react-json-view | JSON rendering |

## Component Architecture

```
App.tsx
├── Layout (Ant Design)
│   ├── Sider (collapsible)
│   │   ├── Logo
│   │   └── Menu
│   │       ├── Schema
│   │       └── Collections (submenu)
│   ├── Layout
│   │   ├── Header
│   │   │   └── Health Status Indicator
│   │   └── Content
│   │       ├── Welcome.tsx (Schema view)
│   │       └── ClassData.tsx (Collection browser)
```

---

## Components

### App.tsx - Main Layout

**Responsibilities:**
- Layout structure with collapsible sidebar
- Navigation state management
- Schema loading and caching
- Health check polling

**State:**

```typescript
const [pathname, setPathname] = useState('/');
const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
const [collections, setCollections] = useState<Collection[]>([]);
const [class2props, setClass2props] = useState<Record<string, Property[]>>({});
const [collapsed, setCollapsed] = useState(false);
```

**Menu Items:**

| Key | Icon | Label |
|-----|------|-------|
| /schema | BorderlessTableOutlined | Schema |
| /class | TableOutlined | Collections (expandable) |

---

### Welcome.tsx - Schema Overview

**Responsibilities:**
- Display schema information
- Show available collections
- Provide quick start guidance

---

### ClassData.tsx - Collection Browser

**Responsibilities:**
- Search mode selection
- Search parameter configuration
- AG Grid results display
- Pagination control

**State:**

```typescript
const [searchMode, setSearchMode] = useState<SearchMode>('semantic');
const [keyword, setKeyword] = useState('');
const [certainty, setCertainty] = useState(0.65);
const [alpha, setAlpha] = useState(0.5);
const [rowData, setRowData] = useState<WeaviateObject[]>([]);
const [loading, setLoading] = useState(false);
const [totalCount, setTotalCount] = useState(0);
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
```

**Search Mode Controls:**

| Mode | Additional Controls |
|------|---------------------|
| Semantic | Certainty slider (0-1, step 0.05) |
| Keyword | None |
| Hybrid | Alpha slider (0-1, step 0.1) |

---

## Custom Cell Renderers

AG Grid uses custom cell renderers for better data visualization.

### TruncatedCellRenderer

**Purpose:** Display long text truncated with tooltip

**Behavior:**
- Text ≤ 50 chars: Display normally
- Text > 50 chars: Show first 50 chars + "..."
- Hover: Full text in tooltip

### ArrayCellRenderer

**Purpose:** Display array values as tags

**Behavior:**
- Empty array: Show "-"
- ≤ 2 items: Show all as tags
- > 2 items: Show first 2 + count tag
- Hover: All items in tooltip

### ObjectCellRenderer

**Purpose:** Display object values as badge

**Behavior:**
- Show blue "Object" tag
- Hover: Pretty-printed JSON in tooltip

### ScoreCellRenderer

**Purpose:** Display search scores with visual indicator

**Behavior:**
- Progress bar (0-100% relative to max score)
- Color-coded by score level
- Hover: Detailed score info

**Score Levels:**

| Mode | Score | Level | Color |
|------|-------|-------|-------|
| Semantic | >= 0.8 | Excellent | Green |
| Semantic | 0.6-0.79 | Good | Blue |
| Semantic | 0.4-0.59 | Fair | Orange |
| Semantic | < 0.4 | Weak | Red |
| BM25/Hybrid | >= 80% | Best Match | Green |
| BM25/Hybrid | 50-79% | Good Match | Blue |
| BM25/Hybrid | 25-49% | Partial Match | Orange |
| BM25/Hybrid | < 25% | Weak Match | Red |

---

## AG Grid Configuration

### Column Definitions

```typescript
const columnDefs: ColDef[] = [
  {
    field: 'uuid',
    headerName: 'ID',
    width: 280,
    minWidth: 200,
    pinned: 'left',
    cellStyle: { fontFamily: 'monospace', fontSize: '12px' },
    filter: 'agTextColumnFilter',
  },
  ...properties.map(prop => ({
    field: prop.name,
    headerName: prop.name,
    minWidth: 150,
    flex: 1,
    resizable: true,
    cellRenderer: cellRenderer,
    autoHeight: true,
    filter: 'agTextColumnFilter',
  })),
  {
    field: 'score',
    headerName: 'Score',
    width: 140,
    minWidth: 120,
    pinned: 'right',
    filter: 'agNumberColumnFilter',
    cellRenderer: ScoreCellRenderer,
  },
];
```

### Default Column Definition

```typescript
const defaultColDef: ColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  minWidth: 150,
  wrapText: true,
  autoHeight: true,
};
```

### Grid Features

| Feature | Setting |
|---------|---------|
| Row selection | Single |
| Row height | 48px (auto-height enabled) |
| Header height | 48px |
| Animation | Enabled |
| Pagination | External (custom footer) |
| Row styling | Alternating colors |

### Custom Styling

```css
.ag-theme-alpine {
  --ag-header-background-color: #1890ff;
  --ag-header-foreground-color: #fff;
  --ag-border-color: #1890ff;
  --ag-row-hover-color: #bae7ff;
  --ag-odd-row-background-color: #e6f7ff;
  --ag-even-row-background-color: #ffffff;
}
```

---

## API Client (api.ts)

### Functions

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `getSchema()` | GET /schema | List all collections |
| `getCollectionInfo(name)` | GET /collection/{name} | Get collection details |
| `healthCheck()` | GET /health | Check connection status |
| `searchClass(collection, options)` | POST /class/{name} | Generic search |
| `bm25Search(collection, query, options)` | POST /class/{name}/bm25 | Keyword search |
| `hybridSearch(collection, query, options)` | POST /class/{name}/hybrid | Hybrid search |
| `generativeSearch(collection, prompt, options)` | POST /class/{name}/generate | RAG |
| `aggregateCollection(collection, groupBy)` | POST /class/{name}/aggregate | Aggregation |

### Error Handling

```typescript
async function apiRequest<T>(endpoint: string, options = {}): Promise<T> {
  const response = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}
```

---

## TypeScript Types (types.ts)

### Core Types

```typescript
// Search modes
type SearchMode = 'semantic' | 'keyword' | 'hybrid';

// Collection schema
interface Collection {
  name: string;
  description: string | null;
  properties: Property[];
  vectorizer: string | null;
}

interface Property {
  name: string;
  data_type: string;
  description: string | null;
}

// Search results
interface WeaviateObject {
  uuid: string;
  key: string;
  certainty?: number;
  distance?: number;
  score?: number;
  explain_score?: string;
  generated?: string;
  [key: string]: unknown;
}

interface ApiResponse<T> {
  data: T[];
  count: number;
  search_type: SearchMode | 'fetch' | 'generative';
  alpha?: number;
}

// Health check
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  weaviate?: 'connected' | 'disconnected';
  error?: string;
}
```

---

## State Flow

```
User Action
    │
    ▼
┌─────────────────┐
│ Update State    │ (keyword, certainty, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ useEffect       │ (triggers on state change)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API Call        │ (searchClass)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update rowData  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AG Grid Render  │
└─────────────────┘
```

---

## File Structure

```
frontend/
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Main app with layout
│   ├── api.ts             # API client
│   ├── types.ts           # TypeScript definitions
│   ├── ClassData.tsx      # Collection browser
│   ├── Welcome.tsx        # Schema welcome page
│   ├── customMenu.ts      # Menu configuration
│   ├── index.css          # Global styles
│   ├── App.css            # App styles
│   └── vite-env.d.ts      # Vite types
├── dist/                   # Built output
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.node.json
```

---

## Dependencies (package.json)

```json
{
  "dependencies": {
    "@ant-design/icons": "^5.2.6",
    "@emotion/css": "^11.11.2",
    "@microlink/react-json-view": "^1.26.2",
    "ag-grid-community": "^35.1.0",
    "ag-grid-react": "^35.1.0",
    "antd": "^5.9.0",
    "lodash": "^4.17.21",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/lodash": "^4.17.0",
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react-swc": "^3.8.0",
    "typescript": "^5.0.2",
    "vite": "^6.2.0"
  }
}
```

---

## Related Files

- [API Design](./api-design.md) - Backend endpoints
- [Search Modes](./search-modes.md) - Search implementations
- [Architecture](./architecture.md) - System overview
- [BDD Scenarios](./bdd.md) - Feature 7: AG Grid Results
