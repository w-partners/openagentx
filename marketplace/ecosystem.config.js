module.exports = {
  apps: [
    {
      name: 'openagentx',
      script: 'node_modules/.bin/next',
      args: 'start -p 3101',
      cwd: '/home/llm/projects/cryptointel/marketplace',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3101,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      restart_delay: 5000,
      min_uptime: 30000,
      max_restarts: 50,
      kill_timeout: 10000,
      listen_timeout: 30000,
    },
  ],
};
