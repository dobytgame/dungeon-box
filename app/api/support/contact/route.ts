import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  sendSupportConfirmationEmail,
  sendSupportNotificationToTeam,
} from '@/lib/email/send-transactional';

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(320),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(4000),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: 'Preencha nome, e-mail, assunto e mensagem.' },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();
  const preview =
    body.message.length > 280
      ? `${body.message.slice(0, 280)}…`
      : body.message;

  const [confirmation, team] = await Promise.all([
    sendSupportConfirmationEmail({
      to: email,
      name: body.name,
      subject: body.subject,
      messagePreview: preview,
    }),
    sendSupportNotificationToTeam({
      fromEmail: email,
      fromName: body.name,
      subject: body.subject,
      message: body.message,
    }),
  ]);

  if (!confirmation.sent && !team.sent) {
    return NextResponse.json(
      { error: 'Não foi possível enviar sua mensagem. Tente novamente.' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Mensagem enviada. O Mestre responde em breve.',
    emailSent: confirmation.sent,
  });
}
