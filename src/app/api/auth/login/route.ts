import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPasscode,
  createSessionToken,
  setSessionCookie,
  checkRateLimit,
  recordFailedLogin,
  resetRateLimit,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please wait ${rateLimit.waitSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const passcode = body.passcode?.trim();

    if (!passcode) {
      return NextResponse.json({ error: 'Passcode is required.' }, { status: 400 });
    }

    const isValid = await verifyPasscode(passcode);
    if (!isValid) {
      recordFailedLogin(ip);
      return NextResponse.json({ error: 'Incorrect passcode. Access denied.' }, { status: 401 });
    }

    resetRateLimit(ip);
    const token = await createSessionToken();
    await setSessionCookie(token);

    return NextResponse.json({ success: true, message: 'Access granted.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed.' }, { status: 500 });
  }
}
