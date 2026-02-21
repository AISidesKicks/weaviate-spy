# AG Grid Community Refactoring Plan

## Overview
Replace ProTable with AG Grid Community for better column resizing and overall table functionality.

## Why AG Grid Community?
- Built-in column resizing (drag column borders)
- Better performance with large datasets
- Virtual scrolling
- More control over column widths and behavior
- No custom resize implementation needed

## Implementation Steps

### Step 1: Install AG Grid Dependencies
Add to `frontend/package.json`:
```json
"ag-grid-community": "^32.0.0",
"ag-grid-react": "^32.0.0"
```

### Step 2: Rewrite ClassData.tsx
Replace ProTable with AG Grid while maintaining:
- Search mode selector (semantic, keyword, hybrid)
- Certainty/Alpha sliders
- Pagination (server-side)
- Column auto-sizing based on header width
- Resizable columns (built-in AG Grid feature)

### Step 3: Key AG Grid Features to Use
- `defaultColDef.resizable = true` - Enable column resizing
- `defaultColDef.suppressSizeToFit = false` - Allow auto-sizing
- `columnApi.autoSizeAllColumns()` - Auto-size columns on load
- `rowModelType = 'infinite'` - Server-side pagination
- `onGridReady` - Initialize grid and fetch first data

### Step 4: Remove Unused Files
- Delete `frontend/src/ResizableHeader.tsx` (no longer needed)

## Files to Modify
1. `frontend/package.json` - Add AG Grid dependencies
2. `frontend/src/ClassData.tsx` - Complete rewrite with AG Grid

## Expected Result
- Columns sized to fit header text
- Drag-to-resize columns works properly
- Better performance with large datasets
- Cleaner, more maintainable code
