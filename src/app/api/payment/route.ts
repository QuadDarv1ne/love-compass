import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { z } from 'zod';

const paymentSchema = z.object({
  amount: z.number().min(1).max(10000),
  currency: z.string().default('RUB'),
  description: z.string().max(200),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validated = paymentSchema.parse(body);

    const { amount, currency, description } = validated;

    // Generate SBP QR payment URL
    // In production, this would integrate with YooKassa, CloudPayments, or SBP gateway
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    // SBP QR format (simplified for demo)
    const qrData = {
      paymentId,
      amount,
      currency,
      description,
      merchantId: 'love_compass_merchant',
      timestamp: new Date().toISOString(),
    };

    // Generate QR code data (base64 encoded JSON for demo)
    const qrValue = Buffer.from(JSON.stringify(qrData)).toString('base64');

    return NextResponse.json({
      success: true,
      paymentId,
      qrCode: qrValue,
      amount,
      currency,
      description,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      status: 'pending',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payment data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json(
      { error: 'paymentId is required' },
      { status: 400 }
    );
  }

  // In production, check payment status from payment gateway
  // For demo, return mock status
  return NextResponse.json({
    paymentId,
    status: 'completed',
    paidAt: new Date().toISOString(),
    amount: 299,
    currency: 'RUB',
  });
}
