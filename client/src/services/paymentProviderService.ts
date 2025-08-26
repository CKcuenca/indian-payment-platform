import api from './api';
import { PaymentProviderCategory, PaymentProvider } from '../types';

export const paymentProviderService = {
  // 获取所有支付商分类
  getCategories: (): Promise<PaymentProviderCategory[]> => {
    return api.get('/api/payment-providers/categories').then(response => response.data.data);
  },

  // 根据类型获取支付商分类
  getCategoryByType: (type: string): Promise<PaymentProviderCategory> => {
    return api.get(`/api/payment-providers/categories/${type}`).then(response => response.data.data);
  },

  // 获取所有支付商
  getAllProviders: (): Promise<PaymentProvider[]> => {
    return api.get('/api/payment-providers').then(response => response.data.data);
  },

  // 根据类型获取支付商分类
  getProvidersByType: (type: string): Promise<PaymentProvider[]> => {
    return api.get(`/api/payment-providers/type/${type}`).then(response => response.data.data);
  },

  // 根据分类获取支付商
  getProvidersByCategory: (categoryId: string): Promise<PaymentProvider[]> => {
    return api.get(`/api/payment-providers/category/${categoryId}`).then(response => response.data.data);
  },

  // 获取激活的支付商
  getActiveProviders: (): Promise<PaymentProvider[]> => {
    return api.get('/api/payment-providers/active').then(response => response.data.data);
  },

  // 根据ID获取支付商
  getProviderById: (id: string): Promise<PaymentProvider> => {
    return api.get(`/api/payment-providers/${id}`).then(response => response.data.data);
  },

  // 获取支付商统计信息
  getProviderStats: () => {
    return api.get('/api/payment-providers/stats').then(response => response.data.data);
  },

  // 验证支付商类型
  validateProviderType: (type: string): Promise<{ type: string; isValid: boolean }> => {
    return api.post('/api/payment-providers/validate-type', { type }).then(response => response.data.data);
  },

  // 验证支付商名称
  validateProviderName: (name: string): Promise<{ name: string; isValid: boolean }> => {
    return api.post('/api/payment-providers/validate-name', { name }).then(response => response.data.data);
  }
};
