#!/usr/bin/env bash
# ============================================================
# CHECK-VPS - Inspeciona a VPS sem alterar NADA.
# ============================================================
# Mostra: SO, versoes do Node, PM2, Nginx, MySQL, Certbot, portas em
# uso, sites Nginx ativos e processos PM2 ja rodando.
# Util antes de instalar coisas novas quando ha outros apps rodando.
# ============================================================

set -u

echo "===================================================="
echo " Sistema operacional"
echo "===================================================="
. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME (kernel: $(uname -r))"
echo ""

echo "===================================================="
echo " Recursos"
echo "===================================================="
echo "CPU(s): $(nproc)"
free -h | sed 's/^/  /'
echo ""
df -h / | sed 's/^/  /'
echo ""

echo "===================================================="
echo " Node.js / npm"
echo "===================================================="
if command -v node >/dev/null; then
  echo "node: $(node --version)"
  echo "npm:  $(npm --version)"
  echo "Caminhos: $(which node) | $(which npm)"
  if command -v nvm >/dev/null 2>&1 || [ -d "$HOME/.nvm" ]; then
    echo "nvm: detectado (versoes disponiveis):"
    bash -lc 'source ~/.nvm/nvm.sh 2>/dev/null && nvm ls' 2>/dev/null | sed 's/^/  /' | head -20
  fi
else
  echo "node: NAO INSTALADO"
fi
echo ""

echo "===================================================="
echo " PM2"
echo "===================================================="
if command -v pm2 >/dev/null; then
  echo "pm2: $(pm2 --version)"
  echo ""
  echo "Apps gerenciados:"
  pm2 list 2>/dev/null | sed 's/^/  /'
else
  echo "pm2: NAO INSTALADO"
fi
echo ""

echo "===================================================="
echo " Nginx"
echo "===================================================="
if command -v nginx >/dev/null; then
  nginx -v 2>&1 | sed 's/^/  /'
  if [ -d /etc/nginx/sites-enabled ]; then
    echo "Sites ativos:"
    ls -1 /etc/nginx/sites-enabled 2>/dev/null | sed 's/^/  - /'
  fi
  echo "Status do servico:"
  systemctl is-active nginx 2>/dev/null | sed 's/^/  /'
else
  echo "nginx: NAO INSTALADO"
fi
echo ""

echo "===================================================="
echo " MySQL / MariaDB"
echo "===================================================="
if command -v mysql >/dev/null; then
  mysql --version 2>&1 | sed 's/^/  /'
  echo "Status do servico:"
  systemctl is-active mysql 2>/dev/null || systemctl is-active mariadb 2>/dev/null || echo "  servico nao detectado"
else
  echo "mysql: NAO INSTALADO"
fi
echo ""

echo "===================================================="
echo " Certbot (SSL)"
echo "===================================================="
if command -v certbot >/dev/null; then
  certbot --version 2>&1 | sed 's/^/  /'
  echo "Certificados existentes:"
  certbot certificates 2>/dev/null | grep -E "(Certificate Name|Domains|Expiry)" | sed 's/^/  /'
else
  echo "certbot: NAO INSTALADO"
fi
echo ""

echo "===================================================="
echo " Portas em escuta"
echo "===================================================="
ss -tlnp 2>/dev/null | awk 'NR>1 {print "  " $4 "  -  " $7}' | sort -u
echo ""

echo "===================================================="
echo " Firewall (UFW)"
echo "===================================================="
if command -v ufw >/dev/null; then
  ufw status 2>&1 | sed 's/^/  /' || echo "  precisa de sudo"
else
  echo "  ufw: nao instalado"
fi
echo ""

echo "===================================================="
echo " Git"
echo "===================================================="
if command -v git >/dev/null; then
  git --version | sed 's/^/  /'
else
  echo "  git: NAO INSTALADO"
fi
echo ""

echo "===================================================="
echo " Projetos detectados em /opt e /var/www"
echo "===================================================="
[ -d /opt ] && ls -la /opt 2>/dev/null | sed 's/^/  /'
echo "---"
[ -d /var/www ] && ls -la /var/www 2>/dev/null | sed 's/^/  /'
echo ""

echo "===================================================="
echo " Fim do diagnostico"
echo "===================================================="
