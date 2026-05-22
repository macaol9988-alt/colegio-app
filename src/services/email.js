const nodemailer = require("nodemailer");

let cachedTransporter = null;
let transporterConfigured = false;

function getTransporter() {
  if (cachedTransporter !== null) return cachedTransporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    transporterConfigured = false;
    cachedTransporter = null;
    return null;
  }
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  transporterConfigured = true;
  return cachedTransporter;
}

function isConfigured() {
  getTransporter();
  return transporterConfigured;
}

async function send({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[email] SMTP nao configurado. Pulando envio para", to, "-", subject);
    return { skipped: true };
  }
  const fromName = process.env.SMTP_FROM_NAME || "Colegio";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
    text,
  });
  return { messageId: info.messageId };
}

function activationEmail({ name, link, schoolName }) {
  const safeName = String(name || "").trim() || "Usuario";
  const safeSchool = String(schoolName || "Colegio").trim();
  return {
    subject: `${safeSchool} - Ative sua conta`,
    html: `
      <div style="font-family:Segoe UI, Arial, sans-serif; background:#f4f3ff; padding:32px;">
        <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:20px; padding:32px; box-shadow:0 12px 32px rgba(108,92,231,0.18);">
          <h1 style="color:#6c5ce7; margin:0 0 12px;">Bem-vindo(a) a ${safeSchool}</h1>
          <p style="color:#3d3d4e; line-height:1.6;">Ola, ${safeName}!</p>
          <p style="color:#3d3d4e; line-height:1.6;">
            Sua conta foi criada e esta aguardando ativacao. Clique no botao abaixo para definir sua senha e comecar a usar o sistema.
          </p>
          <p style="text-align:center; margin:28px 0;">
            <a href="${link}" style="background:linear-gradient(135deg,#6c5ce7,#a29bfe); color:#fff; text-decoration:none; padding:14px 28px; border-radius:14px; font-weight:600; display:inline-block;">Ativar minha conta</a>
          </p>
          <p style="color:#8a8aa3; font-size:13px; line-height:1.6;">
            Se o botao nao funcionar, copie e cole o link abaixo no navegador:<br/>
            <span style="word-break:break-all; color:#6c5ce7;">${link}</span>
          </p>
          <p style="color:#8a8aa3; font-size:12px; margin-top:24px;">Este link expira em 48 horas.</p>
        </div>
      </div>
    `,
    text: `Ola ${safeName}, ative sua conta acessando: ${link}`,
  };
}

function passwordResetEmail({ name, link, schoolName }) {
  const safeName = String(name || "").trim() || "Usuario";
  const safeSchool = String(schoolName || "Colegio").trim();
  return {
    subject: `${safeSchool} - Redefinir senha`,
    html: `
      <div style="font-family:Segoe UI, Arial, sans-serif; background:#fff5f9; padding:32px;">
        <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:20px; padding:32px; box-shadow:0 12px 32px rgba(253,121,168,0.18);">
          <h1 style="color:#e84393; margin:0 0 12px;">Redefinir senha</h1>
          <p style="color:#3d3d4e; line-height:1.6;">Ola, ${safeName}!</p>
          <p style="color:#3d3d4e; line-height:1.6;">
            Recebemos um pedido para redefinir sua senha. Clique no botao abaixo. Se nao foi voce, ignore este e-mail.
          </p>
          <p style="text-align:center; margin:28px 0;">
            <a href="${link}" style="background:linear-gradient(135deg,#e84393,#fd79a8); color:#fff; text-decoration:none; padding:14px 28px; border-radius:14px; font-weight:600; display:inline-block;">Definir nova senha</a>
          </p>
          <p style="color:#8a8aa3; font-size:13px; line-height:1.6;">
            Se o botao nao funcionar, copie e cole o link no navegador:<br/>
            <span style="word-break:break-all; color:#e84393;">${link}</span>
          </p>
          <p style="color:#8a8aa3; font-size:12px; margin-top:24px;">Este link expira em 1 hora.</p>
        </div>
      </div>
    `,
    text: `Ola ${safeName}, redefina sua senha: ${link}`,
  };
}

function ticketCreatedEmail({ ticket, schoolName }) {
  const safeSchool = String(schoolName || "Colegio").trim();
  return {
    subject: `[${ticket.ticket_number}] ${safeSchool} - Novo chamado: ${ticket.title}`,
    html: `
      <div style="font-family:Segoe UI, Arial, sans-serif; background:#f4f3ff; padding:32px;">
        <div style="max-width:520px; margin:0 auto; background:#fff; border-radius:20px; padding:32px;">
          <h2 style="color:#6c5ce7; margin-top:0;">Novo chamado aberto</h2>
          <p><b>Numero:</b> ${ticket.ticket_number}</p>
          <p><b>Titulo:</b> ${ticket.title}</p>
          <p><b>Prioridade:</b> ${ticket.priority}</p>
          <p><b>Categoria:</b> ${ticket.category}</p>
          <p><b>Solicitante:</b> ${ticket.created_by_name}</p>
        </div>
      </div>
    `,
    text: `Novo chamado ${ticket.ticket_number}: ${ticket.title}`,
  };
}

module.exports = {
  send,
  isConfigured,
  activationEmail,
  passwordResetEmail,
  ticketCreatedEmail,
};
