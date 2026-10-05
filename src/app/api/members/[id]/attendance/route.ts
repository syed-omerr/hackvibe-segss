import { NextRequest, NextResponse } from 'next/server';
import { updateMemberAttendance } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { AttendanceStatus } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { attendance } = await req.json();

    if (!['UNMARKED', 'PRESENT', 'ABSENT'].includes(attendance)) {
      return NextResponse.json({ error: 'Invalid attendance status' }, { status: 400 });
    }

    const success = updateMemberAttendance(id, attendance as AttendanceStatus);
    if (!success) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, attendance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update attendance' }, { status: 500 });
  }
}
