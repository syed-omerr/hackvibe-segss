import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = getDashboardStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch stats' }, { status: 500 });
  }
}
