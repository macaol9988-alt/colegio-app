# Sistema do Colégio

Sistema completo para a rotina do colégio:

- **Hora extra de professores**: registro de ponto com GPS, geocerca, justificativas, aprovação e exportação.
- **Chamados de TI**: kanban com prioridades, SLA automático, comentários, histórico, atribuição.
- **Painel administrativo**: dados do colégio, logo, cores, geocerca, SLA, usuários e cadastros.
- **Auto-cadastro + ativação**: usuários se cadastram (e-mail OU CPF + senha), admin ativa pelo painel ou o usuário ativa pelo link enviado por e-mail.

## Stack

- Backend: Node.js (Express) + MySQL
- Frontend: HTML5 + CSS (Neumorphism colorido) + JS vanilla, mobile-first
- Mapas: Leaflet
- Autenticação: JWT
- E-mail: SMTP via nodemailer

---

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 18+ instalado
- MySQL 8+ rodando (local ou remoto)

### 2. Instalar dependências

```powershell
npm install
```

### 3. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```powershell
copy .env.example .env
```

Edite o `.env` com seus dados do MySQL e do SMTP (o SMTP é opcional na primeira execução).

Para gerar um `JWT_SECRET` forte:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Criar o banco de dados

Antes de iniciar a primeira vez, crie o banco no MySQL (o sistema cria as tabelas sozinho):

```sql
CREATE DATABASE colegio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Iniciar o servidor

```powershell
npm start
```

A primeira execução vai:
1. Criar todas as tabelas (schema.sql).
2. Criar um admin inicial com as credenciais definidas em `SEED_ADMIN_*` no `.env`.

Abra no navegador:

```
http://localhost:3000
```

Faça login com o admin inicial. Pelo painel você poderá:
- Editar os dados do colégio e a logo.
- Cadastrar professores, coordenação e equipe de TI.
- Configurar a geocerca arrastando o marcador no mapa.
- Ajustar SLA dos chamados.

---

## Deploy na Hostinger (Node.js + MySQL)

### 1. Criar o banco MySQL

1. No hPanel, vá em **Bancos de dados → MySQL**.
2. Crie um banco (anote nome, usuário, senha, host — geralmente `localhost`).
3. Abra o **phpMyAdmin**, selecione o banco e cole o conteúdo de `src/schema.sql` na aba SQL. Rode para criar as tabelas (ou deixe o app criar na primeira execução).

### 2. Subir o código

Opção A — Git: conecte o repositório pelo painel Node.js da Hostinger.

Opção B — Upload manual via Gerenciador de Arquivos / FTP:
- Faça upload de tudo, EXCETO `node_modules/` e `.env`.
- A Hostinger roda `npm install` automaticamente quando você cria o app Node.js.

### 3. Criar o aplicativo Node.js na Hostinger

No hPanel:

1. Vá em **Avançado → Node.js** (ou **Web App Node.js** no card que apareceu pra você).
2. Crie um novo app:
   - **Versão do Node.js**: 18 ou superior.
   - **Pasta da aplicação**: a pasta para onde você subiu o código.
   - **Arquivo de inicialização**: `server.js`.
   - **URL pública**: o domínio ou subdomínio escolhido.

### 4. Definir as variáveis de ambiente (.env)

Ainda no painel Node.js da Hostinger, encontre a seção **Variáveis de ambiente** e cadastre, no mínimo:

```
NODE_ENV=production
APP_URL=https://seudominio.com
DB_HOST=localhost
DB_NAME=u00000_colegio
DB_USER=u00000_admin
DB_PASSWORD=...
JWT_SECRET=gere-uma-string-aleatoria-longa
SEED_ADMIN_EMAIL=admin@seudominio.com
SEED_ADMIN_PASSWORD=trocar-no-primeiro-acesso
```

(Os nomes começando com `u00000_` são típicos da Hostinger — confirme no painel do banco.)

### 5. Configurar o SMTP (opcional, mas recomendado)

