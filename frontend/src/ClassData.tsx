/**
 * ClassData Component - v0.3.0
 * Refactored to use AG Grid Community for better column resizing
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, GridApi, ICellRendererParams } from 'ag-grid-community';
import { Radio, Slider, Space, Tag, Tooltip, Input, Spin, Select, Button, Pagination } from 'antd';
import {
  SearchOutlined,
  ThunderboltOutlined,
  SyncOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { searchClass } from './api';
import type {
  SearchMode,
  WeaviateObject,
  Property,
} from './types';

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface ClassDataProps {
  pathname: string;
  properties: Property[];
}

// Custom cell renderer for truncated text with tooltip
const TruncatedCellRenderer = (props: ICellRendererParams) => {
  const value = props.value;
  if (value === null || value === undefined) return <span>-</span>;
  
  const displayText = typeof value === 'object' 
    ? JSON.stringify(value) 
    : String(value);
  
  if (displayText.length <= 50) {
    return <span>{displayText}</span>;
  }
  
  return (
    <Tooltip title={displayText}>
      <span style={{ cursor: 'pointer' }}>
        {displayText.substring(0, 50)}...
      </span>
    </Tooltip>
  );
};

// Custom cell renderer for arrays
const ArrayCellRenderer = (props: ICellRendererParams) => {
  const value = props.value;
  if (!value || !Array.isArray(value) || value.length === 0) {
    return <span>-</span>;
  }
  
  if (value.length <= 2) {
    return (
      <span>
        {value.map((v, i) => (
          <Tag key={i} style={{ margin: '1px', fontSize: '11px' }}>
            {String(v).substring(0, 20)}
          </Tag>
        ))}
      </span>
    );
  }
  
  return (
    <Tooltip title={value.map((v) => String(v)).join(', ')}>
      <span>
        {value.slice(0, 2).map((v, i) => (
          <Tag key={i} style={{ margin: '1px', fontSize: '11px' }}>
            {String(v).substring(0, 15)}
          </Tag>
        ))}
        <Tag style={{ margin: '1px', fontSize: '11px' }}>+{value.length - 2}</Tag>
      </span>
    </Tooltip>
  );
};

// Custom cell renderer for objects
const ObjectCellRenderer = (props: ICellRendererParams) => {
  const value = props.value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return <TruncatedCellRenderer {...props} />;
  }
  
  return (
    <Tooltip title={JSON.stringify(value, null, 2)}>
      <Tag color="blue" style={{ cursor: 'pointer' }}>Object</Tag>
    </Tooltip>
  );
};

// Custom cell renderer for score with visual indicator
const ScoreCellRenderer = (props: ICellRendererParams) => {
  const data = props.data;
  if (!data) return <span>-</span>;
  
  const score = data.score ?? data.certainty ?? data.distance;
  if (score === undefined || score === null) return <span>-</span>;
  
  const explainScore = data.explain_score;
  const maxScore = (props.context as { maxScore?: number })?.maxScore ?? score;
  const searchType = (props.context as { searchType?: string })?.searchType ?? 'semantic';
  
  // Calculate relative score (0-100%)
  const relativeScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
  
  // Determine score level and color
  let color = '#ff4d4f'; // red for low
  let label = 'Low';
  
  if (searchType === 'keyword' || searchType === 'bm25') {
    // For BM25, use relative scoring
    if (relativeScore >= 80) {
      color = '#52c41a'; // green
      label = 'Best Match';
    } else if (relativeScore >= 50) {
      color = '#1890ff'; // blue
      label = 'Good Match';
    } else if (relativeScore >= 25) {
      color = '#faad14'; // orange
      label = 'Partial Match';
    } else {
      color = '#ff4d4f'; // red
      label = 'Weak Match';
    }
  } else {
    // For semantic/hybrid, use absolute scoring
    if (score >= 0.8) {
      color = '#52c41a';
      label = 'Excellent';
    } else if (score >= 0.6) {
      color = '#1890ff';
      label = 'Good';
    } else if (score >= 0.4) {
      color = '#faad14';
      label = 'Fair';
    } else {
      color = '#ff4d4f';
      label = 'Weak';
    }
  }
  
  return (
    <Tooltip title={
      <div>
        <div><strong>Score:</strong> {typeof score === 'number' ? score.toFixed(4) : score}</div>
        <div><strong>Level:</strong> {label}</div>
        {searchType === 'keyword' && (
          <div><strong>Relative:</strong> {relativeScore.toFixed(1)}%</div>
        )}
        {explainScore && (
          <div style={{ marginTop: '8px', maxWidth: '300px' }}>
            <strong>Explanation:</strong>
            <div style={{ fontSize: '11px', marginTop: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {explainScore}
            </div>
          </div>
        )}
      </div>
    }>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
        {/* Progress bar */}
        <div style={{ 
          width: '40px', 
          height: '8px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${Math.min(100, relativeScore)}%`, 
            height: '100%', 
            backgroundColor: color,
            transition: 'width 0.3s ease'
          }} />
        </div>
        {/* Score value */}
        <span style={{ fontSize: '11px', fontWeight: 500, color }}>
          {typeof score === 'number' ? score.toFixed(2) : score}
        </span>
      </div>
    </Tooltip>
  );
};

