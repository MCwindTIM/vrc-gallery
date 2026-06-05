/** PM2 process file. Usage: pm2 start ecosystem.config.cjs */
const path = require("node:path");

const root = __dirname;

module.exports = {
  apps: [
    {
      name: "vrc-gallery",
      cwd: root,
      script: "npm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: 8787,
        TRUST_PROXY: "1",
      },
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
