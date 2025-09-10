import axios from 'axios';
import CryptoJS from 'crypto-js';
import { 
  CashGitPaymentRequest, 
  CashGitPaymentResponse,
  CashGitQueryRequest, 
  CashGitQueryResponse,
  CashGitRefundRequest, 
  CashGitRefundResponse,
  CashGitCloseRequest, 
  CashGitCloseResponse
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// 生成MD5签名
const generateSignature = (params: any, secretKey: string): string => {
  // 移除sign字段并排序
  const { sign, ...sortedParams } = params;
  const keys = Object.keys(sortedParams).sort();
  
  // 构建签名字符串
  const signStr = keys.map(key => `${key}=${sortedParams[key]}`).join('&') + `&key=${secretKey}`;
  
  // 生成MD5签名并转小写
  return CryptoJS.MD5(signStr).toString().toLowerCase();
};

export const cashgitApiService = {
  // 创建支付订单
  createPayment: async (data: Omit<CashGitPaymentRequest, 'sign'>, secretKey: string): Promise<CashGitPaymentResponse> => {
    const dataWithSign = {
      ...data,
      sign: generateSignature(data, secretKey)
    };
    const response = await axios.post(`${API_BASE_URL}/pay`, dataWithSign);
    return response.data;
  },

  // 查询订单
  queryOrder: async (data: Omit<CashGitQueryRequest, 'sign'>, secretKey: string): Promise<CashGitQueryResponse> => {
    const dataWithSign = {
      ...data,
      sign: generateSignature(data, secretKey)
    };
    const response = await axios.post(`${API_BASE_URL}/query`, dataWithSign);
    return response.data;
  },

  // 申请退款
  requestRefund: async (data: Omit<CashGitRefundRequest, 'sign'>, secretKey: string): Promise<CashGitRefundResponse> => {
    const dataWithSign = {
      ...data,
      sign: generateSignature(data, secretKey)
    };
    const response = await axios.post(`${API_BASE_URL}/refund`, dataWithSign);
    return response.data;
  },

  // 关闭订单
  closeOrder: async (data: Omit<CashGitCloseRequest, 'sign'>, secretKey: string): Promise<CashGitCloseResponse> => {
    const dataWithSign = {
      ...data,
      sign: generateSignature(data, secretKey)
    };
    const response = await axios.post(`${API_BASE_URL}/close`, dataWithSign);
    return response.data;
  }
};
