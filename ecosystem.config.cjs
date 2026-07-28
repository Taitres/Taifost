module.exports = {
  apps: [
    {
      name: 'shiro',
      cwd: '/root/mx-space/shiro-src/apps/web/.next/standalone/apps/web',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 2323,
        HOSTNAME: '0.0.0.0',
        NEXT_PUBLIC_API_URL: 'https://api.taitres.com/api/v2',
        NEXT_PUBLIC_GATEWAY_URL: 'https://api.taitres.com',
      },
      max_memory_restart: '512M',
      autorestart: true,
    },
  ],
}
