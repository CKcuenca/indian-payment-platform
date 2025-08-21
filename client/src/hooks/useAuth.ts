import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { User, Permission } from '../types';

/**
 * 认证状态Hook
 * 提供响应式的认证状态管理，自动同步AuthService状态
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 监听认证状态变化事件
    const handleAuthStateChange = (event: CustomEvent) => {
      const { isAuthenticated: newAuthState, user } = event.detail;
      setIsAuthenticated(newAuthState);
      setCurrentUser(user || null);
    };

    // 添加事件监听器
    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);

    // 清理函数
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
    };
  }, []);

  // 登录方法
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.login({ username, password });
      // 状态会通过事件自动更新
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 登出方法
  const logout = () => {
    authService.logout();
    // 状态会通过事件自动更新
  };

  // 检查权限
  const hasPermission = (permission: Permission) => {
    return authService.hasPermission(permission);
  };

  // 检查是否有任意权限
  const hasAnyPermission = (permissions: Permission[]) => {
    return authService.hasAnyPermission(permissions);
  };

  // 获取权限管理器
  const getPermissionManager = () => {
    return authService.getPermissionManager();
  };

  return {
    isAuthenticated,
    currentUser,
    isLoading,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    getPermissionManager
  };
}
