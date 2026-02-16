import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getSchema } from "./api";
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef, ICellRendererParams } from 'ag-grid-community';
import { Modal, Table, Tag, Button, Space, Tooltip, Input, Pagination } from 'antd';
import { InfoCircleOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { Collection, Property } from "./types";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Custom cell renderer for properties count with view button
const PropertiesCellRenderer = (props: ICellRendererParams) => {
  const count = props.value?.length || 0;
  const onClick = props.colDef?.cellRendererParams?.onClick;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(props.data);
    }
  };
  
  return (
    <Space>
      <Tag color="blue">{count} properties</Tag>
      {count > 0 && (
        <Button 
          type="link" 
          size="small" 
          icon={<EyeOutlined />}
          onClick={handleClick}
        >
          View
        </Button>
      )}
    </Space>
  );
};

// Custom cell renderer for distance metric
const DistanceMetricCellRenderer = (props: ICellRendererParams) => {
  const value = props.value;
  if (!value) return <Tag>default</Tag>;
  
  const colorMap: Record<string, string> = {
    'cosine': 'green',
    'l2-squared': 'orange',
    'ip': 'blue',
    'dot': 'blue',
    'hamming': 'purple',
    'manhattan': 'cyan',
  };
  
  return (
    <Tag color={colorMap[value] || 'default'}>
      {value}
    </Tag>
  );
};

// Custom cell renderer for vector index type
const VectorIndexCellRenderer = (props: ICellRendererParams) => {
  const value = props.value;
  if (!value) return <span>-</span>;
  
  return (
    <Tag color="purple">
      {value}
    </Tag>
  );
};

export default function Welcome() {
  const [schemas, setSchemas] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  useEffect(() => {
    getSchema().then((schemas) => {
      let classes = Object.values(schemas);
      setSchemas(classes);
    });
  }, []);

  // Handle viewing properties
  const handleViewProperties = useCallback((record: any) => {
    const collection = schemas.find(s => s.name === record.className);
    if (collection) {
      setSelectedCollection(collection);
      setModalVisible(true);
    }
  }, [schemas]);

  // Transform schema data for the grid
  const allRowData = useMemo(() => {
    return schemas.map((schema: Collection) => {
      // Extract vector index config info
      const vectorConfigValues = Object.values(schema.vector_config || {}) as any[];
      const vectorIndexConfig = vectorConfigValues[0]?.vector_index_config || {};
      const distanceMetric = vectorIndexConfig.distance_metric || 'cosine';
      
      // Determine vector index type (hnsw, flat, etc.)
      let vectorIndexType = 'hnsw'; // default
      if (vectorIndexConfig.max_connections !== undefined) {
        vectorIndexType = 'hnsw';
      } else if (vectorIndexConfig.flat_search_cutoff !== undefined) {
        vectorIndexType = 'flat';
      }
      
      return {
        className: schema.name,
        description: schema.description || 'No description',
        properties: schema.properties || [],
        propertiesCount: (schema.properties || []).length,
        vectorizer: Object.values(schema.vector_config || [])
          .map((config: any) => config.vectorizer?.vectorizer || 'none')
          .join(", ") || 'none',
        distanceMetric: distanceMetric,
        vectorIndexType: vectorIndexType,
      };
    });
  }, [schemas]);

  // Filter data based on search text
  const filteredData = useMemo(() => {
    if (!searchText) return allRowData;
    const lowerSearch = searchText.toLowerCase();
    return allRowData.filter((row: any) => 
      row.className?.toLowerCase().includes(lowerSearch) ||
      row.description?.toLowerCase().includes(lowerSearch) ||
      row.vectorizer?.toLowerCase().includes(lowerSearch) ||
      row.distanceMetric?.toLowerCase().includes(lowerSearch) ||
      row.vectorIndexType?.toLowerCase().includes(lowerSearch)
    );
  }, [allRowData, searchText]);

  // Paginated data
  const rowData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize]);

  // Total count
  const totalCount = filteredData.length;

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((current: number, size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  // Column definitions
  const colDefs = useMemo<ColDef[]>(() => [
    {
      field: 'className',
      headerName: 'Collection',
      minWidth: 180,
      flex: 1,
      cellStyle: { fontWeight: 'bold' },
      filter: 'agTextColumnFilter',
      filterParams: {
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
    },
    {
      field: 'description',
      headerName: 'Description',
      minWidth: 200,
      flex: 1,
      filter: 'agTextColumnFilter',
      filterParams: {
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
    },
    {
      field: 'properties',
      headerName: 'Properties',
      minWidth: 180,
      cellRenderer: PropertiesCellRenderer,
      cellRendererParams: {
        onClick: handleViewProperties,
      },
      filter: false, // Disable filter for this column
    },
    {
      field: 'vectorizer',
      headerName: 'Vectorizer',
      minWidth: 150,
      flex: 1,
      filter: 'agTextColumnFilter',
      filterParams: {
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      cellRenderer: (props: ICellRendererParams) => {
        const value = props.value;
        if (!value || value === 'none') {
          return <Tag color="default">none</Tag>;
        }
        // Truncate long vectorizer names
        const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
        return (
          <Tooltip title={value}>
            <Tag color="blue">{displayValue}</Tag>
          </Tooltip>
        );
      },
    },
    {
      field: 'vectorIndexType',
      headerName: 'Index Type',
      minWidth: 120,
      cellRenderer: VectorIndexCellRenderer,
      filter: 'agSetColumnFilter',
      filterParams: {
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
    },
    {
      field: 'distanceMetric',
      headerName: 'Distance',
      minWidth: 120,
      cellRenderer: DistanceMetricCellRenderer,
      filter: 'agSetColumnFilter',
      filterParams: {
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
    },
  ], [handleViewProperties]);

  // Default column definition
  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    minWidth: 100,
  }), []);

  // Properties table columns for modal
  const propertiesColumns = [
    {
      title: 'Property Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: 'Data Type',
      dataIndex: 'data_type',
      key: 'data_type',
      render: (type: string) => <Tag color="green">{type}</Tag>,
    },
    {
      title: 'Tokenization',
      dataIndex: 'tokenization',
      key: 'tokenization',
      render: (tokenization: string | null) => tokenization ? <Tag color="orange">{tokenization}</Tag> : <span>-</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || '-',
    },
  ];

  return (
    <div
      style={{
        height: 'calc(100vh - 150px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
      }}
    >
      {/* Header with Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '4px' }}>Schema</h2>
          <p style={{ color: '#666', margin: 0 }}>All collections in the schema</p>
        </div>
        <Input.Search
          placeholder="Search collections..."
          allowClear
          style={{ width: 500 }}
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>
      
      {/* AG Grid */}
      <div style={{ flex: 1, position: 'relative', minHeight: 400 }}>
        <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 350px)', width: '100%', minHeight: 400 }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
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
          />
        </div>
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
      
      {/* Properties Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined />
            Properties for: {selectedCollection?.name}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedCollection && (
          <div>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              {selectedCollection.description || 'No description available'}
            </p>
            <Table
              dataSource={selectedCollection.properties || []}
              columns={propertiesColumns}
              rowKey="name"
              pagination={false}
              size="small"
              bordered
            />
          </div>
        )}
      </Modal>
      
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
        .ag-cell {
          border-right: 1px solid #1890ff !important;
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
