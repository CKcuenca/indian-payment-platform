// 格式化工具函数

/**
 * 格式化金额，如果没有小数则不显示小数
 * @param amount - 金额（以分为单位）
 * @param currency - 货币符号，默认为 '₹'
 * @returns 格式化后的金额字符串
 */
export const formatAmount = (amount: number, currency: string = '₹'): string => {
  const rupees = amount / 100;
  
  // 检查是否为整数
  if (Number.isInteger(rupees)) {
    return `${currency}${rupees.toLocaleString('en-US')}`;
  } else {
    return `${currency}${rupees.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
};

/**
 * 格式化百分比
 * @param value - 百分比值
 * @param decimals - 小数位数，默认为1
 * @returns 格式化后的百分比字符串
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * 格式化日期
 * @param date - 日期字符串或Date对象
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * 格式化日期时间
 * @param date - 日期字符串或Date对象
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 