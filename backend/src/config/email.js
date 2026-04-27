import nodemailer from "nodemailer"; // Biblioteca para envio de emails

// Configuração do Transportador de Email
// Aqui você define qual serviço SMTP será usado para enviar emails
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Servidor SMTP do Gmail
  port: 587, // Porta padrão TLS
  secure: false, // false = STARTTLS (true seria para porta 465)
  auth: {
    user: "seu-email@gmail.com", // Seu email remetente
    pass: "sua-senha-de-app",    // Senha de aplicativo (não use a senha normal do Gmail)
  },
});

// Função responsável por enviar email de recuperação de senha
export async function enviarEmailRecuperacao(email, link) {
  try {
    // Envia o email
    const info = await transporter.sendMail({
      from: '"Training App" <seu-email@gmail.com>', // Nome + email do remetente
      to: email, // Email do destinatário
      subject: "Recuperação de Senha - Training App", // Assunto do email

      // Conteúdo HTML do email
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          
          <!-- Título -->
          <h2 style="color: #10b981;">Recuperação de Senha</h2>

          <!-- Mensagem -->
          <p>Você solicitou a redefinição de sua senha no Training App.</p>
          <p>Clique no botão abaixo para criar uma nova senha. Este link expira em 15 minutos.</p>

          <!-- Botão com link de redefinição -->
          <a href="${link}" 
             style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            Redefinir Minha Senha
          </a>

          <!-- Aviso de segurança -->
          <p style="color: #666; font-size: 12px;">
            Se você não solicitou esta alteração, por favor ignore este email.
          </p>

          <!-- Rodapé -->
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 10px; text-align: center;">
            APlicativo de Treino © 2026
          </p>
        </div>
      `,
    });

    // Log de sucesso no envio
    console.log("📧 Email enviado: %s", info.messageId);

    return true; // Retorna sucesso
  } catch (error) {
    // Log de erro
    console.error("❌ ERRO AO ENVIAR EMAIL:", error);

    return false; // Retorna falha
  }
}