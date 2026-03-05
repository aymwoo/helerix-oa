module.exports = {
  apps: [
    {
      name: 'examforge',
      script: 'server.js', // 使用 standalone 模式生成的 server.js
      cwd: '/home/derekwoo/examforge', // 使用 VPS 上的实际用户路径
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4173
      },
      // 日志配置
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // 性能监控与重启
      max_memory_restart: '1G',
      autorestart: true
    }
  ]
};