Crie um e-mail no painel da Hostinger (ex.: `noreply@seudominio.com`) e adicione:

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@seudominio.com
SMTP_PASSWORD=sua-senha
SMTP_FROM_NAME=Nome do Colégio
SMTP_FROM_EMAIL=noreply@seudominio.com
```

Sem SMTP, o sistema continua funcionando: os links de ativação e reset aparecem no painel admin (e o admin pode copiar e passar manualmente).

### 6. Iniciar o aplicativo

Clique em **Iniciar app** no painel Node.js da Hostinger. Acesse a URL configurada e entre com o admin seed.

---

## Estrutura do projeto

```
horaextra/
├── server.js                # Entry point Express
├── package.json
├── .env.example
├── src/
│   ├── schema.sql           # Schema MySQL (executado automaticamente)
│   ├── db.js                # Pool de conexão
│   ├── middleware/auth.js   # JWT + RBAC
│   ├── services/
│   │   ├── email.js         # Nodemailer + templates
│   │   └── sla.js           # Cálculo de SLA
│   ├── utils/
│   │   ├── jwt.js
│   │   └── validators.js    # CPF, e-mail
│   └── routes/
│       ├── auth.js          # Login, cadastro, ativação, reset
│       ├── users.js         # CRUD usuários (admin)
│       ├── school.js        # Configurações + upload de logo
│       ├── classes.js       # Turmas e vínculos
│       ├── attendance.js    # Hora extra
│       └── tickets.js       # Chamados de TI
└── public/
    ├── index.html           # SPA shell
    ├── styles/
    │   ├── theme.css        # Design system Neumorphism colorido
    │   ├── layout.css       # Sidebar, bottom-nav, topbar
    │   └── modules.css      # Login, kanban, mapa, detalhe
    ├── scripts/
    │   ├── icons.js         # Ícones SVG inline
    │   ├── api.js           # Cliente HTTP com JWT
    │   ├── utils.js         # Toast, Modal, formatadores
    │   ├── auth.js          # Telas de autenticação
    │   ├── app.js           # Roteamento SPA
    │   └── views/
    │       ├── dashboard.js
    │       ├── attendance.js
    │       ├── tickets.js
    │       └── admin.js
    ├── uploads/             # Logos enviadas via painel
    └── assets/
```

---

## Perfis e permissões

| Perfil          | O que pode fazer                                                                 |
|-----------------|----------------------------------------------------------------------------------|
| **Professor**   | Registrar ponto, ver próprios registros, abrir e acompanhar chamados próprios.   |
| **Coordenação** | Ver/aprovar pontos, ver chamados, gerenciar turmas, vincular professores.        |
| **TI**          | Gerenciar chamados (status, prioridade, atribuição), comentar interno/externo.   |
| **Admin**       | Tudo do colégio: dados, logo, cores, geocerca, SLA, usuários, política cadastro. |

---

## Fluxo de cadastro

1. **Auto-cadastro ligado** (padrão): o professor abre `/`, clica em "Criar conta", informa nome, e-mail, CPF e senha.
2. A conta fica como `pending`.
3. Se SMTP estiver configurado: o usuário recebe um e-mail com link de ativação (`?activate=<token>`).
4. Em paralelo, o admin vê o usuário na aba **Usuários → Pendentes** e pode:
   - Ativar manualmente.
   - Reenviar o convite por e-mail.
   - Bloquear.
5. Quando ativada, a conta pode fazer login.

Para desligar o auto-cadastro: **Configurações → Segurança → Permitir auto-cadastro = OFF**. Aí apenas o admin cria contas.

---

## Próximos passos sugeridos

- Anexos em chamados (a tabela `ticket_attachments` já existe).
- Notificações push no navegador.
- Relatório consolidado mensal de hora extra com assinatura digital.
- App PWA instalável no celular (manifest + service worker).

---

## Versão anterior

A versão anterior (puramente frontend, com `localStorage`) foi preservada na pasta [`legacy/`](legacy/).
