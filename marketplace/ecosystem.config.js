module.exports = {
  apps: [
    {
      name: 'openagentx',
      script: 'node_modules/.bin/next',
      args: 'start -p 3100',
      cwd: '/home/llm/projects/cryptointel/marketplace',
      instances: 1,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
