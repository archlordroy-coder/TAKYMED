module.exports = {
  apps: [{
    name: 'takymed-backend',
    script: './dist/node-build.mjs',
    cwd: '/home/ravel/Documents/TAKYMED/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3500
    },
    env_file: '/home/ravel/Documents/TAKYMED/backend/.env',
    log_file: '/home/ravel/Documents/TAKYMED/backend/logs/combined.log',
    out_file: '/home/ravel/Documents/TAKYMED/backend/logs/out.log',
    error_file: '/home/ravel/Documents/TAKYMED/backend/logs/error.log',
    time: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'data'],
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Auto-restart on failure
    autorestart: true,
    // Don't start if crashing too fast
    exp_backoff_restart_delay: 100
  }]
};
