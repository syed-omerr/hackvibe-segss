import { NextRequest, NextResponse } from 'next/server';
import { restoreTeam } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const success = restoreTeam(id);
    if (!success) {
      return NextResponse.json({ error: 'Team not found or not deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Team restored successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to restore team' }, { status: 500 });
  }
}
