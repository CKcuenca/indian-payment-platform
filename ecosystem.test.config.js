module.exports = {
  apps: [
    {
      name: 'test-indian-payment-platform',
      script: '/var/www/test.cashgit.com/server/index.js',
      cwd: '/var/www/test.cashgit.com',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'test',
        PORT: 3002,  // 测试环境使用不同端口
        MONGODB_URI: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/payment-platform-test'
      },
      node_args: [
        '--max-old-space-size=1024',
        '--initial-heap-size=512',
        '--max-semi-space-size=64',
        '--gc-interval=100'
      ],
      exec_mode: 'fork',
      error_file: '/var/www/test.cashgit.com/logs/err.log',
      out_file: '/var/www/test.cashgit.com/logs/out.log',
      log_file: '/var/www/test.cashgit.com/logs/combined.log',
      time: true,
      // 测试环境特殊配置
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};