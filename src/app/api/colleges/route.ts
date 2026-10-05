import { NextResponse } from 'next/server';
import { getColleges } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const colleges = getColleges();
    return NextResponse.json({ colleges });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch colleges' }, { status: 500 });
  }
}
