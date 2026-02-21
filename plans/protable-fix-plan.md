# ProTable Configuration Fix Plan

## Problem Statement
The ProTable component in ClassData.tsx is displaying columns too narrow, showing only ~3 characters from headers, and cramming all fields on one page without proper horizontal scrolling.

## Root Causes Identified

### 1. Column Width Calculation Issue
**Location**: `calculateColumnWidth()` function (lines 29-49)

**Problem**: 
```typescript
let baseWidth = Math.floor(availableWidth / Math.max(totalProperties + 1, 1));
```
This divides the available screen width evenly among all properties, resulting in very narrow columns when there are many properties.

**Fix**: Use a minimum column width that ensures headers are visible, and only use the evenly-distributed width as a maximum limit.

### 2. Horizontal Scroll Configuration
**Location**: Line 351 in ProTable props

**Problem**: 
```typescript
scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
```

**Fix**: Calculate the total width explicitly and apply it to enable proper horizontal scrolling.

### 3. Ellipsis Truncating Headers
**Location**: Column configuration in `buildColumns()` (line 159)

**Problem**: `ellipsis: true` applies to both headers and cell content, truncating header text.

**Fix**: Only apply ellipsis to cell content, not headers.

---

## Implementation Steps

### Step 1: Fix Column Width Calculation
Modify the `calculateColumnWidth` function to:
- Set minimum width based on header length (property name) + padding
- Remove the even distribution that makes columns too narrow
- Ensure headers have enough space to display fully

### Step 2: Calculate Total Table Width
Add logic to calculate total width of all columns:
```typescript
const totalWidth = columns.reduce((sum, col) => sum + (col.width || 200), 0);
```

### Step 3: Fix Scroll Configuration
Update ProTable scroll prop:
```typescript
scroll={{ x: totalWidth, y: 'calc(100vh - 320px)' }}
```

### Step 4: Separate Header and Cell Ellipsis
Apply ellipsis only to cell content renderers, not the column definition itself.

---

## Expected Result
- All column headers should display fully without truncation
- Horizontal scrolling should work properly when columns exceed viewport width
- Each column should have minimum width based on its header text length
- Cell content can still be truncated with tooltip for long text

---

## File to Modify
- `frontend/src/ClassData.tsx`
