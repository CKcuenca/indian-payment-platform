import React from 'react';
import { Permission } from '../types';
import { authService } from '../services/authService';

interface PermissionGuardProps {
  permissions?: Permission[];
  anyPermission?: Permission[];
  allPermissions?: Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// 权限保护组件
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permissions = [],
  anyPermission = [],
  allPermissions = [],
  fallback = null,
  children
}) => {
  // 检查是否已登录
  if (!authService.isAuthenticated()) {
    return <>{fallback}</>;
  }

  // 检查单个权限
  if (permissions.length > 0) {
    const hasPermission = permissions.some(permission => 
      authService.hasPermission(permission)
    );
    if (!hasPermission) {
      return <>{fallback}</>;
    }
  }

  // 检查任意权限
  if (anyPermission.length > 0) {
    if (!authService.hasAnyPermission(anyPermission)) {
      return <>{fallback}</>;
    }
  }

  // 检查所有权限
  if (allPermissions.length > 0) {
    const hasAllPermissions = allPermissions.every(permission => 
      authService.hasPermission(permission)
    );
    if (!hasAllPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

// 角色保护组件
interface RoleGuardProps {
  roles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  roles = [],
  fallback = null,
  children
}) => {
  if (!authService.isAuthenticated()) {
    return <>{fallback}</>;
  }

  const currentUser = authService.getCurrentUser();
  if (!currentUser || (roles.length > 0 && !roles.includes(currentUser.role))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// 商户数据保护组件
interface MerchantDataGuardProps {
  merchantId: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const MerchantDataGuard: React.FC<MerchantDataGuardProps> = ({
  merchantId,
  fallback = null,
  children
}) => {
  if (!authService.isAuthenticated()) {
    return <>{fallback}</>;
  }

  if (!authService.canViewMerchantData(merchantId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// 隐藏敏感信息的组件
interface SensitiveDataGuardProps {
  showSensitiveData?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const SensitiveDataGuard: React.FC<SensitiveDataGuardProps> = ({
  showSensitiveData = false,
  children,
  fallback = <span style={{ color: '#999' }}>***</span>
}) => {
  // 管理员可以查看所有敏感信息
  if (authService.isAdmin()) {
    return <>{children}</>;
  }

  // 如果明确要求显示敏感数据，检查权限
  if (showSensitiveData) {
    // 只有管理员可以查看支付配置等敏感信息
    if (!authService.isAdmin()) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}; 