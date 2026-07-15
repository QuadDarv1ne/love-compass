import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { PORT } from '@/lib/constants';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${PORT.DEFAULT}`;

/**
 * Escape URL entities to prevent XSS in email templates.
 */
function escapeUrl(url: string): string {
  return url
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
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
  const verificationUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  if (isDev || !resend) {
    if (isDev) {
      logger.info('[EMAIL]', `Verification email for ${email}: token=${token.slice(0, 8)}...`);
    }
    return;
  }

  await resend.emails.send({
    from: `Love Compass <${fromEmail}>`,
    to: email,
    subject: 'Verify your email — Love Compass',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e11d48;">Welcome to Love Compass!</h1>
        <p>To complete registration, please verify your email by clicking the link below:</p>
        <a href="${escapeUrl(verificationUrl)}"
           style="display: inline-block; padding: 12px 24px; background-color: #e11d48; color: white;
                  text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Verify email
        </a>
        <p style="color: #666; font-size: 14px;">
          If you did not register, please ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  if (isDev || !resend) {
    if (isDev) {
      logger.warn('[EMAIL]', `Password reset link for ${email}: ${resetUrl}`);
    }
    return;
  }

  await resend.emails.send({
    from: `Love Compass <${fromEmail}>`,
    to: email,
    subject: 'Reset your password — Love Compass',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e11d48;">Reset Password</h1>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${escapeUrl(resetUrl)}"
           style="display: inline-block; padding: 12px 24px; background-color: #e11d48; color: white;
                  text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Reset password
        </a>
        <p style="color: #666; font-size: 14px;">
          This link is valid for 1 hour. If you did not request a reset, please ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  if (isDev || !resend) {
    if (isDev) {
      logger.warn('[EMAIL]', `Welcome email for ${name} (${email})`);
    }
    return;
  }

  await resend.emails.send({
    from: `Love Compass <${fromEmail}>`,
    to: email,
    subject: 'Welcome! — Love Compass',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e11d48;">Hi, ${escapeHtml(name)}!</h1>
        <p>Your email has been verified. Welcome to Love Compass!</p>
        <p>Now you can start finding your perfect match. Good luck!</p>
      </div>
    `,
  });
}
