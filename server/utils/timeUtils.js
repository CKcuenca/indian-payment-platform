// 印度时间工具函数

/**
 * 获取当前印度时间
 * @returns {Date} 印度时间
 */
const getIndianTime = () => {
  return new Date();
};

/**
 * 获取印度时间的ISO字符串
 * @returns {string} 印度时间的ISO字符串
 */
const getIndianTimeISO = () => {
  return new Date().toISOString();
};

/**
 * 获取指定时间戳的印度时间
 * @param {number} timestamp - 时间戳
 * @returns {Date} 印度时间
 */
const getIndianTimeFromTimestamp = (timestamp) => {
  return new Date(timestamp);
};

/**
 * 获取印度时间的日期字符串 (YYYY-MM-DD)
 * @returns {string} 日期字符串
 */
const getIndianDateString = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * 获取印度时间的日期时间字符串 (YYYY-MM-DD HH:mm:ss)
 * @returns {string} 日期时间字符串
 */
const getIndianDateTimeString = () => {
  const now = new Date();
  return now.toISOString().replace('T', ' ').split('.')[0];
};

/**
 * 检查是否为印度时间
 * @returns {boolean} 是否为印度时间
 */
const isIndianTime = () => {
  return process.env.TZ === 'Asia/Kolkata';
};

module.exports = {
  getIndianTime,
  getIndianTimeISO,
  getIndianTimeFromTimestamp,
  getIndianDateString,
  getIndianDateTimeString,
  isIndianTime
}; 