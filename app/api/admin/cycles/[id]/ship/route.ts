import { NextResponse } from 'next/server';
import { shipSubscriptionCycleAction } from '@/lib/admin/actions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const formData = await request.formData();
  const result = await shipSubscriptionCycleAction(id, formData);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
