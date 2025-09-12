/**
 * 新的支付商配置系统 - 支持双类型配置
 * 每个支付商可以独立配置原生和/或唤醒类型
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

export const DUAL_TYPE_PAYMENT_CONFIGS: Record<string, PaymentProviderConfig> = {
  // PassPay - 支持原生和唤醒双类型
  passpay: {
    name: 'passpay',
    displayName: 'PassPay',
    description: '支持原生和唤醒双通道的支付服务商',
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
          payId: '12'
        },
        fieldLabels: {
          secretKey: '原生通道密钥',
          accountId: '原生通道商户号 (MCHID)',
          payId: '支付通道ID'
        },
        fieldHelpers: {
          secretKey: 'PassPay原生通道提供的商户密钥',
          accountId: 'PassPay原生通道提供的商户号',
          payId: '原生通道固定使用PayID=12'
        },
        specialNotes: [
          '• PayID固定为12',
          '• 需要原生通道专用的商户号和密钥',
          '• 使用MD5签名算法'
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
          payId: '10'
        },
        fieldLabels: {
          secretKey: '唤醒通道密钥',
          accountId: '唤醒通道商户号 (MCHID)',
          payId: '支付通道ID'
        },
        fieldHelpers: {
          secretKey: 'PassPay唤醒通道提供的商户密钥',
          accountId: 'PassPay唤醒通道提供的商户号',
          payId: '唤醒通道固定使用PayID=10'
        },
        specialNotes: [
          '• PayID固定为10',
          '• 需要唤醒通道专用的商户号和密钥',
          '• 使用MD5签名算法'
        ]
      }
    },
    globalNotes: [
      'PassPay双通道支付服务商：',
      '• 可以只配置原生通道、只配置唤醒通道，或同时配置两种通道',
      '• 不同通道使用完全独立的商户参数',
      '• 请根据PassPay提供的具体参数进行配置'
    ]
  },

  // DhPay - 支持原生和唤醒双类型
  dhpay: {
    name: 'dhpay',
    displayName: 'DhPay',
    description: '可配置原生和唤醒双通道的支付服务商',
    supportedTypes: ['native', 'wakeup'],
    typeConfigs: {
      native: {
        type: 'native',
        subType: 'third_party',
        requiredFields: ['accountName', 'accountId', 'secretKey', 'environment'],
        optionalFields: ['description'],
        hiddenFields: ['apiKey', 'mchNo', 'payId'],
        defaultValues: {
          type: 'native',
          subType: 'third_party',
          environment: 'production'
        },
        fieldLabels: {
          secretKey: '原生通道密钥',
          accountId: '原生通道商户ID'
        },
        fieldHelpers: {
          secretKey: 'DhPay原生通道提供的商户密钥',
          accountId: 'DhPay原生通道分配的商户ID'
        },
        specialNotes: [
          '• 使用MD5签名算法（转大写）',
          '• 金额单位为分（整数）',
          '• 原生通道直连模式'
        ]
      },
      wakeup: {
        type: 'wakeup',
        subType: 'wakeup',
        requiredFields: ['accountName', 'accountId', 'secretKey', 'environment'],
        optionalFields: ['description'],
        hiddenFields: ['apiKey', 'mchNo', 'payId'],
        defaultValues: {
          type: 'wakeup',
          subType: 'wakeup',
          environment: 'production'
        },
        fieldLabels: {
          secretKey: '唤醒通道密钥',
          accountId: '唤醒通道商户ID'
        },
        fieldHelpers: {
          secretKey: 'DhPay唤醒通道提供的商户密钥',
          accountId: 'DhPay唤醒通道分配的商户ID'
        },
        specialNotes: [
          '• 使用MD5签名算法（转大写）',
          '• 金额单位为分（整数）',
          '• 唤醒支付模式'
        ]
      }
    },
    globalNotes: [
      'DhPay配置说明：',
      '• 支持原生和唤醒双通道模式',
      '• 不同通道需要使用不同的商户参数',
      '• 请根据DhPay提供的具体文档配置'
    ]
  },

  // UniSpay - 支持原生和唤醒双类型
  unispay: {
    name: 'unispay',
    displayName: 'UniSpay',
    description: '基于SHA256的双通道支付服务商',
    supportedTypes: ['native', 'wakeup'],
    typeConfigs: {
      native: {
        type: 'native',
        subType: 'third_party',
        requiredFields: ['accountName', 'mchNo', 'secretKey', 'environment'],
        optionalFields: ['description'],
        hiddenFields: ['apiKey', 'accountId', 'payId'],
        defaultValues: {
          type: 'native',
          subType: 'third_party',
          environment: 'production'
        },
        fieldLabels: {
          secretKey: '原生通道密钥',
          mchNo: '原生通道商户号'
        },
        fieldHelpers: {
          secretKey: 'UniSpay原生通道提供的商户密钥',
          mchNo: 'UniSpay原生通道提供的商户号，通常以K开头'
        },
        specialNotes: [
          '• 使用SHA256签名算法',
          '• 商户号通常以K开头',
          '• 金额单位为卢比（字符串格式）'
        ]
      },
      wakeup: {
        type: 'wakeup',
        subType: 'wakeup',
        requiredFields: ['accountName', 'mchNo', 'secretKey', 'environment'],
        optionalFields: ['description'],
        hiddenFields: ['apiKey', 'accountId', 'payId'],
        defaultValues: {
          type: 'wakeup',
          subType: 'wakeup',
          environment: 'production'
        },
        fieldLabels: {
          secretKey: '唤醒通道密钥',
          mchNo: '唤醒通道商户号'
        },
        fieldHelpers: {
          secretKey: 'UniSpay唤醒通道提供的商户密钥',
          mchNo: 'UniSpay唤醒通道提供的商户号，通常以K开头'
        },
        specialNotes: [
          '• 使用SHA256签名算法',
          '• 商户号通常以K开头',
          '• 金额单位为卢比（字符串格式）'
        ]
      }
    },
    globalNotes: [
      'UniSpay配置说明：',
      '• 支持原生和唤醒双通道模式',
      '• 基于SHA256的安全签名机制',
      '• 不同通道需要独立的商户参数'
    ]
  }
};

/**
 * 获取支付商配置
 */
