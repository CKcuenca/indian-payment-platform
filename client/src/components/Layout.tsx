import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  AccountBalance,
  Business,
  Monitor,
  Api,
  Person,
  TrendingUp,
  CreditCard
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { Permission } from '../types';
import { PermissionGuard } from './PermissionGuard';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    text: '仪表板',
    icon: <Dashboard />,
    path: '/',
    permissions: []
  },

  {
    text: '交易记录',
    icon: <AccountBalance />,
    path: '/transactions',
    permissions: [Permission.VIEW_ALL_TRANSACTIONS, Permission.VIEW_OWN_TRANSACTIONS]
  },
  {
    text: '商户管理',
    icon: <Business />,
    path: '/merchants',
    permissions: [Permission.VIEW_ALL_MERCHANTS]
  },
  {
    text: '支付管理',
    icon: <CreditCard />,
    path: '/payment-management',
    permissions: [Permission.VIEW_PAYMENT_CONFIG]
  },
  {
    text: '支付统计',
    icon: <TrendingUp />,
    path: '/payment-data',
    permissions: [Permission.SYSTEM_MONITORING]
  },
  {
    text: '用户管理',
    icon: <Person />,
    path: '/users',
    permissions: [Permission.MANAGE_USERS]
  },
  {
    text: '系统监控',
    icon: <Monitor />,
    path: '/monitoring',
    permissions: [Permission.SYSTEM_MONITORING]
  },
  {
    text: '支付测试',
    icon: <Api />,
    path: '/cashgit-payment-test',
    permissions: [Permission.SYSTEM_MONITORING]
  },


];

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const currentUser = authService.getCurrentUser();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
    handleProfileMenuClose();
  };

  const handleProfile = () => {
    navigate('/profile');
    handleProfileMenuClose();
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          CashGit
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <PermissionGuard
            key={item.text}
            permissions={item.permissions}
            anyPermission={item.permissions && item.permissions.length > 0 ? item.permissions : undefined}
          >
            <ListItem disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          </PermissionGuard>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            CashGit - Indian Payment Platform
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* 对接文档链接 - 只有商户用户才能看到 */}
            {currentUser?.role === 'MERCHANT' && (
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                sx={{ mr: 2, borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                onClick={() => window.open('/api-docs', '_blank')}
              >
                对接文档
              </Button>
            )}
            <Typography variant="body2" sx={{ mr: 2 }}>
              {currentUser?.displayName || currentUser?.username}
            </Typography>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                <Person />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        {children}
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
      >
        <MenuItem onClick={handleProfile}>个人资料</MenuItem>
        <MenuItem onClick={handleLogout}>退出登录</MenuItem>
      </Menu>
    </Box>
  );
}
