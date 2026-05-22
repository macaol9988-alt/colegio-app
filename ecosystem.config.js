// Configuracao do PM2 para o Sistema do Colegio.
// Uso: pm2 start ecosystem.config.js
//      pm2 reload colegio
//      pm2 logs colegio
//      pm2 save && pm2 startup   (para subir junto com a VPS)

module.exports = {
  apps: [
    {
      name: "colegio",
      script: "app.js",
      cwd: __dirname,
      instances: 1,                 // 1 processo (KVM 2 com outros apps - economiza RAM)
      exec_mode: "fork",            // fork para apps simples; "cluster" se quiser balancear
      autorestart: true,
      watch: false,                 // nao usar watch em producao
      max_memory_restart: "500M",   // se passar de 500MB, reinicia o processo
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
        PORT: 3001,                 // porta INTERNA - Nginx vai fazer proxy do dominio para essa porta
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
