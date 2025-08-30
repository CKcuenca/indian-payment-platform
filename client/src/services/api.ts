import axios from 'axios';

// 环境变量配置 - 同一服务器部署时使用相对路径
const getApiBaseUrl = () => {
  // 1. 优先使用环境变量（最灵活）
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 2. 如果没有环境变量，根据环境选择
  if (process.env.NODE_ENV === 'production') {
    // 生产环境：前端和后端在同一服务器
    // 使用相对路径，请求会自动发送到当前域名
    return '';
  } else {
    // 开发环境：前端在3000端口，后端在3001端口
    return 'http://localhost:3001';
  }
};

const API_BASE_URL = getApiBaseUrl();

  // 调试信息（仅开发环境）
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    console.log('🔧 API配置信息:');
    console.log('  - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - 自动选择的API_BASE_URL:', API_BASE_URL);
    console.log('  - 环境类型:', isProduction ? '生产环境' : '非生产环境');
  }

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加API密钥和认证token
api.interceptors.request.use((config) => {
  // 添加API密钥
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  
  // 添加JWT token
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 调试信息（仅开发环境）
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    console.log('🔧 API请求:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      baseURL: config.baseURL
    });
  }
  
  return config;
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 网络错误
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(new Error('网络连接失败，请检查网络连接'));
    }
    
    // HTTP状态码错误处理
    switch (error.response.status) {
      case 400:
        console.error('Bad request:', error.response.data);
        break;
      case 401:
        // 清除认证信息并重定向到登录页
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('apiKey');
        // 只在浏览器环境中重定向
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        break;
      case 403:
        console.error('Forbidden:', error.response.data);
        break;
      case 404:
        console.error('Not found:', error.response.data);
        break;
      case 500:
        console.error('Server error:', error.response.data);
        break;
      default:
        console.error('API error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;