// Cell renderer selector
const cellRenderer = (props: ICellRendererParams) => {
  const value = props.value;
  
  if (value === null || value === undefined) {
    return <span>-</span>;
  }
  
  if (Array.isArray(value)) {
    return <ArrayCellRenderer {...props} />;
  }
  
  if (typeof value === 'object') {
    return <ObjectCellRenderer {...props} />;
  }
  
  return <TruncatedCellRenderer {...props} />;
};

export default function ClassData({ pathname, properties }: ClassDataProps) {
  const defaultCertainty = 0.65;
  const defaultAlpha = 0.5;

  // State
  const [searchMode, setSearchMode] = useState<SearchMode>('semantic');
  const [keyword, setKeyword] = useState('');
  const [certainty, setCertainty] = useState(defaultCertainty);
  const [alpha, setAlpha] = useState(defaultAlpha);
  const [rowData, setRowData] = useState<WeaviateObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const gridRef = useRef<AgGridReact>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  // Extract collection name from pathname
  const collection = pathname.replace('/class/', '');
  
  // Memoize property names to prevent unnecessary re-renders
  const propertyNames = useMemo(() => properties.map((p) => p.name), [properties]);

  // Calculate max score from row data for relative scoring
  const maxScore = useMemo(() => {
    if (rowData.length === 0) return 0;
    const scores = rowData
      .map(row => row.score ?? row.certainty ?? row.distance)
      .filter((s): s is number => typeof s === 'number');
    return scores.length > 0 ? Math.max(...scores) : 0;
  }, [rowData]);

  // Context for AG Grid (passed to cell renderers)
  const gridContext = useMemo(() => ({
    maxScore,
    searchType: searchMode,
  }), [maxScore, searchMode]);

  // Build column definitions
  const columnDefs: ColDef[] = [
    {
      field: 'uuid',
      headerName: 'ID',
      width: 280,
      minWidth: 200,
      pinned: 'left',
      cellStyle: { fontFamily: 'monospace', fontSize: '12px' },
      filter: 'agTextColumnFilter',
      filterParams: {
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
    },
    ...properties.map((prop): ColDef => ({
      field: prop.name,
      headerName: prop.name,
      minWidth: 150,
      flex: 1,
      resizable: true,
      cellRenderer: cellRenderer,
      autoHeight: true,
      filter: 'agTextColumnFilter',
      filterParams: {
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
    })),
    {
      field: 'score',
      headerName: 'Score',
      width: 140,
      minWidth: 120,
      pinned: 'right',
      filter: 'agNumberColumnFilter',
      filterParams: {
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      cellRenderer: ScoreCellRenderer,
      valueGetter: (params) => {
        const data = params.data;
        if (!data) return undefined;
        const score = data.score ?? data.certainty ?? data.distance;
        return score;
      },
    },
  ];

  // Default column definition
  const defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    minWidth: 150,
    wrapText: true,
    autoHeight: true,
  };

  // Fetch data
  const fetchData = useCallback(async (page: number = 1, limit: number = 20) => {
    if (!collection || propertyNames.length === 0) return;
    
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const response = await searchClass(collection, {
        offset,
        limit,
        query: keyword,
        certainty,
        alpha,
        mode: searchMode,
        properties: propertyNames,
      });

      if (isMounted.current) {
        setRowData(response.data);
        setTotalCount(response.count);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (isMounted.current) {
        setRowData([]);
        setTotalCount(0);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [collection, keyword, certainty, alpha, searchMode, propertyNames]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Reset page to 1 when search params change
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, certainty, alpha, searchMode]);

  // Initial fetch and when search params change
  // Only fetch when properties are available (not empty)
  useEffect(() => {
    if (propertyNames.length === 0 || !collection) {
      return;
    }
    
    let cancelled = false;
    const doFetch = async () => {
      setLoading(true);
      
      // Debug logging
      console.log('[ClassData] Fetching data with params:', {
        collection,
        currentPage,
        pageSize,
        keyword,
        certainty,
        alpha,
        searchMode,
        propertyNames,
      });
      
      try {
        const offset = (currentPage - 1) * pageSize;
        const response = await searchClass(collection, {
          offset,
          limit: pageSize,
          query: keyword,
          certainty,
          alpha,
          mode: searchMode,
          properties: propertyNames,
        });
        
        console.log('[ClassData] Response:', response);

        if (!cancelled) {
          setRowData(response.data);
          setTotalCount(response.count);
        }
      } catch (error) {
        console.error('[ClassData] Failed to fetch data:', error);
        console.error('[ClassData] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        if (!cancelled) {
          setRowData([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    doFetch();
    
    return () => {
      cancelled = true;
    };
  }, [collection, keyword, certainty, alpha, searchMode, pageSize, currentPage, propertyNames]);

  // Handle search
  const handleSearch = (value: string) => {
    setKeyword(value);
  };

  // Handle mode change
  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
  };

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Fetch is handled by useEffect
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((current: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    // Fetch is handled by useEffect
  }, []);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div
      style={{
        height: 'calc(100vh - 150px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Search Controls */}
      <div
        style={{
          padding: '12px 16px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '8px',
          flexShrink: 0,
        }}
      >
        <Space size="middle" wrap>
          {/* Search Mode Selector */}
          <Radio.Group
            value={searchMode}
            onChange={(e) => handleModeChange(e.target.value)}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="semantic">
              <ThunderboltOutlined /> Semantic
            </Radio.Button>
            <Radio.Button value="keyword">
              <SearchOutlined /> Keyword
            </Radio.Button>
            <Radio.Button value="hybrid">
              <SyncOutlined /> Hybrid
            </Radio.Button>
          </Radio.Group>

          {/* Search Input */}
          <Input.Search
            ref={searchInputRef as any}
            placeholder="Search..."
            onSearch={handleSearch}
            style={{ width: 400 }}
            allowClear
            enterButton
          />

          {/* Certainty Slider (for semantic mode) */}
          {searchMode === 'semantic' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Certainty:</span>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={certainty}
                onChange={setCertainty}
                style={{ width: 120 }}
                marks={{ 0: '0', 0.5: '0.5', 1: '1' }}
              />
              <span style={{ fontSize: '12px' }}>{certainty.toFixed(2)}</span>
            </div>
          )}

          {/* Alpha Slider (for hybrid mode) */}
          {searchMode === 'hybrid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Alpha:</span>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={alpha}
                onChange={setAlpha}
                style={{ width: 120 }}
                marks={{ 0: 'BM25', 0.5: 'Balanced', 1: 'Vector' }}
              />
              <span style={{ fontSize: '12px' }}>{alpha.toFixed(1)}</span>
            </div>
          )}
        </Space>
      </div>

      {/* AG Grid */}
      <div style={{ flex: 1, position: 'relative', minHeight: 400 }}>
        {propertyNames.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <Spin tip="Loading properties..." />
          </div>
        ) : (
          <Spin spinning={loading} tip="Loading data...">
            <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 350px)', width: '100%', minHeight: 400 }}>
              <AgGridReact
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                context={gridContext}
                animateRows={true}
                rowSelection="single"
                suppressCellFocus={true}
                suppressRowClickSelection={true}
                headerHeight={48}
                rowHeight={48}
                pagination={false}
                getRowStyle={(params) => {
                  if (params.node.rowIndex !== null && params.node.rowIndex !== undefined) {
                    return {
                      backgroundColor: params.node.rowIndex % 2 === 0 ? '#ffffff' : '#e6f7ff'
                    };
                  }
                  return {};
                }}
                onGridReady={() => {
                  // Size columns to fit the grid width
                  if (gridRef.current?.api) {
                    gridRef.current.api.sizeColumnsToFit();
                  }
                }}
              />
            </div>
          </Spin>
        )}
      </div>

      {/* Footer with pagination */}
      <div
        style={{
          padding: '16px',
          background: '#fafafa',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '14px', color: '#666' }}>
          Total: {totalCount} items
        </span>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={totalCount}
          onChange={handlePageChange}
          onShowSizeChange={handlePageSizeChange}
          showSizeChanger
          showQuickJumper
          pageSizeOptions={['10', '20', '50', '100']}
          showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
        />
      </div>

      {/* AG Grid Styles */}
      <style>{`
        .ag-theme-alpine {
          --ag-header-background-color: #1890ff;
          --ag-header-foreground-color: #fff;
          --ag-border-color: #1890ff;
          --ag-row-hover-color: #bae7ff;
          --ag-odd-row-background-color: #e6f7ff;
          --ag-even-row-background-color: #ffffff;
          --ag-font-size: 14px;
          --ag-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          --ag-row-border-color: #1890ff;
        }
        .ag-header-cell {
          font-weight: 600;
          border-right: 1px solid #40a9ff !important;
        }
        .score-high {
          color: #52c41a;
          font-weight: bold;
        }
        .ag-cell {
          display: flex;
          align-items: center;
          padding: 4px 12px;
          border-right: 1px solid #1890ff !important;
        }
        .ag-row {
          border-bottom: 1px solid #1890ff;
        }
        .ag-row-odd {
          background-color: #e6f7ff !important;
        }
        .ag-row-even {
          background-color: #ffffff !important;
        }
        .ag-row-hover {
          background-color: #bae7ff !important;
        }
        .ag-root-wrapper {
          border: 2px solid #1890ff;
          border-radius: 8px;
          overflow: hidden;
        }
        .ag-header {
          border-bottom: 2px solid #1890ff;
        }
      `}</style>
    </div>
  );
}
