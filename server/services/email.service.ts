/**
 * Email Notification Service
 *
 * Uses Resend for transactional emails.
 * Falls back to logging if RESEND_API_KEY is not set.
 *
 * Set RESEND_API_KEY and EMAIL_FROM in env vars.
 */

import { logger } from '../config/logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'RotaAI <noreply@rotaai.com>';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logger.info(`[EMAIL MOCK] To: ${params.to} | Subject: ${params.subject}`);
    return true; // Don't fail if email not configured
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error(`Email send failed: ${err}`);
      return false;
    }

    logger.info(`Email sent to ${params.to}: ${params.subject}`);
    return true;
  } catch (error: any) {
    logger.error(`Email error: ${error.message}`);
    return false;
  }
}

// Pre-built email templates
export async function sendRequestApproved(to: string, name: string, requestTitle: string) {
  return sendEmail({
    to,
    subject: `Request Approved: ${requestTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #10b981;">Request Approved</h2>
        <p>Hi ${name},</p>
        <p>Your request <strong>"${requestTitle}"</strong> has been approved.</p>
        <p>View details in your <a href="https://rotaai-app.tiwaton.co.uk/app/portal" style="color: #6366f1;">My Portal</a>.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af;">RotaAI - Clinical Workforce Management</p>
      </div>
    `,
  });
}

export async function sendRequestRejected(to: string, name: string, requestTitle: string, reason?: string) {
  return sendEmail({
    to,
    subject: `Request Update: ${requestTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Request Not Approved</h2>
        <p>Hi ${name},</p>
        <p>Your request <strong>"${requestTitle}"</strong> was not approved.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Contact your rota coordinator if you have questions.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af;">RotaAI - Clinical Workforce Management</p>
      </div>
    `,
  });
}

export async function sendRotaPublished(to: string, name: string, periodName: string) {
  return sendEmail({
    to,
    subject: `New Rota Published: ${periodName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #6366f1;">New Rota Published</h2>
        <p>Hi ${name},</p>
        <p>A new rota <strong>"${periodName}"</strong> has been published.</p>
        <p>View your shifts in <a href="https://rotaai-app.tiwaton.co.uk/app/portal" style="color: #6366f1;">My Portal</a> or sync to your calendar.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af;">RotaAI - Clinical Workforce Management</p>
      </div>
    `,
  });
}

export async function sendShiftChange(to: string, name: string, details: string) {
  return sendEmail({
    to,
    subject: 'Shift Change Notification',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Shift Change</h2>
        <p>Hi ${name},</p>
        <p>${details}</p>
        <p>Check your <a href="https://rotaai-app.tiwaton.co.uk/app/portal" style="color: #6366f1;">My Portal</a> for the latest schedule.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af;">RotaAI - Clinical Workforce Management</p>
      </div>
    `,
  });
}

export async function sendInviteEmail(to: string, orgName: string, inviteUrl: string) {
  return sendEmail({
    to,
    subject: `You've been invited to join ${orgName} on RotaAI`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #6366f1;">You're Invited</h2>
        <p>You've been invited to join <strong>${orgName}</strong> on RotaAI.</p>
        <p><a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accept Invite</a></p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">This invite expires in 7 days.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af;">RotaAI - Clinical Workforce Management</p>
      </div>
    `,
  });
}
