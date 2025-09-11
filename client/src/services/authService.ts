import api from './api';
import { User, Permission, ApiResponse } from '../types';
import { createPermissionManager, PermissionManager } from '../utils/permissions';

// 登录请求接口
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应接口
export interface LoginResponse {
  user: User;
  token: string;
  permissions: Permission[];
}

// 认证服务类
class AuthService {
  private currentUser: User | null = null;
  private permissionManager: PermissionManager | null = null;
  private token: string | null = null;

  constructor() {
    // 从本地存储恢复用户状态
    this.token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    const tokenExpiry = localStorage.getItem('token_expiry');
    
    // 检查token是否过期
    if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
      this.clearAuth();
      return;
    }
    
    if (userData && this.token) {
      try {
        this.currentUser = JSON.parse(userData);
        this.initializePermissionManager();
        
        // 设置API请求头
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      } catch (error) {
        console.error('Failed to parse user data:', error);
        this.clearAuth();
      }
    }
  }

  // 初始化权限管理器
  private initializePermissionManager() {
    if (this.currentUser) {
      this.permissionManager = createPermissionManager(
        this.currentUser.role,
        this.currentUser.permissions,
        this.currentUser.merchantId
      );
    }
  }

  // 登录
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>('/api/auth/login', credentials);
      
      if (response.data.success) {
        const { user, token, permissions } = response.data.data;
        
        // 保存认证信息
        this.currentUser = user;
        this.token = token;
        this.currentUser.permissions = permissions;
        
        // 保存到本地存储（设置token 24小时后过期）
        const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(this.currentUser)); // 保存包含权限的完整用户对象
        localStorage.setItem('token_expiry', expiryTime.toString());
        
        // 初始化权限管理器
        this.initializePermissionManager();
        
        // 设置 API 请求头
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // 触发自定义事件，通知其他组件状态变化
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
          detail: { isAuthenticated: true, user: this.currentUser } 
        }));
        
        return response.data.data;
      } else {
        throw new Error(response.data.error || '登录失败');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '登录失败');
    }
  }

  // 登出
  logout(): void {
    this.clearAuth();
    // 清除 API 请求头
    delete api.defaults.headers.common['Authorization'];
    
    // 触发自定义事件，通知其他组件状态变化
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
      detail: { isAuthenticated: false } 
    }));
  }

  // 清除认证信息
  private clearAuth(): void {
    this.currentUser = null;
    this.permissionManager = null;
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_expiry');
  }

  // 检查token是否即将过期
  isTokenExpiringSoon(): boolean {
    const tokenExpiry = localStorage.getItem('token_expiry');
    if (!tokenExpiry) return false;
    
    // 如果30分钟内过期，返回true
    const expiry = parseInt(tokenExpiry);
    const thirtyMinutes = 30 * 60 * 1000;
    return (expiry - Date.now()) < thirtyMinutes;
  }

  // 刷新token（如果支持）
  async refreshToken(): Promise<boolean> {
    try {
      if (!this.token) return false;
      
      const response = await api.post('/api/auth/refresh', { token: this.token });
      if (response.data.success) {
        const { token: newToken } = response.data.data;
        this.token = newToken;
        
        // 更新本地存储
        const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('token_expiry', expiryTime.toString());
        
        // 更新API请求头
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  }

  // 获取当前用户
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // 获取当前token
  getToken(): string | null {
    return this.token;
  }

  // 获取权限管理器
  getPermissionManager(): PermissionManager | null {
    return this.permissionManager;
  }

  // 检查是否已登录
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.token !== null;
  }

  // 检查是否有指定权限
  hasPermission(permission: Permission): boolean {
    return this.permissionManager?.hasPermission(permission) || false;
  }

  // 检查是否有多个权限中的任意一个
  hasAnyPermission(permissions: Permission[]): boolean {
    return this.permissionManager?.hasAnyPermission(permissions) || false;
  }

  // 检查是否是管理员
  isAdmin(): boolean {
    return this.permissionManager?.isAdmin() || false;
  }

  // 检查是否是运营人员
  isOperator(): boolean {
    return this.permissionManager?.isOperator() || false;
  }

  // 检查是否是商户
  isMerchant(): boolean {
    return this.permissionManager?.isMerchant() || false;
  }

  // 检查是否可以查看指定商户的数据
  canViewMerchantData(targetMerchantId: string): boolean {
    return this.permissionManager?.canViewMerchantData(targetMerchantId) || false;
  }

  // 获取用户角色显示名称
  getRoleDisplayName(): string {
    return this.permissionManager?.getRoleDisplayName() || '未知角色';
  }

  // 获取菜单权限
  getMenuPermissions() {
    return this.permissionManager?.getMenuPermissions() || {
      dashboard: false,
      merchants: false,
      orders: false,
      transactions: false,
      paymentConfig: false,
      users: false,
      systemMonitoring: false
    };
  }

  // 刷新用户信息
  async refreshUserInfo(): Promise<void> {
    try {
      const response = await api.get<ApiResponse<User>>('/auth/profile');
      if (response.data.success) {
        this.currentUser = response.data.data;
        this.initializePermissionManager();
        localStorage.setItem('user_data', JSON.stringify(this.currentUser));
      }
    } catch (error) {
      console.error('Failed to refresh user info:', error);
    }
  }

  // 获取用户资料
  async getProfile(): Promise<User> {
    try {
      const response = await api.get<ApiResponse<User>>('/api/auth/profile');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || '获取用户资料失败');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '获取用户资料失败');
    }
  }

  // 更新用户资料
  async updateProfile(profileData: Partial<User>): Promise<User> {
    try {
      const response = await api.put<ApiResponse<User>>('/api/auth/profile', profileData);
      
      if (response.data.success) {
        // 更新本地用户数据
        this.currentUser = { ...this.currentUser, ...response.data.data };
        localStorage.setItem('user_data', JSON.stringify(this.currentUser));
        
        return response.data.data;
      } else {
        throw new Error(response.data.error || '更新用户资料失败');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '更新用户资料失败');
    }
  }

  // 修改密码
  async changePassword(passwordData: { currentPassword: string; newPassword: string }): Promise<void> {
    try {
      const response = await api.post<ApiResponse<void>>('/api/auth/change-password', passwordData);
      
      if (response.data.success) {
        return;
      } else {
        throw new Error(response.data.error || '修改密码失败');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '修改密码失败');
    }
  }
}

// 创建单例实例
export const authService = new AuthService(); 