// 错误处理工具

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

// 处理API错误
export function handleApiError(error: any): ApiError {
  if (error.response) {
    // 服务器响应了错误状态码
    return {
      status: error.response.status,
      message: error.response.data?.error || error.response.data?.message || '请求失败',
      details: error.response.data
    };
  } else if (error.request) {
    // 请求已发出但没有收到响应
    return {
      status: 0,
      message: '网络连接失败，请检查网络连接',
      details: error.request
    };
  } else {
    // 请求配置出错
    return {
      status: -1,
      message: error.message || '请求配置错误',
      details: error
    };
  }
}

// 获取用户友好的错误消息
export function getUserFriendlyMessage(error: ApiError): string {
  switch (error.status) {
    case 400:
      return '请求参数错误，请检查输入信息';
    case 401:
      return '登录已过期，请重新登录';
    case 403:
      return '权限不足，无法执行此操作';
    case 404:
      return '请求的资源不存在';
    case 409:
      return '数据冲突，请检查输入信息';
    case 422:
      return '数据验证失败，请检查输入信息';
    case 429:
      return '请求过于频繁，请稍后再试';
    case 500:
      return '服务器内部错误，请稍后再试';
    case 502:
      return '网关错误，请稍后再试';
    case 503:
      return '服务暂时不可用，请稍后再试';
    case 504:
      return '网关超时，请稍后再试';
    case 0:
      return '网络连接失败，请检查网络连接';
    case -1:
      return '请求配置错误';
    default:
      return error.message || '未知错误';
  }
}

// 记录错误日志
export function logError(error: ApiError, context?: string) {
  const timestamp = new Date().toISOString();
  const logMessage = {
    timestamp,
    context: context || 'API',
    error: {
      status: error.status,
      message: error.message,
      details: error.details
    }
  };
  
  // 在开发环境中输出到控制台
  if (process.env.NODE_ENV !== 'production') {
    console.error('🚨 API错误:', logMessage);
  }
  
  // 在生产环境中可以发送到错误监控服务
  // sendErrorToMonitoring(logMessage);
}

// 处理认证错误
export function handleAuthError(error: ApiError) {
  if (error.status === 401) {
    // 清除本地存储的认证信息
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('apiKey');
    
    // 触发认证状态变化事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { isAuthenticated: false } 
      }));
    }
  }
}

// 重试机制
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}
