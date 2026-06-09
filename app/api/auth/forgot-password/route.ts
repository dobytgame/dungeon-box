import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestPasswordReset } from '@/lib/auth/password-reset';

const bodySchema = z.object({
  email: z.string().email().max(320),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }

  const result = await requestPasswordReset(body.email);

  return NextResponse.json(result);
}
