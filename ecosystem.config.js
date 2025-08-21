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
        PORT: 3002
      },
      node_args: [
        '--max-old-space-size=1024',
        '--initial-heap-size=512',
        '--max-semi-space-size=64',
        '--gc-interval=100'
      ],
      exec_mode: 'fork',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
