/**
 * 支付商配置映射
 * 定义不同支付商的字段要求和显示逻辑
 */

export interface PaymentProviderConfig {
  name: string;
  displayName: string;
  type: 'native' | 'wakeup';
  subType: 'third_party' | 'fourth_party' | 'wakeup';
  requiredFields: string[];
  optionalFields: string[];
  hiddenFields: string[];
  defaultValues: Record<string, any>;
  fieldLabels: Record<string, string>;
  fieldHelpers: Record<string, string>;
  specialNotes?: string[];
}

export const PAYMENT_PROVIDER_CONFIGS: Record<string, PaymentProviderConfig> = {
  // DhPay配置
  dhpay: {
    name: 'dhpay',
    displayName: 'DhPay',
    type: 'wakeup',
    subType: 'wakeup',
    requiredFields: ['accountName', 'secretKey', 'environment'],
    optionalFields: ['description'],
    hiddenFields: ['apiKey', 'mchNo', 'accountId'],
    defaultValues: {
      accountId: '66',
      apiKey: '',
      type: 'wakeup',
      subType: 'wakeup',
      environment: 'production'
    },
    fieldLabels: {
      secretKey: '商户密钥',
      accountId: '商户ID (系统分配)'
    },
    fieldHelpers: {
      secretKey: 'DhPay提供的商户密钥，用于API签名验证',
      accountId: '固定值66，由系统自动分配'
    },
    specialNotes: [
      'DhPay配置说明：',
      '• 商户ID已固定为系统分配值 (66)',
      '• 只需填写商户密钥即可',
      '• 支持唤醒支付模式'
    ]
  },

  // UniSpay配置
  unispay: {
    name: 'unispay',
    displayName: 'UniSpay',
    type: 'native',
    subType: 'wakeup',
    requiredFields: ['accountName', 'accountId', 'secretKey', 'environment', 'mchNo'],
    optionalFields: ['description', 'apiKey'],
    hiddenFields: [],
    defaultValues: {
      type: 'native',
      subType: 'wakeup',
      environment: 'production'
    },
    fieldLabels: {
      accountId: '商户ID',
      mchNo: '商户号 (mchNo)',
      secretKey: '密钥'
    },
    fieldHelpers: {
      accountId: 'UniSpay提供的商户ID',
      mchNo: 'UniSpay提供的商户号，用于API调用',
      secretKey: '用于API签名验证，请保密'
    },
    specialNotes: [
      'UniSpay配置说明：',
      '• 需要填写商户ID和商户号',
      '• 支持UPI转账到私人银行卡',
      '• 印度本地支付服务'
    ]
  },

  // 传统第三方支付商配置
  airpay: {
    name: 'airpay',
    displayName: 'AirPay',
    type: 'native',
    subType: 'third_party',
    requiredFields: ['accountName', 'accountId', 'apiKey', 'secretKey', 'environment'],
    optionalFields: ['description'],
    hiddenFields: ['mchNo'],
    defaultValues: {
      type: 'native',
      subType: 'third_party',
      environment: 'sandbox'
    },
    fieldLabels: {
      accountId: '商户ID',
      apiKey: 'API密钥',
      secretKey: '密钥'
    },
    fieldHelpers: {
      accountId: 'AirPay提供的商户ID',
      apiKey: '用于API调用认证',
      secretKey: '用于API签名验证，请保密'
    },
    specialNotes: [
      'AirPay配置说明：',
      '• 传统第三方支付商',
      '• 需要API密钥和密钥',
      '• 支持代收代付服务'
    ]
  },

  // 唤醒支付商配置
  wakeup: {
    name: 'wakeup',
    displayName: 'WakeUp',
    type: 'wakeup',
    subType: 'wakeup',
    requiredFields: ['accountName', 'accountId', 'secretKey', 'environment'],
    optionalFields: ['description'],
    hiddenFields: ['apiKey', 'mchNo'],
    defaultValues: {
      type: 'wakeup',
      subType: 'wakeup',
      environment: 'sandbox'
    },
    fieldLabels: {
      accountId: '账户ID',
      secretKey: '密钥'
    },
    fieldHelpers: {
      accountId: 'WakeUp平台账户ID',
      secretKey: '用于API签名验证'
    },
    specialNotes: [
      'WakeUp配置说明：',
      '• 唤醒支付平台',
      '• 聚合多个支付商',
      '• 简化集成流程'
    ]
  }
};

/**
 * 获取支付商配置
 */
export function getPaymentProviderConfig(providerName: string): PaymentProviderConfig | null {
  return PAYMENT_PROVIDER_CONFIGS[providerName] || null;
}

/**
 * 检查字段是否应该显示
 */
export function shouldShowField(providerName: string, fieldName: string): boolean {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return true;
  
  return !config.hiddenFields.includes(fieldName);
}

/**
 * 检查字段是否必需
 */
export function isFieldRequired(providerName: string, fieldName: string): boolean {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return false;
  
  return config.requiredFields.includes(fieldName);
}

/**
 * 获取字段标签
 */
export function getFieldLabel(providerName: string, fieldName: string): string {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return fieldName;
  
  return config.fieldLabels[fieldName] || fieldName;
}

/**
 * 获取字段帮助文本
 */
export function getFieldHelper(providerName: string, fieldName: string): string {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return '';
  
  return config.fieldHelpers[fieldName] || '';
}

/**
 * 获取支付商特殊说明
 */
export function getProviderNotes(providerName: string): string[] {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return [];
  
  return config.specialNotes || [];
}
