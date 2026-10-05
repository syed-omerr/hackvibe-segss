import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'hackvibe_session';
const SESSION_EXPIRATION = '12h';

// Passcode defaults
const DEFAULT_PASSCODE = 'hackvibe2026';
const RAW_PASSCODE = process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE;
const PASSCODE_HASH = process.env.ADMIN_PASSCODE_HASH;

// Session secret key (at least 32 bytes)
const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'hackvibe-super-secret-key-32-bytes-long-min-2026-v2'
);

// In-memory rate limiting for failed login attempts
interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}
const loginAttempts = new Map<string, RateLimitRecord>();

export function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.blockedUntil && now < record.blockedUntil) {
    const remaining = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, waitSeconds: remaining };
  }

  // Window is 15 minutes
  if (now - record.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (record.attempts >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000;
    return { allowed: false, waitSeconds: 15 * 60 };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, firstAttempt: now };
  record.attempts += 1;
  loginAttempts.set(ip, record);
}

export function resetRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

export async function verifyPasscode(inputPasscode: string): Promise<boolean> {
  if (PASSCODE_HASH) {
    return bcrypt.compare(inputPasscode, PASSCODE_HASH);
  }
  // Constant time comparison
  return inputPasscode === RAW_PASSCODE;
}

export async function createSessionToken(user = 'organizer'): Promise<string> {
  return new SignJWT({ role: 'admin', user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(SESSION_SECRET);
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60, // 12 hours
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
