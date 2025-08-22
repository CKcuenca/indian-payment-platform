module.exports = {
  apps: [
    {
      name: 'indian-payment-platform',
      script: '/var/www/cashgit.com/server/index.js',  // 使用绝对路径
      cwd: '/var/www/cashgit.com',  // 设置工作目录
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      node_args: [
        '--max-old-space-size=1024',
        '--initial-heap-size=512',
        '--max-semi-space-size=64',
        '--gc-interval=100'
        // 移除不兼容的参数
      ],
      exec_mode: 'fork',
      error_file: '/var/www/cashgit.com/logs/err.log',  // 使用绝对路径
      out_file: '/var/www/cashgit.com/logs/out.log',    // 使用绝对路径
      log_file: '/var/www/cashgit.com/logs/combined.log', // 使用绝对路径
      time: true
    }
  ]
};
