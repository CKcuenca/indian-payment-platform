import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import Transactions from './pages/Transactions';
import Merchants from './pages/Merchants';
import PaymentManagementNew from './pages/PaymentManagementNew';
import Users from './pages/Users';
import MerchantKeyManagement from './pages/MerchantKeyManagement';

import CashGitPaymentTest from './pages/CashGitPaymentTest';

import Orders from './pages/Orders';

import PaymentData from './pages/PaymentData';
import LimitManagement from './pages/LimitManagement';



import { useAuth } from './hooks/useAuth';
import { Permission } from './types';

// 创建主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: Permission[];
  anyPermission?: Permission[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  permissions = [], 
  anyPermission = [] 
}) => {
  const { isAuthenticated, currentUser } = useAuth();
  
  // 开发环境调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log('=== ProtectedRoute 权限检查调试 ===');
    console.log('路径:', window.location.pathname);
    console.log('认证状态:', isAuthenticated);
    console.log('用户角色:', currentUser?.role);
    console.log('需要权限:', permissions);
  }
  
  if (!isAuthenticated || !currentUser) {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ 用户未认证，重定向到登录页面');
    }
    return <Navigate to="/login" replace />;
  }

  if (permissions.length > 0) {
    const hasAllPermissions = permissions.every(p => currentUser.permissions.includes(p));
    if (process.env.NODE_ENV === 'development') {
      console.log('检查所有权限:', permissions, '结果:', hasAllPermissions);
    }
    if (!hasAllPermissions) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ 用户缺少必要权限，重定向到仪表盘');
      }
      return <Navigate to="/" replace />;
    }
  }

  if (anyPermission.length > 0) {
    const hasAnyPermission = anyPermission.some(p => currentUser.permissions.includes(p));
    if (process.env.NODE_ENV === 'development') {
      console.log('检查任意权限:', anyPermission, '结果:', hasAnyPermission);
    }
    if (!hasAnyPermission) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ 用户缺少任意权限，重定向到仪表盘');
      }
      return <Navigate to="/" replace />;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ 权限检查通过，渲染组件');
  }
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={<Login />} 
          />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute anyPermission={[Permission.VIEW_ALL_TRANSACTIONS, Permission.VIEW_OWN_ORDERS]}>
                <Layout>
                  <Orders />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/transactions"
            element={
              <ProtectedRoute anyPermission={[Permission.VIEW_ALL_TRANSACTIONS, Permission.VIEW_OWN_TRANSACTIONS]}>
                <Layout>
                  <Transactions />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/merchants"
            element={
              <ProtectedRoute anyPermission={[Permission.VIEW_ALL_MERCHANTS, Permission.VIEW_OWN_MERCHANT_DATA]}>
                <Layout>
                  <Merchants />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment-management"
            element={
              <ProtectedRoute permissions={[Permission.VIEW_PAYMENT_CONFIG]}>
                <Layout>
                  <PaymentManagementNew />
                </Layout>
              </ProtectedRoute>
            }
          />



          <Route
            path="/payment-data"
            element={
              <ProtectedRoute>
                <Layout>
                  <PaymentData />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute permissions={[Permission.MANAGE_USERS]}>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />



          <Route
            path="/limit-management"
            element={
              <ProtectedRoute>
                <Layout>
                  <LimitManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/cashgit-payment-test"
            element={
              <ProtectedRoute>
                <Layout>
                  <CashGitPaymentTest />
                </Layout>
              </ProtectedRoute>
            }
          />





          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <div>个人资料页面（待实现）</div>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/merchant-keys"
            element={
              <ProtectedRoute anyPermission={[Permission.VIEW_OWN_MERCHANT_DATA, Permission.MANAGE_MERCHANTS]}>
                <Layout>
                  <MerchantKeyManagement />
                </Layout>
              </ProtectedRoute>
            }
          />




          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;