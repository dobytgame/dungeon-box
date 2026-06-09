import { Resend } from 'resend';

let client: Resend | null = null;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY não configurado.');
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}
