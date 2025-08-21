import axios from 'axios';
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

export const cashgitApiService = {
  // 创建支付订单
  createPayment: async (data: CashGitPaymentRequest): Promise<CashGitPaymentResponse> => {
    const response = await axios.post(`${API_BASE_URL}/pay`, data);
    return response.data;
  },

  // 查询订单
  queryOrder: async (data: CashGitQueryRequest): Promise<CashGitQueryResponse> => {
    const response = await axios.post(`${API_BASE_URL}/query`, data);
    return response.data;
  },

  // 申请退款
  requestRefund: async (data: CashGitRefundRequest): Promise<CashGitRefundResponse> => {
    const response = await axios.post(`${API_BASE_URL}/refund`, data);
    return response.data;
  },

  // 关闭订单
  closeOrder: async (data: CashGitCloseRequest): Promise<CashGitCloseResponse> => {
    const response = await axios.post(`${API_BASE_URL}/close`, data);
    return response.data;
  }
};
