module.exports = {
  apps: [
    {
      name: "saadstudio",
      cwd: __dirname,
      script: "npm",
      args: "run start -- -p 3000",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};

