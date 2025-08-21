module.exports = {
  apps: [
    {
      name: 'indian-payment-platform',
      script: 'server/index.js',
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
        '--gc-interval=100',
        '--max-code-cache-size=128',
        '--string-slice-copy-cache-size=64',
        '--max-external-memory-size=256',
        '--max-array-buffer-size=128'
      ],
      // 移除 --optimize-for-size 标志
      // 添加性能优化标志
      exec_mode: 'fork',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
