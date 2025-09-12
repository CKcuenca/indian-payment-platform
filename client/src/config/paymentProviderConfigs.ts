/**
 * 支付商配置映射
 * 定义不同支付商的字段要求和显示逻辑
 */

export interface PaymentTypeConfig {
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

export interface PaymentProviderConfig {
  name: string;
  displayName: string;
  description: string;
  supportedTypes: ('native' | 'wakeup')[];
  typeConfigs: {
    native?: PaymentTypeConfig;
    wakeup?: PaymentTypeConfig;
  };
  globalNotes?: string[];
}

export const PAYMENT_PROVIDER_CONFIGS: Record<string, PaymentProviderConfig> = {
  // DhPay配置
  dhpay: {
    name: 'dhpay',
    displayName: 'DhPay',
    description: 'DhPay支付服务商，支持唤醒支付模式',
    supportedTypes: ['wakeup'],
    typeConfigs: {
      wakeup: {
        type: 'wakeup',
        subType: 'wakeup',
        requiredFields: ['accountName', 'accountId', 'secretKey', 'environment'],
        optionalFields: ['description'],
        hiddenFields: ['apiKey', 'mchNo'],
        defaultValues: {
          accountId: '',
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
          accountId: '由DhPay提供的商户ID'
        },
        specialNotes: [
          'DhPay配置说明：',
          '• 需要填写商户ID与商户密钥',
          '• 支持唤醒支付模式'
        ]
      }
    }
  },

  // UniSpay配置
  unispay: {
    name: 'unispay',
    displayName: 'UniSpay',
    description: 'UniSpay印度本地支付服务，支持UPI转账',
    supportedTypes: ['native'],
    typeConfigs: {
      native: {
        type: 'native',
        subType: 'wakeup',
        requiredFields: ['accountName', 'secretKey', 'environment', 'mchNo'],
        optionalFields: ['description', 'apiKey'],
        hiddenFields: ['apiKey', 'accountId'],
        defaultValues: {
          type: 'native',
          subType: 'wakeup',
          environment: 'production',
          accountId: '',
          mchNo: '',
          apiKey: ''
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
      }
    }
  },

  // 唤醒支付商配置
  wakeup: {
    name: 'wakeup',
    displayName: 'WakeUp',
    description: 'WakeUp唤醒支付平台，聚合多个支付商',
    supportedTypes: ['wakeup'],
    typeConfigs: {
      wakeup: {
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
    }
  },

  // PassPay（通用配置）- 支持原生和唤醒双通道
  passpay: {
    name: 'passpay',
    displayName: 'PassPay',
    description: 'PassPay支付服务商，支持原生和唤醒双通道',
    supportedTypes: ['native', 'wakeup'],
    typeConfigs: {
      native: {
        type: 'native',
        subType: 'third_party',
        requiredFields: ['accountName', 'accountId', 'payId', 'secretKey', 'environment'],
        optionalFields: ['description'],
        hiddenFields: ['apiKey', 'mchNo'],
        defaultValues: {
          type: 'native',
          subType: 'third_party',
          environment: 'production',
          accountId: '',
          payId: '12'
        },
        fieldLabels: {
          secretKey: '商户密钥',
          accountId: '商户号 (MCHID)',
          payId: '支付通道ID (PayID)',
          type: '通道类型'
        },
        fieldHelpers: {
          secretKey: 'PassPay提供的商户密钥，用于API签名验证',
          accountId: 'PassPay提供的商户号 (MCHID)',
          payId: '支付通道ID - 原生通道使用12',
          type: '原生通道'
        },
        specialNotes: [
          'PassPay原生通道配置：',
          '• PayID=12，原生通道',
          '• 需要原生通道的MCHID和密钥'
        ]
      },
      wakeup: {
        type: 'wakeup',
        subType: 'third_party',
        requiredFields: ['accountName', 'accountId', 'payId', 'secretKey', 'environment'],
        optionalFields: ['description'],
        hiddenFields: ['apiKey', 'mchNo'],
        defaultValues: {
          type: 'wakeup',
          subType: 'third_party',
          environment: 'production',
          accountId: '',
          payId: '10'
        },
        fieldLabels: {
          secretKey: '商户密钥',
          accountId: '商户号 (MCHID)',
          payId: '支付通道ID (PayID)',
          type: '通道类型'
        },
        fieldHelpers: {
          secretKey: 'PassPay提供的商户密钥，用于API签名验证',
          accountId: 'PassPay提供的商户号 (MCHID)',
          payId: '支付通道ID - 唤醒通道使用10',
          type: '唤醒通道'
        },
        specialNotes: [
          'PassPay唤醒通道配置：',
          '• PayID=10，唤醒通道',
          '• 需要唤醒通道的MCHID和密钥'
        ]
      }
    },
    globalNotes: [
      'PassPay双通道配置说明：',
      '• 原生通道和唤醒通道使用不同的商户参数',
      '• 请分别配置两个通道的MCHID和密钥'
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
 * 获取支付商类型配置
 */
export function getPaymentTypeConfig(providerName: string, type: 'native' | 'wakeup'): PaymentTypeConfig | null {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return null;
  
  return config.typeConfigs[type] || null;
}

/**
 * 检查字段是否应该显示
 */
export function shouldShowField(providerName: string, type: 'native' | 'wakeup', fieldName: string): boolean {
  const typeConfig = getPaymentTypeConfig(providerName, type);
  if (!typeConfig) return true;
  
  return !typeConfig.hiddenFields.includes(fieldName);
}

/**
 * 检查字段是否必需
 */
export function isFieldRequired(providerName: string, type: 'native' | 'wakeup', fieldName: string): boolean {
  const typeConfig = getPaymentTypeConfig(providerName, type);
  if (!typeConfig) return false;
  
  return typeConfig.requiredFields.includes(fieldName);
}

/**
 * 获取字段标签
 */
export function getFieldLabel(providerName: string, type: 'native' | 'wakeup', fieldName: string): string {
  const typeConfig = getPaymentTypeConfig(providerName, type);
  if (!typeConfig) return fieldName;
  
  return typeConfig.fieldLabels[fieldName] || fieldName;
}

/**
 * 获取字段帮助文本
 */
export function getFieldHelper(providerName: string, type: 'native' | 'wakeup', fieldName: string): string {
  const typeConfig = getPaymentTypeConfig(providerName, type);
  if (!typeConfig) return '';
  
  return typeConfig.fieldHelpers[fieldName] || '';
}

/**
 * 获取支付商类型特殊说明
 */
export function getTypeNotes(providerName: string, type: 'native' | 'wakeup'): string[] {
  const typeConfig = getPaymentTypeConfig(providerName, type);
  if (!typeConfig) return [];
  
  return typeConfig.specialNotes || [];
}

/**
 * 获取支付商全局特殊说明
 */
export function getProviderNotes(providerName: string): string[] {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return [];
  
  return config.globalNotes || [];
}

// 向后兼容的函数，使用默认类型
export function shouldShowFieldCompat(providerName: string, fieldName: string): boolean {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return true;
  
  // 使用支持的第一个类型
  const firstType = config.supportedTypes[0];
  return shouldShowField(providerName, firstType, fieldName);
}

export function isFieldRequiredCompat(providerName: string, fieldName: string): boolean {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return false;
  
  // 使用支持的第一个类型
  const firstType = config.supportedTypes[0];
  return isFieldRequired(providerName, firstType, fieldName);
}

export function getFieldLabelCompat(providerName: string, fieldName: string): string {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return fieldName;
  
  // 使用支持的第一个类型
  const firstType = config.supportedTypes[0];
  return getFieldLabel(providerName, firstType, fieldName);
}

export function getFieldHelperCompat(providerName: string, fieldName: string): string {
  const config = getPaymentProviderConfig(providerName);
  if (!config) return '';
  
  // 使用支持的第一个类型
  const firstType = config.supportedTypes[0];
  return getFieldHelper(providerName, firstType, fieldName);
}
