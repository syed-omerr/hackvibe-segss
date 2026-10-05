import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPasscode,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  checkRateLimit,
  recordFailedLogin,
  resetRateLimit,
  getSession,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Please wait ${rateLimit.waitSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const { passcode } = await req.json();
    if (!passcode) {
      return NextResponse.json({ error: 'Passcode is required.' }, { status: 400 });
    }

    const isValid = await verifyPasscode(passcode);
    if (!isValid) {
      recordFailedLogin(ip);
      return NextResponse.json({ error: 'Invalid organizer passcode.' }, { status: 401 });
    }

    resetRateLimit(ip);
    const token = await createSessionToken();
    await setSessionCookie(token);

    return NextResponse.json({ success: true, message: 'Authenticated successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true, message: 'Logged out successfully.' });
}

export async function GET() {
  const isAuth = await getSession();
  return NextResponse.json({ authenticated: isAuth });
}
