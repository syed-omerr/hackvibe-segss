import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTeams,
  createTeam,
  findExistingPhone,
  findExistingTeamName,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { teamRegistrationSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const track = searchParams.get('track') || undefined;
    const year = searchParams.get('year') || undefined;
    const college = searchParams.get('college') || undefined;
    const attendance = searchParams.get('attendance') || undefined;
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const teams = getAllTeams(includeDeleted, {
      search,
      track,
      year,
      college,
      attendance,
    });

    return NextResponse.json({ teams, total: teams.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 1. Zod validation
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

    // 2. Duplicate Team Name Warning Check (FR-VAL-6)
    if (!data.overrideDuplicateName) {
      const existingName = findExistingTeamName(data.team_name);
      if (existingName) {
        return NextResponse.json(
          {
            warning: 'DUPLICATE_TEAM_NAME',
            message: `A team named "${data.team_name}" is already registered (ID: ${existingName.registration_id}). Do you want to proceed anyway?`,
          },
          { status: 409 }
        );
      }
    }

    // 3. Duplicate Phone Check across other teams (FR-VAL-5)
    if (!data.overrideDuplicatePhone) {
      for (const m of data.members) {
        if (m.phone) {
          const match = findExistingPhone(m.phone);
          if (match) {
            return NextResponse.json(
              {
                warning: 'DUPLICATE_PHONE',
                message: `Phone number ${m.phone} (${m.name}) is already registered with team "${match.team_name}" (${match.registration_id}). Do you want to override and register anyway?`,
                phone: m.phone,
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // 4. Create Team atomically
    const newTeam = createTeam(
      {
        team_name: data.team_name,
        track: data.track,
        registration_id: data.registration_id,
        source: 'portal',
      },
      data.members.map((m) => ({
        name: m.name,
        role: m.role,
        college: m.college,
        branch: m.branch,
        year: m.year,
        phone: m.phoneUnavailable ? null : m.phone,
        attendance: m.attendance,
      }))
    );

    return NextResponse.json({
      success: true,
      team: newTeam,
      registration_id: newTeam.registration_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create team' }, { status: 400 });
  }
}
