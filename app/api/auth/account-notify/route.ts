import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendAccountCreatedEmail } from '@/lib/email/send-transactional';

const bodySchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();

  const result = await sendAccountCreatedEmail({
    to: email,
    name: body.name,
  });

  if (!result.sent && result.reason === 'provider_error') {
    console.warn('[auth] account created email failed:', result.message);
  }

  return NextResponse.json({
    success: true,
    emailSent: result.sent,
  });
}
