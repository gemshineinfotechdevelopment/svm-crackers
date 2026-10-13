module.exports = {
  apps: [
    {
      name: 'svm-crackers-api',
      cwd: './server',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5017,
      },
    },
  ],
};

