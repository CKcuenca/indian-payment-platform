import { 
  MGPaymentRequest, 
  MGPaymentResponse, 
  MGPayResponseData,
  MGQueryResponseData,
  MGRefundRequest,
  MGRefundResponseData 
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * MG支付API服务
 * 提供符合MG支付标准的API调用方法
 */
class MGPaymentService {
  /**
   * 创建支付订单
   * @param request 支付请求参数
   * @returns 支付响应
   */
  async createPayment(request: MGPaymentRequest): Promise<MGPaymentResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/mg/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('创建支付订单失败:', error);
      throw error;
    }
  }

  /**
   * 查询订单状态
   * @param appid 商户ID
   * @param orderid 订单ID
   * @param sign 签名
   * @returns 订单查询响应
   */
  async queryOrder(appid: string, orderid: string, sign: string): Promise<MGPaymentResponse> {
    try {
      const request = { appid, orderid, sign };
      const response = await fetch(`${API_BASE_URL}/mg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('查询订单失败:', error);
      throw error;
    }
  }

  /**
   * 关闭订单
   * @param appid 商户ID
   * @param orderid 订单ID
   * @param sign 签名
   * @returns 关闭订单响应
   */
  async closeOrder(appid: string, orderid: string, sign: string): Promise<MGPaymentResponse> {
    try {
      const request = { appid, orderid, sign };
      const response = await fetch(`${API_BASE_URL}/mg/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('关闭订单失败:', error);
      throw error;
    }
  }

  /**
   * 申请退款
   * @param request 退款请求参数
   * @returns 退款响应
   */
  async refund(request: MGRefundRequest): Promise<MGPaymentResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/mg/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('申请退款失败:', error);
      throw error;
    }
  }

  /**
   * 生成测试签名（仅用于开发测试）
   * @param params 参数对象
   * @param secretKey 密钥
   * @returns 签名
   */
  generateTestSignature(params: Record<string, any>, secretKey: string): string {
    // 这里应该实现与后端相同的MD5签名算法
    // 由于前端安全性考虑，实际生产环境应该在后端生成签名
    console.warn('前端签名生成仅用于测试，生产环境请在后端处理');
    
    // 简单的MD5实现（仅用于演示）
    const sortedKeys = Object.keys(params).sort();
    const sourceString = sortedKeys
      .filter(key => key !== 'sign' && params[key] !== undefined && params[key] !== '')
      .map(key => `${key}=${params[key]}`)
      .join('&') + secretKey;
    
    // 注意：这里只是演示，实际应该使用crypto-js等库
    return btoa(sourceString).substring(0, 32);
  }
}

export const mgPaymentService = new MGPaymentService();
