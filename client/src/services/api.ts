import axios from 'axios';

// 环境变量配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cashgit.com';

// 调试信息
console.log('🔧 API配置信息:');
console.log('  - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('  - 最终使用的API_BASE_URL:', API_BASE_URL);
console.log('  - 当前环境:', process.env.NODE_ENV);

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
  
  // 调试信息
  console.log('🔧 API请求:', {
    url: config.url,
    method: config.method,
    headers: config.headers,
    baseURL: config.baseURL
  });
  
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
        localStorage.removeItem('apiKey');
        window.location.href = '/login';
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
