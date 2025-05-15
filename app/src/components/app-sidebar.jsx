import React, { useState } from 'react';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { Link, useLocation } from 'react-router-dom';
import { 
  Book, 
  Calendar, 
  ShoppingCart, 
  Home, 
  BarChart2, 
  Settings, 
  Users, 
  HelpCircle, 
  Moon, 
  Sun,
  Menu as MenuIcon,
  X
} from 'lucide-react';

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const location = useLocation();
  
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };
  
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  // Theme colors
  const colors = {
    dark: {
      sidebar: '#1E293B',
      text: '#E2E8F0',
      activeItem: '#3B82F6',
      activeText: '#FFFFFF',
      hoverBg: '#334155',
      border: '#334155'
    },
    light: {
      sidebar: '#FFFFFF',
      text: '#334155',
      activeItem: '#3B82F6',
      activeText: '#FFFFFF',
      hoverBg: '#F1F5F9',
      border: '#E2E8F0'
    }
  };
  
  const theme = isDarkMode ? colors.dark : colors.light;
  
  // Menu items with icons and paths
  const menuItems = [
    { icon: <Home size={20} />, title: 'Dashboard', path: '/' },
    { icon: <Book size={20} />, title: 'Documentation', path: '/documentation' },
    { icon: <Calendar size={20} />, title: 'Calendar', path: '/calendar' },
    { icon: <ShoppingCart size={20} />, title: 'E-commerce', path: '/e-commerce' },
    { icon: <BarChart2 size={20} />, title: 'Analytics', path: '/analytics' },
    { icon: <Users size={20} />, title: 'Users', path: '/users' },
    { icon: <Settings size={20} />, title: 'Settings', path: '/settings' },
    { icon: <HelpCircle size={20} />, title: 'Help', path: '/help' }
  ];
  
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100vh' }}>
      <Sidebar
        collapsed={collapsed}
        width="250px"
        collapsedWidth="80px"
        backgroundColor={theme.sidebar}
        rootStyles={{
          border: `1px solid ${theme.border}`,
          color: theme.text,
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header with logo and toggle button */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between'
          }}
        >
          {!collapsed && (
            <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
              AppName
            </div>
          )}
          <button
            onClick={toggleSidebar}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: theme.text
            }}
          >
            {collapsed ? <MenuIcon size={20} /> : <X size={20} />}
          </button>
        </div>
        
        {/* Menu items */}
        <Menu
          menuItemStyles={{
            button: ({ active }) => ({
              color: active ? theme.activeText : theme.text,
              backgroundColor: active ? theme.activeItem : 'transparent',
              '&:hover': {
                backgroundColor: active ? theme.activeItem : theme.hoverBg,
                color: active ? theme.activeText : theme.text
              },
              paddingLeft: collapsed ? '24px' : '16px',
              transition: 'all 0.3s ease'
            }),
            icon: ({ active }) => ({
              color: active ? theme.activeText : theme.text
            })
          }}
        >
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              icon={item.icon}
              component={<Link to={item.path} />}
              active={location.pathname === item.path}
            >
              {item.title}
            </MenuItem>
          ))}
        </Menu>
        
        {/* Theme toggle button at the bottom */}
        <div
          style={{
            padding: '20px',
            borderTop: `1px solid ${theme.border}`,
            marginTop: 'auto'
          }}
        >
          <button
            onClick={toggleTheme}
            style={{
              width: '100%',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: theme.text,
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = theme.hoverBg}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            {!collapsed && <span>Toggle Theme</span>}
          </button>
        </div>
      </Sidebar>

      {/* Example of main content area - you would replace this with your actual content */}
      <div
        style={{
          padding: '20px',
          width: '100%',
          backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
          color: isDarkMode ? '#F1F5F9' : '#334155',
          transition: 'all 0.3s ease'
        }}
      >
        <h1 style={{ marginBottom: '20px' }}>Main Content Area</h1>
        <p>Current path: {location.pathname}</p>
      </div>
    </div>
  );
};

export default AppSidebar;