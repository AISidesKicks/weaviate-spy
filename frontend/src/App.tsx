/**
 * Weaviate Spy App - v0.3.0
 * Refactored to use AG Grid and Ant Design Layout
 */

import { useEffect, useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  BorderlessTableOutlined,
  TableOutlined,
  HeartOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { getSchema, healthCheck } from './api';
import { Collection } from './types';
import ClassData from './ClassData';
import Welcome from './Welcome';

const { Header, Sider, Content } = Layout;

export default function App() {
  const [pathname, setPathname] = useState('/');
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [class2props, setClass2props] = useState<Record<string, Collection['properties']>>({});
  const [collapsed, setCollapsed] = useState(false);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Check health on mount
  useEffect(() => {
    healthCheck()
      .then((res) => {
        setIsHealthy(res.status === 'healthy');
      })
      .catch(() => {
        setIsHealthy(false);
      });
  }, []);

  // Load schema on mount
  useEffect(() => {
    getSchema()
      .then((schemas) => {
        const classes = Object.values(schemas) as Collection[];
        setCollections(classes);
        
        // Build property map
        const propMap: Record<string, Collection['properties']> = {};
        classes.forEach((schema: Collection) => {
          const key = `/class/${schema.name}`;
          propMap[key] = schema.properties;
        });
        setClass2props(propMap);
      })
      .catch((error) => {
        console.error('Failed to load schema:', error);
      });
  }, []);

  // Build menu items
  const menuItems = [
    {
      key: '/schema',
      icon: <BorderlessTableOutlined />,
      label: 'Schema',
    },
    {
      key: '/class',
      icon: <TableOutlined />,
      label: 'Collections',
      children: collections.map((schema) => ({
        key: `/class/${schema.name}`,
        icon: <DatabaseOutlined />,
        label: schema.name,
      })),
    },
  ];

  // Handle menu click
  const onMenuClick = ({ key }: { key: string }) => {
    setPathname(key);
  };

  // Get selected keys and open keys
  const getSelectedKeys = () => {
    if (pathname === '/' || pathname === '/schema') {
      return ['/schema'];
    }
    return [pathname];
  };

  const getOpenKeys = () => {
    if (pathname.startsWith('/class/')) {
      return ['/class'];
    }
    return [];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="light"
        width={220}
      >
        <div
          style={{
            height: 32,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 24 }}>🕵️</span>
          {!collapsed && (
            <span style={{ fontSize: 20, fontWeight: 600 }}>Weaviate Spy</span>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={onMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          {isHealthy !== null && (
            <span
              style={{
                fontSize: '14px',
                color: isHealthy ? '#52c41a' : '#ff4d4f',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <HeartOutlined />
              {isHealthy ? 'Connected' : 'Disconnected'}
            </span>
          )}
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          {pathname === '/' || pathname === '/schema' ? (
            <Welcome />
          ) : (
            <ClassData
              pathname={pathname}
              properties={class2props[pathname] || []}
            />
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
