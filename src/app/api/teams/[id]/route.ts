import { NextRequest, NextResponse } from 'next/server';
import { getTeamById, updateTeam, softDeleteTeam } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { teamRegistrationSchema } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const team = getTeamById(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    return NextResponse.json({ team });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching team' }, { status: 500 });
  }
}

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
    const body = await req.json();

    const parsed = teamRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const expectedVersion = typeof body.version === 'number' ? body.version : undefined;

    const updated = updateTeam(
      id,
      {
        team_name: data.team_name,
        track: data.track,
      },
      data.members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        college: m.college,
        branch: m.branch,
        year: m.year,
        phone: m.phoneUnavailable ? null : m.phone,
        attendance: m.attendance,
      })),
      expectedVersion
    );

    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    const isConflict = err.message?.includes('CONFLICT');
    return NextResponse.json(
      { error: err.message || 'Failed to update team' },
      { status: isConflict ? 409 : 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const success = softDeleteTeam(id);
    if (!success) {
      return NextResponse.json({ error: 'Team not found or already deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Team soft-deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete team' }, { status: 500 });
  }
}
