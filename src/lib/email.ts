import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Escape URL entities to prevent XSS in email templates.
 */
function escapeUrl(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Escape HTML entities to prevent XSS in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  if (!resend) {
    if (isDev) {
      console.warn(`\n[EMAIL] Verification link for ${email}: ${verificationUrl}\n`);
    }
    return;
  }

  await resend.emails.send({
    from: `Love Compass <${fromEmail}>`,
    to: email,
    subject: 'Подтвердите ваш email — Love Compass',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e11d48;">Добро пожаловать в Love Compass!</h1>
        <p>Для завершения регистрации подтвердите ваш email, перейдя по ссылке:</p>
        <a href="${escapeUrl(verificationUrl)}"
           style="display: inline-block; padding: 12px 24px; background-color: #e11d48; color: white;
                  text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Подтвердить email
        </a>
        <p style="color: #666; font-size: 14px;">
          Если вы не регистрировались, просто проигнорируйте это письмо.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  if (!resend) {
    if (isDev) {
      console.warn(`\n[EMAIL] Password reset link for ${email}: ${resetUrl}\n`);
    }
    return;
  }

  await resend.emails.send({
    from: `Love Compass <${fromEmail}>`,
    to: email,
    subject: 'Сброс пароля — Love Compass',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e11d48;">Сброс пароля</h1>
        <p>Вы запросили сброс пароля. Перейдите по ссылке для установки нового пароля:</p>
        <a href="${escapeUrl(resetUrl)}"
           style="display: inline-block; padding: 12px 24px; background-color: #e11d48; color: white;
                  text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Сбросить пароль
        </a>
        <p style="color: #666; font-size: 14px;">
          Ссылка действительна 1 час. Если вы не запрашивали сброс, проигнорируйте это письмо.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  if (!resend) {
    if (isDev) {
      console.warn(`\n[EMAIL] Welcome email for ${name} (${email})\n`);
    }
    return;
  }

  await resend.emails.send({
    from: `Love Compass <${fromEmail}>`,
    to: email,
    subject: 'Добро пожаловать! — Love Compass',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e11d48;">Привет, ${escapeHtml(name)}!</h1>
        <p>Ваш email подтверждён. Добро пожаловать в Love Compass!</p>
        <p>Теперь вы можете искать свою вторую половинку. Удачи!</p>
      </div>
    `,
  });
}