export function getDualTypeProviderConfig(providerName: string): PaymentProviderConfig | null {
  return DUAL_TYPE_PAYMENT_CONFIGS[providerName] || null;
}

/**
 * 获取支付商的特定类型配置
 */
export function getProviderTypeConfig(providerName: string, type: 'native' | 'wakeup'): PaymentTypeConfig | null {
  const providerConfig = getDualTypeProviderConfig(providerName);
  if (!providerConfig) return null;
  return providerConfig.typeConfigs[type] || null;
}

/**
 * 检查支付商是否支持指定类型
 */
export function isTypeSupported(providerName: string, type: 'native' | 'wakeup'): boolean {
  const providerConfig = getDualTypeProviderConfig(providerName);
  if (!providerConfig) return false;
  return providerConfig.supportedTypes.includes(type);
}

/**
 * 获取字段标签
 */
export function getDualTypeFieldLabel(providerName: string, type: 'native' | 'wakeup', fieldName: string): string {
  const typeConfig = getProviderTypeConfig(providerName, type);
  return typeConfig?.fieldLabels[fieldName] || fieldName;
}

/**
 * 获取字段帮助文本
 */
export function getDualTypeFieldHelper(providerName: string, type: 'native' | 'wakeup', fieldName: string): string {
  const typeConfig = getProviderTypeConfig(providerName, type);
  return typeConfig?.fieldHelpers[fieldName] || '';
}

/**
 * 检查字段是否必填
 */
export function isDualTypeFieldRequired(providerName: string, type: 'native' | 'wakeup', fieldName: string): boolean {
  const typeConfig = getProviderTypeConfig(providerName, type);
  return typeConfig?.requiredFields.includes(fieldName) || false;
}

/**
 * 检查字段是否应该显示
 */
export function shouldShowDualTypeField(providerName: string, type: 'native' | 'wakeup', fieldName: string): boolean {
  const typeConfig = getProviderTypeConfig(providerName, type);
  if (!typeConfig) return false;
  return !typeConfig.hiddenFields.includes(fieldName);
}