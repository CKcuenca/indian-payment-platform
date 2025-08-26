import api from './api';
import { Merchant, ApiResponse, PaginationResponse, Transaction, Order } from '../types';

export const merchantService = {
  // 获取商户信息
  getMerchantInfo: (): Promise<ApiResponse<Merchant>> => {
    // 使用新的演示端点，无需认证
    return api.get('/api/demo/merchant-info').then(response => response.data);
  },

  // 获取交易历史
  getTransactions: (params: {
    page?: number;
    limit?: number;
    type?: 'DEPOSIT' | 'WITHDRAWAL';
    status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  }): Promise<ApiResponse<PaginationResponse<Transaction>>> => {
    return api.get('/api/demo/transactions', { params }).then(response => response.data);
  },

  // 获取订单历史
  getOrders: (params: {
    page?: number;
    limit?: number;
    type?: 'DEPOSIT' | 'WITHDRAWAL';
    status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  }): Promise<ApiResponse<PaginationResponse<Order>>> => {
    return api.get('/api/demo/orders', { params }).then(response => response.data);
  },

  // 创建充值订单
  createPayment: (data: {
    merchantId: string;
    amount: number;
    currency?: string;
    customerEmail: string;
    customerPhone: string;
    returnUrl: string;
    notifyUrl?: string;
    provider?: string;
    description?: string;
  }): Promise<ApiResponse<{
    orderId: string;
    paymentUrl: string;
    amount: number;
    currency: string;
    status: string;
  }>> => {
    return api.post('/api/payment/create', data).then(response => response.data);
  },

  // 查询订单状态
  queryOrder: (orderId: string, merchantId: string): Promise<ApiResponse<Order>> => {
    return api.get(`/api/payment/status/${orderId}`, { params: { merchantId } }).then(response => response.data);
  },

  // 获取可用支付提供者
  getAvailableProviders: (): Promise<ApiResponse<string[]>> => {
    return api.get('/api/payment/providers').then(response => response.data);
  },
};
