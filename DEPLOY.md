# Deploy na Hostinger (Hospedagem Compartilhada)

Guia passo-a-passo para subir o sistema na **hospedagem compartilhada Premium / Business** da Hostinger (com Node.js).

> Pré-requisito: você tem um plano com suporte a Node.js no hPanel (Premium ou Business).

---

## Visão geral em 6 passos

1. Criar o banco MySQL no hPanel
2. Importar `database/install.sql` no phpMyAdmin
3. Subir o código (Gerenciador de Arquivos ou FTP)
4. Criar o aplicativo Node.js no hPanel
5. Definir as variáveis de ambiente
6. Iniciar o app e fazer login

---

## 1. Criar o banco MySQL

1. Faça login no [hPanel](https://hpanel.hostinger.com/).
2. Vá em **Websites → Gerenciar** no seu site.
3. No menu lateral: **Bancos de dados → Bancos de dados MySQL**.
4. Em "Criar novo banco de dados MySQL", preencha:
   - **Nome do banco MySQL**: `colegio` (vai virar algo como `u123456_colegio`)
   - **Nome de usuário MySQL**: `admin` (vai virar `u123456_admin`)
   - **Senha**: gere uma forte e **anote**.
5. Clique em **Criar**.

Anote os valores que aparecem na lista de bancos:

| Campo       | Exemplo                  |
|-------------|--------------------------|
| Host        | `localhost`              |
| Database    | `u123456_colegio`        |
| Usuário     | `u123456_admin`          |
| Senha       | (a que você definiu)     |

---

## 2. Importar o SQL no phpMyAdmin

1. Ainda em **Bancos de dados MySQL**, clique no ícone do **phpMyAdmin** ao lado do banco recém-criado.
2. Dentro do phpMyAdmin, **selecione o banco** no menu da esquerda (clique no nome `u123456_colegio`).
3. Clique na aba **Importar** no topo.
4. Em "Arquivo a importar", clique em **Escolher arquivo** e selecione `database/install.sql`.
5. Role até o final e clique em **Importar**.
6. Aguarde a mensagem verde: *"A importação foi concluída com sucesso..."*

Pronto — todas as tabelas foram criadas e o admin inicial já está cadastrado:

```
E-mail: admin@colegio.com
Senha:  admin123
```

> ⚠️ A senha padrão será obrigatoriamente trocada no primeiro acesso.

---

## 3. Subir o código

Você tem duas opções:

### Opção A — Gerenciador de Arquivos (mais simples)

1. Compacte o projeto em um `.zip` no seu computador. **Não inclua**:
   - `node_modules/`
   - `.env` (vamos definir as variáveis pelo painel)
   - `legacy/` (versão antiga)
   - `.git/`
2. No hPanel: **Arquivos → Gerenciador de Arquivos**.
3. Crie uma pasta para o app, por exemplo: `domains/seudominio.com/colegio-app`
   - **Importante**: não coloque dentro de `public_html` (a Hostinger gerencia separadamente).
4. Entre na pasta criada, clique em **Upload** e envie o `.zip`.
5. Clique com botão direito no `.zip` → **Extrair**.
6. Apague o `.zip` depois de extrair.

### Opção B — FTP

1. No hPanel: **Arquivos → Contas FTP**. Pegue host, usuário e senha.
2. Use FileZilla ou similar, conecte e envie os arquivos para a pasta do app (ex: `colegio-app/`).
3. Não envie `node_modules/`, `.env`, `legacy/`, `.git/`.

### Lista oficial do que enviar

```
✅ ENVIAR:
  server.js
  package.json
  package-lock.json (se existir)
  src/
  public/
  database/
  README.md (opcional)
  DEPLOY.md (opcional)

❌ NÃO ENVIAR:
  node_modules/
  .env
  .env.local
  .git/
  legacy/
  *.log
```

---

## 4. Criar o aplicativo Node.js

1. No hPanel: **Avançado → Node.js** (em alguns planos aparece como **Website → Node.js**).
2. Clique em **Criar aplicação**:
   - **Versão do Node.js**: `18.x` (ou superior disponível).
   - **Modo de aplicativo**: `Production`.
   - **Raiz do aplicativo**: caminho onde você subiu o código, ex: `colegio-app`.
   - **URL do aplicativo**: subdomínio/domínio onde o app vai responder, ex: `colegio.seudominio.com` ou `seudominio.com`.
   - **Arquivo de inicialização**: `server.js`
3. Clique em **Criar**.

A Hostinger vai rodar `npm install` automaticamente nesse momento. Aguarde alguns minutos.

> Se aparecer erro de `npm install`, abra o terminal do painel (botão **Executar comando NPM**) e rode `npm install` manualmente.

---

## 5. Definir as variáveis de ambiente

Na mesma tela do app Node.js, role até **Variáveis de ambiente** e clique em **Adicionar variável** para cada uma:

| Variável            | Valor                                                                 |
|---------------------|-----------------------------------------------------------------------|
| `NODE_ENV`          | `production`                                                          |
| `APP_URL`           | `https://colegio.seudominio.com` (sem barra no final)                 |
| `DB_HOST`           | `localhost`                                                           |
| `DB_PORT`           | `3306`                                                                |
| `DB_NAME`           | `u123456_colegio` (o nome que apareceu na lista do passo 1)           |
| `DB_USER`           | `u123456_admin`                                                       |
| `DB_PASSWORD`       | (a senha que você anotou)                                             |
| `JWT_SECRET`        | string longa aleatória (veja abaixo como gerar)                       |
| `JWT_EXPIRES_IN`    | `12h`                                                                 |
| `SKIP_DB_SCHEMA`    | `true` (porque já importamos via phpMyAdmin)                          |
| `SKIP_DB_SEED`      | `true` (admin já está no banco)                                       |

### Gerar um JWT_SECRET seguro

No terminal do seu computador (qualquer um com Node):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Cole o resultado no campo `JWT_SECRET` do painel.

### Variáveis opcionais de e-mail (SMTP)

Se quiser que o sistema envie e-mails de ativação e reset de senha automaticamente:

1. No hPanel: **E-mails → Contas de e-mail**, crie `noreply@seudominio.com`.
2. Volte ao painel Node.js e adicione:

| Variável            | Valor                              |
|---------------------|------------------------------------|
| `SMTP_HOST`         | `smtp.hostinger.com`               |
| `SMTP_PORT`         | `465`                              |
| `SMTP_SECURE`       | `true`                             |
| `SMTP_USER`         | `noreply@seudominio.com`           |
| `SMTP_PASSWORD`     | (senha do e-mail criado)           |
| `SMTP_FROM_NAME`    | Nome do seu colégio                |
| `SMTP_FROM_EMAIL`   | `noreply@seudominio.com`           |

> **Sem SMTP**: o sistema continua 100% funcional. Os links de ativação e reset de senha aparecem no painel admin para você copiar e passar manualmente ao usuário.

---

## 6. Iniciar e testar

1. Clique em **Reiniciar** no painel Node.js (ou **Iniciar**, se for a primeira vez).
2. Acesse a URL do app no navegador, ex: `https://colegio.seudominio.com`.
3. Verifique a saúde clicando em `https://colegio.seudominio.com/api/health` — deve responder:
   ```json
   { "status": "ok", "db": "ok", "time": "..." }
   ```
4. Faça login com:
   - **E-mail**: `admin@colegio.com`
   - **Senha**: `admin123`
5. Vá em **Configurações → Segurança** e altere a senha.
6. Em **Configurações → Dados do colégio**, troque o nome, suba a logo, defina as cores.
7. Em **Configurações → Geocerca**, posicione o mapa na escola e ajuste o raio.

---

## Resolução de problemas

### `/api/health` retorna `db: error`

Erro de conexão com o banco. Confira no painel Node.js as variáveis:
- `DB_HOST` (geralmente `localhost`)
- `DB_NAME` (com o prefixo `u123456_`)
- `DB_USER` (com o prefixo `u123456_`)
- `DB_PASSWORD`

Em **Bancos de dados → MySQL** confirme se o usuário tem permissão no banco.

### "Cannot GET /" ou tela em branco

Reinicie o app pelo painel Node.js. Verifique se o **Arquivo de inicialização** está como `server.js` e a **Raiz do aplicativo** aponta para a pasta correta.

### `npm install` falhou

Abra o terminal Node.js no painel da Hostinger e rode:

```bash
cd ~/colegio-app   # ou o caminho da sua raiz
npm install --omit=dev
```

### O upload de logo dá erro

A pasta `public/uploads/` precisa ter permissão de escrita. No Gerenciador de Arquivos:
1. Botão direito em `public/uploads/` → **Permissões**.
2. Marque para `755` ou `775`.

### Mudei o código, como atualizar?

1. Suba os arquivos alterados via Gerenciador de Arquivos ou FTP.
2. No painel Node.js, clique em **Reiniciar**.
3. Se mexeu em `package.json`, clique em **Executar NPM install** antes de reiniciar.

### Quero limpar tudo e começar do zero

No phpMyAdmin, importe `database/uninstall.sql` (apaga tudo) e depois `database/install.sql` (recria).

Para limpar só os dados mantendo as tabelas, importe `database/reset-data.sql`.

---

## Checklist final antes de divulgar

- [ ] Banco criado e SQL importado
- [ ] Código no servidor
- [ ] App Node.js criado e iniciado
- [ ] Variáveis de ambiente preenchidas
- [ ] `/api/health` retorna `db: ok`
- [ ] Senha do admin alterada
- [ ] Logo e cores do colégio configuradas
- [ ] Geocerca posicionada
- [ ] SMTP configurado (se for usar e-mail)
- [ ] HTTPS ativo no domínio (Hostinger oferece SSL gratuito - hPanel → Segurança → SSL)

Pronto — o sistema está no ar.
