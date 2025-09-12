module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      script: './group-bot.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform',
        ADMIN_TELEGRAM_USERS: process.env.ADMIN_TELEGRAM_USERS || ''
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // 重启策略
      max_restarts: 5,
      min_uptime: '10s',
      
      // 内存监控
      max_memory_restart: '200M',
      
      // 日志配置
      log_file: './logs/telegram-bot.log',
      error_file: './logs/telegram-bot-error.log',
      out_file: './logs/telegram-bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // 自动重启
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      
      // 进程管理
      kill_timeout: 3000,
      listen_timeout: 3000,
      
      // 环境变量
      source_map_support: false,
      instance_var: 'INSTANCE_ID'
    }
  ]
};