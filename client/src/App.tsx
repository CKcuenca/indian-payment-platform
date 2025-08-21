import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import Transactions from './pages/Transactions';
import Merchants from './pages/Merchants';
import PaymentManagement from './pages/PaymentManagement';
import Users from './pages/Users';
import Monitoring from './pages/Monitoring';
import CashGitPaymentTest from './pages/CashGitPaymentTest';
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
  
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (permissions.length > 0 && !permissions.every(p => currentUser.permissions.includes(p))) {
    return <Navigate to="/" replace />;
  }

  if (anyPermission.length > 0 && !anyPermission.some(p => currentUser.permissions.includes(p))) {
    return <Navigate to="/" replace />;
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
              <ProtectedRoute permissions={[Permission.VIEW_ALL_MERCHANTS]}>
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
                  <PaymentManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment-data"
            element={
              <ProtectedRoute permissions={[Permission.SYSTEM_MONITORING]}>
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
            path="/monitoring"
            element={
              <ProtectedRoute permissions={[Permission.SYSTEM_MONITORING]}>
                <Layout>
                  <Monitoring />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/limit-management"
            element={
              <ProtectedRoute permissions={[Permission.SYSTEM_MONITORING]}>
                <Layout>
                  <LimitManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/cashgit-payment-test"
            element={
              <ProtectedRoute permissions={[Permission.SYSTEM_MONITORING]}>
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
